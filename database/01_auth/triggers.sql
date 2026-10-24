-- 01_auth: Triggers
DELIMITER $$

DROP TRIGGER IF EXISTS trg_app_user_before_insert_link$$
CREATE TRIGGER trg_app_user_before_insert_link
BEFORE INSERT ON app_user
FOR EACH ROW
BEGIN
  DECLARE v_role_name VARCHAR(20);
  SELECT role_name INTO v_role_name FROM role WHERE role_id = NEW.role_id;

  IF v_role_name = 'STUDENT' THEN
    IF NEW.student_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT role requires a student_id';
    END IF;
    IF NEW.faculty_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT role must not have a faculty_id';
    END IF;
  ELSEIF v_role_name = 'FACULTY' THEN
    IF NEW.faculty_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FACULTY role requires a faculty_id';
    END IF;
    IF NEW.student_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FACULTY role must not have a student_id';
    END IF;
  ELSEIF v_role_name = 'ADMIN' THEN
    IF NEW.student_id IS NOT NULL OR NEW.faculty_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ADMIN role must not have student_id or faculty_id';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_app_user_before_update_link$$
CREATE TRIGGER trg_app_user_before_update_link
BEFORE UPDATE ON app_user
FOR EACH ROW
BEGIN
  DECLARE v_role_name VARCHAR(20);
  SELECT role_name INTO v_role_name FROM role WHERE role_id = NEW.role_id;

  IF v_role_name = 'STUDENT' THEN
    IF NEW.student_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT role requires a student_id';
    END IF;
    IF NEW.faculty_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'STUDENT role must not have a faculty_id';
    END IF;
  ELSEIF v_role_name = 'FACULTY' THEN
    IF NEW.faculty_id IS NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FACULTY role requires a faculty_id';
    END IF;
    IF NEW.student_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'FACULTY role must not have a student_id';
    END IF;
  ELSEIF v_role_name = 'ADMIN' THEN
    IF NEW.student_id IS NOT NULL OR NEW.faculty_id IS NOT NULL THEN
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'ADMIN role must not have student_id or faculty_id';
    END IF;
  END IF;
END$$

DROP TRIGGER IF EXISTS trg_app_user_after_update_role$$
CREATE TRIGGER trg_app_user_after_update_role
AFTER UPDATE ON app_user
FOR EACH ROW
BEGIN
  IF OLD.role_id <> NEW.role_id THEN
    INSERT INTO role_change_audit (user_id, old_role_id, new_role_id)
    VALUES (NEW.user_id, OLD.role_id, NEW.role_id);
  END IF;
END$$

DELIMITER ;
