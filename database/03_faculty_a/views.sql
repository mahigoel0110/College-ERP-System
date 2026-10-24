CREATE OR REPLACE VIEW vw_faculty_workload AS
SELECT f.faculty_id,f.employee_code,CONCAT(f.first_name,' ',f.last_name) faculty_name,d.designation_name,
       fn_years_of_service(f.faculty_id) years_of_service,fn_weekly_workload(f.faculty_id) weekly_hours
FROM faculty f JOIN faculty_profile fp ON fp.faculty_id=f.faculty_id
JOIN designation d ON d.designation_id=fp.designation_id;
CREATE OR REPLACE VIEW vw_faculty_allocations AS
SELECT ca.allocation_id,ca.faculty_id,f.employee_code,ca.offering_id,c.course_code,c.course_name,
       sem.term,ca.hours_per_week
FROM course_allocation ca JOIN faculty f ON f.faculty_id=ca.faculty_id
JOIN course_offering co ON co.offering_id=ca.offering_id JOIN course c ON c.course_id=co.course_id
JOIN semester sem ON sem.semester_id=co.semester_id;
