import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.ban.astrocat',
  appName: 'Astro Cat PvP 4.0',
  webDir: 'dist',
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '271365354200-divjlei917agdhao9na226dnhemtiq2b.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
