import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.viralclip.ai',
  appName: 'ViralClip AI',
  webDir: 'dist',
  server: {
    cleartext: true,
    androidScheme: 'http',
  },
};

export default config;
