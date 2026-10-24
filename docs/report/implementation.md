# Group report sections

## Shared schema and Authentication

The normalized shared schema separates departments, programs, academic years, semesters, students, and faculty. Authentication is separated from those identity anchors and references them with foreign keys. Unique constraints protect usernames, emails, enrollment numbers, and linked identity records. The module demonstrates role checks, lockout, login auditing, and role-change auditing. Attach test evidence for registration, failed-login lockout and role consistency.

## Student Management

Student profile, guardian, admission, course, offering, enrollment and attendance data are separated by entity and connected with foreign keys. Unique enrollment and attendance keys prevent duplicates. Triggers enforce active-student and capacity rules; procedures support enrollment, dropping, reactivation, admission and attendance. Attach evidence for capacity boundaries, future attendance, duplicate enrollment and low-attendance reporting.

## Faculty Management A

Faculty profiles, qualifications, designation history and course allocations are separate entities. Workload and service functions, transactional registration, audit history, and the 16-hour cap support faculty assignments. Attach full seed and workload test evidence.

## Faculty Management B

Leave balances, requests, salary structures, change logs and payroll are normalized into separate records. Approval locks the pending request and updates the matching annual balance once. Payroll uses unique faculty-period keys and calculates PF, tax and loss-of-pay. Attach approval/rejection, duplicate payroll and payroll formula evidence.

## Examination

Exams reference student course offerings; registrations reference active enrollments; marks and marks audit are separate. Attendance eligibility calls the Student Management function. Grade points and credits produce SGPA; result summaries capture semester output. Attach evidence for below-75% rejection, marks bounds, publication, and revaluation workflow.

## Administration

Fee structures and their audit trail are separate from payments and immutable receipts. Fee collection runs in a transaction. Hostel rooms and allocations support capacity/vacancy queries. Attach evidence for late fees, duplicate payments, atomic receipt issuance and room capacity.

## Evidence and team integration

Verification in this environment (20 October 2026): backend `npm run check` passed and the frontend production build passed with Vite 8.3.4. Earlier dependency audits reported zero vulnerabilities in both dependency trees. The package manifests do not define a unit-test script. The latest `git diff --check` passed; Git emitted line-ending normalization warnings for README and the existing student test file.

The final clean SQL workflow completed successfully with `bash database/run_all.sh --test`, using the configured application database account through a temporary protected MySQL option file. As warned beforehand, this rebuild dropped and recreated `college_erp`. It created 45 tables and printed PASS results across all six modules, including authentication, student management, both faculty modules, examinations, and administration. The temporary option file was cleared after the run. The previously generated `college_erp` data was replaced by the clean seeded/test state.

Seeded demo authentication was verified against the running API: the documented administrator and student accounts logged in, `/auth/me` returned their expected roles, and the student received 403 from an administrator-only hostel endpoint. The original login failure was caused by the seed password hash not matching the documented demo password; the seed hash was corrected and verified by the successful clean database build and login checks. The earlier locked administrator state disappeared with the warned clean reseed.

The frontend uses same-origin `/api` requests and `frontend/vite.config.js` proxies them to `http://localhost:5000`. The configured development port is 5175. Earlier browser verification at `http://localhost:5174` confirmed successful admin, faculty, and student logins; role-specific navigation; live dashboard values; and formatted/searchable account, enrollment, course, attendance, faculty, leave balance, fee/receipt, hostel, and notice views. A student direct-navigation attempt to `/administration` returned to the student dashboard. API responses for these views were served through the frontend's `/api` proxy.

The audit added routes and views for faculty course rosters, student fees/hostel, exam registrations and revaluation, faculty details, and administration records. No successful enrollment, attendance, marks publication, leave approval/payroll, fee collection, or hostel allocation was submitted through the UI in this audit; those writes would alter academic, payroll, or immutable receipt data. The clean SQL suite did exercise the stored procedures and their invariants, and prior direct API verification covered authentication and role denial. Keep these results distinct from full write-workflow E2E coverage.

Final code verification after the UI and CORS fixes: backend `npm run check`, frontend `npm run build`, and `git diff --check` passed. The final browser reload returned a proxy 502. A local health probe could not connect to `127.0.0.1:5000`, while a second API start failed with `EADDRINUSE`; process inspection was blocked by the environment. Therefore live API/database workflows could not be repeated in this final pass. The earlier browser/API verification above remains evidence of the successful integration state before this runtime became unavailable. The destructive SQL runner was not repeated because it drops and recreates `college_erp` and no fresh database rebuild was needed for these frontend/configuration changes.

The repository does not contain `ERP_BUILD_PROMPT.md`; the user-provided task text was the available specification. No screenshots were fabricated. `git diff --check` passed.

The 20 October 2026 branch integration added CAPTCHA, IP rate limiting, and persisted rotating refresh sessions adapted from the fetched Authentication branch, plus 5175 CORS support. Backend syntax/check and the frontend production build pass after those edits. The CAPTCHA service's one-time challenge was checked locally. The refreshed login, token rotation/replay revocation, and live database-backed flows have not been reverified against MySQL in this pass because the configured application DB credentials were rejected; the destructive SQL runner was not rerun.

Latest login connectivity verification: the backend on port 5000 returned HTTP 200 for `/api/health` and `/api/auth/captcha`; the DB pool query succeeded. A read-only check confirmed the documented admin demo row is active, unlocked, and its bcrypt hash matches the documented demo password. One complete CAPTCHA → login → `/auth/me` → logout request flow returned successful responses. That current database did not return a persisted refresh token. The configured frontend now uses the Vite proxy on port 5175; its browser reachability is pending the required unsandboxed Vite process launch.

The arithmetic challenge was subsequently replaced with Google reCAPTCHA v2. The public response token is submitted as `recaptchaToken`; the backend calls Google's verification endpoint before account lookup and fails closed for invalid, expired, missing, misconfigured, or unverifiable tokens. Real Google verification requires both environment keys documented in the README. Google test keys are available for development only and always pass, so they do not provide production bot protection.
