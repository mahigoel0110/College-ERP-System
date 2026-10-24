-- 01_auth: Seed data
-- Roles
INSERT INTO role (role_id, role_name) VALUES
  (1, 'ADMIN'),
  (2, 'FACULTY'),
  (3, 'STUDENT');

-- All user passwords are bcrypt hash of 'Password@123' (cost 10)
-- Hash generated and verified with bcryptjs.
SET @pw_hash = '$2a$10$3hdlcfEE2hhoBs0UqJRKmeqOZYEFStKzKAYXL4QasJKo1yfSprsgC';

-- Admin user (no student/faculty link)
INSERT INTO app_user (user_id, username, email, password_hash, role_id, student_id, faculty_id) VALUES
  (1, 'admin', 'admin@example.edu', @pw_hash, 1, NULL, NULL);

-- Student users (linked to students 1-3)
INSERT INTO app_user (user_id, username, email, password_hash, role_id, student_id, faculty_id) VALUES
  (2, 'student01', 'user.student01@example.edu', @pw_hash, 3, 1, NULL),
  (3, 'student02', 'user.student02@example.edu', @pw_hash, 3, 2, NULL),
  (4, 'student03', 'user.student03@example.edu', @pw_hash, 3, 3, NULL);

-- Faculty users (linked to faculty 1-3)
INSERT INTO app_user (user_id, username, email, password_hash, role_id, student_id, faculty_id) VALUES
  (5, 'faculty01', 'user.faculty01@example.edu', @pw_hash, 2, NULL, 1),
  (6, 'faculty02', 'user.faculty02@example.edu', @pw_hash, 2, NULL, 2),
  (7, 'faculty03', 'user.faculty03@example.edu', @pw_hash, 2, NULL, 3);

-- Sample login audit rows via procedure calls
CALL sp_record_login_attempt('admin', 1, '192.168.1.10');
CALL sp_record_login_attempt('student01', 1, '192.168.1.11');
CALL sp_record_login_attempt('student01', 0, '192.168.1.20');
CALL sp_record_login_attempt('unknown_user', 0, '10.0.0.5');
CALL sp_record_login_attempt('faculty01', 1, '192.168.1.12');
