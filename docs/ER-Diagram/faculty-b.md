# Faculty Management B ER diagram

```mermaid
erDiagram
  FACULTY ||--o{ LEAVE_BALANCE : accrues
  LEAVE_TYPE ||--o{ LEAVE_BALANCE : type
  FACULTY ||--o{ LEAVE_REQUEST : requests
  LEAVE_TYPE ||--o{ LEAVE_REQUEST : type
  FACULTY ||--o{ SALARY_STRUCTURE : paid
  SALARY_STRUCTURE ||--o{ SALARY_CHANGE_LOG : audited
  FACULTY ||--o{ PAYROLL : receives
```
