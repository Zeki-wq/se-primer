# SE Primer — Google Stitch Mobil Öncelikli Tasarım Sistemi (`DESIGN.md`)

**Ders:** YZM301 Yazılım Gerçekleme ve Test (15 Puan)  
**Hedef Görünüm (Viewport):** Mobil Öncelikli (Mobile-First, `430px × 844px`)  
**Tasarım Dili:** Karanlık Mod Geliştirici Estetiği (Sleek Dark Mode Developer Aesthetic)

---

## 1. Renk Paleti ve Tasarım Tokenları (Color System)

| Token Adı | Hex Kodu | RGB Değeri | Kullanım Rolü ve Anlamsal Karşılığı |
| :--- | :---: | :---: | :--- |
| **`bg-navy-primary`** | `#0B132B` | `rgb(11, 19, 43)` | Ana mobil ekran gövdesi arka planı (Derin Gece Laciverti) |
| **`bg-navy-outer`** | `#060A17` | `rgb(6, 10, 23)` | Dış çerçeve, terminal log kutusu ve AI Tutor çekmece zemini |
| **`surface-card`** | `#131F42` | `rgb(19, 31, 66)` | Hikaye kartları, seçim kutuları ve analiz panelleri |
| **`accent-orange`** | `#F77F00` | `rgb(247, 127, 0)` | Birincil CTA ("Nöbete Başla"), 60sn sayaç rozeti, yüksek riskli B seçeneği |
| **`accent-emerald`** | `#10B981` | `rgb(16, 185, 129)` | Güvenli mühendislik adımları (A seçeneği), İpucu kutusu, Sokratik AI Tutor, `SON A · İYİ` |
| **`semantic-danger`** | `#EF4444` | `rgb(239, 68, 68)` | P1 Kriz alarmı, `SON C` veritabanı çöküşü ve kritik hata rozetleri |
| **`text-primary`** | `#F8FAFC` | `rgb(248, 250, 252)` | Ana başlıklar ve hikaye metinleri (Yüksek kontrast: `15.8:1`) |
| **`text-secondary`** | `#CBD5E1` | `rgb(203, 213, 225)` | Alt açıklamalar, teknik geri bildirim detayları |

---

## 2. Tipografi Sistemi (Typography Scale)

Uygulama okunabilirliği yüksek **Sans-Serif** ile geliştirici hissiyatını güçlendiren **Monospace** yazı tiplerini birleştirir:

- **Birincil Arayüz ve Hikaye Fontu (`font-sans`):** `'Inter'`, `system-ui`, `-apple-system`, `sans-serif`
  - **Ekran Başlığı (`H1`):** `18px` (`1.125rem`), `font-weight: 800`, satır yüksekliği `1.35`
  - **Bölüm / Kriz Başlığı (`H2`):** `15px` (`0.9375rem`), `font-weight: 700`
  - **Hikaye ve Açıklama Metni (`Body`):** `13px` (`0.8125rem`), `font-weight: 400`, satır yüksekliği `1.5`
- **Teknik Telemetri, Log ve Sayaç Fontu (`font-mono`):** `'JetBrains Mono'`, `'Fira Code'`, `ui-monospace`, `monospace`
  - **Durum Rozeti (`[data-testid="current-state"]`):** `12px`, `font-weight: 700`, büyük harf (`uppercase`)
  - **60sn Geri Sayım Sayacı (`[data-testid="countdown-timer"]`):** `12px`, `font-weight: 800`, `#F77F00`
  - **Terminal Log Çıktısı (`[data-testid="terminal-log"]`):** `12px`, `line-height: 1.4`

---

## 3. Mobil Öncelikli Yerleşim ve Izgara (Layout & Viewport `430×844`)

- **Konteyner Genişliği:** Maksimum `430px` genişlik, `844px` dikey akışa uygun esnek (`flex-col justify-between`) tek sayfa (SPA) kabuğu.
- **Dokunma Hedefleri (Touch Targets):** Tüm karar butonları (`choice-a`, `choice-b`, `start-btn`, `restart-btn`) minimum `48px` yüksekliğe ve `12px` iç boşluğa (`padding`) sahiptir.
- **Durum İzleme Çubuğu (Top Telemetry Bar):** Ekranın en üstünde her zaman aktif durumu gösteren `<span data-testid="current-state">...</span>` rozeti yer alır.

---

## 4. Üç Mobil Ekranın Bileşen Spesifikasyonları

### Ekran 1: Giriş ve Kişiselleştirme Ekranı (`ONBOARDING`)
- **Konteyner:** `[data-testid="onboarding-screen"]`
- **Üst Tanıtım Kartı:** `"PAZARTESİ 08:00 • SENARYO #01"` rozeti, `"SE Primer: Yazılım Mühendisliği, Oynanan Bir Kitap"` başlığı ve 300 hastanın beklediği MHC-PMS kriz özeti.
- **1. Seviye Seçim Kartı (2 Sütun Grid):**
  - `[data-testid="level-beginner"]` (**Yeni Başladım**): Seçildiğinde `#10B981` zümrüt yeşili kenarlıkla vurgulanır; karar ekranlarında ipucu kutusunu açar.
  - `[data-testid="level-experienced"]` (**Deneyimliyim**): Seçildiğinde `#F77F00` turuncu kenarlıkla vurgulanır; karar ekranlarında 60sn sayacı başlatır.
