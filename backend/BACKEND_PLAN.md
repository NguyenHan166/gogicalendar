# GogiCalendar Backend - Implementation Plan và Prompt cho AI Agent

Tài liệu này là lộ trình xây dựng Backend cho GogiCalendar bằng Express.js. Mỗi phase có thể được giao riêng cho một AI agent bằng prompt tương ứng.

## 1. Mục tiêu và phạm vi

Backend cần thay thế toàn bộ mock state hiện có trong `frontend/src/store/useScheduleStore.ts`, đồng thời giữ đúng hành vi của giao diện hiện tại:

- Quản lý đăng nhập bằng username và password.
- Nhân viên đăng nhập bằng mã nhân viên hoặc số điện thoại.
- Quản lý nhân viên và mã ca.
- Tạo tuần, mở/khóa đăng ký, bắt đầu xếp lịch và công bố lịch.
- Nhân viên gửi nguyện vọng khi tuần đang mở đăng ký.
- Quản lý xếp ca, nhập dự trù và xem số nhân sự theo khung giờ.
- Nhân viên chỉ xem lịch chưa công bố của chính mình khi nghiệp vụ cho phép; lịch tổng chỉ hiển thị sau khi công bố.
- Mọi thay đổi quan trọng có audit log.

## 2. Tech stack đề xuất

- Runtime: Node.js LTS.
- Framework: Express.js.
- Language: TypeScript, chạy ESM.
- Database: MongoDB.
- ODM: Mongoose.
- Validation: Zod.
- Authentication: JWT access token và refresh token.
- Password hashing: Argon2 hoặc bcrypt.
- Security: Helmet, CORS allowlist, rate limiting.
- Logging: Pino và `pino-http`.
- Test: Vitest, Supertest và `mongodb-memory-server` ở chế độ replica set.
- Code quality: ESLint và Prettier.

MongoDB là database chính của dự án. Thiết kế ưu tiên document model:

- `WeeklySchedule` là aggregate chính, embed `preferences`, `assignments` và `forecast` vì các dữ liệu này luôn được đọc và cập nhật theo tuần.
- `Employee`, `ShiftCode`, `UserCredential`, `RefreshToken` và `AuditLog` là collection riêng.
- Các reference trong schedule lưu cả business ID cần thiết và MongoDB ObjectId khi phù hợp, nhưng API không để lộ phụ thuộc vào ObjectId.
- Dùng MongoDB replica set cho local, test và production để hỗ trợ transaction.
- Unique index và compound index phải được khai báo rõ trong Mongoose schema; không chỉ dựa vào validation ở application.

## 3. Contract MVP phải bám theo Frontend

Code FE hiện tại là nguồn contract ưu tiên cho MVP. Một số điểm trong `backend_specification.md` chưa đồng nhất với FE:

- FE dùng role `"employee" | "manager"`, không dùng `"staff"`. API trả về `"employee" | "manager"` để tránh phải sửa nhiều FE.
- `WeeklySchedule.preferences` hiện là mảng `EmployeePreference[]`, không phải object theo employee ID.
- `forecast` hiện là `{ [day]: { [department]: number } }`. Forecast chi tiết theo khung giờ sẽ được bổ sung ở phase sau mà không phá contract MVP.
- `ShiftCode.type` của FE là `"work" | "off" | "leave"`.
- Số điện thoại phải được chuẩn hóa thành chuỗi chỉ chứa chữ số khi lưu và khi tìm đăng nhập.
- Ngày trong DB lưu dạng ISO date. API có thể trả thêm map theo nhãn `"Thứ 2"` đến `"Chủ Nhật"` để FE hiện tại dùng ngay.

Response envelope thống nhất:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error envelope thống nhất:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": []
  }
}
```

## 4. State machine bắt buộc

```text
draft -> registration_open -> registration_locked -> scheduling -> published
                                      ^                  |
                                      |                  |
                                      +------------------+
