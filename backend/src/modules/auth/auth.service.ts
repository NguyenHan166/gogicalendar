import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

import bcrypt from 'bcryptjs';
import mongoose, { Types, type FilterQuery } from 'mongoose';

import { env, type AppEnv } from '../../config/env.js';
import { AppError } from '../../lib/app-error.js';
import { normalizePhone } from '../../lib/phone.js';
import {
  EmployeeModel,
  RefreshTokenModel,
  UserCredentialModel,
  type Employee,
} from '../../models/index.js';
import { writeAuthAudit } from './auth-audit.service.js';
import { AccessTokenService, generateRefreshToken, hashRefreshToken } from './token.service.js';
import type {
  AuthPrincipal,
  AuthProfile,
  AuthRequestContext,
  AuthService,
  AuthSession,
  EmployeeLoginInput,
  ManagerLoginInput,
} from './auth.types.js';

const DUMMY_PASSWORD_HASH = bcrypt.hashSync('invalid-credential-placeholder', 12);

class RefreshRotationConflict extends Error {}

function invalidCredentials(cause?: unknown): AppError {
  return new AppError(401, 'INVALID_CREDENTIALS', 'Thông tin đăng nhập không hợp lệ', { cause });
}

function invalidRefreshToken(cause?: unknown): AppError {
  return new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token không hợp lệ hoặc đã hết hạn', {
    cause,
  });
}

function identifierFingerprint(identifier: string): string {
  return createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex');
}