- **2. Mühendislik Rolü Kartı:** `[data-testid="role-backend"]`, `[data-testid="role-devops"]`, `[data-testid="role-qa"]` butonları.
- **3. Öğrenme Hedefi Kartı:** `[data-testid="goal-arch"]`, `[data-testid="goal-test"]`, `[data-testid="goal-kvkk"]` seçim satırları.
- **Birincil Aksiyon Butonu:** `[data-testid="start-btn"]` — Tam genişlikte (`w-full`), `#F77F00` arka planlı **"Nöbete Başla → [08:00]"** butonu.

---

### Ekran 2: Kriz Sahnesi, Karar ve Sokratik AI Tutor Çekmecesi (`DECISION_1_ARCH`, `DECISION_2_TEST`, `DECISION_3_KVKK`)
- **Konteyner:** `[data-testid="decision-screen"]`
- **Üst Kriz Barı:**
  - Sol: Kırmızı canlı alarm noktası ve `[data-testid="crisis-header"]` (`"08:00 - Randevu Sistemi Çöktü"`).
  - Sağ: `[data-testid="countdown-timer"]` — Deneyimli modda görünür olan `#F77F00` nabız efektli 60 saniye geri sayım sayacı (`60s (01:00)`).
- **Ara Geri Bildirim Kutusu (`[data-testid="feedback-box"]`):**
  - Bir önceki karardan hemen sonra görünür olur; kararın teknik sonucunu **"Ne Oldu?"** ve **"Neden Oldu?"** başlıklarıyla açıklar.
- **Ana Hikaye ve Telemetri Kartı (`[data-testid="narrative-card"]`):**
  - Aktif rol rozeti, `"300 Hasta Bekliyor"` sayacı, vaka açıklaması ve `#060A17` zeminli canlı `mhc-pms-production.log` terminal penceresi.
  - **Açık İpucu Kutusu (`[data-testid="hint-box"]`):** `"Yeni Başladım"` modunda `#10B981` zümrüt yeşili vurguyla açık gelir; `"Deneyimliyim"` modunda gizlenir (`display: none`).
- **İkili Karar Butonları:**
  - `[data-testid="choice-a"]`: Solunda `A` rozeti taşıyan, `#10B981` kenarlıklı güvenli/standart mühendislik seçeneği.
  - `[data-testid="choice-b"]`: Solunda `B` rozeti taşıyan, `#F77F00` kenarlıklı hızlı/yüksek riskli seçenek.
- **Alt Sokratik AI Tutor Çekmecesi (`[data-testid="tutor-panel"]`):**
  - `[data-testid="tutor-response"]`: İtalik zümrüt yeşili metinle Sokratik karşı soruyu gösteren sohbet baloncuğu.
  - `[data-testid="tutor-input"]` ve `[data-testid="tutor-send"]`: Oyuncunun soru yazıp gönderdiği etkileşim çubuğu.

---

### Ekran 3: Sonuç ve "Ne Oldu / Neden Oldu?" Analiz Ekranı (`ENDING_GOOD`, `ENDING_BAD_KVKK`, `ENDING_CRASH`)
- **Konteyner:** `[data-testid="ending-screen"]`
- **Nihai Durum Kartı (`#ending-hero-card`):**
  - Durum kodu rozeti (`[data-testid="ending-state-code"]`) ve ana sonuç başlığı (`[data-testid="ending-title"]`):
    - **İyi Son:** `"SON A · İYİ — Sistem Ayakta, veri güvende"` (`#10B981` zümrüt yeşili tema)
    - **Kötü Son (KVKK):** `"SON B · KÖTÜ — Sistem Ayakta Ama KVKK ihlali"` (`#F77F00` turuncu uyarı teması)
    - **Kritik Çöküş:** `"SON C · KRİTİK ÇÖKÜŞ — Test Edilmeyen Yama Veritabanını Bozdu"` (`#EF4444` kırmızı alarm teması)
- **Teknik Analiz Kutusu (`[data-testid="ending-breakdown"]`):**
  - **"Ne Oldu?"** ve **"Neden Oldu?"** bölümleriyle krizin mühendislik kök neden analizini (Post-Mortem) sunar.
- **Görsel Karar Yolu Özeti (`[data-testid="pathway-summary"]`):**
  - Oyuncunun `Karar 1 (Mimari)` -> `Karar 2 (Test)` -> `Karar 3 (KVKK)` adımlarında yaptığı tüm seçimleri ve risk durumlarını dikey zaman çizelgesinde listeler.
- **Tekrar Oyna Butonu (`[data-testid="restart-btn"]`):**
  - Oyunu sıfırlayıp `ONBOARDING` durumuna döndüren `#F77F00` vurgulu **"↻ Tekrar Oyna"** butonu.
