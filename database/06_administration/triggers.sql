DELIMITER $$
CREATE TRIGGER trg_fee_structure_after_update AFTER UPDATE ON fee_structure FOR EACH ROW
BEGIN IF OLD.amount<>NEW.amount THEN INSERT INTO fee_structure_audit(fee_structure_id,old_amount,new_amount) VALUES(NEW.fee_structure_id,OLD.amount,NEW.amount); END IF; END$$
CREATE TRIGGER trg_receipt_before_update BEFORE UPDATE ON receipt FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Issued receipts are immutable'; END$$
CREATE TRIGGER trg_receipt_before_delete BEFORE DELETE ON receipt FOR EACH ROW
BEGIN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Issued receipts cannot be deleted'; END$$
CREATE TRIGGER trg_hostel_allocation_before_insert BEFORE INSERT ON hostel_allocation FOR EACH ROW
BEGIN DECLARE v_capacity INT; DECLARE v_occupied INT; IF NEW.status='ACTIVE' AND NOT EXISTS(SELECT 1 FROM student WHERE student_id=NEW.student_id AND status='ACTIVE') THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Only active students may be allocated'; END IF; IF NEW.status='ACTIVE' THEN SELECT capacity INTO v_capacity FROM hostel_room WHERE hostel_room_id=NEW.hostel_room_id; SELECT COUNT(*) INTO v_occupied FROM hostel_allocation WHERE hostel_room_id=NEW.hostel_room_id AND status='ACTIVE'; IF v_occupied>=v_capacity THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Room capacity reached'; END IF; END IF; END$$
CREATE TRIGGER trg_fee_payment_before_update BEFORE UPDATE ON fee_payment FOR EACH ROW
BEGIN IF EXISTS(SELECT 1 FROM receipt WHERE fee_payment_id=OLD.fee_payment_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payment with issued receipt is immutable'; END IF; END$$
CREATE TRIGGER trg_fee_payment_before_delete BEFORE DELETE ON fee_payment FOR EACH ROW
BEGIN IF EXISTS(SELECT 1 FROM receipt WHERE fee_payment_id=OLD.fee_payment_id) THEN SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Payment with issued receipt cannot be deleted'; END IF; END$$
DELIMITER ;
