-- 02_student: Analytical Queries

-- Q1: Enrollment count per offering (GROUP BY / HAVING)
SELECT c.course_code, c.course_name, co.offering_id,
       COUNT(e.enrollment_id) AS enrolled_count
FROM course_offering co
JOIN course c ON co.course_id = c.course_id
LEFT JOIN enrollment e ON co.offering_id = e.offering_id AND e.status = 'ENROLLED'
GROUP BY c.course_code, c.course_name, co.offering_id
HAVING COUNT(e.enrollment_id) >= 1
ORDER BY enrolled_count DESC;

-- Q2: Batch-wise (program-wise) strength
SELECT p.program_code, p.program_name,
       COUNT(s.student_id) AS strength
FROM program p
LEFT JOIN student s ON p.program_id = s.program_id AND s.status = 'ACTIVE'
GROUP BY p.program_code, p.program_name
ORDER BY strength DESC;

-- Q3: Students below 75% attendance in any course (subquery)
SELECT DISTINCT s.student_id, s.enrollment_no,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name
FROM student s
WHERE s.student_id IN (
  SELECT e.student_id
  FROM enrollment e
  WHERE e.status = 'ENROLLED'
    AND fn_attendance_percentage(e.enrollment_id) < 75.00
)
ORDER BY s.enrollment_no;

-- Q4: RANK of students by attendance within a course (window function)
SELECT c.course_code,
       CONCAT(s.first_name, ' ', s.last_name) AS student_name,
       fn_attendance_percentage(e.enrollment_id) AS attendance_pct,
       RANK() OVER (PARTITION BY co.course_id ORDER BY fn_attendance_percentage(e.enrollment_id) DESC) AS att_rank
FROM enrollment e
JOIN student s ON e.student_id = s.student_id
JOIN course_offering co ON e.offering_id = co.offering_id
JOIN course c ON co.course_id = c.course_id
WHERE e.status = 'ENROLLED'
ORDER BY c.course_code, att_rank;
