# SE Primer v2: Adaptif İpucu Tahmin Modeli Kartı (`model/README.md`)

Bu model kartı, **SE Primer v2 (YZM301 Yazılım Gerçekleme ve Test)** projesinde kriz simülasyonu oynayan öğrencilerin karar alma davranışlarına göre ipucu ihtiyacını tahmin eden ONNX makine öğrenmesi modelinin mimarisini, eğitim sürecini, metriklerini, sınırlarını ve etik standartlarını belgelemektedir.

---

## 1. Modelin Amacı

- **Hedef:** Kriz yönetimi sırasında oyuncunun karar süresi, önceki adımlardaki hataları, tereddüt (karar değiştirme) ve etkileşim telemetrisini değerlendirerek **"Bu adımda teknik ipucuna ihtiyaç var mı?" (`ipucu_gerekti`: 0 veya 1)** tahminini üretmek.
- **Entegrasyon:** Tahmin edilen olasılık $P(\text{ipucu\_gerekti} = 1) \ge 0.60$ eşiğini aştığında, FSM akışı kesilmeden arayüzde oyuncuya adaptif rehberlik rozeti sunulur ve Sokratik AI Tutor'un yönlendirici pedagojik tonu ayarlanır. FSM durum geçişleri asla model kararıyla değiştirilmez.

---

## 2. Kullanılan Gerçek ve Sentetik Veri Miktarı

