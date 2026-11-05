/**
 * SE Primer v2 — Diferansiyel Parite Testleri (Cypress vs Python Oracle)
 * Dosya: cypress/e2e/se_primer_parity.cy.js
 *
 * Amaç:
 *   tests/parite.json içerisindeki 5 referans girdiyi tarayıcı ortamında
 *   çalışan onnxruntime-web / SE Primer ML motoruna iletir.
 *   Uygulamadaki `data-cy="p"` alanından okunan çıkarım olasılığı ile
 *   Python Oracle'ın hesapladığı olasılık arasındaki mutlak farkın
 *   < 1e-4 (0.0001) olduğunu kanıtlar.
 */

describe('SE Primer v2 — Diferansiyel Parite Testleri (ONNX Web vs Python Oracle)', () => {
  const APP_URL = Cypress.env('APP_URL') || 'index.html';
  let parityData;

  before(() => {
    // tests/parite.json dosyasını yükle
    cy.readFile('tests/parite.json').then((data) => {
      parityData = data;
      expect(parityData.reference_cases).to.have.lengthOf(5);
    });
  });

  beforeEach(() => {
    cy.viewport(430, 844);
    cy.visit(APP_URL);
    // Onboarding ekranından karar ekranına geç
    cy.get('[data-testid="start-btn"]').click();
    cy.get('[data-testid="current-state"]').should('have.text', 'DECISION_1_ARCH');
    cy.get('[data-cy="p"]').should('be.visible');
  });

  it('1. Model ve ONNX Runtime Web Hazırlık Kontrolü', () => {
    cy.window().then((win) => {
      expect(win.SEPrimerApp).to.exist;
      expect(win.SEPrimerApp.predictHintNeedProbability).to.be.a('function');
    });
  });

  // 5 Referans Durum için Diferansiyel Test Döngüsü
  const testCases = [
    { idx: 0, name: 'Ref 1: Beginner Hesitant (Yüksek İhtiyaç - P ~ 1.0)' },
    { idx: 1, name: 'Ref 2: Experienced Fast (Düşük İhtiyaç - P ~ 0.0008)' },
    { idx: 2, name: 'Ref 3: Intermediate Oscillating (Eşik Üstü - P ~ 0.9999)' },
    { idx: 3, name: 'Ref 4: Experienced Stuck (Adaptif Tetik - P ~ 0.9999)' },
    { idx: 4, name: 'Ref 5: Beginner Confident (Eşik Üstü - P ~ 0.8459)' }
  ];

  testCases.forEach(({ idx, name }) => {
    it(`Diferansiyel Doğrulama: ${name}`, () => {
      const refCase = parityData.reference_cases[idx];
      const expectedProb = refCase.expected_prob_raw;
      const tolerance = parityData.tolerance || 1e-4;

      // Uygulama penceresine referans telemetri girdilerini enjekte et ve çıkarımı tetikle
      cy.window().then(async (win) => {
        // [seviye, karar_suresi_sn, onceki_yanlis_sayisi, ipucu_sayisi, sahne_no, karar_degistirme_sayisi]
        const [seviye, sure, prevWrong, ipucuSayisi, sahneNo, hes] = refCase.features;

        // Seviye string'e dönüştür
        const lvlStr = seviye === 2 ? 'experienced' : seviye === 1 ? 'intermediate' : 'beginner';
        win.SEPrimerApp.gameState.profile.level = lvlStr;

        // Sahne durumuna göre currentState güncelle
        const sahneStateMap = {
          1: win.SEPrimerApp.STATES.DECISION_1_ARCH,
          2: win.SEPrimerApp.STATES.DECISION_2_TEST,
          3: win.SEPrimerApp.STATES.DECISION_3_KVKK
        };
        win.SEPrimerApp.gameState.currentState = sahneStateMap[sahneNo] || win.SEPrimerApp.STATES.DECISION_1_ARCH;

        // Karar süresi hesaplaması için startTime doğrudan ayarla (tam sure sn olacak şekilde)
        win.SEPrimerApp.gameState.currentStepTelemetry.startTime = performance.now() - (sure * 1000);
        win.SEPrimerApp.gameState.currentStepTelemetry.stepHesitationCount = hes;
        win.SEPrimerApp.gameState.currentStepTelemetry.stepTutorQueryCount = ipucuSayisi;

        // Önceki yanlış kararları history'e yerleştir
        win.SEPrimerApp.gameState.history = [];
        for (let i = 0; i < prevWrong; i++) {
          win.SEPrimerApp.gameState.history.push({ choice: 'B', isTimeout: false });
        }

        // Doğrudan refCase özellik vektörünü tensöre vererek çıkarım yap
        const feats = refCase.features;
        const prob = await win.SEPrimerApp.predictHintNeedProbability(feats);
        win.SEPrimerApp.updateMLDevPanel(prob, prob >= 0.60);
      });

      // data-cy="p" alanından metni oku ve sayıya dönüştür
      cy.get('[data-cy="p"]')
        .should('be.visible')
        .invoke('text')
        .then((text) => {
          // Metin: "P = 0.8460" veya data-value
          cy.get('[data-cy="p"]').invoke('attr', 'data-value').then((attrVal) => {
            const actualProb = attrVal ? parseFloat(attrVal) : parseFloat(text.replace(/[^0-9.]/g, ''));
            const absDiff = Math.abs(actualProb - expectedProb);
            cy.log(`Python Oracle: ${expectedProb.toFixed(6)}, Web App: ${actualProb.toFixed(6)}, Fark: ${absDiff.toExponential(3)}`);
            expect(absDiff).to.be.lessThan(tolerance, `ONNX Web ile Python Oracle arasındaki fark (${absDiff.toExponential(4)}) toleransı (${tolerance}) aşmamalı!`);
          });
        });
    });
  });
});
