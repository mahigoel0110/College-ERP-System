-- 02_student: Triggers
DELIMITER $$

DROP TRIGGER IF EXISTS trg_enrollment_before_insert$$
CREATE TRIGGER trg_enrollment_before_insert
BEFORE INSERT ON enrollment
FOR EACH ROW
BEGIN
  DECLARE v_student_status VARCHAR(10);
  DECLARE v_cap SMALLINT;
  DECLARE v_enrolled INT;

  -- Student must be ACTIVE
  SELECT status INTO v_student_status FROM student WHERE student_id = NEW.student_id;
  IF v_student_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only ACTIVE students can enroll';
  END IF;

  -- Capacity check
  SELECT capacity INTO v_cap FROM course_offering WHERE offering_id = NEW.offering_id;
  SELECT COUNT(*) INTO v_enrolled
  FROM enrollment
  WHERE offering_id = NEW.offering_id AND status = 'ENROLLED';

  IF v_enrolled >= v_cap THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course offering capacity is full';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_enrollment_before_update$$
CREATE TRIGGER trg_enrollment_before_update
BEFORE UPDATE ON enrollment
FOR EACH ROW
BEGIN
  DECLARE v_student_status VARCHAR(10);
  DECLARE v_cap SMALLINT;
  DECLARE v_enrolled INT;

  -- If re-enrolling (DROPPED -> ENROLLED), check student status and capacity
  IF OLD.status = 'DROPPED' AND NEW.status = 'ENROLLED' THEN
    SELECT status INTO v_student_status FROM student WHERE student_id = NEW.student_id;
    IF v_student_status <> 'ACTIVE' THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only ACTIVE students can enroll';
    END IF;

    SELECT capacity INTO v_cap FROM course_offering WHERE offering_id = NEW.offering_id;
    SELECT COUNT(*) INTO v_enrolled
    FROM enrollment
    WHERE offering_id = NEW.offering_id AND status = 'ENROLLED';

    IF v_enrolled >= v_cap THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Course offering capacity is full';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_attendance_before_insert$$
CREATE TRIGGER trg_attendance_before_insert
BEFORE INSERT ON attendance
FOR EACH ROW
BEGIN
  DECLARE v_sem_start DATE;
  DECLARE v_sem_end DATE;

  -- class_date must not be in the future
  IF NEW.class_date > CURDATE() THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cannot mark attendance for a future date';
  END IF;

  -- class_date must be within the offering's semester dates
  SELECT s.start_date, s.end_date INTO v_sem_start, v_sem_end
  FROM enrollment e
  JOIN course_offering co ON e.offering_id = co.offering_id
  JOIN semester s ON co.semester_id = s.semester_id
  WHERE e.enrollment_id = NEW.enrollment_id;

  IF NEW.class_date < v_sem_start OR NEW.class_date > v_sem_end THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Class date is outside the semester period';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_student_profile_after_update$$
CREATE TRIGGER trg_student_profile_after_update
AFTER UPDATE ON student_profile
FOR EACH ROW
BEGIN
  IF OLD.phone <> NEW.phone THEN
    INSERT INTO student_profile_audit (student_id, field_name, old_value, new_value)
    VALUES (NEW.student_id, 'phone', OLD.phone, NEW.phone);
  END IF;
  IF OLD.address <> NEW.address THEN
    INSERT INTO student_profile_audit (student_id, field_name, old_value, new_value)
    VALUES (NEW.student_id, 'address', OLD.address, NEW.address);
  END IF;
  IF OLD.date_of_birth <> NEW.date_of_birth THEN
    INSERT INTO student_profile_audit (student_id, field_name, old_value, new_value)
    VALUES (NEW.student_id, 'date_of_birth', CAST(OLD.date_of_birth AS CHAR), CAST(NEW.date_of_birth AS CHAR));
  END IF;
END$$

DELIMITER ;
