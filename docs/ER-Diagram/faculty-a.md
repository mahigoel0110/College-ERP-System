# Faculty Management A ER diagram

```mermaid
erDiagram
  FACULTY ||--|| FACULTY_PROFILE : profile
  DESIGNATION ||--o{ FACULTY_PROFILE : rank
  FACULTY ||--o{ FACULTY_QUALIFICATION : earns
  FACULTY ||--o{ FACULTY_DESIGNATION_HISTORY : history
  FACULTY ||--o{ COURSE_ALLOCATION : teaches
  COURSE_OFFERING ||--o{ COURSE_ALLOCATION : assigned
```
