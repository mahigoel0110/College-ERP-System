INSERT INTO designation (designation_id, designation_name, level_no) VALUES
 (1,'Assistant Professor',3),(2,'Associate Professor',5),(3,'Professor',7);
INSERT INTO faculty_profile (faculty_id,designation_id,date_of_joining,phone,office_room,specialization) VALUES
 (1,1,'2018-07-01','9000000001','CE-101','Software Engineering'),
 (2,2,'2015-06-01','9000000002','IT-201','Networks'),
 (3,1,'2020-08-01','9000000003','ENTC-101','Communications'),
 (4,1,'2019-07-01','9000000004','ME-101','Thermal Engineering');
INSERT INTO faculty_qualification (faculty_id,degree,institution,year_passed) VALUES
 (1,'M.E. Computer','University A',2014),(2,'Ph.D. IT','University B',2012),
 (3,'M.E. Electronics','University C',2016),(4,'M.E. Mechanical','University D',2015);
INSERT INTO faculty_designation_history (faculty_id,old_designation_id,new_designation_id,changed_on) VALUES
 (1,NULL,1,'2018-07-01'),(2,NULL,2,'2015-06-01'),(3,NULL,1,'2020-08-01'),(4,NULL,1,'2019-07-01');
INSERT INTO course_allocation (faculty_id,offering_id,hours_per_week) VALUES (1,1,4),(2,3,4),(3,5,4),(4,7,4);
