#!/bin/bash

# Clear test database using SQL file with retry logic
# Capture output and only print if command fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/clear-test-database.sql"
MAX_RETRIES=5
RETRY_DELAY=2

for i in $(seq 1 $MAX_RETRIES); do
    # Add small delay to avoid concurrent access
    sleep 1
    
    # Capture both stdout and stderr
    OUTPUT=$(npx wrangler@latest d1 execute --env=test test-schedule-manager --local --file="$SQL_FILE" 2>&1)
    EXIT_CODE=$?
    
    # Success case
    if [ $EXIT_CODE -eq 0 ]; then
        exit 0
    fi
    
    # Check if it's a database busy error
    if echo "$OUTPUT" | grep -q "SQLITE_BUSY\|database is locked"; then
        if [ $i -lt $MAX_RETRIES ]; then
            echo "Database busy, retrying in ${RETRY_DELAY}s... (attempt $i/$MAX_RETRIES)"
            sleep $RETRY_DELAY
            continue
        fi
    fi
    
    # Other error or max retries reached
    echo "Failed to clear test database after $i attempts:"
    echo "$OUTPUT"
    exit $EXIT_CODE
done