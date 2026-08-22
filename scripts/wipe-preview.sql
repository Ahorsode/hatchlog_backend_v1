SELECT schemaname, relname, n_live_tup
FROM pg_stat_user_tables
WHERE schemaname IN ('public', 'auth', 'storage')
ORDER BY schemaname, n_live_tup DESC;
