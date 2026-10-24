-- 01_auth: Authentication module tables
CREATE TABLE role (
  role_id   INT UNSIGNED NOT NULL AUTO_INCREMENT,
  role_name VARCHAR(20)  NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_role PRIMARY KEY (role_id),
  CONSTRAINT uq_role_name UNIQUE (role_name)
);

CREATE TABLE app_user (
  user_id         INT UNSIGNED NOT NULL AUTO_INCREMENT,
  username        VARCHAR(50)  NOT NULL,
  email           VARCHAR(120) NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  role_id         INT UNSIGNED NOT NULL,
  student_id      INT UNSIGNED NULL,
  faculty_id      INT UNSIGNED NULL,
  is_active       TINYINT(1)   NOT NULL DEFAULT 1,
  failed_attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME     NULL,
  last_login_at   DATETIME     NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT pk_app_user PRIMARY KEY (user_id),
  CONSTRAINT uq_app_user_username UNIQUE (username),
  CONSTRAINT uq_app_user_email UNIQUE (email),
  CONSTRAINT uq_app_user_student UNIQUE (student_id),
  CONSTRAINT uq_app_user_faculty UNIQUE (faculty_id),
  CONSTRAINT fk_app_user_role FOREIGN KEY (role_id) REFERENCES role (role_id),
  CONSTRAINT fk_app_user_student FOREIGN KEY (student_id) REFERENCES student (student_id),
  CONSTRAINT fk_app_user_faculty FOREIGN KEY (faculty_id) REFERENCES faculty (faculty_id),
  CONSTRAINT ck_app_user_link CHECK (NOT (student_id IS NOT NULL AND faculty_id IS NOT NULL))
);

CREATE TABLE refresh_tokens (
  refresh_token_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  expires_at DATETIME NOT NULL,
  is_revoked TINYINT(1) NOT NULL DEFAULT 0,
  revoked_at DATETIME NULL,
  replaced_by_token_hash CHAR(64) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_refresh_tokens PRIMARY KEY (refresh_token_id),
  CONSTRAINT uq_refresh_tokens_hash UNIQUE (token_hash),
  CONSTRAINT fk_refresh_tokens_user FOREIGN KEY (user_id) REFERENCES app_user (user_id) ON DELETE CASCADE
);
CREATE INDEX idx_refresh_tokens_user_active ON refresh_tokens (user_id, is_revoked, expires_at);

CREATE TABLE login_audit (
  login_audit_id     INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id            INT UNSIGNED NULL,
  username_attempted VARCHAR(50)  NOT NULL,
  success            TINYINT(1)   NOT NULL,
  attempted_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address         VARCHAR(45)  NULL,
  CONSTRAINT pk_login_audit PRIMARY KEY (login_audit_id),
  CONSTRAINT fk_login_audit_user FOREIGN KEY (user_id) REFERENCES app_user (user_id)
);
CREATE INDEX idx_login_audit_user ON login_audit (user_id);
CREATE INDEX idx_login_audit_attempted_at ON login_audit (attempted_at);

CREATE TABLE role_change_audit (
  audit_id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     INT UNSIGNED NOT NULL,
  old_role_id INT UNSIGNED NOT NULL,
  new_role_id INT UNSIGNED NOT NULL,
  changed_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_role_change_audit PRIMARY KEY (audit_id),
  CONSTRAINT fk_role_change_audit_user FOREIGN KEY (user_id) REFERENCES app_user (user_id),
  CONSTRAINT fk_role_change_audit_old_role FOREIGN KEY (old_role_id) REFERENCES role (role_id),
  CONSTRAINT fk_role_change_audit_new_role FOREIGN KEY (new_role_id) REFERENCES role (role_id)
);
