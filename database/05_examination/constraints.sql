ALTER TABLE exam ADD CONSTRAINT fk_exam_offering FOREIGN KEY(offering_id) REFERENCES course_offering(offering_id);
ALTER TABLE exam_registration ADD CONSTRAINT fk_exam_registration_enrollment FOREIGN KEY(enrollment_id) REFERENCES enrollment(enrollment_id);
ALTER TABLE result_summary ADD CONSTRAINT fk_result_summary_student FOREIGN KEY(student_id) REFERENCES student(student_id);
ALTER TABLE result_summary ADD CONSTRAINT fk_result_summary_semester FOREIGN KEY(semester_id) REFERENCES semester(semester_id);
