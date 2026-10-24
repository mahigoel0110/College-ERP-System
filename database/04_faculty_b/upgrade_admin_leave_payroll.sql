-- ====================================================================
-- College ERP: Admin Leave & Payroll Management Upgrade
-- Migration File: 04_faculty_b/upgrade_admin_leave_payroll.sql
-- ====================================================================

-- 1. Add is_active column to leave_type if not present
ALTER TABLE leave_type
  ADD COLUMN IF NOT EXISTS is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER requires_document;

UPDATE leave_type SET is_active = 1 WHERE is_active IS NULL;

-- 2. Create leave_balance_audit table for manual balance adjustments
CREATE TABLE IF NOT EXISTS leave_balance_audit (
  audit_id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  faculty_id INT UNSIGNED NOT NULL,
  leave_type_id INT UNSIGNED NOT NULL,
  balance_year SMALLINT NOT NULL,
  old_allocated DECIMAL(5,2) NOT NULL,
  new_allocated DECIMAL(5,2) NOT NULL,
  adjustment_amount DECIMAL(5,2) NOT NULL,
  reason VARCHAR(255) NOT NULL,
  adjusted_by INT UNSIGNED NULL,
  adjusted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_leave_balance_audit PRIMARY KEY(audit_id),
  CONSTRAINT fk_balance_audit_faculty FOREIGN KEY(faculty_id) REFERENCES faculty(faculty_id),
  CONSTRAINT fk_balance_audit_type FOREIGN KEY(leave_type_id) REFERENCES leave_type(leave_type_id),
  CONSTRAINT fk_balance_audit_user FOREIGN KEY(adjusted_by) REFERENCES app_user(user_id) ON DELETE SET NULL
);

-- 3. Ensure salary structures for all faculty members 1 to 8
INSERT IGNORE INTO salary_structure (faculty_id, basic_pay, effective_from)
SELECT faculty_id, 50000 + faculty_id * 1000, '2026-01-01'
FROM faculty
WHERE faculty_id NOT IN (SELECT faculty_id FROM salary_structure);
