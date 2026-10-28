# SE Primer: Yazılım Mühendisliği, Oynanan Bir Kitap

**Ders:** YZM301 Yazılım Gerçekleme ve Test  
**Uygulama Türü:** Mobil Öncelikli (`430×844`) Tek Sayfalık İnteraktif Karar Oyunu (SPA) & Sonlu Durum Makinesi (FSM)  

---

## 1. Proje Özeti

**SE Primer**, yazılım mühendisliği öğrencilerinin ve genç mühendislerin yüksek stresli üretim (production) krizlerinde aldıkları teknik kararların sonuçlarını deneyimleyerek öğrenmelerini sağlayan, **Sokratik AI Tutor** destekli interaktif bir durum makinesi oyunudur.

---

## 2. Problem Tanımı

Pazartesi sabahı saat **08:00**'de dün geceki `v2.4.0` sürüm geçişinden sonra hastane randevu sistemi (**MHC-PMS**) çökmüştür. Bankolarda **300 hasta** sırada beklemektedir ve oyuncu nöbetçi yazılım mühendisi rolündedir. Zaman baskısı altında **mimari müdahale (Rollback vs. Hotfix)**, **yayın öncesi doğrulama (Smoke Test)** ve **kişisel sağlık verisi mahremiyeti (KVKK Veri Maskeleme)** kararlarını vererek sistemi saat 08:25 itibarıyla güvenli ve veri sızıntısız şekilde (`ENDING_GOOD`) ayağa kaldırması gerekmektedir.

---

## 3. Özellikler

- **7 Durumlu Deterministik Sonlu Durum Makinesi (FSM):** `ONBOARDING`, `DECISION_1_ARCH`, `DECISION_2_TEST`, `DECISION_3_KVKK`, `ENDING_GOOD`, `ENDING_BAD_KVKK`, `ENDING_CRASH`.
- **Kişiselleştirilmiş Deneyim:**
  - **Yeni Başladım (`level-beginner`):** Her karar adımında açık teknik ipucu kutusu (`[data-testid="hint-box"]`) görünür, süre sınırı yoktur.
  - **Deneyimliyim (`level-experienced`):** Her karar adımında **60 saniyelik geri sayım sayacı** (`[data-testid="countdown-timer"]`) çalışır; süre dolduğunda otomatik olarak panik kararı (`B` seçeneği) tetiklenir.
  - **Rol Bazlı Telemetri (`Backend`, `DevOps`, `QA`, `Fullstack`):** Kriz ekranındaki terminal logları (`[data-testid="terminal-log"]`) seçilen role göre dinamik üretilir.
- **"Ne Oldu? Neden Oldu?" Teknik Geri Bildirim Kutusu:** Her karar sonrasında `[data-testid="feedback-box"]` içerisinde seçimin mimari, şema, test ve KVKK açısından teknik sonucu gösterilir.
- **Çok Katmanlı Guardrail'e Sahip Sokratik AI Tutor:** Oyuncuya asla doğrudan veya dolaylı olarak `A` / `B` şıkkını söylemeyen, retorik evet/hayır tuzaklarından kaçınan ve açık uçlu tek cümlelik karşı sorular üreten mentor mekanizması.

---

## 4. Sonlu Durum Makinesi (FSM) Akışı

| Mevcut Durum | Seçim / Tetikleyici | Sonraki Durum | Açıklama |
| :--- | :--- | :--- | :--- |
| `ONBOARDING` | `Nöbete Başla` (`start-btn`) | `DECISION_1_ARCH` | Profil ayarları (İpucu veya 60sn sayaç) yüklenir |
| `DECISION_1_ARCH` | `A` (Rollback) veya `B` (Hotfix / Timeout) | `DECISION_2_TEST` | Mimari karar kaydedilir ve geri bildirim gösterilir |
| `DECISION_2_TEST` | `A` (Kısa Smoke Test Koş) | `DECISION_3_KVKK` | Şema ve tablo kilitleri test ortamında doğrulanır |
| `DECISION_2_TEST` | `B` (Hemen Yayına Al) — *Karar 1 = A ise* | `DECISION_3_KVKK` | Riskli geçiş uyarısıyla KVKK adımına ilerler |
| `DECISION_2_TEST` | `B` (Hemen Yayına Al) — *Karar 1 = B veya Timeout ise* | `ENDING_CRASH` | **SON C:** Test edilmeyen yama veritabanını bozar |
| `DECISION_3_KVKK` | `A` (Logdaki Hasta Adını Maskele) | `ENDING_GOOD` | **SON A · İYİ:** Sistem ayakta, veri güvende (`08:25`) |
| `DECISION_3_KVKK` | `B` (Ekibe Olduğu Gibi At / Timeout) | `ENDING_BAD_KVKK` | **SON B · KÖTÜ:** Sistem ayakta ama KVKK ihlali |

