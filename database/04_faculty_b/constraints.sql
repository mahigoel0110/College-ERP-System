-- Leave-balance year is checked transactionally in sp_approve_leave; it cannot be a generated-expression FK.
ALTER TABLE leave_balance ADD CONSTRAINT fk_leave_balance_faculty FOREIGN KEY(faculty_id) REFERENCES faculty(faculty_id);
ALTER TABLE leave_request ADD CONSTRAINT fk_leave_request_faculty FOREIGN KEY(faculty_id) REFERENCES faculty(faculty_id);
ALTER TABLE salary_structure ADD CONSTRAINT fk_salary_structure_faculty FOREIGN KEY(faculty_id) REFERENCES faculty(faculty_id);
ALTER TABLE payroll ADD CONSTRAINT fk_payroll_faculty FOREIGN KEY(faculty_id) REFERENCES faculty(faculty_id);
