# SE Primer v2.0 — Yayın ve Dağıtım Dokümanı (`RELEASE.md`)

**Ders:** YZM301 Yazılım Gerçekleme ve Test  
**Sürüm:** `v2.0`  
**Tarih:** 2026-11-05  

---

## 1. v2.0 Sürüm Notları (Release Notes)

SE Primer v2.0, temel v1.0 durum makinesi (FSM) mimarisini, senaryosunu ve 14 Cypress E2E testini korurken aşağıdaki makine öğrenmesi yeniliklerini getirmektedir:

- **Adaptif İpucu Tahmin Motoru:** Oyuncunun karar süresi, tereddüt (odak değiştirme), önceki hataları ve sahne dinamiklerine göre ipucu ihtiyacını tahmin eden Scikit-Learn `LogisticRegression` modeli entegre edildi.
- **ONNX Web Entegrasyonu:** Model `skl2onnx` ile ONNX formatına dönüştürüldü; istemci tarafında `onnxruntime-web` ile milisaniyelik yerel çıkarım sağlandı.
- **Veri Toplama Modu & Şeffaflık:** Anonim telemetri kaydedici (`data/SOZLUK.md`, `data/oturumlar.csv`) eklendi. Gerçek ve sentetik veri ayrımı kesin çizgilerle tanımlandı.
- **Sıfır FSM Regresyonu:** 7 FSM durumu, karar seçenekleri ve Sokratik AI Tutor guardrail'leri %100 korundu.

---

## 2. Model ve Veri Sürümü

- **Model Versiyonu:** `v2.0` (`se-primer-adaptive-hint-predictor`)
- **Model Tipi:** `LogisticRegression` (L2 penalty, $C=1.0$, `random_state=42`)
- **Model Formatı:** `ONNX` (`float_input` $[1, 6] \rightarrow$ `probabilities` $[1, 2]$)
- **Veri Kümesi Versiyonu:** `v2.0-synthetic-pedagogic-300` ($N=300$, %100 kurgusal sentetik kriz telemetrisi)
- **Gerçek Veri Sayısı:** `0` satır (canlı oturumlar henüz toplanmadı)
- **Doğrulama Metrikleri:** Accuracy: `%98.67`, F1-Score: `0.9908` (Kabul eşiği $F_1 \ge 0.70$ geçildi).
- **Oracle Doğrulaması:** Sklearn ile ONNX Runtime arasındaki fark: $9.78 \times 10^{-8} < 10^{-4}$.

---

## 3. Commit Sabitleme Yöntemi (Commit Pinning) ve Model URL'si

Tarayıcı istemcisinin (`index.html`/`app.js`) Hugging Face üzerindeki modele erişiminde `main` dalı yerine kesin **Commit SHA** sabitlenir (Immutability):

- **Kırılgan Yaklaşım (Main dalı - Kaçınılan):**  
  `https://huggingface.co/<kullanici>/se-primer-hint-model/resolve/main/model.onnx`  
  *(Main dalına yeni bir commit atıldığında istemci beklenmedik biçimde değişebilir veya çökebilir).*
- **Güvenli Yaklaşım (Commit Pinning - Tercih Edilen):**  
  `https://huggingface.co/<kullanici>/se-primer-hint-model/resolve/<COMMIT_SHA>/model.onnx`
- **Mevcut Hugging Face Dağıtım Bilgisi:**
  - **Repo ID:** `Raptor13/se-primer-hint-model`
  - **Commit SHA:** `657fdf4be40ecfa8cd5bf713f51c10df2de1f4b3`
  - **Sabit Model URL (ONNX):** `https://huggingface.co/Raptor13/se-primer-hint-model/resolve/657fdf4be40ecfa8cd5bf713f51c10df2de1f4b3/model.onnx`
  - **Sabit Config URL:** `https://huggingface.co/Raptor13/se-primer-hint-model/resolve/657fdf4be40ecfa8cd5bf713f51c10df2de1f4b3/config.json`
  - **Öncelikli Yerel Fallback:** `./model/model.onnx` (Ağ kesintilerinde veya çevrimdışı Cypress testlerinde doğrudan yerel dosya tüketilir).

---

## 4. Önceki Sürüme Geri Dönüş (Rollback) Planı

Eğer yeni model tarayıcı tarafında beklenmedik bir bellek sızıntısına (memory leak), WASM çökmesine veya yanlış pozitif ipucu kirliliğine yol açarsa:

1. **Arayüz Düzeyinde Hızlı Devre Dışı Bırakma (Feature Flag):**  
   `app.js` içerisindeki `gameState.adaptiveModelEnabled = false` yapılarak FSM anında v1.0 kural tabanlı motoruna (`profile.level === 'beginner' ? showHint : hideHint`) döner.
2. **Model URL'sini Eski Commit SHA'ya Yönlendirme:**  
   Commit pinning sayesinde Hugging Face URL'si bir önceki kararlı commit SHA'sına çevrilir.
