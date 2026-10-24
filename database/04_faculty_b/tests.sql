DROP PROCEDURE IF EXISTS sp_test_faculty_b_expected_error;
DELIMITER $$
CREATE PROCEDURE sp_test_faculty_b_expected_error(IN p_case INT)
BEGIN
  DECLARE v_state CHAR(5) DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION GET DIAGNOSTICS CONDITION 1 v_state=RETURNED_SQLSTATE;
  IF p_case=1 THEN CALL sp_approve_leave(1,1); ELSE CALL sp_generate_payroll(1,'2026-10-01','2026-10-31',0); END IF;
  SELECT IF(BINARY v_state=BINARY IF(p_case=1,'45000','23000'),'PASS','FAIL') result,IF(p_case=1,'04_faculty_b duplicate leave approval rejected','04_faculty_b duplicate payroll rejected') test;
END$$
DELIMITER ;

SELECT IF(fn_leave_balance(1,1,2026)=20,'PASS','FAIL') result,'04_faculty_b initial leave balance' test;
CALL sp_approve_leave(1,1);
SELECT IF((SELECT days_remaining FROM leave_balance WHERE faculty_id=1 AND leave_type_id=1 AND balance_year=2026)=18,'PASS','FAIL') result,'04_faculty_b approval deducts leave once' test;
CALL sp_test_faculty_b_expected_error(1);
SELECT IF((SELECT days_remaining FROM leave_balance WHERE faculty_id=1 AND leave_type_id=1 AND balance_year=2026)=18,'PASS','FAIL') result,'04_faculty_b rejected reapproval preserves balance' test;
CALL sp_generate_payroll(1,'2026-10-01','2026-10-31',0);
SELECT IF((SELECT COUNT(*) FROM payroll WHERE faculty_id=1 AND period_start='2026-10-01' AND period_end='2026-10-31' AND basic_pay=51000 AND gross_pay=61200 AND net_pay=54880)=1,'PASS','FAIL') result,'04_faculty_b payroll calculation' test;
CALL sp_test_faculty_b_expected_error(2);
UPDATE salary_structure SET basic_pay=basic_pay+100 WHERE faculty_id=1 AND effective_from='2026-01-01';
SELECT IF((SELECT COUNT(*) FROM salary_change_log l JOIN salary_structure s ON s.salary_structure_id=l.salary_structure_id WHERE s.faculty_id=1)=1,'PASS','FAIL') result,'04_faculty_b salary audit trigger' test;
UPDATE salary_structure SET basic_pay=basic_pay-100 WHERE faculty_id=1 AND effective_from='2026-01-01';
SELECT IF((SELECT COUNT(*) FROM vw_payroll_summary WHERE faculty_id=1)>=1,'PASS','FAIL') result,'04_faculty_b payroll summary view' test;
DROP PROCEDURE sp_test_faculty_b_expected_error;
