-- 03_faculty_a: Cross-module foreign keys
ALTER TABLE course_allocation
  ADD CONSTRAINT fk_course_allocation_offering
  FOREIGN KEY (offering_id) REFERENCES course_offering (offering_id);
