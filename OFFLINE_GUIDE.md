# KisanCore AI — Offline Features Guide

## What Works Offline

✅ **Home Page**
- View last sensor readings (temperature, humidity, soil moisture)
- See cached weather forecast
- Check cached market prices
- View your active crops and harvest countdown
- Get farming tips (rotates automatically)

✅ **Crops Page**
- ML crop recommendation (uses offline rule-based system)
- Fertilizer calculator (pure math, no internet needed)
- Soil analysis (local logic)
- Add/edit/delete crops (syncs when online)

✅ **IoT Page**
- View last sensor readings
- Toggle pump manually (queues action until online)
- See safety rules and thresholds

✅ **Market Page**
- View cached mandi prices with timestamp
- Search and filter cached data
- See when data was last updated

✅ **Profile Page**
- View and edit your profile
- Changes save locally and sync when online

✅ **Weather Page**
- View 7-day cached forecast
- See last update time

## What Needs Internet

❌ **Chat Page**
- AI responses require live Groq API connection
- You can view chat history offline

❌ **Scan Page**
- Disease detection needs CNN model on server
- Camera/file picker works offline, but analysis doesn't

❌ **Live Data Updates**
- Real-time sensor data from ESP32
- Current market prices
- Fresh weather forecast

## How to Use Offline

1. **Before going offline:** Open the app while connected to internet.
   This caches all pages, images, and latest data.

2. **When offline:** The app works normally. You'll see small badges
   showing "📡 Offline Mode" or "Cached Data" where relevant.

3. **When back online:** Any actions you took offline (adding crops,
   toggling pump, editing profile) automatically sync to the server.
   You'll see a green toast: "✅ Synced X actions to server"

## Install as App

On Android Chrome:
- Visit the website
- Tap menu (⋮) → "Install App" or "Add to Home Screen"
- App installs like a native app
- Works offline just like the website

On iPhone Safari:
- Visit the website  
- Tap Share button → "Add to Home Screen"
- Icon appears on home screen
- Works offline with cached data

## Data Storage

All offline data is stored in your browser:
- LocalStorage: Profile, active crops, settings (5-10 MB)
- IndexedDB: Offline sync queue, large data (50 MB)
- Cache Storage: Pages, images, API responses (100 MB)

Total: ~150 MB — clears when you clear browser data.

## Troubleshooting

**"This page isn't available offline"**
→ You haven't visited that page while online yet.
   Connect to internet, visit all pages once to cache them.

**Changes don't sync when back online**
→ Check browser console (F12) for sync errors
   May need to refresh the page to trigger sync

**Old data showing even when online**
→ Refresh the page (pull down on mobile)
   Cache updates in background but may take a few seconds
