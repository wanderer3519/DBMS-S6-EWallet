-- db_connect.sql - Database connection configuration

-- Function to create database connection (to be used with PL/pgSQL)
CREATE OR REPLACE FUNCTION get_db_connection()
RETURNS pg_catalog.refcursor AS $$
DECLARE
    ref refcursor;
BEGIN
    OPEN ref FOR EXECUTE 'SELECT 1'; -- Just a placeholder to return a refcursor
    RETURN ref;
END;
$$ LANGUAGE plpgsql; 