# Working assumptions

- The shared anchor schema and IDs in `00_common` remain authoritative. Module records use those existing IDs and module tables use their own generated IDs.
- Faculty Management A owns faculty profile, qualifications, designation history, and teaching assignments. Faculty Management B owns leave and compensation. Team leaders should confirm this split; leader names, approval and signatures remain placeholders in the integration mapping.
- Leave balances are tracked by calendar year. The included sample leave request is pending; balances are deducted only once when `sp_approve_leave` approves it.
- Payroll gross is basic pay plus a 20% allowance; PF is 12% of basic, professional tax is 200, and loss-of-pay is subtracted from net pay. The 20% allowance is a working assumption because no allowance rate was supplied.
- Late fee is a flat 2% of the outstanding fee whenever payment is after the due date. The rate is stored per fee structure and can be changed by administrators.
- React uses the repository's existing Bootstrap 5 dependency. JWT is kept in `localStorage` for a simple demo; this is vulnerable to token theft through XSS and should be replaced with secure, HttpOnly cookies for production.
- The local API expects `college_erp` from a locally installed MySQL server. The SQL runner only drops/recreates that exact development database and can be configured with `MYSQL_CMD`.
- Seed accounts are `admin`, `student01`–`student03`, and `faculty01`–`faculty03`; their common sample password is `Password@123` as encoded by the repository's existing bcrypt seed hash.
- Cross-module SQL is added to the module that references the other module. SQL remains the schema source of truth; there are no JavaScript migrations.
