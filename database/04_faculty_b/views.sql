CREATE OR REPLACE VIEW vw_leave_balance AS 
SELECT 
  lb.leave_balance_id,
  f.faculty_id,
  f.employee_code,
  CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
  d.department_name,
  lt.leave_type_id,
  lt.type_name,
  COALESCE(lt.type_code, SUBSTRING(lt.type_name, 1, 2)) AS type_code,
  COALESCE(lb.allocated_days, lt.annual_days) AS allocated_days,
  lb.balance_year,
  lb.days_remaining AS remaining_days,
  COALESCE((
    SELECT SUM(lr.days_requested) 
    FROM leave_request lr 
    WHERE lr.faculty_id = f.faculty_id 
      AND lr.leave_type_id = lt.leave_type_id 
      AND YEAR(lr.start_date) = lb.balance_year 
      AND lr.status = 'APPROVED'
  ), 0) AS used_days,
  COALESCE((
    SELECT SUM(lr.days_requested) 
    FROM leave_request lr 
    WHERE lr.faculty_id = f.faculty_id 
      AND lr.leave_type_id = lt.leave_type_id 
      AND YEAR(lr.start_date) = lb.balance_year 
      AND lr.status = 'PENDING'
  ), 0) AS pending_days,
  (lb.days_remaining - COALESCE((
    SELECT SUM(lr.days_requested) 
    FROM leave_request lr 
    WHERE lr.faculty_id = f.faculty_id 
      AND lr.leave_type_id = lt.leave_type_id 
      AND YEAR(lr.start_date) = lb.balance_year 
      AND lr.status = 'PENDING'
  ), 0)) AS available_days
FROM leave_balance lb 
JOIN faculty f ON f.faculty_id = lb.faculty_id 
LEFT JOIN department d ON d.department_id = f.department_id
JOIN leave_type lt ON lt.leave_type_id = lb.leave_type_id;

CREATE OR REPLACE VIEW vw_payroll_summary AS 
SELECT 
  p.payroll_id,
  p.faculty_id,
  f.employee_code,
  CONCAT(f.first_name, ' ', f.last_name) AS faculty_name,
  d.department_name,
  p.period_start,
  p.period_end,
  DATE_FORMAT(p.period_start, '%M %Y') AS month_year,
  p.basic_pay,
  COALESCE(p.allowances, ROUND(p.gross_pay - p.basic_pay, 2)) AS allowances,
  p.gross_pay,
  p.pf_amount,
  p.professional_tax,
  p.lop_amount,
  ROUND(p.pf_amount + p.professional_tax + p.lop_amount, 2) AS total_deductions,
  ROUND(p.net_pay, 2) AS net_pay,
  ROUND(p.net_pay, 2) AS take_home,
  p.payment_status,
  COALESCE(p.payment_date, DATE(p.generated_at)) AS payment_date,
  p.generated_at
FROM payroll p
JOIN faculty f ON f.faculty_id = p.faculty_id
LEFT JOIN department d ON d.department_id = f.department_id;
