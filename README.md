# University Higher Education ERP System

React 18 + Vite frontend, Express/MySQL REST API, and a modular MySQL 8 database. SQL files are the source of truth for schema and business logic. The development workflow uses locally installed MySQL; Docker is not required.

## Prerequisites

- Windows 10/11, Node.js 20.19+ (or 22.12+), npm, and MySQL Server 8.0+ with the `mysql` command-line client available on PATH.
- Bash to run `database/run_all.sh`; Git for Windows includes Git Bash. The script accepts a custom `MYSQL_CMD` when needed.

## Local setup

1. Create the development database by copying `.env.example` to `.env` and setting `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME=college_erp`, and a random `JWT_SECRET` of at least 32 characters. Keep `.env` private.
2. Start the local MySQL service. From Git Bash in the repository root, run:

   ```bash
   bash database/run_all.sh --test
   ```

   The runner resets only `college_erp`, then applies SQL in phase and module dependency order. Use `bash database/run_all.sh` to build without module tests. It reports SQL errors and exits nonzero when a test prints `FAIL`.
3. Install and start the backend:

   ```powershell
   cd backend
   npm install
   npm run dev
   ```

   The API listens on `http://localhost:5000`; verify `GET /api/health`.
4. In another terminal, install and start the frontend:

   ```powershell
   cd frontend
   npm install
   npm run dev
   ```

   Open the `Local` URL printed by Vite (`http://localhost:5175`). Vite proxies same-origin `/api` requests to port 5000.

## Google reCAPTCHA v2 setup

The login checkbox uses a public site key in `frontend/.env` (`VITE_RECAPTCHA_SITE_KEY`) and a private verification key in `backend/.env` (`RECAPTCHA_SECRET_KEY`). If either `.env` already exists, preserve it and add only the required setting; never put the secret in a `VITE_` variable. If `frontend/.env` does not exist, copy `frontend/.env.example` to create it. Restart Vite and the backend after changing environment values. The backend verifies each response with Google's `siteverify` service before it reads the account or checks the password. Missing, invalid, expired, reused, or unverifiable responses fail closed.

For local integration tests only, Google's official v2 test keys are:

- Site key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Secret key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

These test keys always pass verification and are not bot protection. Do not use them in production. For deployment, create a reCAPTCHA v2 Checkbox key pair in the [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create), register `localhost` for local development and the actual production hostname for deployment, and keep the secret only in the backend environment. Google's docs recommend separate development and production keys and require `localhost` to be added to allowed domains for local testing ([v2 FAQ](https://developers.google.com/recaptcha/docs/faq), [domain validation](https://developers.google.com/recaptcha/docs/domain_validation)).

## Demonstration accounts

Existing seed users: `admin`, `student01`, `student02`, `student03`, `faculty01`, `faculty02`, and `faculty03`. Seeded bcrypt password is `Password@123`. These are classroom-only credentials; change or remove them outside a demo environment.

## Verification commands

```powershell
cd backend; npm run check
cd ..\frontend; npm install; npm run build
```

The DB verification command above is the integration check. `database-verification.log` is historical evidence for the original common/auth/student baseline and early Faculty A phases only; it is not evidence that the added modules passed. See [docs/report/implementation.md](docs/report/implementation.md) for test evidence to collect in the target environment.

## Troubleshooting

- `mysql: command not found`: add the MySQL `bin` directory to PATH or set `MYSQL_CMD` to an installed MySQL client command.
- Access denied: check local MySQL credentials in `.env`; the SQL runner reads the same file.
- Function creation denied: the runner attempts to enable `log_bin_trust_function_creators`; configure the MySQL account/server accordingly if your local policy blocks it.
- API refuses to start: set a `JWT_SECRET` with 32+ characters and ensure `college_erp` exists.
- Frontend API errors: start the API on port 5000 and check `/api/health`.

See [API routes](docs/api/routes.md), [integration mapping](docs/integration-mapping.md), and [architecture overview](docs/architecture/overview.md).