| Veri Kaynağı | Satır Sayısı ($N$) | Yüzde | Açıklama |
| :--- | :---: | :---: | :--- |
| **Gerçek Kullanıcı Oturumu (`kaynak='gercek'`)** | `0` | `%0.0` | Öğrenci simülasyonu henüz canlı sınıf ortamında koşulmadığı için sıfır gerçek veri bulunmaktadır. Şeffaflık gereğince gerçek veri sayısı asla uydurulmamıştır. |
| **Sentetik Pedagojik Veri (`kaynak='sentetik'`)** | `300` | `%100.0` | `spec.md` ve `data/SOZLUK.md` standartlarına uygun, 100 kurgusal kriz oturumuna (3'er sahne) dayalı pedagojik kurallarla üretilmiştir. |
| **Toplam Eğitim Örneklemi** | **`300`** | **`%100.0`** | Sınıf 0: `%26.00` (78 örnek), Sınıf 1: `%74.00` (222 örnek). |

---

## 3. Eğitim Yöntemi

- **Algoritma:** Scikit-Learn `LogisticRegression` (L2 Ridge Penalty, $C=1.0$, `solver='lbfgs'`, `max_iter=1000`).
- **Veri Bölme (Split):** Stratified Train/Test Split (Eğitim: `225` örnek, Test: `75` örnek). Hedef sınıf oranı test kümesinde korunmuştur.
- **Tekrarlanabilirlik:** Veri üretimi, bölme ve model eğitimi aşamalarının tamamında sabit tohum (`random_state=42`) kullanılmıştır.
- **Özellik Sırası (Kesin Sıralama):**
  1. `seviye` (`int`: 0=Beginner, 1=Intermediate, 2=Experienced)
  2. `karar_suresi_sn` (`float`: 0.1 - 60.0 saniye)
  3. `onceki_yanlis_sayisi` (`int`: 0, 1, 2)
  4. `ipucu_sayisi` (`int`: kümülatif ipucu/tutor etkileşimi)
  5. `sahne_no` (`int`: 1=Mimari, 2=Test, 3=KVKK)
  6. `karar_degistirme_sayisi` (`int`: seçenekler arası odaklanma/tıklama tereddüdü)
- **ONNX Dönüşümü:** `skl2onnx` kütüphanesi ile `options={id(clf): {'zipmap': False}}` seçeneği kullanılarak ham float olasılık tensörü (`[None, 2]`) üreten `model.onnx` dosyası elde edilmiştir.

---

## 4. Değerlendirme (Evaluation) ve Oracle Sonuçları

Test kümesi ($N_{\text{test}} = 75$) üzerinde $\tau = 0.60$ karar eşiği ile elde edilen metrikler:

| Değerlendirme Metriği | Elde Edilen Değer | spec.md Kabul Kriteri | Sonuç |
| :--- | :---: | :---: | :---: |
| **Accuracy (Doğruluk)** | `%98.67` (0.9867) | — | — |
| **Precision (Sınıf 1)** | `%100.00` (1.0000) | — | — |
| **Recall (Sınıf 1)** | `%98.18` (0.9818) | — | — |
| **$F_1$-Score (Sınıf 1)** | **`0.9908`** | $\ge 0.70$ | **GEÇTİ ✓** |
| **Macro $F_1$-Score** | **`0.9832`** | $\ge 0.70$ | **GEÇTİ ✓** |

### Python ONNX Runtime vs. Scikit-Learn Oracle Doğrulaması:
- **Maksimum Mutlak Olasılık Farkı:** $\max |P_{\text{sklearn}} - P_{\text{onnx}}| = 9.7845 \times 10^{-8}$
- **İzin Verilen Tolerans Sınırı:** $< 1.0 \times 10^{-4}$
- **Oracle Doğrulama Durumu:** **BAŞARILI (PASSED) ✓** (Fark toleransın ~1000 kat altındadır).

---

## 5. Modelin Sınırlamaları

1. **Sentetik Dağılım Bağımlılığı:** Model kurgusal senaryo dinamikleriyle üretilen 300 sentetik satır üzerinde eğitilmiştir. Gerçek insan bilişsel gecikmeleri ve beklenmeyen ağ duraklamaları sentetik modelin tahmininde sapmalara yol açabilir.
2. **Küçük Örneklem Boyutu ($N=300$):** Örneklem sayısı kısıtlı olduğu için aşırı öğrenmeyi engellemek adına karmaşık doğrusal olmayan modeller yerine doğrusal L2 Logistic Regression kullanılmıştır.
3. **Senaryoya Özel Kapsam:** Model yalnızca "MHC-PMS Hastane Randevu Sistemi Çöküşü" senaryosu (3 sahne) için kalibre edilmiştir; genel yazılım mühendisliği sınavlarında doğrudan kullanılamaz.

---

## 6. Kullanılmaması Gereken Durumlar (Out of Scope / Misuse)

- **Akademik Notlandırma veya Ceza:** Bu model öğrencilerin ders notunu, başarısını veya yetkinliğini ölçmek için **kesinlikle kullanılamaz**. Yalnızca arayüzdeki pedagojik ipucu desteğini açıp kapamakla sınırlıdır.
- **Kritik Karar Mekanizmaları:** Gerçek hastane, bankacılık veya altyapı üretim sistemlerinde sürüm geri alma ya da yama kararlarını otomatik vermek için kullanılamaz.
- **Sokratik AI Tutor'un Yerine Geçme:** Model oyuncuya yanıt üretmez; sadece Sokratik Tutor'un devreye girme ihtiyacını sınıflandırır.

---

## 7. KVKK ve Veri Gizliliği Yaklaşımı (Privacy by Design)

- **Sıfır Kişisel Veri (Zero PII/PHI):** Model girdilerinde ve eğitim verilerinde hiçbir isim, soyisim, öğrenci numarası, e-posta, IP adresi, coğrafi konum veya cihaz parmak izi kullanılmaz.
- **İstemci Tarafında Çıkarım (Local On-Device Inference):** Model ONNX formatında doğrudan kullanıcının tarayıcısında (`onnxruntime-web`) çalışır. Oyuncunun fare hareketleri ve karar süreleri hiçbir harici sunucuya veya üçüncü taraf API'ye gönderilmez.
- **Şeffaf Ayrım:** Gerçek kullanıcı telemetrisi (`data/oturumlar.csv`) ile sentetik eğitim seti (`data/sentetik_dataset.csv`) dosya düzeyinde tamamen birbirinden yalıtılmıştır.

