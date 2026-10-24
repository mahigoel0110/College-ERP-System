-- 01_auth: Stored Procedures
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_register_user$$
CREATE PROCEDURE sp_register_user(
  IN p_username      VARCHAR(50),
  IN p_email         VARCHAR(120),
  IN p_password_hash VARCHAR(255),
  IN p_role_name     VARCHAR(20),
  IN p_student_id    INT UNSIGNED,
  IN p_faculty_id    INT UNSIGNED
)
BEGIN
  DECLARE v_role_id INT UNSIGNED;
  DECLARE v_user_id INT UNSIGNED;

  -- Validate role
  SELECT role_id INTO v_role_id FROM role WHERE role_name = p_role_name;
  IF v_role_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown role specified';
  END IF;

  -- Validate username uniqueness
  IF EXISTS (SELECT 1 FROM app_user WHERE username = p_username) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Username already exists';
  END IF;

  -- Validate email uniqueness
  IF EXISTS (SELECT 1 FROM app_user WHERE email = p_email) THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Email already exists';
  END IF;

  INSERT INTO app_user (username, email, password_hash, role_id, student_id, faculty_id)
  VALUES (p_username, p_email, p_password_hash, v_role_id, p_student_id, p_faculty_id);

  SET v_user_id = LAST_INSERT_ID();
  SELECT v_user_id AS user_id;
END$$

DROP PROCEDURE IF EXISTS sp_record_login_attempt$$
CREATE PROCEDURE sp_record_login_attempt(
  IN p_username VARCHAR(50),
  IN p_success  TINYINT(1),
  IN p_ip       VARCHAR(45)
)
BEGIN
  DECLARE v_user_id INT UNSIGNED DEFAULT NULL;

  SELECT user_id INTO v_user_id FROM app_user WHERE username = p_username;

  -- Always log the attempt (user_id may be NULL if username not found)
  INSERT INTO login_audit (user_id, username_attempted, success, ip_address)
  VALUES (v_user_id, p_username, p_success, p_ip);

  IF v_user_id IS NOT NULL THEN
    IF p_success = 1 THEN
      UPDATE app_user
      SET failed_attempts = 0,
          locked_until    = NULL,
          last_login_at   = NOW()
      WHERE user_id = v_user_id;
    ELSE
      UPDATE app_user
      SET failed_attempts = failed_attempts + 1,
          locked_until = CASE
            WHEN locked_until > NOW() THEN locked_until
            WHEN failed_attempts + 1 >= 5 THEN DATE_ADD(NOW(), INTERVAL 15 MINUTE)
            ELSE locked_until
          END
      WHERE user_id = v_user_id;
    END IF;
  END IF;
END$$

DROP PROCEDURE IF EXISTS sp_change_user_role$$
CREATE PROCEDURE sp_change_user_role(
  IN p_user_id       INT UNSIGNED,
  IN p_new_role_name VARCHAR(20)
)
BEGIN
  DECLARE v_new_role_id INT UNSIGNED;
  DECLARE v_old_role_id INT UNSIGNED;

  SELECT role_id INTO v_new_role_id FROM role WHERE role_name = p_new_role_name;
  IF v_new_role_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Unknown role specified';
  END IF;

  SELECT role_id INTO v_old_role_id FROM app_user WHERE user_id = p_user_id;
  IF v_old_role_id IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User not found';
  END IF;

  IF v_old_role_id = v_new_role_id THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'User already has this role';
  END IF;

  UPDATE app_user SET role_id = v_new_role_id WHERE user_id = p_user_id;
  -- role_change_audit is logged by the after update trigger
END$$

DELIMITER ;
