SELECT ex.exam_id,ex.exam_name,COUNT(er.exam_registration_id) registrants FROM exam ex LEFT JOIN exam_registration er ON er.exam_id=ex.exam_id GROUP BY ex.exam_id,ex.exam_name HAVING COUNT(er.exam_registration_id)>0;
SELECT student_id,sgpa FROM vw_published_results WHERE sgpa>(SELECT AVG(sgpa) FROM result_summary);
SELECT student_id,sgpa,RANK() OVER(PARTITION BY semester_id ORDER BY sgpa DESC) semester_rank FROM result_summary;
