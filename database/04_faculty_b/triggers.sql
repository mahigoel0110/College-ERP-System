DELIMITER $$
CREATE TRIGGER trg_leave_request_before_update BEFORE UPDATE ON leave_request FOR EACH ROW
BEGIN IF OLD.status<>'PENDING' AND NEW.status<>OLD.status THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Decided leave request is immutable'; END IF; END$$
CREATE TRIGGER trg_salary_structure_after_update AFTER UPDATE ON salary_structure FOR EACH ROW
BEGIN IF OLD.basic_pay<>NEW.basic_pay THEN INSERT INTO salary_change_log(salary_structure_id,old_basic_pay,new_basic_pay) VALUES(NEW.salary_structure_id,OLD.basic_pay,NEW.basic_pay); END IF; END$$
DELIMITER ;
