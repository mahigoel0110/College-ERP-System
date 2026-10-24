-- 03_faculty_a: Functions
DELIMITER $$

DROP FUNCTION IF EXISTS fn_weekly_workload$$
CREATE FUNCTION fn_weekly_workload(p_faculty_id INT UNSIGNED)
RETURNS TINYINT UNSIGNED
READS SQL DATA
BEGIN
  DECLARE v_total INT UNSIGNED DEFAULT 0;

  SELECT COALESCE(SUM(hours_per_week), 0) INTO v_total
  FROM course_allocation
  WHERE faculty_id = p_faculty_id;

  RETURN v_total;
END$$

DROP FUNCTION IF EXISTS fn_years_of_service$$
CREATE FUNCTION fn_years_of_service(p_faculty_id INT UNSIGNED)
RETURNS SMALLINT UNSIGNED
READS SQL DATA
BEGIN
  DECLARE v_join DATE;

  SELECT date_of_joining INTO v_join
  FROM faculty_profile
  WHERE faculty_id = p_faculty_id;

  IF v_join IS NULL THEN
    RETURN 0;
  END IF;

  RETURN TIMESTAMPDIFF(YEAR, v_join, CURDATE());
END$$

DELIMITER ;
