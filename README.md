# SE Primer v2: Yazılım Mühendisliği, Oynanan Bir Kitap

**Ders:** YZM301 Yazılım Gerçekleme ve Test  
**Uygulama Türü:** Mobil Öncelikli (`430×844`) Tek Sayfalık Karar Oyunu (SPA), Deterministik Durum Makinesi (FSM) & Tarayıcı İçi ONNX Makine Öğrenmesi (WASM)  

---

## 1. Projenin Amacı

**SE Primer**, yazılım mühendisliği öğrencilerinin ve genç mühendislerin üretim krizlerinde aldıkları teknik, operasyonel ve KVKK kararlarını simüle ederek deneyimlemelerini sağlayan interaktif bir durum makinesi oyunudur.

Pazartesi sabahı saat **08:00**'de çöken hastane randevu sistemi (**MHC-PMS**, sırada bekleyen **300 hasta**) krizinde oyuncu nöbetçi mühendistir. Zaman baskısı altında **mimari müdahale (`Rollback` vs. `Hotfix`)**, **yayın öncesi doğrulama (`Smoke Test`)** ve **veri mahremiyeti (`KVKK Maskeleme`)** kararlarını verir.

---

## 2. v1 ve v2 Farkı

| Özellik / Boyut | SE Primer v1.0 | SE Primer v2.0 (The Primer v2) |
| :--- | :--- | :--- |
| **İpucu Mekanizması** | Statik profil kuralı (Yeni Başlayan = Açık, Deneyimli = Kapalı). | **Dinamik & Adaptif ML Modeli:** Oyuncunun karar süresi, tereddüt (hesitation) ve hata geçmişine göre çıkarım yapar. |
| **Makine Öğrenmesi** | Yok (Saf kural tabanlı). | **Scikit-Learn Logistic Regression $\rightarrow$ ONNX Web:** $1\times 6$ tensör ile tarayıcıda yerel çıkarım ($P \ge 0.60$ ise yardım modu). |
| **Süre Baskısı Uyarlaması** | 60 saniye sayaç deneyimli modda daima akar, bitince panik tetikler. | Model ipucu ihtiyacı sezdiğinde **süre baskısı durdurulur / dondurulur**, oyuncuya pedagojik alan açılır. |
| **Veri Toplama Modu** | Yok. | Anonim UUID tabanlı, sıfır PII/PHI içeren **Veri Toplama Modu** ve CSV dışa aktarma (`data/oturumlar.csv`). |
| **Doğrulama & Test** | 14 Cypress E2E Testi. | **20 Kapsamlı Test:** 14 E2E Testi + 6 Python Oracle Diferansiyel Parite Testi ($|P_{\text{onnx}} - P_{\text{sklearn}}| < 10^{-4}$). |
| **Model Dağıtımı** | Yok. | Hugging Face Hub üzerinde **Commit SHA Pinning** ile sabitlenmiş ONNX dağıtımı. |

---

## 3. Sistem Mimarisi Şeması

```text
+-----------------------------------------------------------------------------------+
|                            SE PRIMER v2 MİMARİSİ                                  |
+-----------------------------------------------------------------------------------+
|                                                                                   |
|  [ KULLANICI ETKİLEŞİMİ ]                                                         |
|         │                                                                         |
|         ▼                                                                         |
|  [ Deterministik FSM (app.js) ] ── (Kişiselleştirme: Beginner / Experienced)      |
|         │                                                                         |
|         ├──► Telemetri Sayaçları (Karar Süresi, Tereddüt Odaklanması, Hata Sayısı)|
|         │                                                                         |
|         ▼                                                                         |
|  [ Tarayıcı İçi ONNX Runtime Web (lib/ort.min.js) ]                               |
|         ▲                                                                         |
|         │ (Model Yükleme: Yerel model/model.onnx veya Hugging Face Commit Pinning)|
|         │                                                                         |
|         ▼                                                                         |
|  [ Olasılık Hesabı: P(ipucu=1) ]                                                  |
|         │                                                                         |
|         ├── P >= 0.60 ──► [ ADAPTİF YARDIM MODU ]                                 |
|         │                 • İpucu Kutusu Açılır ([data-testid="hint-box"])        |
|         │                 • 60sn Sayaç Dondurulur (Süre baskısı kaldırılır)       |
|         │                 • Sokratik AI Tutor Desteği Güçlendirilir               |
|         │                                                                         |
|         └── P <  0.60 ──► [ NORMAL OYUN AKIŞI ]                                   |
|                                                                                   |
|  [ ÇIKARIM DOĞRULAMA KANALI ]                                                     |
|         │                                                                         |
|         ├──► [data-cy="p"] Geliştirici Paneli (Canlı P Değeri)                    |
|         └──► Cypress Parite Testi <─── tests/parite.json <─── Python Oracle       |
|                                         (Fark < 1e-4)                             |
+-----------------------------------------------------------------------------------+
```

---

## 4. Veri Toplama Yöntemi ve Şeffaflık

