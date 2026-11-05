# YZM301 Yazılım Gerçekleme ve Test — Özgün Vize Sınav Sorusu Tasarımı (`SINAV_TASARIMI.md`)

**Ders:** YZM301 Yazılım Gerçekleme ve Test  
**Soru Türü:** Klasik / Muhakeme ve Senaryo Analizi  
**Süre / Puan:** 25 Dakika / 25 Puan  
**Hedef:** Ezber tanımlar yerine teknik karar gerekçelerini, sınır koşullarını ve doğrulama stratejilerini ölçmek.

---

### Soru Metni: "Kritik Karar Destek Sisteminde Model Dönüşümü ve Diferansiyel Doğrulama"

Bir finansal kriz masasında nöbetçi mühendislerin alacağı acil likidite müdahale kararlarını (`Rollback` vs. `Hotfix`) desteklemek amacıyla Python (`scikit-learn`) ortamında eğitilmiş bir L2-Logistic Regression sınıflandırma modeli geliştirilmiştir. Model, mühendisin karar süresi, işlem geçmişi ve telemetri verilerine göre risk eşiğini aşan durumlarda uyarı üretmektedir.

Sistem mühendisliği ekibi, sıfır sunucu gecikmesi ve KVKK/GDPR kapsamında veri mahremiyetini garanti altına almak için modeli Python sunucusunda çalıştırmak yerine, `ONNX` formatına dönüştürerek doğrudan istemci tarayıcısında (`onnxruntime-web`) koşturma kararı almıştır.

Aşağıdaki üç alt soruyu yazılım test ve kalite prensipleri çerçevesinde yanıtlayınız:

#### 1. Doğrulama (Verification) ve Geçerleme (Validation) Ayrımı (8 Puan)
Bu sistem özelinde:
- **Doğrulama (Verification):** Python'da eğitilen modelin ONNX formatına dönüştürüldükten sonra matematiksel olarak Python'daki modelle aynı girdi-çıktı bağıntısını üretip üretmediğinin incelenmesi midir, yoksa modelin kriz anındaki mühendisin gerçek stresine uygun rehberlik edip etmediğinin testi midir? Neden?
- **Geçerleme (Validation):** "Doğru ürünü mü inşa ettik?" sorusuna karşılık gelen test adımı bu senaryoda nasıl kurgulanmalıdır? (Mühendisin öz-değerlendirmesi ve sahadaki başarı çıktısı açısından açıklayınız).

#### 2. Test Oracle Problemi, Diferansiyel Test ve Tolerans (10 Puan)
Makine öğrenmesi modelleri karmaşık ve sürekli (continuous) olasılık çıktıları ürettiği için geleneksel yazılım testlerindeki "sabit beklenen değer" (Expected Value) belirlemek güçtür (Test Oracle Problemi).
- Bu kısıtı aşmak için Python çalışma zamanı ile tarayıcıdaki ONNX Runtime arasında **Diferansiyel Test (Differential Testing)** nasıl uygulanır? Python çalışma zamanı burada nasıl bir **Test Oracle** görevi üstlenir?
- İki çalışma zamanı arasında 32-bit kayan noktalı sayı (floating-point) aritmetiği farklarından ötürü `0.845951` ile `0.845950` gibi mikro sapmalar oluşabilir. Bu testte kesin eşitlik (`===`) yerine neden bir **Tolerans Eşiği ($\epsilon < 10^{-4}$)** tanımlanmalıdır? Toleransın çok geniş ($10^{-1}$) veya imkansız derecede dar ($10^{-12}$) seçilmesinin doğuracağı test risklerini (False Positive / False Negative) açıklayınız.

#### 3. Regresyon Testi Güvencesi (7 Puan)
Mevcut web uygulamasında daha önceden yazılmış ve çalışan 14 adet uçtan uca (E2E - Cypress) durum makinesi testi bulunmaktadır.
- Yeni adaptif makine öğrenmesi motoru sisteme entegre edildiğinde, eski 14 testin tamamının yeniden koşulması neden kritik bir **Regresyon Testi (Regression Testing)** zorunluluğudur?
- Modelin eklenmesi, uygulamanın durum geçişlerini (FSM) doğrudan bozmasa dahi asenkron yükleme (async inference) veya DOM manipülasyonu yoluyla eski testlerde ne tür yarış durumlarına (race condition) veya zaman aşımı (flaky test) hatalarına yol açabilir? Bunu önlemek için test mimarisinde nasıl bir önlem alınmalıdır?

---

### Beklenen Cevap Anahtarı ve Değerlendirme Kriterleri (Özet):
1. **Verification vs. Validation:** Verification = Matematiksel dönüşümün doğruluğu (Spec'e uygunluk, "Ürünü doğru mu ürettik?"); Validation = Sistemin sahada kullanıcı stresini çözüp çözmediği ("Doğru ürünü mü ürettik?").
2. **Oracle & Tolerans:** Python çıktısı `Pseudo-Oracle` kabul edilir. Farklı donanım/WASM mimarilerindeki IEEE-754 yuvarlama farkları nedeniyle $\epsilon < 10^{-4}$ gereklidir. Dar eşik sahte alarmlara (flaky), geniş eşik model sapmalarının kaçmasına neden olur.
3. **Regresyon Güvencesi:** Yeni kodun eski stabil FSM yollarını, 60sn sayacını ve guardrail'leri bozmadığının kanıtıdır. Asenkron çıkarım esnasında butonların kilitlenmesi veya sayaç çakışması `isTransitioning` bayrağı ve deterministik kancalarla çözülmelidir.

