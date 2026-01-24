# Set database connection parameters
$env:PGUSER = "postgres"
$env:PGPASSWORD = "your_password"  # Replace with actual password
$env:PGDATABASE = "fluxcore"
$env:PGHOST = "localhost"
$env:PGPORT = "5432"

# Run the migration SQL
psql -f scripts\apply-vector-store-migration.sql

# Verify the migration
psql -c "SELECT id, name, backend, source FROM fluxcore_vector_stores LIMIT 5;"