- **Sıfır Kişisel Veri (Zero PII/PHI):** İsim, e-posta, IP, konum veya donanım parmak izi **kesinlikle toplanmaz**.
- **Anonim Oturum Kimliği:** Her oyun oturumuna RFC 4122 v4 uyumlu rastgele UUID atanır (`crypto.randomUUID()`).
- **Veri Kaynaklarının Saydam Ayrımı:**
  - `kaynak='gercek'`: Gerçek oyuncunun web arayüzünde verdiği kararlar (`data/oturumlar.csv`). *Henüz canlı sınıf oturumu yapılmadığı için satır sayısı 0'dır; uydurma veri girilmemiştir.*
  - `kaynak='sentetik'`: Eğitim amacıyla üretilen 300 satırlık pedagojik senaryo seti (`data/sentetik_dataset.csv`).
- **Veri Sözlüğü:** Sütun tanımları ve ground truth etiketleme mekanizması [`data/SOZLUK.md`](./data/SOZLUK.md) dosyasında belgelenmiştir.

---

## 5. Model Deposu, Canlı Uygulama ve Bağlantılar

- **Hugging Face Model Deposu:** [https://huggingface.co/Raptor13/se-primer-hint-model](https://huggingface.co/Raptor13/se-primer-hint-model)
- **Sabitlenmiş Commit SHA:** `657fdf4be40ecfa8cd5bf713f51c10df2de1f4b3`
- **Sabit Model URL (ONNX):** [https://huggingface.co/Raptor13/se-primer-hint-model/resolve/657fdf4be40ecfa8cd5bf713f51c10df2de1f4b3/model.onnx](https://huggingface.co/Raptor13/se-primer-hint-model/resolve/657fdf4be40ecfa8cd5bf713f51c10df2de1f4b3/model.onnx)
- **GitHub Kaynak Kodu:** [https://github.com/Zeki-wq/se-primer](https://github.com/Zeki-wq/se-primer) *(Private Depo)*
- **Canlı Uygulama Adresi:** `[EKLENECEK: GitHub Pages / Vercel canlı bağlantısı]`
- **Demo Videosu Adresi:** [`cypress/videos/se_primer.cy.js.mp4`](./cypress/videos/se_primer.cy.js.mp4) *(veya harici video linki: `[EKLENECEK]`)*

---

## 6. Kurulum ve Çalıştırma (En Fazla 3 Komut)

Projeyi sıfırdan kurup çalıştırmak ve tüm testleri doğrulamak için **3 komut**:

```bash
# 1. Bağımlılıkları Kur
npm install && pip install scikit-learn onnxruntime skl2onnx huggingface_hub

# 2. Modeli Eğit, ONNX Üret ve Oracle Testini Koş
python train.py

# 3. Tüm Testleri Çalıştır (Python Oracle + Cypress E2E & Parite Testleri)
npm run test:all
```

---

## 7. Test Komutları Özeti

- `npm run test:all`: Python Oracle + 14 Cypress E2E + 6 Cypress Parite testinin tamamını tek komutla koşturur.
- `npm run test:e2e`: Yalnızca 14 temel FSM ve mobil E2E testini çalıştırır.
- `npm run test:parity`: Yalnızca ONNX Web vs. Python Oracle diferansiyel testini çalıştırır.
- `npm run oracle`: Python Oracle referans tablosunu (`tests/parite.json`) üretir.

---

## 8. AI Coding Agent Kullanım Beyanı

Bu projenin geliştirilmesinde **Google DeepMind Antigravity AI Pair Programming Agent** kullanılmıştır. Akademik dürüstlük ve teknik şeffaflık gereğince yapay zeka araçlarının kullanım alanları aşağıda beyan edilmiştir:

| Geliştirme Aşaması | Kullanılan AI Aracı | AI Tarafından Üretilen Çıktı | İnsan / Geliştirici Tarafından Elle Kontrol Edilen ve Doğrulanan Alanlar |
| :--- | :--- | :--- | :--- |
| **Spesifikasyon & FSM Tasarımı** | Antigravity (Gemini 3.8 Flash) | `spec.md` taslağı ve Mermaid.js `stateDiagram-v2` şeması. | Kriz senaryosu pedagojisi, 3 farklı sonun deterministik geçiş kuralları ve BDD kabul kriterleri elle incelendi ve onaylandı. |
| **Ön Yüz & FSM Kodlaması** | Antigravity Agent | `index.html` ve `app.js` Vanilla JS mimarisi. | `isTransitioning` çift tıklama kilidi, mobil `430×844` viewport CSS'i ve sentetik KVKK veri maskelemesi satır satır denetlendi. |
| **Makine Öğrenmesi & ONNX** | Antigravity Agent | `train.py`, `skl2onnx` export pipeline ve `config.json`. | Özellik sırası, L2 regülarizasyon parametresi, stratified train/test split tohumu (`random_state=42`) ve F1 eşiği ($F_1 \ge 0.70$) elle doğrulandı. |
| **Diferansiyel Test & Parite** | Antigravity Agent | `tests/parite.py` ve `cypress/e2e/se_primer_parity.cy.js`. | Python Oracle ile tarayıcı arasındaki $< 10^{-4}$ tolerans formülasyonu ve referans senaryoların uç durumları (edge-cases) elle kontrol edildi. |
| **Dağıtım & Güvenlik** | Antigravity Agent | `push_model.py` ve `RELEASE.md`. | API tokenının kaynak kodda yer almaması, ortam değişkeninden okunması ve Hugging Face commit sabitlemesi (commit pinning) bizzat test edilerek doğrulandı. |
