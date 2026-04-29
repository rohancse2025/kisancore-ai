# KisanCore Backend Deployment to Render

## Prerequisites
- Render account (sign up free at render.com)
- Code pushed to GitHub
- API keys ready: GROQ_API_KEY, OPENWEATHER_API_KEY, Twilio keys

## Step 1 — Create Render Account
1. Go to render.com → Sign up with GitHub
2. Authorize Render to access your repositories

## Step 2 — Create PostgreSQL Database
1. Render Dashboard → New → PostgreSQL
2. Name: kisancore-db
3. Database: kisancore
4. User: kisancore_user
5. Region: Singapore (or closest to you)
6. Plan: Free
7. Click "Create Database"
8. Wait 2 minutes for database to provision
9. Copy the **Internal Database URL** → looks like:
   `postgres://kisancore_user:RANDOM_PASSWORD@dpg-xxxxx/kisancore`

## Step 3 — Deploy Backend Web Service
1. Render Dashboard → New → Web Service
2. Connect your GitHub repository: `kisancore-ai`
3. Name: `kisancore-api`
4. Region: Singapore (same as database)
5. Branch: `main`
6. Root Directory: `backend`
7. Runtime: `Python 3`
8. Build Command: `pip install -r requirements.txt`
9. Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
10. Plan: `Free`

## Step 4 — Add Environment Variables
In the **Environment** section, add these:

- `GROQ_API_KEY` = your_groq_api_key_here
- `OPENWEATHER_API_KEY` = your_openweather_key_here
- `TWILIO_ACCOUNT_SID` = your_twilio_sid_here
- `TWILIO_AUTH_TOKEN` = your_twilio_token_here
- `TWILIO_WHATSAPP_FROM` = whatsapp:+14155238886
- `SECRET_KEY` = (click "Generate" button)
- `DATABASE_URL` = paste the URL from Step 2
- `CORS_ORIGINS` = `https://kisancore-ai.vercel.app,http://localhost:5173`

11. Click "Create Web Service"

## Step 5 — Wait for Deployment
- Render builds your app (takes 3-5 minutes first time)
- Watch the logs in real-time
- When you see: `Uvicorn running on http://0.0.0.0:10000` → **SUCCESS**
- Your API URL: `https://kisancore-api.onrender.com`

## Step 6 — Test API
Open browser: `https://kisancore-api.onrender.com/api/v1/health`
You should see: `{"status": "ok", "app": "ai-smart-agriculture", "environment": "dev"}`

Test docs: `https://kisancore-api.onrender.com/docs`
You should see FastAPI Swagger UI with all endpoints.

## Step 7 — Update Frontend
Update `frontend/.env.production`:
`VITE_API_URL=https://kisancore-api.onrender.com`

Redeploy frontend on Vercel:
- Vercel auto-redeploys when you push to GitHub
- Or manually: Vercel Dashboard → Deployments → Redeploy

## Step 8 — Update ESP32 Code
In your Arduino sketch, update:
```cpp
const char* SERVER_IP = "kisancore-api.onrender.com";
const int SERVER_PORT = 443;  // HTTPS
const String SERVER_PATH = "/api/v1/iot/data";
```
Use a library like `WiFiClientSecure` or `HTTPSRedirect` for HTTPS on ESP32.

## Step 9 — Update WhatsApp Webhook
Twilio Console → Your WhatsApp Sandbox → Webhook URL:
`https://kisancore-api.onrender.com/api/v1/sms/webhook`

Send test message: `STATUS`
You should get live farm readings reply.

## Troubleshooting
- **Build fails**: Check `requirements.txt` has all dependencies.
- **Database connection error**: Check `DATABASE_URL` is correct.
- **CORS error**: Add your Vercel URL to `CORS_ORIGINS`.
- **ESP32 can't connect**: Render free tier sleeps after 15 min inactivity. First request takes 30s to wake up.

## Free Tier Limitations
- Sleeps after 15 minutes of inactivity.
- 750 hours/month free.
- Database: 1GB storage, 97 connection limit.
- Upgrade to paid plan for production: $7/month for always-on.
