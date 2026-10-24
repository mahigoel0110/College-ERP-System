CREATE TABLE leave_type (
  leave_type_id INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  type_name VARCHAR(40) NOT NULL, 
  type_code VARCHAR(10) NULL,
  annual_days DECIMAL(5,2) NOT NULL, 
  description VARCHAR(255) NULL,
  requires_document TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT pk_leave_type PRIMARY KEY(leave_type_id), 
  CONSTRAINT uq_leave_type_name UNIQUE(type_name), 
  CONSTRAINT ck_leave_days CHECK(annual_days>=0)
);

CREATE TABLE leave_balance (
  leave_balance_id INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  faculty_id INT UNSIGNED NOT NULL, 
  leave_type_id INT UNSIGNED NOT NULL, 
  allocated_days DECIMAL(5,2) NULL,
  balance_year SMALLINT NOT NULL, 
  days_remaining DECIMAL(5,2) NOT NULL, 
  CONSTRAINT pk_leave_balance PRIMARY KEY(leave_balance_id), 
  CONSTRAINT uq_leave_balance UNIQUE(faculty_id,leave_type_id,balance_year), 
  CONSTRAINT fk_leave_balance_type FOREIGN KEY(leave_type_id) REFERENCES leave_type(leave_type_id), 
  CONSTRAINT ck_leave_balance_days CHECK(days_remaining>=0)
);

CREATE TABLE leave_request (
  leave_request_id INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  faculty_id INT UNSIGNED NOT NULL, 
  leave_type_id INT UNSIGNED NOT NULL, 
  start_date DATE NOT NULL, 
  end_date DATE NOT NULL, 
  days_requested DECIMAL(5,2) NOT NULL, 
  reason TEXT NULL,
  contact_info VARCHAR(255) NULL,
  document_name VARCHAR(255) NULL,
  document_path VARCHAR(255) NULL,
  status ENUM('PENDING','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'PENDING', 
  approver_remarks TEXT NULL,
  decided_by INT UNSIGNED NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  decided_at DATETIME NULL, 
  cancelled_at DATETIME NULL,
  CONSTRAINT pk_leave_request PRIMARY KEY(leave_request_id), 
  CONSTRAINT fk_leave_request_type FOREIGN KEY(leave_type_id) REFERENCES leave_type(leave_type_id), 
  CONSTRAINT ck_leave_request_dates CHECK(end_date>=start_date), 
  CONSTRAINT ck_leave_request_days CHECK(days_requested>0)
);

CREATE TABLE leave_approval (
  approval_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  leave_request_id INT UNSIGNED NOT NULL,
  action ENUM('APPROVED','REJECTED','CANCELLED') NOT NULL,
  decided_by INT UNSIGNED NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_leave_approval PRIMARY KEY(approval_id),
  CONSTRAINT fk_leave_approval_request FOREIGN KEY(leave_request_id) REFERENCES leave_request(leave_request_id) ON DELETE CASCADE
);

CREATE TABLE app_notification (
  notification_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NOT NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'INFO',
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  link VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_app_notification PRIMARY KEY(notification_id)
);

CREATE TABLE salary_structure (
  salary_structure_id INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  faculty_id INT UNSIGNED NOT NULL, 
  basic_pay DECIMAL(10,2) NOT NULL, 
  effective_from DATE NOT NULL, 
  effective_to DATE NULL, 
  CONSTRAINT pk_salary_structure PRIMARY KEY(salary_structure_id), 
  CONSTRAINT ck_salary_basic CHECK(basic_pay>0), 
  CONSTRAINT ck_salary_dates CHECK(effective_to IS NULL OR effective_to>=effective_from)
);

CREATE TABLE salary_change_log (
  salary_change_id INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  salary_structure_id INT UNSIGNED NOT NULL, 
  old_basic_pay DECIMAL(10,2) NULL, 
  new_basic_pay DECIMAL(10,2) NOT NULL, 
  changed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  CONSTRAINT pk_salary_change_log PRIMARY KEY(salary_change_id), 
  CONSTRAINT fk_salary_change_structure FOREIGN KEY(salary_structure_id) REFERENCES salary_structure(salary_structure_id)
);

CREATE TABLE payroll (
  payroll_id INT UNSIGNED NOT NULL AUTO_INCREMENT, 
  faculty_id INT UNSIGNED NOT NULL, 
  period_start DATE NOT NULL, 
  period_end DATE NOT NULL, 
  basic_pay DECIMAL(10,2) NOT NULL, 
  allowances DECIMAL(10,2) NOT NULL DEFAULT 0,
  gross_pay DECIMAL(10,2) NOT NULL, 
  pf_amount DECIMAL(10,2) NOT NULL, 
  professional_tax DECIMAL(10,2) NOT NULL DEFAULT 200, 
  lop_amount DECIMAL(10,2) NOT NULL DEFAULT 0, 
  net_pay DECIMAL(10,2) NOT NULL, 
  payment_status ENUM('PAID','PENDING','PROCESSED') NOT NULL DEFAULT 'PAID',
  payment_date DATE NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, 
  CONSTRAINT pk_payroll PRIMARY KEY(payroll_id), 
  CONSTRAINT uq_payroll_period UNIQUE(faculty_id,period_start,period_end), 
  CONSTRAINT ck_payroll_period CHECK(period_end>=period_start), 
  CONSTRAINT ck_payroll_amount CHECK(net_pay>=0)
);
