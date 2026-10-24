-- 01_auth: Analytical Queries

-- Q1: Users per role (GROUP BY with HAVING)
SELECT r.role_name, COUNT(*) AS user_count
FROM app_user u
JOIN role r ON u.role_id = r.role_id
GROUP BY r.role_name
HAVING COUNT(*) >= 1
ORDER BY user_count DESC;

-- Q2: Failed logins per username in the last 24 hours (subquery + GROUP BY)
SELECT la.username_attempted,
       COUNT(*) AS fail_count,
       MAX(la.attempted_at) AS last_failed
FROM login_audit la
WHERE la.success = 0
  AND la.attempted_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
GROUP BY la.username_attempted
ORDER BY fail_count DESC;

-- Q3: RANK of users by failed_attempts within their role (window function)
SELECT u.username,
       r.role_name,
       u.failed_attempts,
       RANK() OVER (PARTITION BY r.role_name ORDER BY u.failed_attempts DESC) AS attempt_rank
FROM app_user u
JOIN role r ON u.role_id = r.role_id
ORDER BY r.role_name, attempt_rank;

-- Q4: Users who have never logged in (subquery / LEFT JOIN)
SELECT u.user_id, u.username, u.email, r.role_name
FROM app_user u
JOIN role r ON u.role_id = r.role_id
WHERE u.last_login_at IS NULL
ORDER BY u.username;
