# Veri Seti Sözlüğü (`data/SOZLUK.md`)

Bu doküman, **SE Primer v2** adaptif makine öğrenmesi modeli için toplanan oturum ve karar telemetrisi verilerinin şemasını, özellik tanımlarını, gizlilik prensiplerini ve etiketleme kurallarını açıklamaktadır.

---

## 1. Veri Gizliliği ve Anonimleştirme İlkeleri (Privacy by Design)

- **Sıfır PII/PHI İlkesi:** Veri setinde hiçbir ad, soyad, e-posta, IP adresi, coğrafi konum, tarayıcı kullanıcı aracısı (`User-Agent`) veya donanım parmak izi (`Fingerprint`) **kaydedilmez**.
- **Anonim Oturum Kimliği:** Her oturum için RFC 4122 v4 uyumlu rastgele bir UUID (`crypto.randomUUID()`) üretilir. Bu kimlik yalnızca aynı oturumdaki adımları birleştirmek için kullanılır.
- **Gerçek ve Sentetik Veri Ayrımı:** `kaynak` sütunu `gercek` ve `sentetik` olmak üzere kesin olarak ayrılmıştır. Sentetik eğitim verileri kesinlikle gerçek kullanıcı verisi gibi gösterilmez.

---

## 2. Sütun Tanımları ve Şema (`data/oturumlar.csv`)

| Sütun Adı | Veri Tipi | Örnek Değer | Açıklama |
| :--- | :--- | :--- | :--- |
| `oturum` | `string (UUID)` | `c4b8e21a-7b3e-4361-9f20-fa7d12e84c90` | Oturuma ait tekil rastgele kimlik |
| `sahne_no` | `int` | `1`, `2`, `3` | Oyun içindeki karar aşaması (`1`: Mimari/Rollback, `2`: Test/Smoke, `3`: KVKK/Maskeleme) |
| `seviye` | `int` | `0`, `1`, `2` | Başlangıçta seçilen profil seviyesi (`0`: Yeni Başlayan, `1`: Orta, `2`: Deneyimli) |
| `karar_suresi_sn` | `float` | `14.25` | O karar ekranına giriş anı ile karar butonuna tıklama anı arasında geçen net süre (saniye) |
| `onceki_yanlis_sayisi` | `int` | `0`, `1`, `2` | O karara kadar seçilmiş olan yüksek riskli (`B` / Hotfix, Test Atlama, Maskesiz Log) karar sayısı |
| `ipucu_sayisi` | `int` | `0`, `1`, `3` | İlgili adımda açılan teknik ipucu sayısı ve Sokratik Tutor'a gönderilen soru adedi |
| `karar_degistirme_sayisi` | `int` | `0`, `2`, `4` | Karar verilmeden önce A ve B seçenekleri üzerine odaklanma/tıklama/hover değiştirme sayısı |
| `ipucu_gerekti` | `int (0/1)` | `1` | **Hedef Değişkeni (Ground Truth):** Oyuncunun bu kararda gerçekten ipucuna ihtiyaç duyup duymadığı |
| `kaynak` | `string` | `gercek` veya `sentetik` | Verinin gerçek kullanıcı oturumundan mı yoksa sentetik senaryo simülasyonundan mı geldiği |

---

## 3. Hedef Değişkeni (`ipucu_gerekti`) Etiketleme Mekanizması

Gerçek oyunculardan veri toplanırken zemin gerçeği (Ground Truth) etiketlemesi iki katmanlı objektif bir mekanizma ile belirlenir:

1. **Oyuncunun Doğrudan Öz-Değerlendirmesi (Self-Assessment Prompt):**
   - Karar verildikten hemen sonra ("Ne oldu, neden oldu?" geri bildirim kutusunun yanında), oyuncuya şu nötr mikro-soru sorulur:  
     *"Bu kararı verirken teknik bir ipucuna / rehberliğe ihtiyaç hissettiniz mi?"*  
     `[Evet (1)]` / `[Hayır (0)]`
2. **Kural Tabanlı Güvenlik Ağı (Fallback Ground Truth):**
   - Eğer oyuncu öz-değerlendirmeyi yanıtsız bırakırsa aşağıdaki nesnel telemetri kuralı işletilir:  
     $$\text{ipucu\_gerekti} = 1 \iff (\text{ipucu\_sayisi} \ge 1) \lor (\text{karar\_suresi\_sn} > 30 \land \text{karar\_degistirme\_sayisi} \ge 2) \lor (\text{onceki\_yanlis\_sayisi} \ge 1 \land \text{karar\_suresi\_sn} > 25)$$
     Aksi durumda $\text{ipucu\_gerekti} = 0$ olarak etiketlenir.

---

## 4. Veri Toplama ve Dışa Aktarma Mekanizması

- Veri toplama modu, URL parametresi (`?mode=collect` veya `?telemetry=1`) ya da Onboarding ekranındaki `"Veri Toplama Modu"` butonu ile aktif edilebilir.
- Gerçekleşen her karar anında telemetri satırı yerel depolama havuzuna (`localStorage.getItem('se_primer_collected_sessions')`) eklenir.
- Oturum sonunda (`ENDING_GOOD`, `ENDING_BAD_KVKK`, `ENDING_CRASH`) oyuncuya/araştırmacıya biriken tüm oturumları tek tıklamayla `oturumlar.csv` formatında indirme (`[data-testid="export-csv-btn"]`) imkanı sunulur.