```

Các transition hợp lệ:

- `draft -> registration_open`
- `registration_open -> registration_locked`
- `registration_locked -> registration_open` khi quản lý mở lại đăng ký
- `registration_locked -> scheduling`
- `scheduling -> published`
- `published -> scheduling` khi quản lý cần chỉnh sửa

Không cho phép client ghi trực tiếp một status bất kỳ mà bỏ qua transition. Service backend phải kiểm tra quyền và transition.

## 5. Quy tắc làm việc chung cho mọi phase

Mỗi AI agent phải:

1. Đọc `README.md`, `backend_specification.md`, `backend/BACKEND_PLAN.md` và các file hiện có trong `backend/`.
2. Kiểm tra code đã có trước khi sửa, không tạo project mới đè lên phase trước.
3. Chỉ làm phạm vi của phase được giao, nhưng sửa lỗi liên quan trực tiếp nếu cần.
4. Không sửa `frontend/` trừ khi prompt của phase cho phép.
5. Không hard-code secret hoặc mật khẩu production.
6. Thêm validation, authorization, error handling và test cho endpoint mới.
7. Chạy lint, typecheck và test trước khi kết thúc.
8. Cập nhật OpenAPI và `backend/README.md` khi API thay đổi.
9. Báo rõ file đã thay đổi, command đã chạy và phần chưa hoàn thành.

---

# Phase 0 - Chốt contract và thiết kế dữ liệu

## Mục tiêu

Thiết kế schema, API contract và quyết định kỹ thuật trước khi viết feature.

## Deliverables

- `backend/docs/api-contract.md`
- `backend/docs/data-model.md`
- `backend/docs/business-rules.md`
- `backend/docs/openapi.yaml` với skeleton endpoint
- Mongoose schema/model bản thiết kế, chưa cần đầy đủ implementation
- Bảng mapping giữa type FE và response API

## Điều kiện hoàn thành

- Không còn mâu thuẫn role, preference, forecast và shift type.
- Có Mermaid document/collection diagram, mô tả phần embed và reference.
- Có unique, compound, partial và TTL index dự kiến.
- Có danh sách authorization cho từng endpoint.

## Prompt Phase 0

```text
Bạn đang thực hiện Phase 0 của Backend GogiCalendar.

Hãy đọc đầy đủ:
- README.md
- backend_specification.md
- backend/BACKEND_PLAN.md
- frontend/src/data/mockData.ts
- frontend/src/store/useScheduleStore.ts

Nhiệm vụ:
1. Phân tích contract dữ liệu FE đang dùng và coi đó là contract tương thích cho MVP.
2. Thiết kế MongoDB document model bằng Mongoose cho các collection tối thiểu:
   UserCredential, Employee, ShiftCode, WeeklySchedule, RefreshToken và AuditLog.
3. Thiết kế `WeeklySchedule` là aggregate document, embed DayPreference,
   ShiftAssignment và ForecastTarget. Giải thích rõ giới hạn kích thước document
   và khi nào cần tách collection trong tương lai.
4. Xác định unique, compound, partial và TTL indexes; reference integrity ở service layer,
   delete policy, transaction boundary và optimistic concurrency strategy bằng `__v` hoặc version field.
5. Viết business rules cho đăng nhập, chuẩn hóa số điện thoại, HUB ID, schedule state machine,
   quyền manager/employee, visibility của lịch và quy tắc sửa nguyện vọng.
6. Tạo skeleton OpenAPI 3.1 cho toàn bộ endpoint dự kiến.
7. Tạo bảng mapping MongoDB document/subdocument -> API DTO -> frontend type.

Chỉ làm tài liệu thiết kế và Mongoose schema/model skeleton, chưa triển khai route/controller.
Không sửa frontend. Không xóa file đã có.
Nếu project đã có Mongoose, chạy typecheck để xác nhận model skeleton hợp lệ;
nếu chưa có dependencies thì ghi rõ lệnh cần chạy ở Phase 1.
```

---

# Phase 1 - Khởi tạo Express và hạ tầng nền

## Mục tiêu

Tạo ứng dụng Express chạy được, kết nối MongoDB và có nền tảng production-ready.

## Deliverables

- Cấu trúc module rõ ràng: `config`, `middlewares`, `modules`, `lib`, `routes`, `types`
- Environment validation bằng Zod
- Mongoose connection, schemas và models
- Global error handler
- Request ID, logging, CORS, Helmet, rate limit
- `GET /api/health` và `GET /api/ready`
- Docker Compose cho MongoDB replica set local
- Seed framework
- ESLint, Prettier, Vitest, Supertest
- `backend/README.md` và `.env.example`

## Điều kiện hoàn thành

- App khởi động được.
- Khởi tạo replica set, index sync và seed chạy được.
- Health test pass.
- Không rò stack trace ở production response.

## Prompt Phase 1

```text
Bạn đang thực hiện Phase 1 của Backend GogiCalendar trong thư mục `backend/`.

