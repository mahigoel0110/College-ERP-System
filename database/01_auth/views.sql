-- 01_auth: Views
CREATE OR REPLACE VIEW vw_user_roles AS
SELECT
  u.user_id,
  u.username,
  u.email,
  r.role_name,
  u.is_active,
  u.student_id,
  u.faculty_id,
  CASE
    WHEN u.student_id IS NOT NULL THEN CONCAT(s.first_name, ' ', s.last_name)
    WHEN u.faculty_id IS NOT NULL THEN CONCAT(f.first_name, ' ', f.last_name)
    ELSE u.username
  END AS person_name,
  u.last_login_at,
  u.created_at
FROM app_user u
JOIN role r ON u.role_id = r.role_id
LEFT JOIN student s ON u.student_id = s.student_id
LEFT JOIN faculty f ON u.faculty_id = f.faculty_id;

CREATE OR REPLACE VIEW vw_failed_logins_24h AS
SELECT
  la.username_attempted,
  la.user_id,
  COUNT(*) AS failed_count,
  MAX(la.attempted_at) AS last_attempt,
  la.ip_address
FROM login_audit la
WHERE la.success = 0
  AND la.attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY la.username_attempted, la.user_id, la.ip_address;
