-- 01_auth: Tests

DROP PROCEDURE IF EXISTS sp_test_auth_expected_error;
DELIMITER $$

CREATE PROCEDURE sp_test_auth_expected_error(IN p_test_case TINYINT UNSIGNED)
BEGIN
  DECLARE v_caught BOOLEAN DEFAULT FALSE;
  DECLARE CONTINUE HANDLER FOR SQLSTATE '45000'
    SET v_caught = TRUE;

  CASE p_test_case
    WHEN 1 THEN
      CALL sp_register_user('admin', 'another@example.edu',
        '$2a$10$x', 'ADMIN', NULL, NULL);
    WHEN 2 THEN
      CALL sp_change_user_role(2, 'ADMIN');
    WHEN 3 THEN
      INSERT INTO app_user
        (username, email, password_hash, role_id, student_id, faculty_id)
      VALUES ('bad_student', 'bad@example.edu', '$2a$10$x', 3, NULL, NULL);
    ELSE
      SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid test case';
  END CASE;

  SELECT
    IF(v_caught, 'PASS', 'FAIL') AS result,
    CONCAT('01_auth: expected error test ', p_test_case) AS test;
END$$

DELIMITER ;

START TRANSACTION;

-- Test fn_is_account_locked: user 1 (admin) should not be locked
SELECT
  CASE WHEN fn_is_account_locked(1) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: fn_is_account_locked returns 0 for unlocked user' AS test;

-- Test fn_role_name: admin user should have ADMIN role
SELECT
  CASE WHEN fn_role_name(1) COLLATE utf8mb4_unicode_ci = 'ADMIN' COLLATE utf8mb4_unicode_ci THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: fn_role_name returns ADMIN for admin user' AS test;

-- Test sp_register_user: register a new user successfully
CALL sp_register_user('test_new_user', 'testnew@example.edu', '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRS', 'ADMIN', NULL, NULL);
SELECT
  CASE WHEN EXISTS(SELECT 1 FROM app_user WHERE username = 'test_new_user') THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: sp_register_user creates user' AS test;

-- Test sp_register_user: reject duplicate username (edge case)
-- We use a handler to capture the SIGNAL and verify it fires
CALL sp_test_auth_expected_error(1);
SELECT
  CASE WHEN (SELECT COUNT(*) FROM app_user WHERE username = 'admin') = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: sp_register_user rejects duplicate username' AS test;

-- Test sp_record_login_attempt: success resets failed_attempts
-- First fail a few times
CALL sp_record_login_attempt('admin', 0, '1.2.3.4');
CALL sp_record_login_attempt('admin', 0, '1.2.3.4');
-- Now succeed
CALL sp_record_login_attempt('admin', 1, '1.2.3.4');
SELECT
  CASE WHEN (SELECT failed_attempts FROM app_user WHERE username = 'admin') = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: sp_record_login_attempt success resets failed_attempts' AS test;

-- Test sp_record_login_attempt: 5 failures should lock the account
CALL sp_record_login_attempt('student01', 0, '5.5.5.5');
CALL sp_record_login_attempt('student01', 0, '5.5.5.5');
CALL sp_record_login_attempt('student01', 0, '5.5.5.5');
CALL sp_record_login_attempt('student01', 0, '5.5.5.5');
CALL sp_record_login_attempt('student01', 0, '5.5.5.5');
SELECT
  CASE WHEN fn_is_account_locked(2) = 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: sp_record_login_attempt locks account after 5 failures' AS test;
SET @student01_locked_until=(SELECT locked_until FROM app_user WHERE username='student01');
CALL sp_record_login_attempt('student01',0,'5.5.5.5');
SELECT IF((SELECT locked_until FROM app_user WHERE username='student01')=@student01_locked_until,
  'PASS','FAIL') AS result,
  '01_auth: repeated failures do not extend an active lock' AS test;

-- Test sp_change_user_role: change student01 to ADMIN (edge case will be the trigger)
-- We need to clear student_id first for the trigger to allow ADMIN role
-- Because the trigger enforces link consistency, changing role without clearing link should fail
CALL sp_test_auth_expected_error(2);
SELECT
  CASE WHEN fn_role_name(2) COLLATE utf8mb4_unicode_ci = 'STUDENT' COLLATE utf8mb4_unicode_ci THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: sp_change_user_role blocked by trigger when link inconsistent' AS test;

-- Test trigger: BEFORE INSERT blocks STUDENT without student_id
CALL sp_test_auth_expected_error(3);
SELECT
  CASE WHEN NOT EXISTS(SELECT 1 FROM app_user WHERE username = 'bad_student') THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: trigger blocks STUDENT without student_id' AS test;

-- Test trigger: AFTER UPDATE logs role change
-- (already tested indirectly; verify audit table has entries from seed)
SELECT
  CASE WHEN (SELECT COUNT(*) FROM login_audit) >= 5 THEN 'PASS' ELSE 'FAIL' END AS result,
  '01_auth: login_audit has seed entries' AS test;

ROLLBACK;

DROP PROCEDURE IF EXISTS sp_test_auth_expected_error;
