# Integration mapping

## Shared anchors and cross-module relationships

| Consumer | Relationship | Owner / dependency |
|---|---|---|
| `01_auth.app_user.student_id` | `student.student_id` | `00_common.student` |
| `01_auth.app_user.faculty_id` | `faculty.faculty_id` | `00_common.faculty` |
| `02_student.student_profile`, `admission`, `enrollment` | `student.student_id` | shared student anchor |
| `03_faculty_a.faculty_profile`, qualification, allocation | `faculty.faculty_id` | shared faculty anchor |
| `03_faculty_a.course_allocation.offering_id` | `course_offering.offering_id` | `02_student`; FK in `03_faculty_a/constraints.sql` |
| `04_faculty_b` leave and payroll records | `faculty.faculty_id` | shared faculty anchor |
| `05_examination.exam.offering_id` | `course_offering.offering_id` | `02_student`; FK in `05_examination/constraints.sql` |
| `05_examination.exam_registration.enrollment_id` | `enrollment.enrollment_id` | `02_student`; attendance eligibility uses `fn_attendance_percentage` |
| `05_examination.result_summary` | student and semester IDs | shared anchors; SGPA joins course credits |
| `06_administration.fee_structure` | program and academic year IDs | shared anchors |
| `06_administration.fee_payment`, hostel allocation | `student.student_id` | shared student anchor |

## Reused database operations

- `fn_attendance_percentage` from Student Management is called by the examination registration procedure and trigger; it supplies the 75% rule.
- Authentication uses `sp_record_login_attempt`, `fn_is_account_locked`, and `sp_register_user` to retain database audits and lockout behavior.
- Authentication retains the team's `app_user` identity links and uses a Google reCAPTCHA v2 checkbox verified server-side, IP rate limits, HS256 access tokens, and hash-only rotating refresh sessions in `refresh_tokens`. Google rejects expired and reused response tokens. Legacy access tokens without a `type` claim remain accepted until their normal expiry; refresh tokens are rejected by route authorization.
- Student enrollment, attendance, and course dropping use `sp_enroll_student`, `sp_mark_attendance`, and `sp_drop_enrollment`.
- Faculty B leave decisions and payroll use transactional `sp_approve_leave` and `sp_generate_payroll`.
- Administration uses `sp_collect_fee` to write the payment and receipt atomically, and `sp_allocate_hostel` to lock/check room capacity.

## API protection and frontend mapping

JWT middleware populates user ID, role, and optional anchor IDs. Student routes derive the student identity from the token for enrollment and restrict student-specific reads to the linked ID. Faculty routes restrict faculty reads and requests to the linked faculty record. Payroll generation, leave decisions, fee collection, hostel allocation, result publication, and notice creation require `ADMIN`; attendance and marks entry require `FACULTY` or `ADMIN`.

The React client sends the JWT as a Bearer token and calls `/api/auth/login`, module list/detail routes, and stored-procedure-backed operations. It displays backend errors and only reports an operation as complete after an HTTP success response.

## Team approval

- Faculty A/B split approved by: ____________________  Date: __________
- Faculty A leader name/signature: ______________________________
- Faculty B leader name/signature: ______________________________
- Integration review / approval: ________________________________

## Team branch review

- `origin/Authentication-Nidhi-Mohit-Netal` was reviewed at fetched ref `c6a17cd`. Its `/api/v1/auth` and standalone `users` schema are incompatible with the shared `app_user` anchors, so those contracts were retained. IP throttling, timing-safe password lookup, and refresh-token rotation were adapted to `/api/auth` and `app_user`; refresh tokens are stored only as SHA-256 hashes. The earlier arithmetic CAPTCHA was replaced by Google's v2 checkbox with backend `siteverify` validation.
- `origin/Examination-Deep-Mansi-Vaibhavi` was reviewed at fetched ref `2ecaf51`. Its separate schema and unscoped CRUD routes conflict with shared `course_offering`, `enrollment`, attendance eligibility, and role authorization. The existing examination module remains authoritative because its stored procedures enforce those shared business rules. The older misspelled ref `origin/Examinination-Deep-Mansi-Vaibhavi` is an earlier scaffold.
- Student Management is the current branch's implementation and its shared anchor relationships are retained. No separate Faculty A, Faculty B, or Administration team refs were available among fetched branches; their current SQL modules remain in place.