Hãy đọc tài liệu của Phase 0 và giữ nguyên các quyết định đã chốt. Thiết lập Express.js với:
- TypeScript ESM
- MongoDB + Mongoose
- Zod
- Pino
- Vitest + Supertest
- ESLint + Prettier

Yêu cầu:
1. Tạo cấu trúc source theo module, tránh controller/service khổng lồ.
2. Validate toàn bộ biến môi trường ngay khi boot.
3. Thêm middleware request ID, JSON body limit, Helmet, CORS allowlist,
   rate limit, not-found handler và global error handler.
4. Tạo `GET /api/health` và `GET /api/ready`; readiness phải kiểm tra DB.
5. Hoàn thiện Mongoose schemas/models từ thiết kế Phase 0; bật timestamps,
   strict mode và optimistic concurrency cho aggregate cần thiết.
6. Tạo `docker-compose.yml` cho MongoDB local chạy replica set,
   script idempotent để init replica set, `.env.example`,
   scripts dev/build/start/lint/typecheck/test/indexes/seed.
7. Tạo index bootstrap/sync có kiểm soát. Không dùng `autoIndex=true` trong production.
8. Cấu hình integration test bằng `MongoMemoryReplSet` hoặc MongoDB test replica set riêng;
   mỗi test suite phải cô lập dữ liệu và đóng connection sạch sẽ.
9. Tạo test cho health, readiness, not-found và error envelope.
10. Viết `backend/README.md` với hướng dẫn chạy từ máy mới.

Không triển khai auth hoặc business endpoint ở phase này.
Không sửa frontend.
Chạy install, khởi tạo MongoDB replica set, tạo indexes, seed, lint, typecheck và test.
Sửa tất cả lỗi trước khi kết thúc.
```

---

# Phase 2 - Authentication và authorization

## Mục tiêu

Triển khai đăng nhập thật và bảo vệ API theo vai trò.

## API chính

- `POST /api/auth/login/manager`
- `POST /api/auth/login/employee`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## Quy tắc

- Manager đăng nhập bằng username/password.
- Employee đăng nhập bằng employee ID hoặc phone đã chuẩn hóa.
- Employee không cần password theo đặc tả hiện tại. Phải rate-limit mạnh và ghi audit log.
- Access token ngắn hạn; refresh token lưu hash trong DB và rotate khi refresh.
- Seed account demo lấy password từ environment, không hard-code vào source.

## Prompt Phase 2

```text
Bạn đang thực hiện Phase 2: Authentication và Authorization cho GogiCalendar.

Đọc code hiện có và tài liệu contract trước khi sửa.

Triển khai:
1. Manager login bằng username/password, password hash bằng Argon2 hoặc bcrypt.
2. Employee login bằng `employeeIdOrPhone`; chuẩn hóa phone bằng cách bỏ mọi ký tự không phải số.
3. JWT access token ngắn hạn và opaque/JWT refresh token có rotation.
   Chỉ lưu hash refresh token trong DB, hỗ trợ revoke khi logout.
4. Middleware `authenticate`, `requireManager`, `requireEmployee` và helper kiểm tra self-access.
5. Endpoint login, refresh, logout và `/me` theo OpenAPI.
6. Rate limit riêng cho login employee và manager.
7. Audit log cho login thành công/thất bại, refresh và logout; không log password/token.
8. Seed manager demo tương thích `rm4650`, nhưng password phải đến từ env seed.
9. Unit/integration test cho happy path, sai thông tin, inactive employee,
   token hết hạn, refresh rotation, logout và role forbidden.

API phải trả role `"manager"` hoặc `"employee"` để tương thích FE.
Không sửa frontend.
Cập nhật OpenAPI, README và `.env.example`; chạy lint, typecheck, test.
```

---

# Phase 3 - Employee và Shift Code modules

## Mục tiêu

Hoàn thiện CRUD danh mục nhân viên và mã ca.

## API chính

- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `PATCH /api/employees/:id/status`
- `GET /api/shifts`
- `GET /api/shifts/:code`
- `POST /api/shifts`
- `PUT /api/shifts/:code`
- `PATCH /api/shifts/:code/status`

## Prompt Phase 3

```text
Bạn đang thực hiện Phase 3: Employee và Shift Code modules.

