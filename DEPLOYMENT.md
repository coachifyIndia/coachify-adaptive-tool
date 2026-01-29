# Coachify - Free Production Deployment Guide

This guide walks you through deploying Coachify using **100% free services**.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│     Vercel      │  API    │     Render      │  DB     │  MongoDB Atlas  │
│   (Frontend)    │ ──────► │    (Backend)    │ ──────► │   (Database)    │
│   React SPA     │         │   Node.js API   │         │    512 MB       │
│     FREE        │         │     FREE        │         │     FREE        │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

## Free Tier Limits

| Service | Free Tier | Limits |
|---------|-----------|--------|
| **Vercel** | Hobby | 100GB bandwidth, unlimited deployments |
| **Render** | Free | 750 hours/month, sleeps after 15min inactivity |
| **MongoDB Atlas** | M0 | 512 MB storage, shared cluster |

---

## Step 1: MongoDB Atlas Setup (Database)

### 1.1 Create Account
1. Go to [mongodb.com/atlas](https://www.mongodb.com/atlas)
2. Sign up for free account

### 1.2 Create Cluster
1. Click "Build a Database"
2. Select **FREE - Shared** (M0 Sandbox)
3. Choose cloud provider: **AWS**
4. Choose region: Closest to your users (e.g., `us-east-1`)
5. Cluster name: `coachify-cluster`
6. Click "Create Cluster"

### 1.3 Create Database User
1. Go to **Database Access** (left sidebar)
2. Click "Add New Database User"
3. Authentication: Password
4. Username: `coachify_admin`
5. Password: Generate secure password (save it!)
6. Database User Privileges: **Read and write to any database**
7. Click "Add User"

### 1.4 Configure Network Access
1. Go to **Network Access** (left sidebar)
2. Click "Add IP Address"
3. Click **"Allow Access from Anywhere"** (0.0.0.0/0)
   - Required for Render's dynamic IPs
4. Click "Confirm"

### 1.5 Get Connection String
1. Go to **Database** (left sidebar)
2. Click "Connect" on your cluster
3. Select "Connect your application"
4. Copy the connection string:
   ```
   mongodb+srv://coachify_admin:<password>@coachify-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<password>` with your actual password
6. Add database name: `coachify` before the `?`:
   ```
   mongodb+srv://coachify_admin:YOUR_PASSWORD@coachify-cluster.xxxxx.mongodb.net/coachify?retryWrites=true&w=majority
   ```

---

## Step 2: Backend Deployment (Render)

### 2.1 Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub (recommended for auto-deploy)

### 2.2 Create Web Service
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure:
   - **Name**: `coachify-api`
   - **Region**: Choose closest to your MongoDB cluster
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: Free

### 2.3 Set Environment Variables
In Render dashboard → Environment tab, add:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `10000` |
| `MONGODB_URI` | Your MongoDB Atlas connection string |
| `JWT_SECRET` | Generate: `openssl rand -base64 64` |
| `JWT_REFRESH_SECRET` | Generate: `openssl rand -base64 64` |
| `CORS_ORIGIN` | `https://your-app.vercel.app` (set after Vercel deploy) |
| `JWT_ACCESS_TOKEN_EXPIRY` | `4h` |
| `JWT_REFRESH_TOKEN_EXPIRY` | `7d` |

### 2.4 Deploy
1. Click "Create Web Service"
2. Wait for build to complete (5-10 minutes)
3. Note your URL: `https://coachify-api.onrender.com`
4. Test: Visit `https://coachify-api.onrender.com/health`

---

## Step 3: Frontend Deployment (Vercel)

### 3.1 Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### 3.2 Import Project
1. Click "Add New..." → "Project"
2. Import your GitHub repository
3. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 3.3 Set Environment Variables
In Vercel → Settings → Environment Variables:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://coachify-api.onrender.com/api/v1` |

### 3.4 Deploy
1. Click "Deploy"
2. Wait for build (2-3 minutes)
3. Note your URL: `https://your-app.vercel.app`

---

## Step 4: Connect Frontend & Backend

### 4.1 Update Render CORS
1. Go to Render dashboard
2. Environment → Edit `CORS_ORIGIN`
3. Set to your Vercel URL: `https://your-app.vercel.app`
4. Click "Save Changes" (triggers redeploy)

### 4.2 Verify Connection
1. Visit your Vercel URL
2. Try logging in with admin credentials
3. Check browser console for any CORS errors

---

## Step 5: Initial Setup

### 5.1 Change Default Admin Password
1. Login at `https://your-app.vercel.app/admin/login`
2. Default credentials:
   - Email: `admin@coachify.com`
   - Password: `Admin@123`
3. **IMMEDIATELY** go to settings and change password!

### 5.2 Seed Initial Data (Optional)
If you need sample questions/users, run locally:
```bash
# Set production MongoDB URI locally
export MONGODB_URI="your-atlas-connection-string"
npm run db:seed
```

---

## Troubleshooting

### Backend "Sleeping" on Render Free Tier
- Free tier services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds (cold start)
- **Solution**: Use [UptimeRobot](https://uptimerobot.com) (free) to ping `/health` every 14 minutes

### CORS Errors
- Ensure `CORS_ORIGIN` in Render exactly matches your Vercel URL
- Include `https://` prefix
- No trailing slash

### MongoDB Connection Issues
- Verify IP whitelist includes `0.0.0.0/0`
- Check username/password are correct
- Ensure database name is in connection string

### Build Failures
- Check Render/Vercel build logs
- Ensure all dependencies are in `package.json`
- Node version should be 18+

---

## Cost Summary

| Service | Monthly Cost |
|---------|--------------|
| Vercel (Frontend) | $0 |
| Render (Backend) | $0 |
| MongoDB Atlas | $0 |
| **Total** | **$0** |

---

## Upgrading Later

When you need more power:

| Need | Solution | Cost |
|------|----------|------|
| No cold starts | Render Starter ($7/mo) | $7/mo |
| More DB storage | MongoDB M2 ($9/mo) | $9/mo |
| Custom domain | Free on both platforms | $10-15/yr for domain |
| More bandwidth | Vercel Pro ($20/mo) | $20/mo |

---

## Security Checklist

- [ ] Changed default admin password
- [ ] Using strong JWT secrets (not defaults)
- [ ] CORS_ORIGIN set to exact frontend URL
- [ ] MongoDB user has minimal required permissions
- [ ] No sensitive data in git repository
- [ ] `.env` files in `.gitignore`
