-- 02_student: Views
CREATE OR REPLACE VIEW vw_enrollment_summary AS
SELECT
  co.offering_id,
  c.course_code,
  c.course_name,
  c.credits,
  s.term,
  d.department_name,
  co.capacity,
  COUNT(CASE WHEN e.status = 'ENROLLED' THEN 1 END) AS enrolled_count,
  co.capacity - COUNT(CASE WHEN e.status = 'ENROLLED' THEN 1 END) AS remaining_seats
FROM course_offering co
JOIN course c ON co.course_id = c.course_id
JOIN semester s ON co.semester_id = s.semester_id
JOIN department d ON c.department_id = d.department_id
LEFT JOIN enrollment e ON co.offering_id = e.offering_id
GROUP BY co.offering_id, c.course_code, c.course_name, c.credits, s.term, d.department_name, co.capacity;

CREATE OR REPLACE VIEW vw_low_attendance AS
SELECT
  st.student_id,
  st.enrollment_no,
  CONCAT(st.first_name, ' ', st.last_name) AS student_name,
  c.course_code,
  c.course_name,
  e.enrollment_id,
  fn_attendance_percentage(e.enrollment_id) AS attendance_pct
FROM enrollment e
JOIN student st ON e.student_id = st.student_id
JOIN course_offering co ON e.offering_id = co.offering_id
JOIN course c ON co.course_id = c.course_id
WHERE e.status = 'ENROLLED'
  AND fn_attendance_percentage(e.enrollment_id) < 75.00;

CREATE OR REPLACE VIEW vw_course_seat_status AS
SELECT
  co.offering_id,
  c.course_id,
  c.course_code,
  c.course_name,
  c.credits,
  c.semester_no,
  sem.semester_id,
  sem.term,
  d.department_name,
  co.capacity,
  COUNT(CASE WHEN e.status = 'ENROLLED' THEN 1 END) AS enrolled,
  co.capacity - COUNT(CASE WHEN e.status = 'ENROLLED' THEN 1 END) AS remaining
FROM course_offering co
JOIN course c ON co.course_id = c.course_id
JOIN semester sem ON co.semester_id = sem.semester_id
JOIN department d ON c.department_id = d.department_id
LEFT JOIN enrollment e ON co.offering_id = e.offering_id
GROUP BY co.offering_id, c.course_id, c.course_code, c.course_name, c.credits, c.semester_no,
         sem.semester_id, sem.term, d.department_name, co.capacity;
