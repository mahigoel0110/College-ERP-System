SELECT IF(fn_letter_grade(90) COLLATE utf8mb4_unicode_ci='O' COLLATE utf8mb4_unicode_ci,'PASS','FAIL') result,'05_examination grade boundary' test;
SELECT IF(fn_student_sgpa(1,1)=0,'PASS','FAIL') result,'05_examination empty SGPA' test;
SELECT IF((SELECT COUNT(*) FROM exam)=2,'PASS','FAIL') result,'05_examination exam seeds' test;
DROP PROCEDURE IF EXISTS sp_test_exam_expected_error;
DELIMITER $$
CREATE PROCEDURE sp_test_exam_expected_error(IN p_case INT)
BEGIN
  DECLARE v_state CHAR(5) DEFAULT NULL;
  DECLARE CONTINUE HANDLER FOR SQLEXCEPTION GET DIAGNOSTICS CONDITION 1 v_state=RETURNED_SQLSTATE;
  IF p_case=1 THEN CALL sp_register_exam(2,9,1); ELSE CALL sp_submit_marks(1,101,NULL); END IF;
  SELECT IF(BINARY v_state=BINARY '45000','PASS','FAIL') result,IF(p_case=1,'05_examination low-attendance registration rejected','05_examination out-of-range marks rejected') test;
END$$
DELIMITER ;
CALL sp_test_exam_expected_error(1);
SET @exam_enrollment_id=(SELECT enrollment_id FROM enrollment WHERE student_id=2 AND offering_id=1 AND status='ENROLLED' LIMIT 1);
CALL sp_register_exam(1,@exam_enrollment_id,1);
CALL sp_submit_marks(1,85,NULL);
UPDATE marks SET marks_obtained=90,grade_scale_id=(SELECT grade_scale_id FROM grade_scale WHERE grade='O') WHERE exam_registration_id=1;
SELECT IF((SELECT COUNT(*) FROM marks_audit WHERE marks_id=(SELECT marks_id FROM marks WHERE exam_registration_id=1) AND old_marks=85 AND new_marks=90)=1,'PASS','FAIL') result,'05_examination marks audit trigger' test;
CALL sp_test_exam_expected_error(2);
CALL sp_publish_results(1);
SELECT IF((SELECT COUNT(*) FROM result_summary rs JOIN enrollment e ON e.student_id=rs.student_id WHERE e.enrollment_id=@exam_enrollment_id AND rs.semester_id=1 AND rs.sgpa>0 AND rs.cgpa>0)=1,'PASS','FAIL') result,'05_examination result publication and GPA summary' test;
SET @test_marks_id=(SELECT marks_id FROM marks WHERE exam_registration_id=1);
CALL sp_request_revaluation(2,@test_marks_id,'Please review the published exam mark');
CALL sp_decide_revaluation(1,1);
SELECT IF((SELECT status FROM revaluation_request WHERE revaluation_request_id=1)='APPROVED','PASS','FAIL') result,'05_examination revaluation decision' test;
DROP PROCEDURE sp_test_exam_expected_error;
