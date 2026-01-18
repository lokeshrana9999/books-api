# Vercel Deployment Guide

Complete step-by-step guide to deploy the Books API to Vercel with Supabase.

## Prerequisites

- ✅ Supabase project created and database connection string ready
- ✅ Code committed to Git (GitHub, GitLab, or Bitbucket)
- ✅ Vercel account (sign up at [vercel.com](https://vercel.com))

## Step 1: Get Supabase Connection Pooler String

**Important**: For Vercel serverless functions, you MUST use the connection pooler, not the direct connection.

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Database**
4. Scroll to **Connection Pooling** section
5. Select **Session** mode
6. Copy the connection string
7. **Add `&connection_limit=1`** at the end (required for serverless)

Your connection string should look like:
```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended for first-time)

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Import project in Vercel:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Click **Import Git Repository**
   - Select your repository
   - Click **Import**

3. **Configure project:**
   - **Framework Preset**: Other
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run vercel-build` (auto-detected)
   - **Output Directory**: (leave empty)
   - **Install Command**: `npm install` (auto-detected)

4. **Add Environment Variables:**
   Click **Environment Variables** and add:
   
   | Name | Value | Environment |
   |------|-------|-------------|
   | `DATABASE_URL` | Your Supabase pooler connection string | Production, Preview, Development |
   | `LOG_LEVEL` | `info` | Production, Preview, Development |
   | `LOG_SINK` | `file` | Production, Preview, Development |
   | `NODE_ENV` | `production` | Production only |

   **Important**: 
   - For `DATABASE_URL`, use the **connection pooler** string with `&connection_limit=1`
   - Replace `[password]` with your actual database password
   - Make sure to add it to all environments (Production, Preview, Development)

5. **Deploy:**
   - Click **Deploy**
   - Wait for build to complete (2-3 minutes)

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project:**
   ```bash
   vercel link
   ```
   - Follow prompts to select/create project
   - Choose default settings

4. **Set environment variables:**
   ```bash
   # Set DATABASE_URL (use connection pooler!)
   vercel env add DATABASE_URL
   # Paste your connection pooler string when prompted
   # Select: Production, Preview, Development
   
   # Set other variables
   vercel env add LOG_LEVEL
   # Enter: info
   # Select: Production, Preview, Development
   
   vercel env add LOG_SINK
   # Enter: file
   # Select: Production, Preview, Development
   
   vercel env add NODE_ENV
   # Enter: production
   # Select: Production only
   ```

5. **Deploy:**
   ```bash
   # Deploy to preview
   vercel
   
   # Deploy to production
   vercel --prod
   ```

## Step 3: Run Database Migrations

After deployment, you need to run migrations on your production database.

### Option A: Using Vercel CLI

```bash
# Set production DATABASE_URL locally
export DATABASE_URL="your-production-connection-pooler-string"

# Run migrations
npx prisma migrate deploy
```

### Option B: Using Supabase SQL Editor

1. Go to Supabase Dashboard → **SQL Editor**
2. Run the migration SQL manually (from `prisma/migrations/` folder)

### Option C: Add Post-Deploy Hook (Recommended)

Add to `package.json`:

```json
{
  "scripts": {
    "postdeploy": "prisma migrate deploy"
  }
}
```

Then set `DATABASE_URL` in Vercel and migrations will run automatically after each deploy.

## Step 4: Seed Production Database (Optional)

**Warning**: Only run this once, or it will create duplicate data.

```bash
# Set production DATABASE_URL
export DATABASE_URL="your-production-connection-pooler-string"

# Run seed (only once!)
npm run seed
```

Or use Supabase Dashboard → **Table Editor** to manually add initial data.

## Step 5: Verify Deployment

1. **Check deployment URL:**
   - Vercel will provide a URL like: `https://your-project.vercel.app`
   - Check deployment logs in Vercel Dashboard

2. **Test health endpoint:**
   ```bash
   curl https://your-project.vercel.app/health
   ```
   Should return: `{"status":"ok","timestamp":"..."}`

3. **Test API endpoint:**
   ```bash
   curl -H "X-API-Key: admin-api-key-12345" \
     https://your-project.vercel.app/api/books
   ```

4. **Check logs:**
   - Vercel Dashboard → Your Project → **Logs**
   - Or: `vercel logs`

## Step 6: Configure Custom Domain (Optional)

1. Go to Vercel Dashboard → Your Project → **Settings** → **Domains**
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate (automatic)

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Supabase connection pooler string | `postgresql://postgres.[ref]:[pass]@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1` |
| `LOG_LEVEL` | Logging level | `info` |
| `LOG_SINK` | Log destination | `file` |
| `NODE_ENV` | Environment | `production` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port (not used in serverless) | `3000` |

## Troubleshooting

### Build Fails

**Error**: `Prisma Client not generated`
- **Solution**: Ensure `vercel-build` script includes `prisma generate`
- Check: `package.json` should have `"vercel-build": "prisma generate && tsc"`

**Error**: `Cannot find module`
- **Solution**: Ensure all dependencies are in `dependencies`, not `devDependencies`
- Run: `npm install --production` locally to test

### Runtime Errors

**Error**: `P1001: Can't reach database server`
- **Solution**: 
  - Verify `DATABASE_URL` is correct
  - Use connection pooler, not direct connection
  - Check Supabase project is active

**Error**: `Too many connections`
- **Solution**: 
  - Use connection pooler
  - Add `&connection_limit=1` to connection string
  - Check Supabase connection limits

**Error**: `Authentication failed`
- **Solution**: 
  - Verify database password is correct
  - Check connection string format
  - Ensure password is URL-encoded if it contains special characters

### Cold Start Issues

**Problem**: First request is slow
- **Solution**: 
  - This is normal for serverless
  - Consider Vercel Pro plan for faster cold starts
  - Use connection pooling (already configured)

### Logging Issues

**Problem**: Logs not appearing
- **Solution**: 
  - Check `LOG_SINK` is set correctly
  - For production, consider `logtail` or `elastic` instead of `file`
  - Check Vercel function logs in dashboard

## Post-Deployment Checklist

- [ ] Deployment successful (no build errors)
- [ ] Health endpoint returns 200
- [ ] Database migrations run successfully
- [ ] Seed data created (if needed)
- [ ] API endpoints responding correctly
- [ ] Authentication working
- [ ] Audit logs being created
- [ ] Environment variables set for all environments
- [ ] Custom domain configured (if applicable)
- [ ] Monitoring/logging set up

## Continuous Deployment

Once connected to Git:
- **Automatic deployments** on every push to `main` branch
- **Preview deployments** for pull requests
- **Rollback** capability in Vercel Dashboard

## Useful Commands

```bash
# View deployments
vercel ls

# View logs
vercel logs

# Open project in browser
vercel open

# Remove deployment
vercel remove

# Check environment variables
vercel env ls
```

## Support Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Vercel Support](https://vercel.com/support)
