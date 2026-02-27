🚀 Quick Start Guide - Astro Cat Mobile Edition
📋 Prerequisites
Node.js (v18+ recommended)

A Firebase Project (Authentication & Firestore enabled)

Android Studio (Required only if building the native APK/AAB)

📥 Installation
Step 1: Install Backend Dependencies
cd server
npm install

Step 2: Install Frontend Dependencies
cd client
npm install

🔧 Environment Configuration
You need to set up environment variables for both the client and the server.

1. Backend (server/.env)
Create a .env file in the server/ directory:

PORT=3000
CLIENT_URL=http://localhost:5173
NODE_ENV=development

2. Frontend (client/.env)
Create a .env file in the client/ directory with your Socket URL and Firebase config:

VITE_SOCKET_URL=http://localhost:3000
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_https://www.google.com/search?q=project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_https://www.google.com/search?q=project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

🎮 Running Locally
Terminal 1: Start Backend Server
cd server
npm start
(Server should start on http://localhost:3000)

Terminal 2: Start Frontend (in a new terminal)
cd client
npm run dev
(Frontend should start on http://localhost:5173)

Open your browser to http://localhost:5173 to test the web version!

📱 Building the Android App (Capacitor)
To package the web game into a native Android app with AdMob support:

Build the React project for production:
cd client
npm run build

Sync the built web assets with the Android project:
npx cap sync android

Open Android Studio to build the signed APK/AAB:
npx cap open android

Note: Before building your final release for the Google Play Store, remember to increment the versionCode and versionName inside android/app/build.gradle.

📊 Troubleshooting
"Cannot connect to server" (Socket.io)

Check if the backend is running on port 3000.

Verify VITE_SOCKET_URL in your client/.env matches your backend address.

"Popup blocked" or "Unauthorized Domain" (Firebase Auth)

If testing on mobile web, ensure your production hosting domain (e.g., https://www.google.com/search?q=astro-cat.onrender.com) and localhost are added to the Authorized domains list in Firebase Console -> Authentication -> Settings.

"Account is being played on another device"

This is your custom Session Locking system working!

If a session gets stuck while testing or reloading, go to your Firestore Database, find your user document, and manually set 'isOnline' to false.

"Port 3000 already in use"

Mac/Linux: run 'lsof -ti:3000 | xargs kill -9'

Windows: run 'netstat -ano | findstr :3000' and kill the PID.

AdMob Ads Not Showing

On the web, the game will automatically run a "Fake Ad" timer to ensure development and PC gameplay are not interrupted.

Real AdMob video ads will only appear when running on a physical Android device or emulator after building through Android Studio.