INSERT INTO leave_type(leave_type_id, type_name, type_code, annual_days, description, requires_document) VALUES
  (1, 'Casual Leave', 'CL', 12, 'Leave for personal, urgent or unforeseen matters', 0),
  (2, 'Medical Leave', 'ML', 10, 'Leave for illness, medical treatment or health recovery', 1),
  (3, 'Earned Leave', 'EL', 15, 'Earned/privileged leave accrued for continuous academic service', 0),
  (4, 'Special Leave', 'SL', 5, 'Special leave for academic conferences, research, or duty', 0)
ON DUPLICATE KEY UPDATE 
  type_name = VALUES(type_name),
  type_code = VALUES(type_code),
  annual_days = VALUES(annual_days),
  description = VALUES(description),
  requires_document = VALUES(requires_document);

INSERT INTO leave_balance(faculty_id, leave_type_id, balance_year, allocated_days, days_remaining) 
SELECT faculty_id, 1, 2026, 12, 12 FROM faculty WHERE faculty_id <= 4
ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days);

INSERT INTO leave_balance(faculty_id, leave_type_id, balance_year, allocated_days, days_remaining) 
SELECT faculty_id, 2, 2026, 10, 10 FROM faculty WHERE faculty_id <= 4
ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days);

INSERT INTO leave_balance(faculty_id, leave_type_id, balance_year, allocated_days, days_remaining) 
SELECT faculty_id, 3, 2026, 15, 15 FROM faculty WHERE faculty_id <= 4
ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days);

INSERT INTO leave_balance(faculty_id, leave_type_id, balance_year, allocated_days, days_remaining) 
SELECT faculty_id, 4, 2026, 5, 5 FROM faculty WHERE faculty_id <= 4
ON DUPLICATE KEY UPDATE allocated_days = VALUES(allocated_days);

INSERT INTO salary_structure(faculty_id, basic_pay, effective_from) 
SELECT faculty_id, 50000 + faculty_id * 1000, '2026-01-01' FROM faculty WHERE faculty_id <= 4;

INSERT INTO leave_request(faculty_id, leave_type_id, start_date, end_date, days_requested, reason, status) 
VALUES(1, 1, '2026-10-22', '2026-10-23', 2, 'Personal urgent family matter', 'APPROVED');

INSERT IGNORE INTO payroll (faculty_id, period_start, period_end, basic_pay, allowances, gross_pay, pf_amount, professional_tax, lop_amount, net_pay, payment_status, payment_date, generated_at)
VALUES
  (1, '2026-08-01', '2026-08-31', 51000.00, 10200.00, 61200.00, 6120.00, 200.00, 0.00, 54880.00, 'PAID', '2026-08-31', '2026-08-31 10:00:00'),
  (1, '2026-09-01', '2026-09-30', 51000.00, 10200.00, 61200.00, 6120.00, 200.00, 0.00, 54880.00, 'PAID', '2026-09-30', '2026-09-30 10:00:00'),
  (1, '2026-10-01', '2026-10-31', 51000.00, 10200.00, 61200.00, 6120.00, 200.00, 0.00, 54880.00, 'PAID', '2026-10-24', '2026-10-24 10:00:00');
