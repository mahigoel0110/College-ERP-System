-- Seed data for common/shared tables (IDs 1-999 reserved)
-- Departments (1-4)
INSERT INTO department (department_id, department_code, department_name) VALUES
  (1, 'CE',   'Computer Engineering'),
  (2, 'IT',   'Information Technology'),
  (3, 'ENTC', 'Electronics and Telecommunication Engineering'),
  (4, 'ME',   'Mechanical Engineering');

-- Programs (1-4)
INSERT INTO program (program_id, program_code, program_name, department_id, duration_years) VALUES
  (1, 'BE-CE',   'B.E. Computer Engineering',                              1, 4),
  (2, 'BE-IT',   'B.E. Information Technology',                             2, 4),
  (3, 'BE-ENTC', 'B.E. Electronics and Telecommunication Engineering',      3, 4),
  (4, 'BE-ME',   'B.E. Mechanical Engineering',                             4, 4);

-- Academic Year (1)
INSERT INTO academic_year (academic_year_id, year_label, start_date, end_date) VALUES
  (1, '2026-27', '2026-06-01', '2027-05-31');

-- Semesters (1-2)
INSERT INTO semester (semester_id, academic_year_id, term, start_date, end_date) VALUES
  (1, 1, 'ODD',  '2026-06-15', '2026-11-30'),
  (2, 1, 'EVEN', '2026-12-15', '2027-05-15');

-- Students (1-12)
INSERT INTO student (student_id, enrollment_no, first_name, last_name, email, program_id) VALUES
  (1,  'EN2026001', 'Test', 'Student01', 'student01@example.edu', 3),
  (2,  'EN2026002', 'Test', 'Student02', 'student02@example.edu', 1),
  (3,  'EN2026003', 'Test', 'Student03', 'student03@example.edu', 2),
  (4,  'EN2026004', 'Test', 'Student04', 'student04@example.edu', 4),
  (5,  'EN2026005', 'Test', 'Student05', 'student05@example.edu', 1),
  (6,  'EN2026006', 'Test', 'Student06', 'student06@example.edu', 2),
  (7,  'EN2026007', 'Test', 'Student07', 'student07@example.edu', 3),
  (8,  'EN2026008', 'Test', 'Student08', 'student08@example.edu', 4),
  (9,  'EN2026009', 'Test', 'Student09', 'student09@example.edu', 1),
  (10, 'EN2026010', 'Test', 'Student10', 'student10@example.edu', 2),
  (11, 'EN2026011', 'Test', 'Student11', 'student11@example.edu', 3),
  (12, 'EN2026012', 'Test', 'Student12', 'student12@example.edu', 4);

-- Faculty (1-8)
INSERT INTO faculty (faculty_id, employee_code, first_name, last_name, email, department_id) VALUES
  (1, 'EMP001', 'Test', 'Faculty01', 'faculty01@example.edu', 1),
  (2, 'EMP002', 'Test', 'Faculty02', 'faculty02@example.edu', 2),
  (3, 'EMP003', 'Test', 'Faculty03', 'faculty03@example.edu', 3),
  (4, 'EMP004', 'Test', 'Faculty04', 'faculty04@example.edu', 4),
  (5, 'EMP005', 'Test', 'Faculty05', 'faculty05@example.edu', 1),
  (6, 'EMP006', 'Test', 'Faculty06', 'faculty06@example.edu', 2),
  (7, 'EMP007', 'Test', 'Faculty07', 'faculty07@example.edu', 3),
  (8, 'EMP008', 'Test', 'Faculty08', 'faculty08@example.edu', 4);
