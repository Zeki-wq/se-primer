const { defineConfig } = require('cypress');

module.exports = defineConfig({
  // 60 Saniyelik Demo Video Kaydı Ayarları
  video: true,
  videosFolder: 'cypress/videos',
  videoCompression: 32,
  trashAssetsBeforeRuns: false,

  // Mobil Öncelikli (Mobile-First) Ekran Boyutları
  viewportWidth: 430,
  viewportHeight: 844,

  e2e: {
    // Yerel sunucu çalışıyorsa http://localhost:3000 veya doğrudan index.html
    baseUrl: null,
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    supportFile: false,
    setupNodeEvents(on, config) {
      return config;
    }
  }
});

