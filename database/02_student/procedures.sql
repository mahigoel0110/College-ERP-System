-- 02_student: Stored Procedures
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_admit_student$$
CREATE PROCEDURE sp_admit_student(
  IN p_first_name      VARCHAR(50),
  IN p_last_name       VARCHAR(50),
  IN p_email           VARCHAR(120),
  IN p_program_id      INT UNSIGNED,
  IN p_dob             DATE,
  IN p_phone           VARCHAR(15),
  IN p_address         VARCHAR(255),
  IN p_guardian_name   VARCHAR(100),
  IN p_guardian_relation VARCHAR(10),
  IN p_guardian_phone  VARCHAR(15),
  IN p_admission_type  VARCHAR(20),
  IN p_merit_score     DECIMAL(5,2)
)
BEGIN
  DECLARE v_student_id INT UNSIGNED;
  DECLARE v_enrollment_no VARCHAR(20);
  DECLARE v_year SMALLINT;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  -- Validate program exists
  IF NOT EXISTS (SELECT 1 FROM program WHERE program_id = p_program_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown program specified';
  END IF;

  -- Validate duplicate email
  IF EXISTS (SELECT 1 FROM student WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student email already exists';
  END IF;

  SET v_year = YEAR(CURDATE());
  SET v_enrollment_no = fn_generate_enrollment_no(p_program_id, v_year);

  START TRANSACTION;
  INSERT INTO student (enrollment_no, first_name, last_name, email, program_id)
  VALUES (v_enrollment_no, p_first_name, p_last_name, p_email, p_program_id);
  SET v_student_id = LAST_INSERT_ID();

  INSERT INTO student_profile (student_id, date_of_birth, phone, address, admission_year)
  VALUES (v_student_id, p_dob, p_phone, p_address, v_year);

  INSERT INTO guardian (student_id, name, relation, phone)
  VALUES (v_student_id, p_guardian_name, p_guardian_relation, p_guardian_phone);

  INSERT INTO admission (student_id, admission_date, admission_type, merit_score)
  VALUES (v_student_id, CURDATE(), p_admission_type, p_merit_score);

  COMMIT;

  SELECT v_student_id AS student_id, v_enrollment_no AS enrollment_no;
END$$

DROP PROCEDURE IF EXISTS sp_enroll_student$$
CREATE PROCEDURE sp_enroll_student(
  IN p_student_id  INT UNSIGNED,
  IN p_offering_id INT UNSIGNED
)
BEGIN
  DECLARE v_existing_id INT UNSIGNED DEFAULT NULL;
  DECLARE v_existing_status VARCHAR(10) DEFAULT NULL;

  -- Check for existing enrollment (including DROPPED)
  SELECT enrollment_id, status INTO v_existing_id, v_existing_status
  FROM enrollment
  WHERE student_id = p_student_id AND offering_id = p_offering_id;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_status = 'ENROLLED' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Student is already enrolled in this offering';
    ELSE
      -- Re-activate a DROPPED enrollment
      UPDATE enrollment SET status = 'ENROLLED', enrolled_on = CURDATE() WHERE enrollment_id = v_existing_id;
      SELECT v_existing_id AS enrollment_id;
    END IF;
  ELSE
    INSERT INTO enrollment (student_id, offering_id, enrolled_on)
    VALUES (p_student_id, p_offering_id, CURDATE());
    SELECT LAST_INSERT_ID() AS enrollment_id;
  END IF;
END$$

DROP PROCEDURE IF EXISTS sp_drop_enrollment$$
CREATE PROCEDURE sp_drop_enrollment(
  IN p_enrollment_id INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = p_enrollment_id AND status = 'ENROLLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Enrollment not found or already dropped';
  END IF;

  UPDATE enrollment SET status = 'DROPPED' WHERE enrollment_id = p_enrollment_id;
  SELECT p_enrollment_id AS enrollment_id, 'DROPPED' AS status;
END$$

DROP PROCEDURE IF EXISTS sp_mark_attendance$$
CREATE PROCEDURE sp_mark_attendance(
  IN p_enrollment_id INT UNSIGNED,
  IN p_class_date    DATE,
  IN p_status        VARCHAR(10)
)
BEGIN
  -- Check enrollment is active
  IF NOT EXISTS (SELECT 1 FROM enrollment WHERE enrollment_id = p_enrollment_id AND status = 'ENROLLED') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot mark attendance for a dropped enrollment';
  END IF;

  -- Upsert attendance
  INSERT INTO attendance (enrollment_id, class_date, status)
  VALUES (p_enrollment_id, p_class_date, p_status)
  ON DUPLICATE KEY UPDATE status = VALUES(status);
END$$

DELIMITER ;