Yêu cầu Employee:
1. Manager được list/create/update/activate/deactivate; employee chỉ được xem profile của mình.
2. List hỗ trợ pagination, search, level, scheduleGroup, primaryDepartment, skill và status.
3. Chuẩn hóa phone trước khi validate unique.
4. HUB có thể bỏ trống ID; backend sinh ID dạng `HUB_<timestamp>_<random>`.
5. Không hard-delete employee đã được tham chiếu bởi lịch.
6. Role API dùng `"manager" | "employee"` và skills là object boolean trong DTO.

Yêu cầu ShiftCode:
1. Manager được create/update/disable; user đã đăng nhập được list active shifts.
2. Validate code unique, time theo HH:mm, breakMinutes >= 0.
3. type chỉ nhận `work`, `off`, `leave`.
4. Nếu `isSplit=true`, bắt buộc có startTime2/endTime2.
5. Không hard-delete shift đã được dùng trong assignment/preference.

Thêm Zod schema, controller, service, repository/query layer theo pattern hiện tại.
Thêm test về permission, filter, pagination, duplicate phone/code, HUB ID,
split shift validation và inactive behavior.
Cập nhật OpenAPI và README. Không sửa frontend.
Chạy lint, typecheck và test.
```

---

# Phase 4 - Weekly schedule và state machine

## Mục tiêu

Tạo tuần, xem tuần và điều khiển vòng đời lịch an toàn.

## API chính

- `GET /api/schedules`
- `GET /api/schedules/:weekId`
- `POST /api/schedules`
- `POST /api/schedules/create-next`
- `PATCH /api/schedules/:weekId/status`

## Prompt Phase 4

```text
Bạn đang thực hiện Phase 4: Weekly Schedule và state machine.

Triển khai:
1. List schedule có pagination/filter theo status, year và date range.
2. Get detail trả DTO tương thích `WeeklySchedule` của FE.
3. Manager có thể tạo tuần bằng startDate hoặc `create-next`.
4. `create-next` phải dùng ISO week chuẩn, xử lý đúng tuần 52/53 và đổi năm;
   không tăng chuỗi weekId thủ công.
5. Mỗi tuần luôn bắt đầu Thứ 2, kết thúc Chủ Nhật và không được overlap tuần khác.
6. Status chỉ đổi theo state machine trong BACKEND_PLAN.
7. Dùng atomic conditional update theo `weekId + version` cho thay đổi một document.
   Chỉ dùng Mongoose session/transaction khi thao tác chạm nhiều collection,
   đồng thời trả `VERSION_CONFLICT` khi hai manager ghi đè nhau.
8. Employee chỉ thấy schedule published; ngoại lệ: được lấy tuần registration_open
   để gửi/xem preference của chính mình nhưng không thấy assignments chưa công bố.
9. Ghi AuditLog cho create week và mọi status transition.
10. Test đầy đủ transition hợp lệ/không hợp lệ, quyền, visibility,
    create-next ở ranh giới năm và concurrent update.

Không triển khai assignments/preferences/forecast mutation ở phase này ngoài DTO rỗng cần thiết.
Cập nhật OpenAPI và README. Không sửa frontend.
Chạy lint, typecheck và test.
```

---

# Phase 5 - Preferences của nhân viên

## Mục tiêu

Cho nhân viên gửi và sửa nguyện vọng đúng thời gian, đúng tuần và đúng danh tính.

## API chính

- `GET /api/schedules/:weekId/preferences/me`
- `PUT /api/schedules/:weekId/preferences/me`
- `GET /api/schedules/:weekId/preferences` - manager
- `PUT /api/schedules/:weekId/preferences/:employeeId` - manager override

## Prompt Phase 5

```text
Bạn đang thực hiện Phase 5: Schedule Preferences.

Triển khai:
1. Employee chỉ đọc/ghi preference của chính mình.
2. Employee chỉ được ghi khi schedule ở `registration_open`.
3. PUT là atomic upsert nguyên bộ preference 7 ngày bên trong schedule document,
   dùng array filter hoặc thay thế subdocument có kiểm soát và version check.
4. Day preference type chỉ nhận `available`, `preferred`, `unavailable`.
5. `preferredShift` bắt buộc và phải tồn tại khi type là `preferred`;
   không cho chọn shift type off/leave làm preferred shift.
6. Note có giới hạn độ dài và được trim.
7. Manager xem toàn bộ preferences, có filter theo department, skill,
   submitted/not-submitted và preference type.
