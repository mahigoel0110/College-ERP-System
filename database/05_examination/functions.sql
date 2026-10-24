DELIMITER $$
CREATE FUNCTION fn_letter_grade(p_percent DECIMAL(5,2)) RETURNS VARCHAR(2) READS SQL DATA
BEGIN DECLARE v_grade VARCHAR(2); SELECT grade INTO v_grade FROM grade_scale WHERE minimum_percent<=p_percent ORDER BY minimum_percent DESC LIMIT 1; RETURN COALESCE(v_grade,'F'); END$$
CREATE FUNCTION fn_student_sgpa(p_student INT UNSIGNED,p_semester INT UNSIGNED) RETURNS DECIMAL(4,2) READS SQL DATA
BEGIN DECLARE v_sgpa DECIMAL(4,2); SELECT ROUND(SUM(c.credits*gs.grade_point)/NULLIF(SUM(c.credits),0),2) INTO v_sgpa FROM exam_registration er JOIN enrollment e ON e.enrollment_id=er.enrollment_id JOIN exam ex ON ex.exam_id=er.exam_id JOIN course_offering co ON co.offering_id=ex.offering_id JOIN course c ON c.course_id=co.course_id JOIN marks m ON m.exam_registration_id=er.exam_registration_id JOIN grade_scale gs ON gs.grade_scale_id=m.grade_scale_id WHERE e.student_id=p_student AND co.semester_id=p_semester; RETURN COALESCE(v_sgpa,0); END$$
DELIMITER ;
