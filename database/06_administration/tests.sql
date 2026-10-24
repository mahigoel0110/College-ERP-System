SELECT IF(fn_late_fee(1000,2,'2026-07-01','2026-07-02')=20,'PASS','FAIL') result,'06_administration late fee rule' test;
SELECT IF(fn_late_fee(1000,2,'2026-07-01','2026-07-01')=0,'PASS','FAIL') result,'06_administration due date boundary' test;
SELECT IF(fn_room_vacancy(1)=2,'PASS','FAIL') result,'06_administration room vacancy function' test;
SELECT IF((SELECT COUNT(*) FROM vw_pending_fees)=12,'PASS','FAIL') result,'06_administration pending fee view' test;
DROP PROCEDURE IF EXISTS sp_test_admin_expected_error;
DELIMITER $$
CREATE PROCEDURE sp_test_admin_expected_error(IN p_case INT)
BEGIN
  DECLARE v_state CHAR(5) DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION GET DIAGNOSTICS CONDITION 1 v_state=RETURNED_SQLSTATE;
  CASE p_case
    WHEN 1 THEN CALL sp_collect_fee(1,1,'UPI');
    WHEN 2 THEN CALL sp_allocate_hostel(2,2);
    ELSE UPDATE receipt SET receipt_no='MUTATED' WHERE fee_payment_id=1;
  END CASE;
  SELECT IF(BINARY v_state=BINARY IF(p_case=1,'23000','45000'),'PASS','FAIL') result,CASE p_case WHEN 1 THEN '06_administration duplicate fee payment rejected' WHEN 2 THEN '06_administration room capacity enforced' ELSE '06_administration receipt immutable' END test;
END$$
DELIMITER ;
CALL sp_collect_fee(1,1,'UPI');
SELECT IF((SELECT COUNT(*) FROM fee_payment fp JOIN receipt r ON r.fee_payment_id=fp.fee_payment_id WHERE fp.student_id=1 AND fp.fee_structure_id=1 AND fp.base_amount=50000 AND fp.total_amount=51000)=1,'PASS','FAIL') result,'06_administration fee and receipt atomic workflow' test;
CALL sp_test_admin_expected_error(1);
CALL sp_allocate_hostel(2,1);
CALL sp_test_admin_expected_error(2);
SELECT IF(fn_room_vacancy(2)=0,'PASS','FAIL') result,'06_administration occupancy after allocation' test;
CALL sp_test_admin_expected_error(3);
DROP PROCEDURE sp_test_admin_expected_error;
