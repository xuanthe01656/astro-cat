🎯 Installation Checklist & Setup Commands
✅ 1. What Was Created & Updated
Root Directory
.gitignore - Git ignore config

README.md - Main documentation

QUICKSTART.md - Quick setup guide

MIGRATION.md - Technical evolution details

PROJECT_SUMMARY.md - Project overview

SETUP.md - This file

Backend (Node.js + Express + Socket.io)
server/

.env - Environment config (PORT, CLIENT_URL)

package.json - Dependencies

server.js - Main server (Socket handlers, Room management)

Frontend (React + Vite + Firebase)
client/

.env - Environment config (VITE_SOCKET_URL, VITE_FIREBASE_*)

capacitor.config.ts - Mobile wrapper configuration

package.json - Dependencies (react, firebase, capacitor, admob)

src/App.jsx - Main game component (Canvas, Auth, AdMob, Logic)

src/firebase.js - Firebase initialization

src/constants.js - Game configs (Skins, Backgrounds, Physics)

Mobile (Native Android)
android/

app/src/main/AndroidManifest.xml - Android permissions and AdMob App ID

app/build.gradle - Version Code and Version Name for Play Store

📋 2. Firebase Configuration (CRITICAL)
Before running the game, you must configure Firebase:

Create a Firebase Project: Go to console.firebase.google.com.

Enable Authentication: Go to Build -> Authentication. Enable the "Google" sign-in provider.

Add Authorized Domains: In Authentication -> Settings -> Authorized domains, ensure you add:

localhost

https://www.google.com/search?q=your-app.onrender.com (Your production backend/frontend URL)

Enable Firestore Database: Go to Build -> Firestore Database. Create a database and set up basic security rules (e.g., allow read/write if request.auth != null).

Get Config: Go to Project Settings -> General, create a Web App, and copy the firebaseConfig keys for your .env file.

💰 3. AdMob Configuration
To enable Rewarded Video Ads on Android:

Create an AdMob Account: Go to https://www.google.com/search?q=apps.admob.com.

Add an App: Select Android, and copy your AdMob App ID.

Create an Ad Unit: Create a "Rewarded Ad" unit and copy the Ad Unit ID.

Update Android Manifest: Paste your AdMob App ID into the <meta-data> tag inside client/android/app/src/main/AndroidManifest.xml.

Update App.jsx: Replace the test Ad Unit ID in the watchAd function with your real Ad Unit ID (when ready for production).

💻 4. Installation Commands
Step 1: Backend Setup
cd server
npm install
(Installs express, socket.io, cors, dotenv)

Step 2: Frontend Setup
cd ../client
npm install
(Installs react, firebase, socket.io-client, @capacitor/core, @capacitor-community/admob)

🔧 5. Environment Variables
Create the necessary .env files before starting.

server/.env:
PORT=3000
CLIENT_URL=http://localhost:5173
NODE_ENV=development

client/.env:
VITE_SOCKET_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_https://www.google.com/search?q=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_https://www.google.com/search?q=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

🎮 6. Testing Checklist
After installation, verify these scenarios:

✅ Services Running

Backend runs on port 3000 without crashing.

Frontend loads on http://localhost:5173.

✅ Authentication & Database

Click "Login with Google".

Popup appears on Desktop Web, Redirect works on Mobile Web.

High scores, coins, and lives load correctly from Firestore.

Cross-Device Block: Open a second tab, try to log in, and verify the "Account played on another device" error appears.

✅ Gameplay & Multiplayer

Single Player: Play, die, and check if Lives decrease.

Multiplayer: Create a room on Tab 1, join on Tab 2, and verify real-time syncing.

✅ Monetization

Click "Watch Ad" for Coins or Lives.

Web Browser: Verify the 3-second fake ad toast appears and rewards are given.

Android APK: Verify the actual AdMob video plays.

📱 7. Building for Android
When ready to package the game for the Google Play Store:

Build React Web Assets:
cd client
npm run build

Sync with Android Project:
npx cap sync android

Open Android Studio:
npx cap open android
(From here, you can generate a signed APK or AAB bundle).