DELIMITER $$
CREATE FUNCTION fn_leave_balance(p_faculty_id INT UNSIGNED,p_type_id INT UNSIGNED,p_year SMALLINT) RETURNS DECIMAL(6,2) READS SQL DATA
BEGIN DECLARE v DECIMAL(6,2); SELECT days_remaining INTO v FROM leave_balance WHERE faculty_id=p_faculty_id AND leave_type_id=p_type_id AND balance_year=p_year; RETURN COALESCE(v,0); END$$
CREATE FUNCTION fn_payroll_net(p_basic DECIMAL(10,2),p_lop DECIMAL(10,2)) RETURNS DECIMAL(10,2) DETERMINISTIC
RETURN ROUND(p_basic + (p_basic*0.20) - (p_basic*0.12) - 200 - p_lop,2)$$
DELIMITER ;
