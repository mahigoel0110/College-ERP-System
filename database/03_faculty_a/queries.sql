-- Faculty, allocation and course join with workload aggregation.
SELECT f.faculty_id,CONCAT(f.first_name,' ',f.last_name) faculty_name,
       COUNT(ca.allocation_id) offerings,SUM(ca.hours_per_week) weekly_hours
FROM faculty f LEFT JOIN course_allocation ca ON ca.faculty_id=f.faculty_id
GROUP BY f.faculty_id,f.first_name,f.last_name HAVING COALESCE(SUM(ca.hours_per_week),0)>0;
-- Subquery: faculty above department average workload.
SELECT faculty_id,weekly_hours FROM vw_faculty_workload w
WHERE weekly_hours>(SELECT AVG(weekly_hours) FROM vw_faculty_workload);
-- Window ranking of assigned faculty workload.
SELECT faculty_id,faculty_name,weekly_hours,RANK() OVER(ORDER BY weekly_hours DESC) workload_rank
FROM vw_faculty_workload;
