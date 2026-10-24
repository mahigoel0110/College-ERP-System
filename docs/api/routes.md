# REST API

Base URL: `http://localhost:5000/api`. JSON responses use `{ "data": ... }`; errors use `{ "error": { "code", "message" } }` where a stable code is available. Authenticated endpoints require `Authorization: Bearer <token>`. IDs and enum values must match the database. Validation/business errors return 400, duplicates return 409, unauthenticated requests return 401, locked accounts return 423, unavailable verification/database services return 503, and insufficient roles return 403.

| Method | Path | Roles | Input / result |
|---|---|---|---|
| GET | `/health` | public | DB connectivity status |
| POST | `/auth/login` | public, rate limited | `{username,password,recaptchaToken}` → `{token,refreshToken,user}`; token is verified server-side with Google reCAPTCHA v2. CAPTCHA errors: `CAPTCHA_REQUIRED`, `CAPTCHA_INVALID`, `CAPTCHA_EXPIRED`, `CAPTCHA_UNAVAILABLE`; credential errors: `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED` |
| POST | `/auth/refresh` | public, refresh token required | Rotates a persisted refresh token and returns a new access/refresh pair |
| POST | `/auth/logout` | public | Revokes the supplied refresh token |
| GET | `/auth/me` | any signed-in | Current token identity |
| GET | `/courses/offerings` | any signed-in | Seat status; students also receive their own enrollment flag |
| GET | `/students/:studentId/profile` | own student/admin | Profile and common anchor fields |
| GET | `/students/:studentId/enrollments` | own student/admin | Course enrollment list |
| GET | `/students/:studentId/attendance` | own student/admin | Attendance percentages |
| GET | `/students/:studentId/fees`, `/students/:studentId/hostel` | own student/admin | Own current-year fee/receipt and hostel allocation records |
| POST | `/students/admissions` | admin | Admission/profile/guardian fields → `sp_admit_student` |
| POST | `/students/enrollments` | student/admin | `{offering_id, student_id?}` → calls `sp_enroll_student` |
| POST | `/students/enrollments/:id/drop` | student/admin | Calls `sp_drop_enrollment` |
| POST | `/students/attendance` | faculty/admin | `{enrollment_id,class_date,status}` → `sp_mark_attendance` |
| GET | `/students/low-attendance` | faculty/admin | `vw_low_attendance` |
| GET | `/faculty/:id/profile` | own faculty/admin | `vw_faculty_workload` row |
| GET | `/faculty/:id/details` | own faculty/admin | Profile, qualifications, designation history |
| GET | `/faculty/profiles` | admin | Faculty workload directory |
| GET | `/faculty/allocations` | faculty/admin | `vw_faculty_allocations` |
| GET | `/faculty/enrollments` | assigned faculty/admin | Course rosters; faculty are limited to their assigned offerings |
| POST/DELETE | `/faculty/allocations`, `/faculty/allocations/:id` | admin | Add/remove allocation via Faculty A procedures |
| GET/POST | `/faculty/leave-balances`, `/faculty/leave-requests` | faculty/admin | View balances; request `{leave_type_id,start_date,end_date,days_requested}` |
| POST | `/faculty/leave-requests/:id/decision` | admin | `{approve:boolean}` → `sp_approve_leave` |
| GET | `/faculty/leave-requests` | faculty/admin | Own requests for faculty; all requests for admin |
| GET/POST | `/faculty/payroll` | faculty/admin for read; admin for generate | Generate `{faculty_id,period_start,period_end,lop_amount}` |
| GET | `/exams` | any signed-in | Student exams for own enrolled offerings; faculty exams for assigned offerings; admin sees all |
| GET | `/exams/registrations` | any signed-in | Student-owned, faculty-assigned, or admin-wide registrations and marks |
| GET | `/exams/revaluation` | student/admin | Own requests or all requests for admin |
| POST | `/exams/registration` | student/admin | `{exam_id,offering_id?,exam_hall_id?}` → `sp_register_exam` |
| POST | `/exams/marks` | faculty/admin | `{exam_registration_id,marks_obtained}` → `sp_submit_marks` |
| POST | `/exams/:id/publish` | admin | Calls `sp_publish_results` |
| GET | `/exams/results/:studentId` | own student/admin | Published result summaries |
| POST | `/exams/revaluation` | student/admin | `{marks_id,reason,student_id?}` → `sp_request_revaluation` |
| POST | `/exams/revaluation/:id/decision` | admin | `{approve:boolean}` → `sp_decide_revaluation` |
| GET | `/admin/users`, `/admin/enrollments` | admin | Sanitized account list and enrollment records |
| GET | `/admin/pending-fees`, `/admin/fee-structures`, `/admin/fee-collection`, `/admin/receipts`, `/admin/hostels`, `/admin/hostel-allocations` | admin | Fee summaries, receipts, room occupancy, and allocations |
| POST | `/admin/fee-payments` | admin | `{student_id,fee_structure_id,payment_method}` → atomic payment/receipt |
| POST | `/admin/hostel-allocations` | admin | `{student_id,hostel_room_id}` → capacity-checked allocation |
| GET | `/notices` | any signed-in | Current notices filtered by audience |
| POST | `/admin/notices` | admin | `{title,body,audience,expires_at?}` |

The backend currently accepts request bodies as JSON. Business rules live in SQL; the API translates MySQL business and uniqueness errors to safe client messages and does not serialize password hashes.
