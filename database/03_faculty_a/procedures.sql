-- 03_faculty_a: Stored Procedures
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_register_faculty$$
CREATE PROCEDURE sp_register_faculty(
  IN p_employee_code   VARCHAR(20),
  IN p_first_name      VARCHAR(50),
  IN p_last_name       VARCHAR(50),
  IN p_email           VARCHAR(120),
  IN p_department_id   INT UNSIGNED,
  IN p_designation_id  INT UNSIGNED,
  IN p_joining_date    DATE,
  IN p_phone           VARCHAR(15),
  IN p_specialization  VARCHAR(120)
)
BEGIN
  DECLARE v_faculty_id INT UNSIGNED;
  DECLARE EXIT HANDLER FOR SQLEXCEPTION BEGIN ROLLBACK; RESIGNAL; END;

  IF NOT EXISTS (SELECT 1 FROM department WHERE department_id = p_department_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown department specified';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM designation WHERE designation_id = p_designation_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown designation specified';
  END IF;

  IF EXISTS (SELECT 1 FROM faculty WHERE employee_code = p_employee_code) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Employee code already exists';
  END IF;

  IF EXISTS (SELECT 1 FROM faculty WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Faculty email already exists';
  END IF;

  START TRANSACTION;

  INSERT INTO faculty (employee_code, first_name, last_name, email, department_id)
  VALUES (p_employee_code, p_first_name, p_last_name, p_email, p_department_id);

  SET v_faculty_id = LAST_INSERT_ID();

  INSERT INTO faculty_profile (faculty_id, designation_id, date_of_joining, phone, office_room, specialization)
  VALUES (v_faculty_id, p_designation_id, p_joining_date, p_phone, NULL, p_specialization);

  COMMIT;

  SELECT v_faculty_id AS faculty_id;
END$$

DROP PROCEDURE IF EXISTS sp_change_designation$$
CREATE PROCEDURE sp_change_designation(
  IN p_faculty_id     INT UNSIGNED,
  IN p_designation_id INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM faculty_profile WHERE faculty_id = p_faculty_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Faculty profile not found';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM designation WHERE designation_id = p_designation_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown designation specified';
  END IF;

  UPDATE faculty_profile
  SET designation_id = p_designation_id
  WHERE faculty_id = p_faculty_id;

  SELECT p_faculty_id AS faculty_id, p_designation_id AS designation_id;
END$$

DROP PROCEDURE IF EXISTS sp_allocate_course$$
CREATE PROCEDURE sp_allocate_course(
  IN p_faculty_id   INT UNSIGNED,
  IN p_offering_id  INT UNSIGNED,
  IN p_hours        TINYINT UNSIGNED
)
BEGIN
  DECLARE v_allocation_id INT UNSIGNED;

  IF NOT EXISTS (SELECT 1 FROM faculty WHERE faculty_id = p_faculty_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown faculty specified';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM course_offering WHERE offering_id = p_offering_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown course offering specified';
  END IF;

  IF EXISTS (SELECT 1 FROM course_allocation WHERE faculty_id = p_faculty_id AND offering_id = p_offering_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Faculty is already allocated to this offering';
  END IF;

  INSERT INTO course_allocation (faculty_id, offering_id, hours_per_week)
  VALUES (p_faculty_id, p_offering_id, p_hours);

  SET v_allocation_id = LAST_INSERT_ID();
  SELECT v_allocation_id AS allocation_id;
END$$

DROP PROCEDURE IF EXISTS sp_deallocate_course$$
CREATE PROCEDURE sp_deallocate_course(
  IN p_allocation_id INT UNSIGNED
)
BEGIN
  IF NOT EXISTS (SELECT 1 FROM course_allocation WHERE allocation_id = p_allocation_id) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course allocation not found';
  END IF;

  DELETE FROM course_allocation WHERE allocation_id = p_allocation_id;
  SELECT p_allocation_id AS allocation_id, 'DEALLOCATED' AS status;
END$$

DELIMITER ;
