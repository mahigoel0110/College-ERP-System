-- 01_auth: Functions
DELIMITER $$

DROP FUNCTION IF EXISTS fn_is_account_locked$$
CREATE FUNCTION fn_is_account_locked(p_user_id INT UNSIGNED)
RETURNS TINYINT(1)
READS SQL DATA
BEGIN
  DECLARE v_locked_until DATETIME;
  SELECT locked_until INTO v_locked_until FROM app_user WHERE user_id = p_user_id;
  IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
    RETURN 1;
  END IF;
  RETURN 0;
END$$

DROP FUNCTION IF EXISTS fn_role_name$$
CREATE FUNCTION fn_role_name(p_user_id INT UNSIGNED)
RETURNS VARCHAR(20)
READS SQL DATA
BEGIN
  DECLARE v_role_name VARCHAR(20);
  SELECT r.role_name INTO v_role_name
  FROM app_user u JOIN role r ON u.role_id = r.role_id
  WHERE u.user_id = p_user_id;
  RETURN v_role_name;
END$$

DELIMITER ;