---

## 5. Mimari Açıklama

Uygulama harici bir framework veya derleme (build) adımı gerektirmeyen **Vanilla HTML5 + CSS3 + ES6 JavaScript** tek sayfalık uygulama (SPA) mimarisiyle geliştirilmiştir:

- [`index.html`](./index.html): Harici CDN bağımlılığı olmadan çevrimdışı ve headless tarayıcılarda da birebir çalışan gömülü Google Stitch tasarım sistemi ve `data-testid` sözleşmesi.
- [`app.js`](./app.js): Merkezi `gameState`, durum geçiş motoru (`transitionToState`), yarış durumu (race condition) ve çift tıklama korumalı karar işleyici (`handleDecisionChoice`), tekil zamanlayıcı yöneticisi (`startCountdown`/`stopCountdown`) ve Sokratik AI Tutor guardrail motoru (`enforceSocraticGuardrail`, `classifyTutorResponse`).
- [`spec.md`](./spec.md): Problem tanımı, Mermaid `stateDiagram-v2` diyagramı ve 5 BDD (`Given/When/Then`) kabul kriteri.
- [`DESIGN.md`](./DESIGN.md): `430×844` mobil öncelikli renk, tipografi ve bileşen spesifikasyonu.
- [`TUTOR_EVAL.md`](./TUTOR_EVAL.md): 20 zorlayıcı öğrenci girdisiyle gerçekleştirilen Sokratik AI Tutor değerlendirme ve güven aralığı raporu.

---

## 6. Kurulum

Uygulamayı çalıştırmak için herhangi bir kurulum gerekmez; `index.html` doğrudan tarayıcıda açılabilir. Cypress E2E testlerini çalıştırmak için:

```bash
npm install
```

---

## 7. Çalıştırma

- **Doğrudan Tarayıcıda:** `index.html` dosyasına çift tıklayarak veya herhangi bir statik dosya sunucusuyla açabilirsiniz.
- **Cypress Arayüzü ile:**
  ```bash
  npm run cypress:open
  ```

---

## 8. Test Komutları

Uçtan uca (E2E) Cypress testlerini headless modda çalıştırmak ve demo videosu üretmek için:

```bash
npm run test:e2e
# veya doğrudan:
npx cypress run --spec "cypress/e2e/se_primer.cy.js"
```

---

## 9. Test Sonuçları

[`cypress/e2e/se_primer.cy.js`](./cypress/e2e/se_primer.cy.js) içerisindeki **14 E2E test senaryosu** (İyi Son, Kötü Son/KVKK, Kritik Çöküş, Rollback+Test Atlama, Hotfix+Smoke Test, 60sn Timeout, Restart Temizliği, Rol Bazlı Loglar, Tutor Boş Girdi, Tutor Doğrudan Cevap Reddi, Prompt Injection & 20 Eval Senaryosu, Çift Tıklama Güvenliği, Sayaç/Manuel Seçim Çakışması ve 320px/430px Mobil Viewport) doğrulanmıştır.

---

## 10. Tutor Evaluation Özeti (`TUTOR_EVAL.md`)

20 farklı zorlayıcı öğrenci mesajı (doğrudan şık isteme, yanlış teknik varsayım, kararsızlık, prompt injection, system override, otorite baskısı, ters psikoloji ve format zorlama) [`TUTOR_EVAL.md`](./TUTOR_EVAL.md) içinde değerlendirilmiştir:
- **Guardrail Öncesi Ham Sürüm:** `18 / 20 (%90.0)` başarı (`2` senaryoda retorik/karşılaştırmalı `INDIRECT_LEAK`, %95 Wilson Güven Aralığı: `[%69.9, %97.2]`).
- **Guardrail Sonrası Final Sürüm (`app.js`):** `20 / 20 (%100.0)` `PASS` (`0` `DIRECT_LEAK`, `0` `INDIRECT_LEAK`, $N=20$ için %95 Wilson Güven Aralığı: `[%83.9, %100.0]`).

