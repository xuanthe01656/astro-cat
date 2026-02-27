🔄 Migration History: PeerJS → Socket.io → Firebase & Capacitor
Overview
Astro Cat has undergone a massive architectural evolution. What began as a single HTML file using PeerJS for peer-to-peer networking is now a modular, cloud-connected, cross-platform application ready for production.

Phase 1: Networking (PeerJS → Socket.io)
Before (PeerJS)
Direct peer-to-peer connections.

Room management handled entirely on the client-side.

Prone to firewall/NAT issues and sudden connection drops.

After (Socket.io)
Server-routed communication using Node.js and Express.

Server securely manages room creation and matchmaking (Codes 1000-9999).

Significantly lower latency and higher reliability.

Clean separation of frontend (React) and backend (Node).

Phase 2: Data & Authentication (LocalStorage → Firebase)
Before
Guest-only system.

High scores, coins, and lives saved locally in the browser's localStorage.

Player progress permanently lost if the cache is cleared or if switching devices.

After (Firebase Integration)
Google Authentication: Players can log in securely across any device.

Firestore Database: Centralized cloud storage for User Profiles (coins, lives, inventory, equipped items) and Leaderboards.

Smart Session Locking: Implemented a custom security algorithm utilizing 'isOnline', 'last_session_id', and a 'last_update_ms' grace period. This strictly prevents a single account from being played on multiple devices or tabs simultaneously.

Hybrid Auth Flow: Dynamically uses 'signInWithPopup' for Web platforms to maintain session stability, and 'signInWithRedirect' for Native Mobile apps to bypass strict browser cross-site tracking preventions.

Phase 3: Platform Expansion (Web → Native Android)
Before
Playable strictly via web browsers. No app store presence.

After (Capacitor JS)
Integrated Capacitor to wrap the React web application into a native mobile environment.

Fully supports generating APK and AAB files via Android Studio for Google Play Store distribution.

Added native device checks (Capacitor.isNativePlatform()) to route specific logic (like Auth and Ads) to either web or mobile environments.

Phase 4: Monetization & UI Polish
AdMob Monetization
Before: Hardcoded reward buttons strictly for UI testing.

After: Integrated '@capacitor-community/admob'. Native Android builds now trigger real Rewarded Video Ads. The Web version gracefully falls back to a simulated 3-second ad timer, ensuring uninterrupted gameplay and testing on PC.

Responsive UI / UX
HUD and UI elements transitioned from rigid fixed pixel values to dynamic 'vw', 'vh', and CSS 'clamp()' functions.

Ensures the game interface looks perfect and proportional on ultra-wide desktop monitors and narrow mobile phone screens alike.