-- 03_faculty_a: Faculty profile, designation, qualifications, course allocation
CREATE TABLE designation (
  designation_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  designation_name VARCHAR(80)  NOT NULL,
  level_no         TINYINT UNSIGNED NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_designation PRIMARY KEY (designation_id),
  CONSTRAINT uq_designation_name UNIQUE (designation_name),
  CONSTRAINT ck_designation_level CHECK (level_no BETWEEN 1 AND 10)
);

CREATE TABLE faculty_profile (
  faculty_id       INT UNSIGNED NOT NULL,
  designation_id   INT UNSIGNED NOT NULL,
  date_of_joining  DATE         NOT NULL,
  phone            VARCHAR(15)  NOT NULL,
  office_room      VARCHAR(20)  NULL,
  specialization   VARCHAR(120) NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_faculty_profile PRIMARY KEY (faculty_id),
  CONSTRAINT fk_faculty_profile_faculty FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id),
  CONSTRAINT fk_faculty_profile_designation FOREIGN KEY (designation_id) REFERENCES designation (designation_id)
);

CREATE TABLE faculty_qualification (
  qualification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  faculty_id       INT UNSIGNED NOT NULL,
  degree           VARCHAR(80)  NOT NULL,
  institution      VARCHAR(120) NOT NULL,
  year_passed      SMALLINT     NOT NULL,
  created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_faculty_qualification PRIMARY KEY (qualification_id),
  CONSTRAINT fk_faculty_qualification_faculty FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id),
  CONSTRAINT uq_faculty_qualification_degree UNIQUE (faculty_id, degree),
  CONSTRAINT ck_faculty_qualification_year CHECK (year_passed >= 1950)
);

CREATE TABLE faculty_designation_history (
  history_id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  faculty_id          INT UNSIGNED NOT NULL,
  old_designation_id  INT UNSIGNED NULL,
  new_designation_id  INT UNSIGNED NOT NULL,
  changed_on          DATE         NOT NULL,
  CONSTRAINT pk_faculty_designation_history PRIMARY KEY (history_id),
  CONSTRAINT fk_faculty_designation_history_faculty FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id),
  CONSTRAINT fk_faculty_designation_history_old FOREIGN KEY (old_designation_id) REFERENCES designation (designation_id),
  CONSTRAINT fk_faculty_designation_history_new FOREIGN KEY (new_designation_id) REFERENCES designation (designation_id)
);

CREATE TABLE course_allocation (
  allocation_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  faculty_id      INT UNSIGNED NOT NULL,
  offering_id     INT UNSIGNED NOT NULL,
  hours_per_week  TINYINT UNSIGNED NOT NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_course_allocation PRIMARY KEY (allocation_id),
  CONSTRAINT fk_course_allocation_faculty FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id),
  CONSTRAINT uq_course_allocation_faculty_offering UNIQUE (faculty_id, offering_id),
  CONSTRAINT ck_course_allocation_hours CHECK (hours_per_week BETWEEN 1 AND 20)
);
