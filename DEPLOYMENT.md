# KisanCore Frontend Deployment to Vercel

## Prerequisites
- GitHub account
- Vercel account (sign up free at vercel.com)
- Code pushed to GitHub repository

## Step 1 — Push Code to GitHub
```bash
cd kisancore-ai
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kisancore-ai.git
git push -u origin main
```

## Step 2 — Deploy to Vercel
1. Go to vercel.com → Log in with GitHub
2. Click "New Project"
3. Import your kisancore-ai repository
4. Framework Preset: Vite
5. Root Directory: frontend
6. Build Command: npm run build (auto-detected)
7. Output Directory: dist (auto-detected)
8. Environment Variables:
   - Key: VITE_API_URL
   - Value: https://kisancore-ai-1.onrender.com (add after backend deployed)
9. Click "Deploy"

## Step 3 — Wait for Deployment
- Vercel builds your app (takes 1-2 minutes)
- When done, you get a URL: https://kisancore-ai.vercel.app

## Step 4 — Test PWA Installation
1. Open your deployed URL on mobile Chrome
2. You should see "Install App" banner
3. Click Install → app installs like native app
4. Open from home screen → works offline!

## Step 5 — Update Backend CORS
After deployment, your frontend URL is: https://kisancore-ai.vercel.app
Update backend/.env to allow this origin:
CORS_ORIGINS=http://localhost:5173,https://kisancore-ai.vercel.app

Redeploy backend (next section).

## Troubleshooting
- Build fails: Check frontend/package.json has correct "build" script
- Routes 404: vercel.json rewrites should fix this
- API calls fail: Check VITE_API_URL is set in Vercel dashboard
- PWA doesn't install: Check manifest.json and sw.js are in public folder

## Custom Domain (Optional)
1. Buy domain at Namecheap/GoDaddy: kisancore.com
2. Vercel Dashboard → Your Project → Settings → Domains
3. Add kisancore.com
4. Update DNS records as shown by Vercel
5. Wait 24 hours → your app is at https://kisancore.com
