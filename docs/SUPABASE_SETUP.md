# Supabase Setup Guide

## Values to Get from Supabase Dashboard

### From API Settings Page (Current Page)

**Project URL** (Optional - for Supabase client, not needed for Prisma):
- Value: `https://aylqypmwlqtnaastyaxw.supabase.co`
- Location: API Settings → Project URL
- Note: You don't need this for Prisma integration, but it's useful if you want to use Supabase client libraries later

### From Database Settings (Required for Prisma)

You need to navigate to **Settings → Database** to get the connection string:

1. **Direct Connection String** (for local development):
   - Location: Settings → Database → Connection string → URI
   - Format: `postgresql://postgres:[YOUR-PASSWORD]@db.[project-ref].supabase.co:5432/postgres`
   - Steps:
     1. Go to Supabase Dashboard
     2. Select your project
     3. Click **Settings** (gear icon) in left sidebar
     4. Click **Database** under Configuration
     5. Scroll to **Connection string** section
     6. Select **URI** tab
     7. Copy the connection string
     8. Replace `[YOUR-PASSWORD]` with your actual database password

2. **Connection Pooler String** (for Vercel/serverless):
   - Location: Settings → Database → Connection Pooling
   - Format: `postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
   - Steps:
     1. Go to Settings → Database
     2. Scroll to **Connection Pooling** section
     3. Copy the connection string (Supabase's pooler automatically uses transaction mode)
     4. **IMPORTANT**: Add `?pgbouncer=true&connection_limit=1` to the connection string
     5. This tells Prisma to disable prepared statements, preventing "prepared statement already exists" errors

## Quick Setup Steps

1. **Get Connection String:**
   - Go to: Settings → Database → Connection string → URI
   - Copy the connection string
   - Replace `[YOUR-PASSWORD]` with your database password

2. **Create `.env` file:**
   ```bash
   cp env.example .env
   ```

3. **Add to `.env`:**
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.aylqypmwlqtnaastyaxw.supabase.co:5432/postgres?schema=public"
   ```

4. **Generate Prisma Client:**
   ```bash
   npm run db:generate
   ```

5. **Run Migrations:**
   ```bash
   npm run db:migrate
   ```

6. **Seed Database:**
   ```bash
   npm run seed
   ```

## Your Project Details

Based on your API Settings page:
- **Project Reference**: `aylqypmwlqtnaastyaxw`
- **Project URL**: `https://aylqypmwlqtnaastyaxw.supabase.co`

Your connection string will look like:
```
postgresql://postgres:[YOUR-PASSWORD]@db.aylqypmwlqtnaastyaxw.supabase.co:5432/postgres?schema=public
```

## Important Notes

- **Never commit your `.env` file** - it contains sensitive credentials
- **Use connection pooler for Vercel** - Direct connections can exhaust connection limits in serverless
- **Keep your database password secure** - Store it only in environment variables
- **Test locally first** - Use direct connection for local development, pooler for production

## Troubleshooting

- **Connection refused**: Check that your IP is allowed in Supabase Dashboard → Settings → Database → Network Restrictions
- **Authentication failed**: Verify your password is correct
- **Too many connections**: Use connection pooler instead of direct connection
- **SSL required**: Supabase requires SSL - Prisma handles this automatically
- **"prepared statement already exists" error**: 
  - **Cause**: Prisma uses prepared statements that conflict with connection poolers
  - **Solution**: Ensure your connection string includes `?pgbouncer=true` parameter
  - **Format**: `postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`
  - The `pgbouncer=true` parameter tells Prisma to disable prepared statements