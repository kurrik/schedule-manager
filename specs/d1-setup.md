# D1 Database Setup Guide

## Initial Setup

1. **Create D1 Database:**
```bash
npx wrangler d1 create schedule-manager
```

2. **Update wrangler.jsonc:**
Replace the `database_id: "TBD"` in `wrangler.jsonc` with the actual database ID from step 1.

3. **Apply Schema:**
```bash
npx wrangler d1 execute schedule-manager --local --file=./schema.sql
npx wrangler d1 execute schedule-manager --remote --file=./schema.sql
```

## Development

- **Local Development:** Uses `--local` flag for local D1 instance
- **Production:** Uses remote D1 database

## Migration Notes

- **Sessions:** Still use KV for Google Auth sessions (unchanged)
- **Data Storage:** All schedule data now in D1 with proper indexes
- **Performance:** Much faster queries with proper SQL indexes
- **Scalability:** Can handle many users efficiently

## Key Improvements

- ✅ **Efficient User Queries:** No more full table scans
- ✅ **Proper Relationships:** Foreign keys between schedules/users/entries
- ✅ **Override Ready:** Schema includes `schedule_overrides` table
- ✅ **Indexed Lookups:** All frequently queried fields are indexed
- ✅ **Atomic Operations:** D1 batch operations for data consistency