8. Manager override phải có reason và tạo audit log.
9. Response detail schedule vẫn map preferences thành `EmployeePreference[]` giống FE.
10. Test lock behavior, self-access, inactive employee, invalid shift,
    upsert idempotency, manager filter và audit log.

Cập nhật OpenAPI và README. Không sửa frontend.
Chạy lint, typecheck và test.
```

---

# Phase 6 - Assignments, forecast và staffing calculation

## Mục tiêu

Triển khai lõi xếp lịch, dự trù và tính thiếu/đủ/thừa.

## API chính

- `PUT /api/schedules/:weekId/assignments`
- `POST /api/schedules/:weekId/assignments`
- `PATCH /api/schedules/:weekId/assignments/:assignmentId`
- `DELETE /api/schedules/:weekId/assignments/:assignmentId`
- `PUT /api/schedules/:weekId/forecast`
- `GET /api/schedules/:weekId/staffing-summary`
- `POST /api/schedules/:weekId/validate`

## Prompt Phase 6

```text
Bạn đang thực hiện Phase 6: Assignments, Forecast và Staffing Calculation.

Assignments:
1. Chỉ manager được thay đổi và chỉ khi status là `registration_locked`,
   `scheduling` hoặc `published`.
2. Khi bắt đầu sửa từ registration_locked, service chuyển sang scheduling theo business rule.
3. Validate employee active, shift tồn tại, day thuộc tuần và primaryRole hợp lệ.
4. Không cho cùng employee có hai assignment trùng ngày trong MVP.
5. Nếu primaryRole/secondaryRole không có trong skills, vẫn cho lưu nhưng trả warning;
   endpoint validate phải liệt kê cảnh báo rõ ràng.
6. Update hàng loạt trong cùng schedule document phải dùng một atomic update hoặc
   document save có optimistic concurrency. Chỉ dùng transaction nếu đồng thời ghi
   collection khác như AuditLog và nghiệp vụ yêu cầu tính nguyên tử.

Forecast:
1. Giữ DTO MVP `{ [dayLabel]: { [department]: number } }`.
2. Thiết kế schedule document đủ mở rộng sang target theo time slot mà không phá API hiện tại.
3. Target là số nguyên >= 0.

Staffing calculation:
1. Viết utility thuần `parseTimeToMinutes` và `isShiftOverlappingSlot`.
2. Hỗ trợ ca thường, ca qua đêm và split shift.
3. Công thức overlap dùng khoảng nửa mở:
   `max(shiftStart, slotStart) < min(shiftEnd, slotEnd)`.
4. Shift type off/leave không được tính là nhân sự có mặt.
5. Summary trả target, actual, variance và status thiếu/đủ/thừa theo ngày,
   department; hỗ trợ query time slots để tính theo giờ.

Thêm test unit kỹ cho boundary time, overnight, split shift, zero-length interval,
off/leave và test integration cho permission, atomic update/transaction, version conflict,
duplicate employee/day, warning kỹ năng và published edit audit.
Cập nhật OpenAPI và README. Không sửa frontend.
Chạy lint, typecheck và test.
```

---

# Phase 7 - Tích hợp Frontend với API thật

## Mục tiêu

Thay Zustand mock mutation bằng API client mà không làm thay đổi UX hiện tại.

## Deliverables

- API client typed
- Auth token handling
- Store async actions và loading/error states
- Loại bỏ credential hard-code khỏi FE
- CORS/env hoàn chỉnh
- Smoke test luồng manager và employee

## Prompt Phase 7

```text
Bạn đang thực hiện Phase 7: tích hợp Frontend GogiCalendar với Backend Express.

Bạn được phép sửa cả `frontend/` và `backend/`, nhưng chỉ sửa backend khi cần điều chỉnh
contract nhỏ có test.

Nhiệm vụ:
1. Đọc toàn bộ API OpenAPI và các type trong `frontend/src/data/mockData.ts`.
2. Tạo API client typed ở frontend, base URL từ `VITE_API_BASE_URL`.
3. Tích hợp login manager/employee, `/me`, logout và refresh token.
4. Thay các mutation Zustand mock bằng async API calls cho employees, shifts,
   schedules, status, preferences, assignments và forecast.
5. Giữ nguyên shape dữ liệu mà component hiện tại dùng; mapping đặt ở API/store layer.
6. Thêm loading, error message và rollback/refetch hợp lý; không để optimistic update
   làm mất dữ liệu khi backend trả version conflict.
