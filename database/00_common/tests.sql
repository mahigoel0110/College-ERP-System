-- Tests for 00_common: verify seed data counts
START TRANSACTION;

SELECT
  CASE WHEN cnt >= 4 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT('00_common: departments count = ', cnt) AS test
FROM (SELECT COUNT(*) AS cnt FROM department) t;

SELECT
  CASE WHEN cnt >= 4 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT('00_common: programs count = ', cnt) AS test
FROM (SELECT COUNT(*) AS cnt FROM program) t;

SELECT
  CASE WHEN cnt >= 12 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT('00_common: students count = ', cnt) AS test
FROM (SELECT COUNT(*) AS cnt FROM student) t;

SELECT
  CASE WHEN cnt >= 8 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT('00_common: faculty count = ', cnt) AS test
FROM (SELECT COUNT(*) AS cnt FROM faculty) t;

SELECT
  CASE WHEN cnt >= 1 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT('00_common: academic_year count = ', cnt) AS test
FROM (SELECT COUNT(*) AS cnt FROM academic_year) t;

SELECT
  CASE WHEN cnt >= 2 THEN 'PASS' ELSE 'FAIL' END AS result,
  CONCAT('00_common: semester count = ', cnt) AS test
FROM (SELECT COUNT(*) AS cnt FROM semester) t;

ROLLBACK;
