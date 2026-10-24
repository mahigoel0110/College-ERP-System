-- Cross-module references to the shared academic and student anchors.
ALTER TABLE fee_structure ADD CONSTRAINT fk_fee_structure_program FOREIGN KEY(program_id) REFERENCES program(program_id);
ALTER TABLE fee_structure ADD CONSTRAINT fk_fee_structure_year FOREIGN KEY(academic_year_id) REFERENCES academic_year(academic_year_id);
ALTER TABLE fee_payment ADD CONSTRAINT fk_fee_payment_student FOREIGN KEY(student_id) REFERENCES student(student_id);
ALTER TABLE hostel_allocation ADD CONSTRAINT fk_hostel_allocation_student FOREIGN KEY(student_id) REFERENCES student(student_id);
