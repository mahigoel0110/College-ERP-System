-- 02_student: Student Management module tables
CREATE TABLE student_profile (
  student_id     INT UNSIGNED NOT NULL,
  date_of_birth  DATE         NOT NULL,
  phone          VARCHAR(15)  NOT NULL,
  address        VARCHAR(255) NOT NULL,
  admission_year SMALLINT     NOT NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_student_profile PRIMARY KEY (student_id),
  CONSTRAINT fk_student_profile_student FOREIGN KEY (student_id) REFERENCES student (student_id)
);

CREATE TABLE guardian (
  guardian_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id  INT UNSIGNED NOT NULL,
  name        VARCHAR(100) NOT NULL,
  relation    ENUM('FATHER','MOTHER','GUARDIAN','OTHER') NOT NULL,
  phone       VARCHAR(15)  NOT NULL,
  email       VARCHAR(120) NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_guardian PRIMARY KEY (guardian_id),
  CONSTRAINT fk_guardian_student FOREIGN KEY (student_id) REFERENCES student (student_id)
);

CREATE TABLE admission (
  admission_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id     INT UNSIGNED NOT NULL,
  admission_date DATE         NOT NULL,
  admission_type ENUM('REGULAR','DIRECT_SECOND_YEAR','TRANSFER') NOT NULL DEFAULT 'REGULAR',
  merit_score    DECIMAL(5,2) NULL,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_admission PRIMARY KEY (admission_id),
  CONSTRAINT uq_admission_student UNIQUE (student_id),
  CONSTRAINT fk_admission_student FOREIGN KEY (student_id) REFERENCES student (student_id),
  CONSTRAINT ck_admission_merit CHECK (merit_score IS NULL OR (merit_score >= 0 AND merit_score <= 100))
);

CREATE TABLE course (
  course_id     INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  course_code   VARCHAR(20)     NOT NULL,
  course_name   VARCHAR(100)    NOT NULL,
  credits       TINYINT UNSIGNED NOT NULL,
  department_id INT UNSIGNED    NOT NULL,
  semester_no   TINYINT UNSIGNED NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_course PRIMARY KEY (course_id),
  CONSTRAINT uq_course_code UNIQUE (course_code),
  CONSTRAINT fk_course_department FOREIGN KEY (department_id) REFERENCES department (department_id),
  CONSTRAINT ck_course_credits CHECK (credits BETWEEN 1 AND 6),
  CONSTRAINT ck_course_semester_no CHECK (semester_no BETWEEN 1 AND 8)
);

CREATE TABLE course_offering (
  offering_id INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  course_id   INT UNSIGNED     NOT NULL,
  semester_id INT UNSIGNED     NOT NULL,
  capacity    SMALLINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_course_offering PRIMARY KEY (offering_id),
  CONSTRAINT uq_course_offering UNIQUE (course_id, semester_id),
  CONSTRAINT fk_offering_course FOREIGN KEY (course_id) REFERENCES course (course_id),
  CONSTRAINT fk_offering_semester FOREIGN KEY (semester_id) REFERENCES semester (semester_id),
  CONSTRAINT ck_offering_capacity CHECK (capacity > 0)
);

CREATE TABLE enrollment (
  enrollment_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id    INT UNSIGNED NOT NULL,
  offering_id   INT UNSIGNED NOT NULL,
  enrolled_on   DATE         NOT NULL,
  status        ENUM('ENROLLED','DROPPED') NOT NULL DEFAULT 'ENROLLED',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_enrollment PRIMARY KEY (enrollment_id),
  CONSTRAINT uq_enrollment UNIQUE (student_id, offering_id),
  CONSTRAINT fk_enrollment_student FOREIGN KEY (student_id) REFERENCES student (student_id),
  CONSTRAINT fk_enrollment_offering FOREIGN KEY (offering_id) REFERENCES course_offering (offering_id)
);

CREATE TABLE attendance (
  attendance_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_id INT UNSIGNED NOT NULL,
  class_date    DATE         NOT NULL,
  status        ENUM('PRESENT','ABSENT') NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_attendance PRIMARY KEY (attendance_id),
  CONSTRAINT uq_attendance UNIQUE (enrollment_id, class_date),
  CONSTRAINT fk_attendance_enrollment FOREIGN KEY (enrollment_id) REFERENCES enrollment (enrollment_id)
);

CREATE TABLE student_profile_audit (
  audit_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  student_id INT UNSIGNED NOT NULL,
  field_name VARCHAR(50)  NOT NULL,
  old_value  VARCHAR(255) NULL,
  new_value  VARCHAR(255) NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_student_profile_audit PRIMARY KEY (audit_id)
);
