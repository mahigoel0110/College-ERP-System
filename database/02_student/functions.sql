-- 02_student: Functions
DELIMITER $$

DROP FUNCTION IF EXISTS fn_generate_enrollment_no$$
CREATE FUNCTION fn_generate_enrollment_no(p_program_id INT UNSIGNED, p_admission_year SMALLINT)
RETURNS VARCHAR(20)
READS SQL DATA
BEGIN
  DECLARE v_prefix VARCHAR(20);
  DECLARE v_seq INT;
  DECLARE v_program_code VARCHAR(20);

  SELECT program_code INTO v_program_code FROM program WHERE program_id = p_program_id;
  SET v_prefix = CONCAT(v_program_code, '-', p_admission_year, '-');

  SELECT COUNT(*) + 1 INTO v_seq
  FROM student
  WHERE enrollment_no LIKE CONCAT(v_prefix, '%');

  RETURN CONCAT(v_prefix, LPAD(v_seq, 4, '0'));
END$$

DROP FUNCTION IF EXISTS fn_attendance_percentage$$
CREATE FUNCTION fn_attendance_percentage(p_enrollment_id INT UNSIGNED)
RETURNS DECIMAL(5,2)
READS SQL DATA
BEGIN
  DECLARE v_total INT;
  DECLARE v_present INT;

  SELECT COUNT(*) INTO v_total FROM attendance WHERE enrollment_id = p_enrollment_id;
  IF v_total = 0 THEN
    RETURN 100.00;
  END IF;

  SELECT COUNT(*) INTO v_present
  FROM attendance
  WHERE enrollment_id = p_enrollment_id AND status = 'PRESENT';

  RETURN ROUND(v_present * 100.0 / v_total, 2);
END$$

DROP FUNCTION IF EXISTS fn_year_of_study$$
CREATE FUNCTION fn_year_of_study(p_student_id INT UNSIGNED)
RETURNS TINYINT
READS SQL DATA
BEGIN
  DECLARE v_admission_year SMALLINT;
  DECLARE v_duration TINYINT;

  SELECT sp.admission_year, p.duration_years
  INTO v_admission_year, v_duration
  FROM student_profile sp
  JOIN student s ON sp.student_id = s.student_id
  JOIN program p ON s.program_id = p.program_id
  WHERE sp.student_id = p_student_id;

  IF v_admission_year IS NULL THEN
    RETURN 1;
  END IF;

  RETURN LEAST(YEAR(CURDATE()) - v_admission_year + 1, v_duration);
END$$

DELIMITER ;
