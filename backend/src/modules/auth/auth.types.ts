import type { EmployeeRole } from '../../models/model.constants.js';

export interface AuthPrincipal {
  credentialId: string;
  employeeId: string;
  role: EmployeeRole;
}

export interface AuthProfile {
  id: string;
  name: string;
  phone: string;
  role: EmployeeRole;
  level: string;
  scheduleGroup: string;
  primaryDepartment: string;
  skills: Record<string, boolean>;
  note?: string;
  status: 'active' | 'inactive';
}

export interface AuthSession {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
  profile: AuthProfile;
}

export interface AuthRequestContext {
  ip?: string;
  requestId?: string;
  userAgent?: string;
}

export interface ManagerLoginInput {
  username: string;
  password: string;
}

export interface EmployeeLoginInput {
  employeeIdOrPhone: string;
}

export interface AuthService {
  authenticateAccessToken(token: string): Promise<AuthPrincipal>;
  getCurrentProfile(principal: AuthPrincipal): Promise<AuthProfile>;
  loginEmployee(input: EmployeeLoginInput, context: AuthRequestContext): Promise<AuthSession>;
  loginManager(input: ManagerLoginInput, context: AuthRequestContext): Promise<AuthSession>;
  logout(
    principal: AuthPrincipal,
    refreshToken: string | undefined,
    context: AuthRequestContext,
  ): Promise<void>;
  refresh(refreshToken: string, context: AuthRequestContext): Promise<AuthSession>;
}
