DELIMITER $$
CREATE FUNCTION fn_late_fee(p_amount DECIMAL(10,2),p_rate DECIMAL(5,2),p_due DATE,p_paid DATE) RETURNS DECIMAL(10,2) DETERMINISTIC
RETURN IF(p_paid>p_due,ROUND(p_amount*p_rate/100,2),0)$$
CREATE FUNCTION fn_room_vacancy(p_room INT UNSIGNED) RETURNS INT READS SQL DATA
BEGIN DECLARE v_cap INT; DECLARE v_used INT; SELECT capacity INTO v_cap FROM hostel_room WHERE hostel_room_id=p_room; SELECT COUNT(*) INTO v_used FROM hostel_allocation WHERE hostel_room_id=p_room AND status='ACTIVE'; RETURN GREATEST(COALESCE(v_cap,0)-v_used,0); END$$
DELIMITER ;