3. **Milisaniyelik Güvenlik Ağı:**  
   ONNX çalışma anında hata verirse `try/catch` bloğu oyunu kilitlemez; sistem otomatik olarak sessizce v1.0 davranışına geri çekilir.

---

## 5. Güvenli Dağıtım Stratejileri (Gelecek Planı vs. Gerçek Durum)

> **Şeffaflık Notu:** Bu proje tek sayfalık statik bir web uygulaması (SPA) olduğu için sunucu tarafı yük dengeleyici (Load Balancer) içermemektedir. Aşağıdaki Shadow, Canary ve Progressive Rollout aşamaları **bu aşamada fiilen çalıştırılmamış**, kurumsal üretime geçişte uygulanacak **geleceğe dönük güvenli dağıtım planı** olarak tasarlanmıştır.

### A. Gölge Dağıtım (Shadow Deployment) — *Gelecek Planı*
- Model arka planda sessizce çalıştırılır.
- Tahminler oyuncuya **gösterilmez**; yalnızca konsola veya telemetri havuzuna kaydedilir.
- Modelin gecikmesi (latency) ve kaynak tüketimi gözlemlenir.

### B. Kanarya Dağıtımı (Canary Deployment - %5) — *Gelecek Planı*
- Kullanıcıların rastgele %5'ine model tabanlı adaptif ipucu açılır (`Math.random() < 0.05`).
- %95 kullanıcı mevcut kural tabanlı arayüzü kullanır.
- Hata oranı (error rate) ve kullanıcı şikayetleri 48 saat izlenir.

### C. Aşamalı Yaygınlaştırma (Progressive Rollout: %25 -> %50 -> %100) — *Gelecek Planı*
- Kanarya aşamasında anomaliler sıfır ise oran kademeli olarak %25'e, ardından %50'ye ve nihayetinde tüm kullanıcılara (%100) genişletilir.

---

## 6. Mevcut SE Primer Mimarisine Uygun Dağıtım Kararı

SE Primer mimarisi için **"Yerel Öncelikli Hibrit Tarayıcı İçi Çıkarım (Local-First On-Device WASM Inference)"** modeli seçilmiştir:
- Model ve ONNX Runtime doğrudan kullanıcının cihazında çalışır.
- Harici bir Python Flask/FastAPI sunucusu barındırma maliyeti ve sunucu çökme riski ortadan kaldırılmıştır.
- Hugging Face, modeli genel ve sürümlü bir model deposu olarak barındırır; tarayıcı ilk açılışta modeli yerelden (veya Hugging Face CDN'den) önbelleğe alır.

---

## 7. Dağıtım Seçenekleri Trade-off Matrisi

| Kriter | Seçenek 1: Tarayıcı İçi (ONNX Web / WASM) *(Seçilen)* | Seçenek 2: Mobil Native (ONNX Mobile Runtime) | Seçenek 3: Merkezi Sunucu API (FastAPI / TorchServe) |
| :--- | :--- | :--- | :--- |
| **Gecikme (Latency)** | **Çok Düşük (<5 ms):** Ağ gidiş-dönüşü (RTT) yok. | **Çok Düşük (<2 ms):** Cihaz NPU/GPU hızlandırması. | **Orta-Yüksek (80-250 ms):** Ağ gecikmesine bağlı. |
| **KVKK & Veri Gizliliği** | **Mükemmel:** Telemetri ve karar verisi istemciden asla dışarı çıkmaz. | **Mükemmel:** Veri tamamen cihazda işlenir. | **Riskli:** Her karar ve etkileşim sunucuya iletilmek zorundadır (Log/PII riski). |
| **Altyapı Maliyeti** | **Sıfır ($0):** Statik barındırma (GitHub Pages / Vercel). | **Sıfır ($0):** Cihaz kaynakları tüketilir. | **Yüksek:** 7/24 çalışan GPU/CPU sunucu ve konteyner maliyeti. |
| **Çevrimdışı Çalışma** | **Tam Destek:** İnternet kopsa dahi oyun kesintisiz sürer. | **Tam Destek:** İnternetsiz çalışır. | **Desteklemez:** İnternet yoksa ipucu ve oyun kilitlenir. |
| **İlk Yükleme Boyutu** | ~400 KB ONNX Runtime JS + ~450 bayt model. | Uygulama paketi boyutu (+15 MB). | İstemci boyutu sıfır (yalnızca HTTP fetch). |
| **Model Fikri Mülkiyeti (IP)** | Model dosyası istemcide görülebilir. | Tersine mühendislik ile ters derlenebilir. | **Tam Güvenli:** Model sunucu belleğinde gizlidir. |

**Sonuç:** SE Primer eğitim odaklı bir öğrenci projesi olduğundan; sıfır sunucu maliyeti, sıfır KVKK riski ve çevrimdışı Cypress test güvencesi sunan **Tarayıcı İçi ONNX Runtime Web (Seçenek 1)** en uygun mühendislik mimarisidir.

