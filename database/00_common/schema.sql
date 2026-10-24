CREATE TABLE department (
  department_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_code VARCHAR(10)  NOT NULL,
  department_name VARCHAR(100) NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_department PRIMARY KEY (department_id),
  CONSTRAINT uq_department_code UNIQUE (department_code),
  CONSTRAINT uq_department_name UNIQUE (department_name)
);
CREATE TABLE program (
  program_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  program_code   VARCHAR(20)  NOT NULL,
  program_name   VARCHAR(100) NOT NULL,
  department_id  INT UNSIGNED NOT NULL,
  duration_years TINYINT UNSIGNED NOT NULL DEFAULT 4,
  created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_program PRIMARY KEY (program_id),
  CONSTRAINT uq_program_code UNIQUE (program_code),
  CONSTRAINT fk_program_department FOREIGN KEY (department_id) REFERENCES department (department_id),
  CONSTRAINT ck_program_duration CHECK (duration_years BETWEEN 1 AND 6)
);
CREATE TABLE academic_year (
  academic_year_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  year_label       VARCHAR(9) NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_academic_year PRIMARY KEY (academic_year_id),
  CONSTRAINT uq_academic_year_label UNIQUE (year_label),
  CONSTRAINT ck_academic_year_dates CHECK (end_date > start_date)
);
CREATE TABLE semester (
  semester_id      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  academic_year_id INT UNSIGNED NOT NULL,
  term             ENUM('ODD','EVEN') NOT NULL,
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_semester PRIMARY KEY (semester_id),
  CONSTRAINT uq_semester_year_term UNIQUE (academic_year_id, term),
  CONSTRAINT fk_semester_academic_year FOREIGN KEY (academic_year_id) REFERENCES academic_year (academic_year_id),
  CONSTRAINT ck_semester_dates CHECK (end_date > start_date)
);
CREATE TABLE student (
  student_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  enrollment_no VARCHAR(20)  NOT NULL,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  program_id    INT UNSIGNED NOT NULL,
  status        ENUM('ACTIVE','GRADUATED','DROPPED') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_student PRIMARY KEY (student_id),
  CONSTRAINT uq_student_enrollment_no UNIQUE (enrollment_no),
  CONSTRAINT uq_student_email UNIQUE (email),
  CONSTRAINT fk_student_program FOREIGN KEY (program_id) REFERENCES program (program_id)
);
CREATE TABLE faculty (
  faculty_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_code VARCHAR(20)  NOT NULL,
  first_name    VARCHAR(50)  NOT NULL,
  last_name     VARCHAR(50)  NOT NULL,
  email         VARCHAR(120) NOT NULL,
  department_id INT UNSIGNED NOT NULL,
  status        ENUM('ACTIVE','ON_LEAVE','RETIRED') NOT NULL DEFAULT 'ACTIVE',
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_faculty PRIMARY KEY (faculty_id),
  CONSTRAINT uq_faculty_employee_code UNIQUE (employee_code),
  CONSTRAINT uq_faculty_email UNIQUE (email),
  CONSTRAINT fk_faculty_department FOREIGN KEY (department_id) REFERENCES department (department_id)
);
