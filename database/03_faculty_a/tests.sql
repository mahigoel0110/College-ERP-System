DROP PROCEDURE IF EXISTS sp_test_faculty_a_expected_error;
DELIMITER $$
CREATE PROCEDURE sp_test_faculty_a_expected_error()
BEGIN
  DECLARE v_caught BOOLEAN DEFAULT FALSE;
  DECLARE CONTINUE HANDLER FOR SQLSTATE '45000' SET v_caught=TRUE;
  CALL sp_allocate_course(1,8,13);
  SELECT IF(v_caught,'PASS','FAIL') result,'03_faculty_a rejects workload above 16 hours' test;
END$$
DELIMITER ;

SELECT IF((SELECT COUNT(*) FROM designation)>=3,'PASS','FAIL') result,'03_faculty_a designation seeds' test;
SELECT IF(fn_weekly_workload(1)=4,'PASS','FAIL') result,'03_faculty_a workload function' test;
SELECT IF(fn_years_of_service(1)=TIMESTAMPDIFF(YEAR,(SELECT date_of_joining FROM faculty_profile WHERE faculty_id=1),CURDATE()),'PASS','FAIL') result,'03_faculty_a service function' test;
SELECT IF((SELECT COUNT(*) FROM faculty_qualification WHERE faculty_id=1)=1,'PASS','FAIL') result,'03_faculty_a qualification seed' test;
CALL sp_change_designation(1,2);
SELECT IF((SELECT COUNT(*) FROM faculty_designation_history WHERE faculty_id=1)=2,'PASS','FAIL') result,'03_faculty_a designation history trigger' test;
SELECT IF((SELECT COUNT(*) FROM vw_faculty_allocations)=4,'PASS','FAIL') result,'03_faculty_a allocations view' test;
CALL sp_test_faculty_a_expected_error();
DROP PROCEDURE IF EXISTS sp_test_faculty_a_expected_error;