function secretsEqual(left: string, right: string): boolean {
  const leftDigest = createHash('sha256').update(left).digest();
  const rightDigest = createHash('sha256').update(right).digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function formattedPhoneRegex(phoneDigits: string): RegExp {
  return new RegExp(`^${phoneDigits.split('').join('\\D*')}$`);
}

function toProfile(employee: Employee): AuthProfile {
  const skills = { ...employee.skills };

  return {
    id: employee.employeeId,
    name: employee.name,
    phone: employee.phone,
    role: employee.role,
    level: employee.level,
    scheduleGroup: employee.scheduleGroup,
    primaryDepartment: employee.primaryDepartment,
    skills,
    ...(employee.note ? { note: employee.note } : {}),
    status: employee.status,
  };
}

export class MongoAuthService implements AuthService {
  private readonly accessTokens: AccessTokenService;

  public constructor(private readonly config: AppEnv = env) {
    this.accessTokens = new AccessTokenService(config);
  }

  public async loginManager(
    input: ManagerLoginInput,
    context: AuthRequestContext,
  ): Promise<AuthSession> {
    const username = input.username.trim().toLowerCase();
    let credential = await UserCredentialModel.findOne({
      username,
      authType: 'manager_password',
    })
      .select('+passwordHash')
      .lean();

    if (!credential) {
      credential = await this.bootstrapImportedManagerCredential(username, input.password);
    }

    if (!credential) {
      await bcrypt.compare(input.password, DUMMY_PASSWORD_HASH);
      await this.auditFailure('auth.login.manager', context, username, 'invalid_credentials');
      throw invalidCredentials();
    }

    const now = new Date();
    const isLocked = credential.lockedUntil && credential.lockedUntil > now;
    if (credential.status !== 'active' || isLocked || !credential.passwordHash) {
      await this.auditFailure(
        'auth.login.manager',
        context,
        username,
        isLocked ? 'credential_locked' : 'invalid_credentials',
      );
      throw invalidCredentials();
    }

    const passwordMatches = await bcrypt.compare(input.password, credential.passwordHash);
    if (!passwordMatches) {
      const failedLoginCount = credential.failedLoginCount + 1;
      const shouldLock = failedLoginCount >= this.config.AUTH_MAX_FAILED_ATTEMPTS;
      await UserCredentialModel.updateOne(
        { _id: credential._id },
        {
          $set: {
            failedLoginCount: shouldLock ? 0 : failedLoginCount,
            ...(shouldLock
              ? { lockedUntil: new Date(Date.now() + this.config.AUTH_LOCK_DURATION_MS) }
              : {}),
          },
        },
      );
      await this.auditFailure(
        'auth.login.manager',
        context,
        username,
        shouldLock ? 'credential_locked' : 'invalid_credentials',
      );
      throw invalidCredentials();
    }

    const employee = await EmployeeModel.findById(credential.employeeRef).lean();
    if (!employee || employee.status !== 'active' || employee.role !== 'manager') {
      await this.auditFailure('auth.login.manager', context, username, 'inactive_identity');
      throw invalidCredentials();
    }

    await UserCredentialModel.updateOne(
      { _id: credential._id },
      { $set: { failedLoginCount: 0, lastLoginAt: now }, $unset: { lockedUntil: 1 } },
    );

    const session = await this.issueSession(
      {
        credentialId: credential._id.toString(),
        employeeId: employee.employeeId,
        role: employee.role,
      },
      employee,
      context,
    );
    await writeAuthAudit({
      action: 'auth.login.manager',
      actorEmployeeId: employee.employeeId,
      actorRole: employee.role,
      context,
      outcome: 'success',
      resourceId: credential._id.toString(),
    });
    return session;
  }

  public async loginEmployee(
    input: EmployeeLoginInput,
    context: AuthRequestContext,
  ): Promise<AuthSession> {
    const identifier = input.employeeIdOrPhone.trim();
    const phone = normalizePhone(identifier);
    const clauses: FilterQuery<Employee>[] = [{ employeeId: identifier }];
    if (phone) {
      clauses.push({ phone }, { phone: formattedPhoneRegex(phone) });
    }

    const employees = await EmployeeModel.find({ $or: clauses }).limit(2).lean();
    const employee = employees.length === 1 ? employees[0] : undefined;

    if (!employee || employee.role !== 'employee' || employee.status !== 'active') {
      await this.auditFailure('auth.login.employee', context, identifier, 'invalid_identity');
      throw invalidCredentials();
    }

    let credential = await UserCredentialModel.findOne({ employeeRef: employee._id }).lean();
    if (!credential) {
      try {
        credential = (
          await UserCredentialModel.create({
            employeeRef: employee._id,
            authType: 'employee_identifier',
            status: 'active',
            failedLoginCount: 0,
            lastLoginAt: new Date(),
          })
        ).toObject();
      } catch (error: unknown) {
        credential = await UserCredentialModel.findOne({ employeeRef: employee._id }).lean();
        if (!credential) throw error;
      }
    }

    if (credential.status !== 'active' || credential.authType !== 'employee_identifier') {
      await this.auditFailure('auth.login.employee', context, identifier, 'disabled_credential');
      throw invalidCredentials();
    }

    await UserCredentialModel.updateOne(
      { _id: credential._id },
      { $set: { lastLoginAt: new Date() } },
    );

    const session = await this.issueSession(
      {
        credentialId: credential._id.toString(),
        employeeId: employee.employeeId,
        role: employee.role,
      },
      employee,
      context,
    );
    await writeAuthAudit({
      action: 'auth.login.employee',
      actorEmployeeId: employee.employeeId,
      actorRole: employee.role,
      context,
      outcome: 'success',
      resourceId: credential._id.toString(),
    });
    return session;
  }

  public async refresh(refreshToken: string, context: AuthRequestContext): Promise<AuthSession> {
    const tokenHash = hashRefreshToken(refreshToken);
    const storedToken = await RefreshTokenModel.findOne({ tokenHash })
      .select('+tokenHash +replacedByTokenHash')
      .lean();

    if (!storedToken) {
      await this.auditFailure('auth.refresh', context, tokenHash, 'unknown_refresh_token');
      throw invalidRefreshToken();
    }

    if (storedToken.revokedAt) {
      await this.revokeFamily(storedToken.credentialRef, storedToken.familyId);
      await this.auditFailure('auth.refresh.reuse', context, storedToken.familyId, 'token_reuse');
      throw invalidRefreshToken();
    }

    if (storedToken.expiresAt <= new Date()) {
      await this.auditFailure('auth.refresh', context, storedToken.familyId, 'token_expired');
      throw invalidRefreshToken();
    }

    let identity: Awaited<ReturnType<MongoAuthService['loadActiveIdentity']>>;
    try {
      identity = await this.loadActiveIdentity(
        storedToken.credentialRef.toString(),
        undefined,
        undefined,
      );
    } catch (error: unknown) {
      await this.auditFailure('auth.refresh', context, storedToken.familyId, 'inactive_identity');
      throw invalidRefreshToken(error);
    }
    const newRefreshToken = generateRefreshToken();
    const newTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + this.config.REFRESH_TOKEN_TTL_SECONDS * 1000);
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        const rotated = await RefreshTokenModel.findOneAndUpdate(
          {
            _id: storedToken._id,
            revokedAt: { $exists: false },
            expiresAt: { $gt: new Date() },
          },
          {
            $set: {
              revokedAt: new Date(),
              replacedByTokenHash: newTokenHash,
            },
          },
          { session },
        );

        if (!rotated) throw new RefreshRotationConflict();

        await RefreshTokenModel.create(
          [
            {
              credentialRef: storedToken.credentialRef,
              tokenHash: newTokenHash,
              familyId: storedToken.familyId,
              expiresAt,
              ...(context.ip ? { createdByIp: context.ip } : {}),
              ...(context.userAgent ? { userAgent: context.userAgent } : {}),
            },
          ],
          { session },
        );
      });
    } catch (error: unknown) {
      if (error instanceof RefreshRotationConflict) {
        await this.revokeFamily(storedToken.credentialRef, storedToken.familyId);
        await this.auditFailure('auth.refresh.reuse', context, storedToken.familyId, 'token_reuse');
        throw invalidRefreshToken(error);
      }
      throw error;
    } finally {
      await session.endSession();
    }

    const accessToken = await this.accessTokens.sign(identity.principal);
    await writeAuthAudit({
      action: 'auth.refresh',
      actorEmployeeId: identity.employee.employeeId,
      actorRole: identity.employee.role,
      context,
      outcome: 'success',
      resourceId: storedToken.familyId,
    });

    return {
      accessToken,
      expiresIn: this.config.ACCESS_TOKEN_TTL_SECONDS,
      refreshToken: newRefreshToken,
      profile: toProfile(identity.employee),
    };
  }

  public async logout(
    principal: AuthPrincipal,
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<void> {
    if (refreshToken) {
      await RefreshTokenModel.updateOne(
        {
          credentialRef: new Types.ObjectId(principal.credentialId),
          tokenHash: hashRefreshToken(refreshToken),
          revokedAt: { $exists: false },
        },
        { $set: { revokedAt: new Date() } },
      );
    } else {
      await RefreshTokenModel.updateMany(
        {
          credentialRef: new Types.ObjectId(principal.credentialId),
          revokedAt: { $exists: false },
        },
        { $set: { revokedAt: new Date() } },
      );
    }

    await writeAuthAudit({
      action: 'auth.logout',
      actorEmployeeId: principal.employeeId,
      actorRole: principal.role,
      context,
      outcome: 'success',
      resourceId: principal.credentialId,
    });
  }

  public async authenticateAccessToken(token: string): Promise<AuthPrincipal> {
    const principal = await this.accessTokens.verify(token);
    try {
      const identity = await this.loadActiveIdentity(
        principal.credentialId,
        principal.employeeId,
        principal.role,
      );
      return identity.principal;
    } catch (error: unknown) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Phiên đăng nhập không còn hợp lệ', {
        cause: error,
      });
    }
  }

  public async getCurrentProfile(principal: AuthPrincipal): Promise<AuthProfile> {
    const identity = await this.loadActiveIdentity(
      principal.credentialId,
      principal.employeeId,
      principal.role,
    );
    return toProfile(identity.employee);
  }

  private async issueSession(
    principal: AuthPrincipal,
    employee: Employee,
    context: AuthRequestContext,
  ): Promise<AuthSession> {
    const accessToken = await this.accessTokens.sign(principal);
    const refreshToken = generateRefreshToken();
    await RefreshTokenModel.create({
      credentialRef: new Types.ObjectId(principal.credentialId),
      tokenHash: hashRefreshToken(refreshToken),
      familyId: randomUUID(),
      expiresAt: new Date(Date.now() + this.config.REFRESH_TOKEN_TTL_SECONDS * 1000),
      ...(context.ip ? { createdByIp: context.ip } : {}),
      ...(context.userAgent ? { userAgent: context.userAgent } : {}),
    });

    return {
      accessToken,
      expiresIn: this.config.ACCESS_TOKEN_TTL_SECONDS,
      refreshToken,
      profile: toProfile(employee),
    };
  }

  private async bootstrapImportedManagerCredential(username: string, password: string) {
    const configuredPassword = this.config.SEED_MANAGER_PASSWORD;
    if (
      !configuredPassword ||
      username !== this.config.SEED_MANAGER_USERNAME.trim().toLowerCase() ||
      !secretsEqual(password, configuredPassword)
    ) {
      return null;
    }

    const employee = await EmployeeModel.findOne({
      employeeId: this.config.SEED_MANAGER_ID,
      role: 'manager',
      status: 'active',
    }).lean();
    if (!employee) return null;

    const passwordHash = await bcrypt.hash(configuredPassword, this.config.BCRYPT_ROUNDS);
    try {
      await UserCredentialModel.create({
        employeeRef: employee._id,
        username,
        passwordHash,
        authType: 'manager_password',
        status: 'active',
        failedLoginCount: 0,
      });
    } catch (error: unknown) {
      const existingCredential = await UserCredentialModel.findOne({
        employeeRef: employee._id,
      })
        .select('+passwordHash')
        .lean();
      if (!existingCredential) throw error;
    }

    return UserCredentialModel.findOne({
      employeeRef: employee._id,
      username,
      authType: 'manager_password',
    })
      .select('+passwordHash')
      .lean();
  }

  private async loadActiveIdentity(
    credentialId: string,
    expectedEmployeeId: string | undefined,
    expectedRole: 'employee' | 'manager' | undefined,
  ): Promise<{ employee: Employee; principal: AuthPrincipal }> {
    if (!Types.ObjectId.isValid(credentialId)) throw invalidCredentials();

    const credential = await UserCredentialModel.findById(credentialId).lean();
    if (!credential || credential.status !== 'active') throw invalidCredentials();

    const employee = await EmployeeModel.findById(credential.employeeRef).lean();
    if (
      !employee ||
      employee.status !== 'active' ||
      (expectedEmployeeId && employee.employeeId !== expectedEmployeeId) ||
      (expectedRole && employee.role !== expectedRole)
    ) {
      throw invalidCredentials();
    }

    return {
      employee,
      principal: {
        credentialId: credential._id.toString(),
        employeeId: employee.employeeId,
        role: employee.role,
      },
    };
  }

  private async revokeFamily(credentialRef: Types.ObjectId, familyId: string): Promise<void> {
    await RefreshTokenModel.updateMany(
      { credentialRef, familyId, revokedAt: { $exists: false } },
      { $set: { revokedAt: new Date() } },
    );
  }

  private async auditFailure(
    action: string,
    context: AuthRequestContext,
    identifier: string,
    reason: string,
  ): Promise<void> {
    await writeAuthAudit({
      action,
      actorRole: 'system',
      context,
      metadata: { identifierFingerprint: identifierFingerprint(identifier) },
      outcome: 'failure',
      reason,
    });
  }
}

export function createAuthService(config: AppEnv = env): AuthService {
  return new MongoAuthService(config);
}
