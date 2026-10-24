SELECT fs.fee_name,COUNT(fp.fee_payment_id) payments,SUM(fp.total_amount) total FROM fee_structure fs LEFT JOIN fee_payment fp ON fp.fee_structure_id=fs.fee_structure_id GROUP BY fs.fee_structure_id,fs.fee_name HAVING COUNT(fp.fee_payment_id)>0;
SELECT student_id,fee_structure_id FROM vw_pending_fees WHERE amount>(SELECT AVG(amount) FROM fee_structure);
SELECT hostel_room_id,room_no,occupied,RANK() OVER(ORDER BY occupied DESC) occupancy_rank FROM vw_room_occupancy;