---

## 11. Güvenlik ve KVKK Yaklaşımı

- **%100 Sentetik Veri:** Uygulama içindeki tüm hasta kayıtları (`SENTETIK_HASTA_01`, `00000000001`) kurgusaldır; hiçbir gerçek kişisel veri veya gerçek T.C. kimlik numarası kullanılmamıştır.
- **XSS Koruması:** Kullanıcıdan alınan AI Tutor girdileri DOM'a yalnızca `textContent` üzerinden yazılır; kontrolsüz `innerHTML` kullanılmaz.
- **API Anahtarı Güvenliği (Secret Management):** Uygulama API anahtarı olmadan yerel deterministik Sokratik motorla tam işlevsel çalışır. Kaynak kodda hiçbir API anahtarı bulunmaz. İsteğe bağlı istemci tarafı Gemini API çağrısı yalnızca yerel eğitim/prototip amaçlıdır; **üretim (production) ortamında API anahtarları asla istemci tarafında tutulmamalı ve mutlaka bir Backend Proxy / API Gateway üzerinden yönetilmelidir.**

---

## 12. Ürün Kararı: Yapmadığım 3 Özellik (Kapsam Dışı ve Mühendislik Gerekçeleri)

1. **Kullanıcı Hesabı ve Geçmiş Kaydı (Authentication & Persistence):**  
   Kimlik doğrulama ve veritabanı oturum katmanı eklemek, tek oturumluk (5 dakikalık) pedagojik kriz simülasyonuna başlama sürtünmesini (onboarding friction) artıracağı ve temel öğrenme çıktısına doğrudan katkı sağlamadan gereksiz altyapı karmaşıklığı yaratacağı için durum yönetimi tamamen istemci belleğinde (in-memory FSM) tutulmuştur.

2. **Çok Oyunculu / Ekip İçi Canlı Kriz Simülasyonu (Multiplayer Real-Time Sync):**  
   WebSocket tabanlı eşzamanlı çok oyunculu senkronizasyon, oyuncunun bireysel mühendislik muhakemesini ve Sokratik AI Tutor ile kurduğu birebir sorgulama döngüsünü dış bağımlılıklara (eşleşecek diğer oyuncuların gecikmesine) mahkûm edeceği için deterministik tek oyunculu durum makinesi tercih edilmiştir.

3. **Gerçek Sunucu / Veritabanı Terminali Entegrasyonu (Live Sandbox Shell Execution):**  
   Kullanıcıya tarayıcı üzerinden gerçek konteyner veya SQL kabuğu açmak ciddi uzaktan kod çalıştırma (RCE) güvenlik zafiyetleri, yüksek bulut maliyeti ve kararsız (flaky) E2E test sonuçları doğuracağından, öngörülebilir ve milisaniyelik tepki veren sentetik telemetri log simülasyonu kullanılmıştır.

---

## 13. Bilinen Kısıtlar

- Uygulama durumu tarayıcı belleğinde (`window.SEPrimerApp.gameState`) tutulduğundan sayfa yenilendiğinde (`F5`) oyun `ONBOARDING` durumuna döner.
- İsteğe bağlı canlı LLM entegrasyonu kullanılmadığında yanıtlar yerel deterministik Sokratik soru havuzundan üretilir.

---

## 14. Proje Ekran Görüntüleri ve Bağlantılar

- **Proje Ekran Görüntüleri:** Cypress test koşusu sırasında veya tarayıcıda `430×844` mobil görünümde incelenebilir (`cypress/screenshots/` / `[EKLENECEK]`).
- **60 Saniyelik Demo Videosu:** [`cypress/videos/se_primer.cy.js.mp4`](./cypress/videos/se_primer.cy.js.mp4) (Cypress E2E test koşusu sırasında kaydedilen gerçek MP4 videosu)
- **GitHub Repository Bağlantısı:** [https://github.com/Zeki-wq/se-primer](https://github.com/Zeki-wq/se-primer) *(Özel / Private Depo)*
