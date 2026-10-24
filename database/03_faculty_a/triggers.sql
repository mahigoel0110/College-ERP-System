-- 03_faculty_a: Triggers
DELIMITER $$

DROP TRIGGER IF EXISTS trg_faculty_profile_after_update$$
CREATE TRIGGER trg_faculty_profile_after_update
AFTER UPDATE ON faculty_profile
FOR EACH ROW
BEGIN
  IF OLD.designation_id <> NEW.designation_id THEN
    INSERT INTO faculty_designation_history (faculty_id, old_designation_id, new_designation_id, changed_on)
    VALUES (NEW.faculty_id, OLD.designation_id, NEW.designation_id, CURDATE());
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_course_allocation_before_insert$$
CREATE TRIGGER trg_course_allocation_before_insert
BEFORE INSERT ON course_allocation
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE v_current INT UNSIGNED DEFAULT 0;

  SELECT status INTO v_status FROM faculty WHERE faculty_id = NEW.faculty_id;
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only ACTIVE faculty can be allocated courses';
  END IF;

  SELECT COALESCE(SUM(hours_per_week), 0) INTO v_current
  FROM course_allocation
  WHERE faculty_id = NEW.faculty_id;

  IF v_current + NEW.hours_per_week > 16 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weekly workload cannot exceed 16 hours';
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_course_allocation_before_update$$
CREATE TRIGGER trg_course_allocation_before_update
BEFORE UPDATE ON course_allocation
FOR EACH ROW
BEGIN
  DECLARE v_status VARCHAR(10);
  DECLARE v_current INT UNSIGNED DEFAULT 0;

  SELECT status INTO v_status FROM faculty WHERE faculty_id = NEW.faculty_id;
  IF v_status <> 'ACTIVE' THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only ACTIVE faculty can be allocated courses';
  END IF;

  SELECT COALESCE(SUM(hours_per_week), 0) INTO v_current
  FROM course_allocation
  WHERE faculty_id = NEW.faculty_id AND allocation_id <> OLD.allocation_id;

  IF v_current + NEW.hours_per_week > 16 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Weekly workload cannot exceed 16 hours';
  END IF;
END$$

DELIMITER ;
