SELECT f.faculty_id,f.employee_code,SUM(p.net_pay) total_net FROM faculty f JOIN payroll p ON p.faculty_id=f.faculty_id GROUP BY f.faculty_id,f.employee_code HAVING SUM(p.net_pay)>0;
SELECT faculty_id,days_remaining FROM vw_leave_balance WHERE days_remaining<(SELECT AVG(days_remaining) FROM leave_balance);
SELECT faculty_id,period_start,net_pay,RANK() OVER(PARTITION BY period_start ORDER BY net_pay DESC) pay_rank FROM payroll;