7. Loại bỏ password `123456789` và logic login hard-code khỏi `App.tsx`.
8. Không xóa mock data ngay; giữ một dev-only fallback rõ ràng nếu thực sự cần,
   mặc định app phải dùng API.
9. Sửa role mismatch `employee/manager` nhất quán.
10. Viết smoke/integration test khả thi và chạy backend test, frontend lint/build.

Kiểm tra thủ công các flow:
- Manager login -> tạo/mở/khóa tuần -> xếp lịch -> forecast -> publish.
- Employee login -> gửi preference khi mở -> bị chặn khi khóa -> xem lịch published.
- Refresh trang vẫn giữ session hợp lệ.

Cập nhật README ở cả frontend và backend với lệnh chạy local.
```

---

# Phase 8 - Hardening, audit, backup và deploy

## Mục tiêu

Đưa hệ thống từ mức chạy local lên mức có thể deploy thử nghiệm an toàn.

## Prompt Phase 8

```text
Bạn đang thực hiện Phase 8: production hardening và deployment cho GogiCalendar.

Thực hiện:
1. Rà soát authorization ở mọi route bằng ma trận quyền trong docs.
2. Hoàn thiện audit log cho auth, employee, shift, schedule status,
   preferences override, assignment và forecast.
3. Thêm endpoint manager đọc audit logs với pagination/filter.
4. Thêm graceful shutdown, DB connection cleanup, trust proxy config,
   secure cookie config nếu refresh token dùng cookie.
5. Tạo Dockerfile multi-stage, production docker-compose mẫu và healthcheck.
6. Viết chiến lược schema/data migration cho MongoDB bằng các script idempotent,
   có collection `schema_migrations`; không dựa vào `autoIndex` ở production.
7. Viết tài liệu backup/restore bằng `mongodump`/`mongorestore`,
   MongoDB Atlas backup nếu deploy Atlas, và rollback deployment/data migration.
8. Thêm CI chạy install, typecheck Mongoose models, lint, test và build.
9. Rà dependency vulnerabilities; chỉ sửa những vấn đề có thể xử lý an toàn.
10. Chạy test coverage và bổ sung test cho business rule có rủi ro cao.
11. Thực hiện API smoke test bằng MongoDB database sạch, replica set và seed tối thiểu.

Không đưa secret thật vào repository.
Không khẳng định production-ready nếu chưa chạy được data migration/index deployment,
test và smoke test.
Cuối cùng tạo `backend/docs/release-checklist.md` ghi rõ tiêu chí go/no-go.
```

---

## 6. API checklist tổng

### Public

- `GET /api/health`
- `GET /api/ready`
- `POST /api/auth/login/manager`
- `POST /api/auth/login/employee`
- `POST /api/auth/refresh`

### Authenticated

- `POST /api/auth/logout`
- `GET /api/auth/me`
- `GET /api/shifts`
- `GET /api/schedules`
- `GET /api/schedules/:weekId`

### Employee self-service

- `GET /api/schedules/:weekId/preferences/me`
- `PUT /api/schedules/:weekId/preferences/me`

### Manager

- Employee CRUD/status
- Shift CRUD/status
- Schedule create/create-next/status
- Preferences list/override
- Assignments CRUD/bulk replace
- Forecast update
- Staffing summary/validation
- Audit log list

## 7. Definition of Done cho toàn bộ Backend

- FE không còn phụ thuộc vào local mock cho luồng chính.
- Tất cả endpoint có Zod validation và authorization.
- State transition được kiểm soát ở service, không chỉ ở UI.
- MongoDB replica set khởi tạo được; index deployment, data migration và seed chạy được trên database sạch.
- Seed không chứa production secret.
- OpenAPI khớp implementation.
- Lint, typecheck, test và build đều pass.
- Có test cho overnight/split shift, permission và trạng thái tuần.
- Có audit log cho thao tác quản lý quan trọng.
- Có Dockerfile, CI, backup/restore guide và release checklist.

## 8. Thứ tự thực hiện khuyến nghị

Thực hiện tuần tự Phase 0 -> 8. Không nên gộp Phase 2 đến Phase 6 vào một prompt lớn vì agent dễ bỏ qua authorization, transaction và test. Sau mỗi phase, commit riêng để dễ review và rollback.
