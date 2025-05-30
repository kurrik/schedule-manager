#!/bin/bash

# Clear test database using SQL file
# Capture output and only print if command fails

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/clear-test-database.sql"

# Capture both stdout and stderr
OUTPUT=$(npx wrangler@latest d1 execute --env=test test-schedule-manager --local --file="$SQL_FILE" 2>&1)
EXIT_CODE=$?

# Only print output if command failed
if [ $EXIT_CODE -ne 0 ]; then
    echo "Failed to clear test database:"
    echo "$OUTPUT"
    exit $EXIT_CODE
fi

# Silent success
exit 0