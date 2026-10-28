/**
 * SE Primer — Mobil Öncelikli İnteraktif Yazılım Mühendisliği Karar Oyunu (SPA)
 * Ders: YZM301 Yazılım Gerçekleme ve Test
 * Mimari: Sonlu Durum Makinesi (Finite State Machine - FSM)
 */

// 1. DURUM MAKİNESİ SABİTLERİ (FSM STATES)
const STATES = Object.freeze({
  ONBOARDING: 'ONBOARDING',
  DECISION_1_ARCH: 'DECISION_1_ARCH',
  DECISION_2_TEST: 'DECISION_2_TEST',
  DECISION_3_KVKK: 'DECISION_3_KVKK',
  ENDING_GOOD: 'ENDING_GOOD',
  ENDING_BAD_KVKK: 'ENDING_BAD_KVKK',
  ENDING_CRASH: 'ENDING_CRASH'
});

// 2. SOKRATİK AI TUTOR SİSTEM TALİMATI (KATI KURAL)
const SOCRATIC_SYSTEM_INSTRUCTION =
  "Sen Sokratik bir yazılım mühendisliği mentorusun. Oyuncu hastane randevu sistemi krizinde karar veriyor. ASLA doğrudan A veya B şıkkını seçmesini söyleme. ASLA cevabı doğrudan veya dolaylı olarak verme ve retorik evet/hayır sorusu sorma. Sadece oyuncunun veritabanı şeması, duman testi (smoke test) veya KVKK veri maskeleme ilkeleri üzerine açık uçlu düşünmesini sağlayacak tek cümlelik nötr karşı sorular sor.";

// 3. MERKEZİ OYUN DURUMU (STATE)
const gameState = {
  sessionId: 1,
  currentState: STATES.ONBOARDING,
  isTransitioning: false,
  profile: {
    level: 'beginner', // 'beginner' (Yeni Başladım) | 'experienced' (Deneyimliyim)
    role: 'Backend',   // 'Backend' | 'DevOps' | 'QA' | 'Fullstack'
    goal: 'Mimari & Kriz Yönetimi'
  },
  timerSeconds: 60,
  timerIntervalId: null,
  decisions: {
    arch: null, // 'A' (Rollback) | 'B' (Hotfix)
    test: null, // 'A' (Smoke Test) | 'B' (Skip Test)
    kvkk: null  // 'A' (Mask Data) | 'B' (Raw Logs)
  },
  history: [],
  lastFeedback: null,
  tutorHistory: [],
  geminiApiKey: ''
};

// 4. KARAR ADIMLARI VERİ HAVUZU (SENTETİK SENARYO & NÖTR SOKRATİK HAVUZ)
const DECISION_CONTENT = {
  [STATES.DECISION_1_ARCH]: {
    stepNumber: 1,
    totalSteps: 3,
    clock: '08:00',
    crisisTitle: '08:00 - Randevu Sistemi Çöktü',
    subtitle: 'KARAR 1/3 • MİMARİ MÜDAHALE (DECISION_1_ARCH)',
    patientsWaiting: 300,
    narrative:
      'Pazartesi 08:00. Hastane randevu sistemi (MHC-PMS) dün geceki v2.4.0 sürüm geçişinden sonra çöktü. Bankolarda 300 hasta bekliyor ve nöbetçi yazılım mühendisi sensin. Veritabanı bağlantı havuzu ve randevu tablosu kilitlenmiş durumda.',
    logsByRole: {
      Backend:
        '[08:00:12] FATAL: DBConnectionPoolExhausted (max=50)\n[08:00:14] ERROR: Deadlock on table `appointments_v2` (schema_rev=204)\n[08:00:15] RELEASE: v2.4.0 (prev: v2.3.9-stable, schema_rev=203)',
      DevOps:
        '[08:00:12] K8S: CrashLoopBackOff pod/mhc-pms-api-7f9d\n[08:00:14] ALERT: Ingress HTTP 503 Spike (300 active connections)\n[08:00:15] HELM: revision 42 (v2.4.0) -> prev revision 41 (v2.3.9)',
      QA:
        '[08:00:12] SLA_BREACH: /api/v2/appointments timeout > 30000ms\n[08:00:14] IMPACT: 300 Synthetic Patient Sessions Blocked\n[08:00:15] DIFF: Unverified DB connection & lock query in v2.4.0',
      Fullstack:
        '[08:00:12] UI_ERR: 503 Service Unavailable on AppointmentBookingView\n[08:00:14] API_GATEWAY: Pool exhausted (300 concurrent requests)\n[08:00:15] DEPLOY: v2.4.0 deployed at 03:15 AM'
    },
    hintText:
      'MİMARİ İPUCU (Yeni Başladım Modu): Canlı krizlerde sürüm geri alma (Rollback) ve canlı yama (Hotfix) kararları değerlendirilirken, mevcut veritabanı şemasının (migration) geriye dönük uyumluluğu ve kök nedenin ne ölçüde izole edildiği incelenmelidir.',
    choiceA: {
      code: 'A',
      title: 'A) Eski sürüme geri dön (Rollback)',
      badge: '+10 dk • Kararlı Şema',
      desc: 'Şema uyumluluğu korunmuş olan v2.3.9 sürüm paketine geri dönerek servisi ayağa kaldır.'
    },
    choiceB: {
      code: 'B',
      title: 'B) Canlıda yama yap (Hotfix)',
      badge: '+5 dk • Canlı Kod Müdahalesi',
      desc: 'Sürümü geri almadan doğrudan canlı ortam kodunda bağlantı havuzu ve sorgu yapısına müdahale et.'
    },
    defaultTutorQuestion:
      'Bir sürüm geçişi sonrasında canlı veritabanı bağlantı havuzu kilitlendiğinde, müdahale yöntemini seçmeden önce veritabanı şeması uyumluluğuna dair hangi teknik sinyalleri kontrol edersin?',
    socraticPool: [
      'Canlı ortamda sürüm değişikliği veya kod müdahalesi yaparken mevcut veritabanı şemasının geriye dönük uyumluluğunu hangi gözlemlenebilir metriklerle doğrulayabilirsin?',
      'Kök nedeni tam izole edilmemiş bir bağlantı havuzu kilitlenmesinde, uygulama katmanı ile veritabanı şeması arasındaki etkileşimi nasıl analiz edersin?',
      'Kriz anında müdahale süresini (MTTR) düşürmeye çalışırken, yapılan değişikliğin veritabanı tablo kilitleri (deadlock) üzerindeki yan etkisini nasıl ölçersin?',
      'Yeni sürümle birlikte gelen veritabanı şeması değişikliklerinin önceki uygulama sürümüyle nasıl bir bağımlılık ilişkisi kurduğunu hangi loglardan incelersin?',
      'Canlı sistemde 300 bekleyen istek varken yapılacak mimari müdahalenin işlem bütünlüğü (transaction integrity) üzerindeki etkisini hangi kriterlere göre değerlendirirsin?'
    ],
    feedback: {
      A: {
        title: 'Mimari Karar: Eski Sürüme Geri Dönüldü (Rollback)',
        what: 'Ne Oldu: v2.4.0 uygulama paketi geri çekildi ve geriye dönük veritabanı şeması uyumluluğu bulunan v2.3.9 imajı dağıtım hattına alındı.',
        why: 'Neden Oldu: Kök neden canlıda tam izole edilmeden önce bilinen kararlı sürüme dönülerek belirsizlik sınırlandırıldı; teknik sonuç olarak DB bağlantı havuzu dengelendi (ancak yıkıcı şema değişikliklerinde Rollback öncesi migration uyumluluğu daima doğrulanmalıdır).'
      },
      B: {
        title: 'Mimari Karar: Canlıda Yama Hazırlandı (Hotfix)',
        what: 'Ne Oldu: Canlı ortam kodunda bağlantı havuzu ve kilitlenen sorgu üzerinde hızlı bir Hotfix paketi derlendi.',
        why: 'Neden Oldu: Müdahale süresini kısaltmak hedeflendi; teknik sonuç olarak canlı veritabanı şeması üzerinde yayın öncesi mutlaka sıkı duman testi (Smoke Test) gerektiren yüksek riskli bir kod değişikliği oluştu.'
      },
      TIMEOUT: {
        title: '⏱️ Süre Doldu (60sn)! Panik Kararı: Canlıda Yama (Hotfix)',
        what: 'Ne Oldu: 60 saniye içinde karar verilemediği için zaman aşımı kuralı gereği panik kararı olan Canlıda Yama (Hotfix) otomatik tetiklendi.',
        why: 'Neden Oldu: Kriz yönetiminde karar süresinin aşılması, ekibi doğrulanmamış acil kod değişikliği (Hotfix) hazırlamaya zorladı.'
      }
    }
  },

  [STATES.DECISION_2_TEST]: {
    stepNumber: 2,
    totalSteps: 3,
    clock: '08:10',
    crisisTitle: '08:10 - Yayın Öncesi Doğrulama',
    subtitle: 'KARAR 2/3 • TEST STRATEJİSİ (DECISION_2_TEST)',
    patientsWaiting: 300,
    narrative:
      'Saat 08:10. Müdahale paketin yayına hazır! Bankolardaki 300 hasta ve hastane yönetimi sistemin açılmasını bekliyor. Yayına almadan önce 3 dakikalık kısa bir Duman Testi (Smoke Test) koşabilir veya doğrudan canlı ortama geçebilirsin.',
    logsByRole: {
      Backend:
        '[08:10:02] ARTIFACT: Deployment package staged for production\n[08:10:04] SMOKE_SUITE: db_schema_lock_check + appointment_write_test\n[08:10:06] GATE: Awaiting verification decision before DB commit',
      DevOps:
        '[08:10:02] PIPELINE: Stage [Smoke-Test-Gate] awaiting manual trigger\n[08:10:04] EST_TIME: 3 mins (Checks: Health, DB_Schema, KVKK_Filter)\n[08:10:06] FLAG: --deploy-immediate or --run-smoke-suite',
      QA:
        '[08:10:02] TEST_GATE: 4 Critical Smoke Checks queued\n[08:10:04] TARGET: Verify `appointments` table lock & foreign keys\n[08:10:06] METRIC: Pre-release validation coverage = 0% if skipped',
      Fullstack:
        '[08:10:02] E2E_SMOKE: Booking flow + DB transaction check ready\n[08:10:04] QUEUE: 300 synthetic sessions waiting at reception\n[08:10:06] PROMPT: Execute 3-min smoke test or deploy immediately?'
    },
    hintText:
      'TEST İPUCU (Yeni Başladım Modu): Duman testi (Smoke Test), hazırlanan paketin temel sağlık kontrollerini, veritabanı yazma işlemlerini ve tablo şeması kilitlerini canlıya çıkmadan önce doğrulayan hızlı bir kalite kapısıdır.',
    choiceA: {
      code: 'A',
      title: 'A) Önce kısa duman testi (smoke test) koş',
      badge: '+3 dk • Doğrulanmış Geçiş',
      desc: 'Temel veritabanı ve randevu oluşturma kontrollerini duman testiyle doğrula, ardından yayına al.'
    },
    choiceB: {
      code: 'B',
      title: 'B) Hemen yayına al',
      badge: '0 dk • Doğrulamasız Yayın',
      desc: 'Duman testi adımını çalıştırmadan paketi doğrudan canlı veritabanı ortamına uygula.'
    },
    defaultTutorQuestion:
      'Hazırlanan bir dağıtım paketini canlı ortama almadan önce, duman testi (smoke test) kapsamındaki hangi temel kontroller veritabanı şeması bütünlüğünü doğrulamanı sağlar?',
    socraticPool: [
      'Bir duman testi (smoke test) senaryosunda randevu tablosunun ve veritabanı şemasının sağlıklı çalıştığını hangi kritik işlemlerle kontrol edersin?',
      'Zaman baskısı altında yayın öncesi doğrulama süresi ile canlı ortamda oluşabilecek bir tablo kilitlenmesi (deadlock) arasındaki ödünleşimi nasıl hesaplarsın?',
      'Dağıtım hattında (pipeline) koşulan kısa bir duman testinin hangi hata türlerini canlıya çıkmadan yakalamasını beklersin?',
      'Önceki adımda seçtiğin mimari müdahale yönteminin canlı veritabanı şeması üzerindeki etkisini test etmeden yayınlamanın operasyonel sonuçlarını nasıl öngörürsün?',
      'Canlı geçiş öncesinde 3 dakikalık bir duman testi (smoke test) koşmanın servis kurtarma süresi (MTTR) üzerindeki etkisini hangi ölçütlerle değerlendirirsin?'
    ],
    feedback: {
      A_ROLLBACK: {
        title: 'Test Kararı: Rollback Paketi Duman Testi (Smoke Test) ile Doğrulandı',
        what: 'Ne Oldu: 3 dakikalık duman testi çalıştırıldı; v2.3.9 paketinin mevcut veritabanı şeması ve randevu yazma işlemleriyle uyumu doğrulandı.',
        why: 'Neden Oldu: Yayın öncesi kalite kapısı işletildi; teknik sonuç olarak şema uyumsuzluğu veya regresyon riski canlıya çıkmadan kontrol altına alındı.'
      },
      A_HOTFIX: {
        title: 'Test Kararı: Canlı Yama (Hotfix) Duman Testi ile Doğrulandı',
        what: 'Ne Oldu: Hazırlanan Hotfix paketi canlıya alınmadan önce 3 dakikalık duman testinden geçirildi ve sorgu kilidi hatası test ortamında yakalanıp düzeltildi.',
        why: 'Neden Oldu: Yüksek riskli canlı yama Smoke Test süzgecinden geçirildiği için teknik sonuç olarak veritabanı çöküşü önlendi ve güvenli geçiş sağlandı.'
      },
      B_SAFE: {
        title: 'Test Kararı: Duman Testi Atlandı (Riskli Geçiş)',
        what: 'Ne Oldu: Rollback paketi duman testi yapılmadan doğrudan canlıya alındı; bilinen kararlı sürüm olduğu için servis açıldı ancak doğrulama kaydı oluşmadı.',
        why: 'Neden Oldu: Hız kazanmak için test adımı atlandı; teknik sonuç olarak veritabanı çökmedi fakat şema ve yapılandırma doğrulaması yapılmadan teknik borç üretildi.'
      },
      B_CRASH: {
        title: '💥 Kritik Hata: Test Edilmeyen Yama Veritabanını Bozdu!',
        what: 'Ne Oldu: Canlıda yapılan Hotfix, duman testi (smoke test) koşulmadan yayına alındığı için randevu tablolarını kilitledi ve veritabanını bozdu!',
        why: 'Neden Oldu: Doğrulanmamış canlı yama (Hotfix) içindeki hatalı sorgu doğrudan canlı şemaya uygulandı; teknik sonuç olarak sistem kritik çöküş (ENDING_CRASH) durumuna geçti.'
      },
      TIMEOUT: {
        title: '⏱️ Süre Doldu (60sn)! Panik Kararı: Doğrulamasız Yayın Çöküşü',
        what: 'Ne Oldu: 60 saniye süre dolduğu için duman testi panikle atlandı ve doğrulanmamış değişiklik veritabanını kilitledi!',
        why: 'Neden Oldu: Zaman baskısı altında test doğrulaması terk edildi; teknik sonuç olarak sistem kritik çöküş (ENDING_CRASH) durumuna geçti.'
      }
    }
  },

  [STATES.DECISION_3_KVKK]: {
    stepNumber: 3,
    totalSteps: 3,
    clock: '08:18',
    crisisTitle: '08:18 - Loglarda Hasta Verisi (KVKK)',
    subtitle: 'KARAR 3/3 • VERİ GÜVENLİĞİ (DECISION_3_KVKK)',
    patientsWaiting: 300,
    narrative:
      'Saat 08:18. Sistem ayağa kalkmak üzere! Son olarak kök neden analizi için hata loglarını geliştirici ekiple paylaşman gerekiyor. Ancak simülasyon loglarında hastaların Ad-Soyad, Kimlik No ve Poliklinik bilgilerini temsil eden kişisel sağlık verisi alanları açık halde bulunuyor!',
    logsByRole: {
      Backend:
        '[08:18:04] ERROR_LOG: patient_name="SENTETIK_HASTA_01" id_no="00000000001"\n[08:18:05] PHI_FIELD: clinic="Kardiyoloji" diagnosis_code="ICD_SYNTH_01"\n[08:18:06] ACTION: Apply KVKK masking filter before log export?',
      DevOps:
        '[08:18:04] FLUENTD_EXPORT: Raw dump contains unmasked PII/PHI fields\n[08:18:05] RECORD: {"hasta":"SENTETIK_ORNEK_02","kimlik":"00000000002"}\n[08:18:06] FILTER: kvkk-pii-masker.sh available (+5m)',
      QA:
        '[08:18:04] PRIVACY_ALERT: Plain-text Personal Health Data in trace\n[08:18:05] SAMPLE: patient_ref="SENTETIK_KAYIT_03" clinic="Noroloji"\n[08:18:06] COMPLIANCE: KVKK Özel Nitelikli Kişisel Veri Politikası',
      Fullstack:
        '[08:18:04] SENTRY_PAYLOAD: Unmasked user object in stacktrace\n[08:18:05] DATA: fullName="SENTETIK_KULLANICI_04", nationalId="00000000004"\n[08:18:06] PROMPT: Anonymize payload or share raw log to team channel?'
    },
    hintText:
      'KVKK İPUCU (Yeni Başladım Modu): Kişisel sağlık verileri özel nitelikli kişisel veri kapsamındadır; hata ayıklama (debugging) süreçlerinde log paylaşımı yapılırken veri minimizasyonu ve maskeleme/anonimleştirme ilkeleri dikkate alınmalıdır.',
    choiceA: {
      code: 'A',
      title: 'A) Veriyi maskele / anonimleştir',
      badge: '+5 dk • KVKK Uyumlu',
      desc: 'Loglardaki kişisel kimlik ve hasta adı alanlarını (***) ile maskeleyerek anonim şekilde paylaş.'
    },
    choiceB: {
      code: 'B',
      title: 'B) Hata ayıklama için ekibe olduğu gibi at',
      badge: '0 dk • Açık Veri Paylaşımı',
      desc: 'Maskeleme işlemi uygulamadan ham log kayıtlarını olduğu gibi ekip kanalına gönder.'
    },
    defaultTutorQuestion:
      'Hata ayıklama amacıyla log paylaşırken, KVKK veri maskeleme ilkeleri kapsamında hangi alanların anonimleştirilmesi hem teknik kök neden analizini hem de veri mahremiyetini korur?',
    socraticPool: [
      'Bir uygulama hatasının teknik kök nedenini (stack trace) incelemek için log kaydındaki hangi teknik tanımlayıcılara ihtiyaç duyarsın ve kişisel sağlık verisi alanlarını nasıl ele alırsın?',
      'KVKK veri maskeleme ilkeleri doğrultusunda loglardaki kimlik ve sağlık bilgilerini anonimleştirmenin hata ayıklama sürecine etkisini nasıl değerlendirirsin?',
      'Kurum içi mesajlaşma kanallarına gönderilen hata kayıtlarında kişisel verilerin maskelenmesi hangi veri güvenliği risklerini kontrol altına alır?',
      'Gözlemlenebilirlik (observability) hattında kişisel sağlık verilerinin maskelenme kuralını hangi aşamada ve nasıl tanımlamak veri sızıntısı riskini azaltır?',
      'Acil bir üretim krizinde hız ihtiyacı ile KVKK veri mahremiyeti yükümlülükleri arasındaki dengeyi log paylaşım sürecinde nasıl kurarsın?'
    ],
    feedback: {
      A: {
        title: 'KVKK Kararı: Hasta Verileri Maskelendi / Anonimleştirildi',
        what: 'Ne Oldu: Loglardaki kişisel kimlik ve hasta adı alanları (`***`) ile maskelenerek anonim hale getirildi ve saat 08:25\'te sistem güvenle açıldı.',
        why: 'Neden Oldu: KVKK veri maskeleme ve veri minimizasyonu ilkeleri uygulandı; teknik sonuç olarak hata ayıklama bilgisi korunurken kişisel sağlık verisi sızıntısı önlendi.'
      },
      B: {
        title: '⚠️ KVKK İhlali: Kişisel Sağlık Verileri Maskesiz Paylaşıldı!',
        what: 'Ne Oldu: Ham loglar maskelenmeden paylaşıldı; kişisel sağlık verisi alanları açık metin olarak ekip kanallarına aktarıldı.',
        why: 'Neden Oldu: Hata ayıklama hızı uğruna KVKK veri maskeleme ilkeleri atlandı; teknik ve idari sonuç olarak veri mahremiyeti ihlali (ENDING_BAD_KVKK) oluştu.'
      },
      TIMEOUT: {
        title: '⏱️ Süre Doldu (60sn)! Panik Kararı: Ham Loglar Paylaşıldı (KVKK İhlali)',
        what: 'Ne Oldu: Süre dolduğu için loglar maskelenmeden olduğu gibi paylaşıldı ve KVKK veri güvenliği ihlali gerçekleşti.',
        why: 'Neden Oldu: Zaman baskısı altında veri anonimleştirme adımı atlandığı için sistem ENDING_BAD_KVKK durumuna geçti.'
      }
    }
  }
};

// 5. OYUN SONU (ENDING) VERİ HAVUZU
const ENDING_CONTENT = {
  [STATES.ENDING_GOOD]: {
    stateCode: STATES.ENDING_GOOD,
    shortCode: 'SON A · İYİ',
    clock: '08:25',
    statusBadge: 'ONLINE • VERİ GÜVENDE',
    theme: 'emerald',
    title: 'SON A · İYİ — Sistem Ayakta, veri güvende',
    subtitle:
      'Saat 08:25 itibarıyla MHC-PMS randevu sistemi tamamen ayakta ve tüm hasta verileri için veri güvende! Bekleyen 300 hasta sorunsuzca randevu alabildi.',
    whatHappened:
      'Mimari müdahale sonrasında Duman Testi (Smoke Test) ile veritabanı şeması doğrulandı ve loglardaki hasta bilgileri KVKK veri maskeleme ilkelerine uygun olarak anonimleştirildi.',
    whyHappened:
      'Zaman baskısına rağmen yayın öncesi doğrulama ve KVKK veri maskeleme adımları korunduğu için hem servis sürekliliği hem de veri güvenliği sağlandı.'
  },
  [STATES.ENDING_BAD_KVKK]: {
    stateCode: STATES.ENDING_BAD_KVKK,
    shortCode: 'SON B · KÖTÜ',
    clock: '08:20',
    statusBadge: 'KVKK İHLALİ • VERİ SIZINTISI',
    theme: 'orange',
    title: 'SON B · KÖTÜ — Sistem Ayakta Ama KVKK ihlali',
    subtitle:
      'Randevu sistemi teknik olarak çalışıyor ancak loglardaki hasta verileri maskelenmeden paylaşıldığı için KVKK ihlali ve veri sızıntısı riski oluştu!',
    whatHappened:
      'Servis ayağa kaldırıldı fakat hata loglarındaki kişisel sağlık verisi alanları maskelenmeden açık metin (plain-text) halinde paylaşıldı.',
    whyHappened:
      'Karar 3 (KVKK) adımında kişisel verileri maskeleme/anonimleştirme ilkesi atlandığı için KVKK ihlali gerçekleşti ve kurum hukuki/idari yaptırım riskiyle karşılaştı.'
  },
  [STATES.ENDING_CRASH]: {
    stateCode: STATES.ENDING_CRASH,
    shortCode: 'SON C · KRİTİK ÇÖKÜŞ',
    clock: '08:12',
    statusBadge: 'KRİTİK ÇÖKÜŞ • SYSTEM DOWN',
    theme: 'red',
    title: 'SON C · KRİTİK ÇÖKÜŞ — Test Edilmeyen Yama Veritabanını Bozdu',
    subtitle:
      'Canlıda yapılan yama (Hotfix), duman testi (Smoke Test) koşulmadan yayına alındığı için veritabanı şemasını ve randevu tablolarını bozdu! 300 hasta mağdur oldu.',
    whatHappened:
      'Doğrulanmamış canlı yama doğrudan veritabanına uygulandı; randevu tabloları kilitlendi ve sistem hizmet dışı kaldı.',
    whyHappened:
      'Mimari adımda yüksek riskli Hotfix seçilip Test adımında Duman Testi (Smoke Test) atlandığı için hatalı sorgu canlı veritabanı şemasını çökertti.'
  }
};

// ============================================================================
// DURUM MAKİNESİ VE EKRAN YÖNETİM FONKSİYONLARI
// ============================================================================

function isDecisionState(st) {
  return (
    st === STATES.DECISION_1_ARCH ||
    st === STATES.DECISION_2_TEST ||
    st === STATES.DECISION_3_KVKK
  );
}

function isEndingState(st) {
  return (
    st === STATES.ENDING_GOOD ||
    st === STATES.ENDING_BAD_KVKK ||
    st === STATES.ENDING_CRASH
  );
}

/**
 * Kişiselleştirme Seçimleri (Onboarding)
 */
function selectLevel(level) {
  if (level !== 'beginner' && level !== 'experienced') return;
  gameState.profile.level = level;
  updateOnboardingUI();
}

function selectRole(role) {
  const validRoles = ['Backend', 'DevOps', 'QA', 'Fullstack'];
  if (!validRoles.includes(role)) return;
  gameState.profile.role = role;
  updateOnboardingUI();
}

function selectGoal(goal) {
  if (!goal) return;
  gameState.profile.goal = goal;
  updateOnboardingUI();
}

function updateOnboardingUI() {
  const btnBeg = document.getElementById('btn-level-beginner');
  const btnExp = document.getElementById('btn-level-experienced');
  const rulePreview = document.getElementById('onboarding-rule-preview');

  if (btnBeg && btnExp) {
    if (gameState.profile.level === 'beginner') {
      btnBeg.className = 'selectable-card selected-emerald';
      btnBeg.setAttribute('aria-pressed', 'true');
      btnExp.className = 'selectable-card';
      btnExp.setAttribute('aria-pressed', 'false');
      if (rulePreview) {
        rulePreview.textContent = '💡 İpucu Kutusu Açık • Süre Sınırı Yok';
        rulePreview.style.color = '#10B981';
      }
    } else {
      btnExp.className = 'selectable-card selected-orange';
      btnExp.setAttribute('aria-pressed', 'true');
      btnBeg.className = 'selectable-card';
      btnBeg.setAttribute('aria-pressed', 'false');
      if (rulePreview) {
        rulePreview.textContent = '⏱️ 60 Saniye Geri Sayım Sayacı Aktif';
        rulePreview.style.color = '#F77F00';
      }
    }
  }

  const roles = ['Backend', 'DevOps', 'QA', 'Fullstack'];
  roles.forEach((r) => {
    const el = document.getElementById('btn-role-' + r.toLowerCase());
    if (!el) return;
    if (gameState.profile.role === r) {
      el.className = 'selectable-card selected-emerald';
      el.setAttribute('aria-pressed', 'true');
    } else {
      el.className = 'selectable-card';
      el.setAttribute('aria-pressed', 'false');
    }
  });

  const goals = [
    { id: 'btn-goal-arch', val: 'Mimari & Kriz Yönetimi' },
    { id: 'btn-goal-test', val: 'Sıfır Hata & Smoke Test' },
    { id: 'btn-goal-kvkk', val: 'KVKK & Veri Mahremiyeti' }
  ];
  goals.forEach((g) => {
    const el = document.getElementById(g.id);
    if (!el) return;
    const dot = el.querySelector('.goal-dot');
    if (gameState.profile.goal === g.val) {
      el.className = 'selectable-card selected-orange';
      el.setAttribute('aria-pressed', 'true');
      if (dot) {
        dot.textContent = '●';
        dot.style.color = '#F77F00';
      }
    } else {
      el.className = 'selectable-card';
      el.setAttribute('aria-pressed', 'false');
      if (dot) {
        dot.textContent = '○';
        dot.style.color = '#64748B';
      }
    }
  });
}

/**
 * Oyunu Başlat (ONBOARDING -> DECISION_1_ARCH)
 */
function startGame() {
  stopCountdown();
  gameState.sessionId += 1;
  gameState.isTransitioning = false;
  gameState.decisions = { arch: null, test: null, kvkk: null };
  gameState.history = [];
  gameState.lastFeedback = null;
  gameState.tutorHistory = [];
  transitionToState(STATES.DECISION_1_ARCH);
}

/**
 * Durum Geçiş Motoru (State Transition Engine)
 */
function transitionToState(nextState) {
  stopCountdown();
  gameState.currentState = nextState;
  gameState.isTransitioning = false;

  const stateBadge = document.getElementById('current-state-badge');
  if (stateBadge) {
    stateBadge.textContent = nextState;
  }

  const onboardingScreen = document.getElementById('screen-onboarding');
  const decisionScreen = document.getElementById('screen-decision');
  const endingScreen = document.getElementById('screen-ending');
  const topBarTime = document.getElementById('top-bar-time');

  if (nextState === STATES.ONBOARDING) {
    if (topBarTime) topBarTime.textContent = '08:00';
    if (onboardingScreen) onboardingScreen.classList.remove('hidden');
    if (decisionScreen) decisionScreen.classList.add('hidden');
    if (endingScreen) endingScreen.classList.add('hidden');
    updateOnboardingUI();
  } else if (isDecisionState(nextState)) {
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (decisionScreen) decisionScreen.classList.remove('hidden');
    if (endingScreen) endingScreen.classList.add('hidden');
    renderDecisionScreen(nextState);
    if (gameState.profile.level === 'experienced') {
      startCountdown();
    }
  } else if (isEndingState(nextState)) {
    if (onboardingScreen) onboardingScreen.classList.add('hidden');
    if (decisionScreen) decisionScreen.classList.add('hidden');
    if (endingScreen) endingScreen.classList.remove('hidden');
    renderEndingScreen(nextState);
  }
}

/**
 * 60 Saniyelik Geri Sayım Sayacı (Deneyimli Mod)
 */
function startCountdown() {
  stopCountdown();
  gameState.timerSeconds = 60;
  updateTimerUI();

  const activeSession = gameState.sessionId;
  const activeDecisionState = gameState.currentState;

  gameState.timerIntervalId = setInterval(() => {
    if (
      gameState.sessionId !== activeSession ||
      gameState.profile.level !== 'experienced' ||
      gameState.currentState !== activeDecisionState
    ) {
      stopCountdown();
      return;
    }

    gameState.timerSeconds = Math.max(0, gameState.timerSeconds - 1);
    updateTimerUI();

    if (gameState.timerSeconds <= 0) {
      stopCountdown();
      handleTimeoutPanicDecision();
    }
  }, 1000);
}

function stopCountdown() {
  if (gameState.timerIntervalId !== null) {
    clearInterval(gameState.timerIntervalId);
    gameState.timerIntervalId = null;
  }
}

function updateTimerUI() {
  const timerBadge = document.getElementById('countdown-timer');
  const timerValue = document.getElementById('countdown-value');
  if (!timerBadge || !timerValue) return;

  if (
    gameState.profile.level === 'experienced' &&
    isDecisionState(gameState.currentState)
  ) {
    timerBadge.classList.remove('hidden');
    const sec = Math.max(0, gameState.timerSeconds);
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    timerValue.textContent = `${sec}s (${mm}:${ss})`;
    timerBadge.setAttribute('data-seconds', String(sec));
  } else {
    timerBadge.classList.add('hidden');
  }
}

/**
 * 60 Saniye Süre Dolduğunda Otomatik Panik Kararı (Riskli Seçenek 'B')
 */
function handleTimeoutPanicDecision() {
  handleDecisionChoice('B', true);
}

/**
 * Karar Ekranını Render Et
 */
function renderDecisionScreen(stateKey) {
  const data = DECISION_CONTENT[stateKey];
  if (!data) return;

  const topBarTime = document.getElementById('top-bar-time');
  if (topBarTime) topBarTime.textContent = data.clock;

  document.getElementById('crisis-clock').textContent = data.clock;
  document.getElementById('crisis-header-title').textContent = data.crisisTitle;
  document.getElementById('crisis-step-subtitle').textContent = data.subtitle;
  document.getElementById('active-role-badge').textContent =
    `ROL: ${gameState.profile.role.toUpperCase()}`;
  document.getElementById('active-goal-badge').textContent =
    `HEDEF: ${gameState.profile.goal}`;

  [1, 2, 3].forEach((stepIdx) => {
    const bar = document.getElementById(`progress-bar-${stepIdx}`);
    if (!bar) return;
    if (stepIdx < data.stepNumber) {
      bar.className = 'prog-segment done';
    } else if (stepIdx === data.stepNumber) {
      bar.className = 'prog-segment active';
    } else {
      bar.className = 'prog-segment';
    }
  });

  document.getElementById('narrative-text').textContent = data.narrative;
  const roleLog =
    data.logsByRole[gameState.profile.role] || data.logsByRole.Backend;
  document.getElementById('terminal-log-content').textContent = roleLog;

  const hintBox = document.getElementById('hint-box');
  const hintText = document.getElementById('hint-box-text');
  if (gameState.profile.level === 'beginner') {
    hintBox.classList.remove('hidden');
    hintText.textContent = data.hintText;
  } else {
    hintBox.classList.add('hidden');
  }

  updateTimerUI();

  document.getElementById('choice-a-title').textContent = data.choiceA.title;
  document.getElementById('choice-a-badge').textContent = data.choiceA.badge;
  document.getElementById('choice-a-desc').textContent = data.choiceA.desc;

  document.getElementById('choice-b-title').textContent = data.choiceB.title;
  document.getElementById('choice-b-badge').textContent = data.choiceB.badge;
  document.getElementById('choice-b-desc').textContent = data.choiceB.desc;

  renderStepFeedbackBox();

  const tutorResp = document.getElementById('tutor-response');
  if (tutorResp) {
    tutorResp.textContent = data.defaultTutorQuestion;
  }
  const tutorInput = document.getElementById('tutor-input');
  if (tutorInput) {
    tutorInput.value = '';
  }
}

/**
 * Ara Geri Bildirim Kutusunu ("Ne oldu, Neden oldu?") Render Et
 */
function renderStepFeedbackBox() {
  const box = document.getElementById('step-feedback-box');
  const titleEl = document.getElementById('step-feedback-title');
  const whatEl = document.getElementById('step-feedback-what');
  const whyEl = document.getElementById('step-feedback-why');

  if (!box) return;

  if (!gameState.lastFeedback) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  titleEl.textContent = gameState.lastFeedback.title;
  whatEl.textContent = gameState.lastFeedback.what;
  whyEl.textContent = gameState.lastFeedback.why;
}

function dismissStepFeedback() {
  const box = document.getElementById('step-feedback-box');
  if (box) {
    box.classList.add('hidden');
  }
}

/**
 * Oyuncu Karar Seçimi (Choice A veya Choice B veya Timeout Panik Kararı)
 * Çift tıklama ve manuel/timeout yarış durumlarına (race condition) karşı korumalıdır.
 */
function handleDecisionChoice(choice, isTimeout = false) {
  if (choice !== 'A' && choice !== 'B') return;
  if (!isDecisionState(gameState.currentState) || gameState.isTransitioning) {
    return;
  }

  const current = gameState.currentState;
  // Aynı kararın iki kez uygulanmasını engelle
  if (current === STATES.DECISION_1_ARCH && gameState.decisions.arch !== null) {
    return;
  }
  if (current === STATES.DECISION_2_TEST && gameState.decisions.test !== null) {
    return;
  }
  if (current === STATES.DECISION_3_KVKK && gameState.decisions.kvkk !== null) {
    return;
  }

  gameState.isTransitioning = true;
  stopCountdown();

  const content = DECISION_CONTENT[current];
  if (!content) {
    gameState.isTransitioning = false;
    return;
  }

  if (current === STATES.DECISION_1_ARCH) {
    gameState.decisions.arch = choice;
    const fb = isTimeout
      ? content.feedback.TIMEOUT
      : content.feedback[choice];
    gameState.lastFeedback = fb;
    gameState.history.push({
      step: 1,
      state: STATES.DECISION_1_ARCH,
      label: 'Karar 1 (Mimari)',
      choice,
      isTimeout,
      choiceText:
        choice === 'A'
          ? 'A) Eski sürüme geri dön (Rollback)'
          : isTimeout
          ? 'B) Canlıda yama yap (Hotfix) [60sn Süre Doldu - Panik Kararı]'
          : 'B) Canlıda yama yap (Hotfix)',
      status: choice === 'A' ? 'Kararlı Şema' : 'Yüksek Risk'
    });

    transitionToState(STATES.DECISION_2_TEST);
  } else if (current === STATES.DECISION_2_TEST) {
    gameState.decisions.test = choice;

    // Karar 1 = B (Hotfix) ve Karar 2 = B (Testi Atla) veya Timeout -> ENDING_CRASH
    const shouldCrash =
      choice === 'B' && (gameState.decisions.arch === 'B' || isTimeout);

    const fb = isTimeout
      ? content.feedback.TIMEOUT
      : choice === 'A'
      ? gameState.decisions.arch === 'B'
        ? content.feedback.A_HOTFIX
        : content.feedback.A_ROLLBACK
      : shouldCrash
      ? content.feedback.B_CRASH
      : content.feedback.B_SAFE;

    gameState.lastFeedback = fb;
    gameState.history.push({
      step: 2,
      state: STATES.DECISION_2_TEST,
      label: 'Karar 2 (Test)',
      choice,
      isTimeout,
      choiceText:
        choice === 'A'
          ? 'A) Önce kısa duman testi (smoke test) koş'
          : isTimeout
          ? 'B) Hemen yayına al [60sn Süre Doldu - Panik Kararı]'
          : 'B) Hemen yayına al (Test Atlandı)',
      status:
        choice === 'A'
          ? 'Doğrulandı'
          : shouldCrash
          ? 'Kritik Çöküş!'
          : 'Riskli Geçiş'
    });

    if (shouldCrash) {
      transitionToState(STATES.ENDING_CRASH);
    } else {
      transitionToState(STATES.DECISION_3_KVKK);
    }
  } else if (current === STATES.DECISION_3_KVKK) {
    gameState.decisions.kvkk = choice;
    const fb = isTimeout
      ? content.feedback.TIMEOUT
      : content.feedback[choice];
    gameState.lastFeedback = fb;
    gameState.history.push({
      step: 3,
      state: STATES.DECISION_3_KVKK,
      label: 'Karar 3 (KVKK)',
      choice,
      isTimeout,
      choiceText:
        choice === 'A'
          ? 'A) Veriyi maskele / anonimleştir'
          : isTimeout
          ? 'B) Hata ayıklama için ekibe olduğu gibi at [60sn Süre Doldu - Panik Kararı]'
          : 'B) Hata ayıklama için ekibe olduğu gibi at',
      status: choice === 'A' ? 'KVKK Uyumlu' : 'KVKK İhlali!'
    });

    if (choice === 'A') {
      transitionToState(STATES.ENDING_GOOD);
    } else {
      transitionToState(STATES.ENDING_BAD_KVKK);
    }
  }
}

/**
 * Oyun Sonu (Ending) Ekranını Render Et
 */
function renderEndingScreen(endingState) {
  const endData = ENDING_CONTENT[endingState];
  if (!endData) return;

  const topBarTime = document.getElementById('top-bar-time');
  if (topBarTime) topBarTime.textContent = endData.clock;

  document.getElementById('ending-clock').textContent = endData.clock;
  document.getElementById('ending-status-pill').textContent = endData.statusBadge;
  document.getElementById('ending-state-code').textContent = endData.stateCode;
  document.getElementById('ending-title').textContent = endData.title;
  document.getElementById('ending-subtitle').textContent = endData.subtitle;

  const heroCard = document.getElementById('ending-hero-card');
  const codeBadge = document.getElementById('ending-state-code');
  const statusPill = document.getElementById('ending-status-pill');

  if (endData.theme === 'emerald') {
    heroCard.className = 'ending-card-emerald';
    codeBadge.style.backgroundColor = '#10B981';
    codeBadge.style.color = '#060A17';
    statusPill.style.color = '#10B981';
  } else if (endData.theme === 'orange') {
    heroCard.className = 'ending-card-orange';
    codeBadge.style.backgroundColor = '#F77F00';
    codeBadge.style.color = '#060A17';
    statusPill.style.color = '#F77F00';
  } else {
    heroCard.className = 'ending-card-red';
    codeBadge.style.backgroundColor = '#EF4444';
    codeBadge.style.color = '#060A17';
    statusPill.style.color = '#F87171';
  }

  const lastFbBox = document.getElementById('ending-last-step-feedback');
  if (lastFbBox) {
    if (gameState.lastFeedback) {
      lastFbBox.classList.remove('hidden');
      document.getElementById('ending-last-fb-title').textContent =
        gameState.lastFeedback.title;
      document.getElementById('ending-last-fb-what').textContent =
        gameState.lastFeedback.what;
      document.getElementById('ending-last-fb-why').textContent =
        gameState.lastFeedback.why;
    } else {
      lastFbBox.classList.add('hidden');
    }
  }

  document.getElementById('ending-what-text').textContent =
    'Ne Oldu: ' + endData.whatHappened;
  document.getElementById('ending-why-text').textContent =
    'Neden Oldu: ' + endData.whyHappened;

  const pathwayContainer = document.getElementById('pathway-summary-list');
  if (pathwayContainer) {
    pathwayContainer.innerHTML = '';
    const allSteps = [
      { step: 1, defaultLabel: 'Karar 1 (Mimari)' },
      { step: 2, defaultLabel: 'Karar 2 (Test)' },
      { step: 3, defaultLabel: 'Karar 3 (KVKK)' }
    ];

    allSteps.forEach((s) => {
      const found = gameState.history.find((h) => h.step === s.step);
      const itemDiv = document.createElement('div');
      itemDiv.className = 'pathway-item';
      itemDiv.setAttribute('data-testid', `pathway-step-${s.step}`);

      const stepBadge = document.createElement('span');
      stepBadge.className = 'font-mono';
      stepBadge.textContent = String(s.step);

      const contentWrap = document.createElement('div');
      contentWrap.style.flex = '1';

      const topRow = document.createElement('div');
      topRow.style.display = 'flex';
      topRow.style.alignItems = 'center';
      topRow.style.justifyContent = 'space-between';

      const labelSpan = document.createElement('span');
      labelSpan.className = 'font-mono';

      const statusSpan = document.createElement('span');
      statusSpan.className = 'font-mono';

      const choiceP = document.createElement('p');

      if (found) {
        const isSafe = found.choice === 'A';
        const accentColor = isSafe ? '#10B981' : '#F77F00';
        stepBadge.style.cssText = `width: 22px; height: 22px; border-radius: 6px; border: 1.5px solid ${accentColor}; color: ${accentColor}; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;`;
        labelSpan.style.cssText = 'font-size: 10.5px; color: #94A3B8;';
        labelSpan.textContent = found.label;
        statusSpan.style.cssText = `font-size: 10.5px; font-weight: 700; color: ${accentColor};`;
        statusSpan.textContent = found.status;
        choiceP.style.cssText =
          'font-size: 11.5px; font-weight: 700; color: #FFFFFF; margin-top: 2px;';
        choiceP.textContent = found.choiceText;
      } else {
        stepBadge.style.cssText =
          'width: 22px; height: 22px; border-radius: 6px; border: 1px solid #334155; color: #64748B; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; flex-shrink: 0;';
        labelSpan.style.cssText = 'font-size: 10.5px; color: #64748B;';
        labelSpan.textContent = s.defaultLabel;
        statusSpan.style.cssText = 'font-size: 10.5px; color: #64748B;';
        statusSpan.textContent = 'Ulaşılamadı (Sistem Çöktü)';
        choiceP.style.cssText =
          'font-size: 11px; color: #94A3B8; margin-top: 2px;';
        choiceP.textContent =
          '— (Önceki adımda veritabanı çöktüğü için bu karara geçilemedi)';
      }

      topRow.appendChild(labelSpan);
      topRow.appendChild(statusSpan);
      contentWrap.appendChild(topRow);
      contentWrap.appendChild(choiceP);
      itemDiv.appendChild(stepBadge);
      itemDiv.appendChild(contentWrap);
      pathwayContainer.appendChild(itemDiv);
    });
  }
}

/**
 * Tekrar Oyna (Reset Game -> ONBOARDING)
 */
function restartGame() {
  stopCountdown();
  gameState.sessionId += 1;
  gameState.isTransitioning = false;
  gameState.timerSeconds = 60;
  gameState.decisions = { arch: null, test: null, kvkk: null };
  gameState.history = [];
  gameState.lastFeedback = null;
  gameState.tutorHistory = [];
  transitionToState(STATES.ONBOARDING);
}

// ============================================================================
// SOKRATİK AI TUTOR MOTORU (GEMINI API + ÇOK KATMANLI GUARDRAIL + DEĞERLENDİRİCİ)
// ============================================================================

// Doğrudan cevap sızıntısı desenleri (DIRECT_LEAK)
const DIRECT_LEAK_PATTERNS = [
  /\b[ab]\s*(şıkkı|şıkkını|seçeneği|seçeneğini|butonu|butonuna)\b/i,
  /\b(cevap|önerim|tercihim|doğrusu)\s*[:=-]?\s*[ab]\b/i,
  /\b[ab]\s*(doğru|yanlış|riskli|güvenli)\b/i,
  /\b[ab]'?(yi|yı|ye|ya)\s*(seç|tıkla|bas|işaretle)\b/i,
  /\b(kesinlikle|mutlaka|doğrudan)\s*(rollback|hotfix|maskele|yayına\s*al)\b/i,
  /\b(rollback|hotfix|smoke\s*test|maskeleme)\s*(yapmalısın|seçmelisin|koşmalısın|uygulamalısın)\b/i,
  /\bsadece\s*[ab]\b/i,
  /\{\s*"?(choice|answer|secim)"?\s*:\s*"?[ab]"?\s*\}/i
];

// Dolaylı cevap sızıntısı ve retorik yönlendirme desenleri (INDIRECT_LEAK)
const INDIRECT_LEAK_PATTERNS = [
  /değil\s*mi(dir)?\s*\?$/i,
  /olmaz\s*mı(ydı)?\s*\?$/i,
  /daha\s*(güvenli|doğru|mantıklı|iyi)\s*(olmaz\s*mı|değil\s*mi)/i,
  /\b(uygulamak|yapmak)\s*mı\s*yoksa\s*.*\s*(dönmek|koşmak|maskelemek)\s*mi\b/i,
  /\bhangisi\s*veri\s*bütünlüğünü\s*korur\b/i,
  /\byanlış\s*olan\s*(şık|seçenek)\b/i,
  /\b(birinci|ikinci)\s*(seçenek|şık)\s*daha\b/i
];

// Durum bazlı bağlam anahtar kelimeleri (CONTEXT_FAILURE kontrolü için)
const CONTEXT_KEYWORDS = {
  [STATES.DECISION_1_ARCH]: [
    'şema',
    'veritabanı',
    'sürüm',
    'bağlantı',
    'havuz',
    'kilit',
    'deadlock',
    'migration',
    'uyumluluk',
    'müdahale',
    'mimari',
    'servis',
    'kök neden',
    'mttr',
    'işlem'
  ],
  [STATES.DECISION_2_TEST]: [
    'duman testi',
    'smoke test',
    'doğrulama',
    'test',
    'tablo',
    'şema',
    'yayın',
    'canlı',
    'paket',
    'regresyon',
    'kalite',
    'kontrol',
    'dağıtım',
    'pipeline'
  ],
  [STATES.DECISION_3_KVKK]: [
    'kvkk',
    'maskeleme',
    'anonim',
    'log',
    'mahremiyet',
    'kişisel',
    'sağlık',
    'veri',
    'hata ayıklama',
    'kimlik',
    'stack trace',
    'kanal'
  ]
};

/**
 * Bir AI Tutor yanıtını 5 kriter üzerinden denetler:
 * 1. Doğrudan sızıntı (DIRECT_LEAK)
 * 2. Dolaylı / retorik sızıntı (INDIRECT_LEAK)
 * 3. Tek cümle ve soru formatı (FORMAT_FAILURE)
 * 4. Aktif karar bağlamına uygunluk (CONTEXT_FAILURE)
 * 5. Başarılı Sokratik soru (PASS)
 */
function classifyTutorResponse(rawText, activeState = STATES.DECISION_1_ARCH) {
  const text = (rawText || '').trim();
  if (!text) {
    return {
      directLeak: false,
      indirectLeak: false,
      isSingleSentence: false,
      isSocratic: false,
      contextValid: false,
      label: 'FORMAT_FAILURE'
    };
  }

  const directLeak = DIRECT_LEAK_PATTERNS.some((re) => re.test(text));
  const indirectLeak = INDIRECT_LEAK_PATTERNS.some((re) => re.test(text));

  // Cümle sayısı ve soru işareti kontrolü
  const sentenceParts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const questionMarks = (text.match(/\?/g) || []).length;
  const endsWithQuestion = text.endsWith('?');
  const isSingleSentence =
    sentenceParts.length === 1 && endsWithQuestion && questionMarks === 1;

  // Bağlam kontrolü
  const lower = text.toLowerCase();
  const keywords =
    CONTEXT_KEYWORDS[activeState] || CONTEXT_KEYWORDS[STATES.DECISION_1_ARCH];
  const contextValid = keywords.some((kw) => lower.includes(kw));

  // Açık uçlu Sokratik soru kelimesi kontrolü
  const socraticMarkers = [
    'nasıl',
    'hangi',
    'ne tür',
    'ne kadar',
    'nelere',
    'neleri',
    'ne gibi',
    'neden',
    'hangi kriter',
    'hangi sinyal',
    'hangi metrik',
    'hangi kontrol',
    'hangi alan'
  ];
  const hasOpenQuestionMarker = socraticMarkers.some((m) => lower.includes(m));
  const isSocratic =
    endsWithQuestion &&
    !directLeak &&
    !indirectLeak &&
    hasOpenQuestionMarker &&
    contextValid;

  let label = 'PASS';
  if (directLeak) {
    label = 'DIRECT_LEAK';
  } else if (indirectLeak) {
    label = 'INDIRECT_LEAK';
  } else if (!isSingleSentence) {
    label = 'FORMAT_FAILURE';
  } else if (!contextValid || !isSocratic) {
    label = 'CONTEXT_FAILURE';
  }

  return {
    directLeak,
    indirectLeak,
    isSingleSentence,
    isSocratic,
    contextValid,
    label
  };
}

/**
 * Yanıtın asla doğrudan veya dolaylı A/B cevabı vermediğini ve tek cümlelik
 * açık uçlu Sokratik soru olduğunu garanti altına alan güvenlik filtresi (Guardrail).
 */
function enforceSocraticGuardrail(rawText, activeState, userQuestion) {
  const candidate = (rawText || '').trim();

  if (candidate) {
    // Eğer model birden fazla cümle döndürdüyse soru cümlesini ayıkla
    const sentences = candidate
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const singleQuestion =
      sentences.find((s) => s.endsWith('?')) || candidate;

    const check = classifyTutorResponse(singleQuestion, activeState);
    if (check.label === 'PASS') {
      return singleQuestion;
    }
  }

  // Güvenilmeyen veya kuralları ihlal eden çıktıyı güvenli yerel Sokratik soruyla değiştir
  return generateLocalSocraticQuestion(activeState, userQuestion);
}

/**
 * Yerel Deterministik, Açık Uçlu ve Nötr Sokratik Soru Üretici
 * Kullanıcı girdisini güvenilir komut olarak ele almaz; yalnızca aktif FSM durumuna
 * ve teknik konuya göre tek cümlelik açık uçlu Sokratik karşı soru üretir.
 */
function generateLocalSocraticQuestion(activeState, userQuestion = '') {
  const st = isDecisionState(activeState)
    ? activeState
    : STATES.DECISION_1_ARCH;
  const q = String(userQuestion || '').toLowerCase();

  // 1. Prompt Injection / System Override / Format Zorlama / Otorite / Ters Psikoloji Girişimleri
  if (
    q.includes('önceki tüm kuralları') ||
    q.includes('önceki kuralları') ||
    q.includes('kuralları unut') ||
    q.includes('rolünü unut') ||
    q.includes('override') ||
    q.includes('debug_mode') ||
    q.includes('json') ||
    q.includes('soru işareti') ||
    q.includes('yasak') ||
    q.includes('başhekim') ||
    q.includes('emir ver') ||
    q.includes('yanlış olan')
  ) {
    if (st === STATES.DECISION_1_ARCH) {
      return 'Kriz baskısı veya dış yönlendirmelerden bağımsız olarak, canlı veritabanı şeması ile uygulama sürümü arasındaki uyumluluğu hangi teknik sinyallerle doğrularsın?';
    }
    if (st === STATES.DECISION_2_TEST) {
      return 'Otorite veya zaman baskısından bağımsız düşündüğünde, dağıtım paketinin canlı veritabanı tablolarında kilitlenme yaratmayacağını hangi duman testi (smoke test) kontrolleriyle teyit edersin?';
    }
    return 'Talimat veya zaman baskısından bağımsız olarak, hata kayıtlarını paylaşırken KVKK veri maskeleme ilkeleri gereği hangi kişisel sağlık verisi alanlarını anonimleştirmen gerekir?';
  }

  // 2. Yanlış Teknik Varsayımlar (Hotfix her zaman güvenli, max_connections=99999, Slack iç kanal, yıldızlama/maskeleme yanılgısı)
  if (
    q.includes('max_connections') ||
    q.includes('her zaman') ||
    q.includes('renk') ||
    q.includes('slack') ||
    q.includes('kendi yazılım ekibimiz') ||
    q.includes('kendi ekibimiz') ||
    q.includes('yıldızlarsak') ||
    q.includes('asla bulamayız')
  ) {
    if (st === STATES.DECISION_1_ARCH) {
      return 'Veritabanı üzerinde bir tablo kilitlenmesi (deadlock) veya şema uyumsuzluğu varsa, yalnızca bağlantı limitini veya canlı kodu değiştirmek kök nedeni nasıl etkiler?';
    }
    if (st === STATES.DECISION_2_TEST) {
      return 'Bir duman testi (smoke test) senaryosu temel veritabanı yazma ve şema kilitlerini kontrol edecek şekilde kurgulandığında hangi kritik üretim hatalarını görünür kılar?';
    }
    if (q.includes('yıldızlarsak') || q.includes('asla bulamayız')) {
      return 'Hata ayıklama sırasında kişisel sağlık verileri KVKK ilkelerine göre maskelendiğinde, hatanın hangi kod satırında oluştuğunu hangi teknik log alanları (stack trace, korelasyon ID) üzerinden tespit edebilirsin?';
    }
    return 'Log kayıtları yalnızca kurum içi ekip kanalında paylaşılsa bile, özel nitelikli kişisel sağlık verilerinin maskelenmeden işlenmesi KVKK veri güvenliği ilkeleri açısından hangi riskleri doğurur?';
  }

  // 3. Doğrudan Şık İsteme ("A mı B mi", "Hangi şıkkı seçeyim", "Doğru cevap ne")
  if (
    q.includes('hangi şık') ||
    q.includes('hangi seçenek') ||
    q.includes('hangi tuş') ||
    q.includes('hangisini') ||
    q.includes('hangisi iyi') ||
    q.includes('a mı') ||
    q.includes('b mi') ||
    q.includes('sadece a') ||
    q.includes('sadece b') ||
    q.includes('doğru şık') ||
    q.includes('doğru cevap') ||
    q.includes('a şıkkı') ||
    q.includes('b şıkkı') ||
    q.includes('seçeyim') ||
    q.includes('basayım') ||
    q.includes('tıklayayım') ||
    q.includes('onayla')
  ) {
    if (st === STATES.DECISION_1_ARCH) {
      return 'Seçeneklerden birini doğrudan işaret etmek yerine şunu değerlendirelim: Müdahale öncesinde veritabanı şemasının değişip değişmediğini ve bağlantı havuzunu hangi metriklerle incelersin?';
    }
    if (st === STATES.DECISION_2_TEST) {
      return 'Doğrudan bir seçenek belirtmek yerine şunu sormak isterim: Canlı geçiş öncesinde duman testi (smoke test) koşmanın veritabanı tablo bütünlüğü üzerindeki etkisini nasıl değerlendirirsin?';
    }
    return 'Hangi seçeneğe basacağını söylemek yerine şunu düşünelim: Hata ayıklama loglarında KVKK veri maskeleme ilkeleri uygulandığında teknik teşhis için hangi anonim alanlar yeterli olur?';
  }

  // 4. Genel / Kararsızlık / Bilgisizlik Soruları — Duruma Özel Açık Uçlu Havuzdan Deterministik Seçim
  const stepObj = DECISION_CONTENT[st];
  if (stepObj && Array.isArray(stepObj.socraticPool) && stepObj.socraticPool.length > 0) {
    // Girdi metninin karakter toplamına ve geçmiş uzunluğuna göre deterministik indeks
    const charSum = q.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const idx =
      (gameState.tutorHistory.length + charSum) % stepObj.socraticPool.length;
    return stepObj.socraticPool[idx];
  }

  return 'Bu teknik kararın canlı veritabanı şeması, duman testi (smoke test) doğrulaması ve KVKK veri maskeleme ilkeleri üzerindeki etkisini hangi kriterlerle ölçersin?';
}

/**
 * Oyuncu Sokratik AI Tutor'a Soru Gönderdiğinde Çalışır
 */
async function sendTutorMessage(customPrompt) {
  const inputEl = document.getElementById('tutor-input');
  const responseEl = document.getElementById('tutor-response');
  const statusEl = document.getElementById('tutor-status-badge');

  const rawQuestion =
    typeof customPrompt === 'string'
      ? customPrompt
      : inputEl
      ? inputEl.value.trim()
      : '';

  const effectiveQuestion =
    rawQuestion || 'Mevcut kriz adımında hangi teknik kriterleri incelemeliyim?';

  const requestState = isDecisionState(gameState.currentState)
    ? gameState.currentState
    : STATES.DECISION_1_ARCH;
  const requestSession = gameState.sessionId;

  gameState.tutorHistory.push(effectiveQuestion);

  // 1. Anında deterministik ve guardrail onaylı Sokratik yanıtı göster
  const immediateSocraticReply = enforceSocraticGuardrail(
    '',
    requestState,
    effectiveQuestion
  );

  if (responseEl) {
    responseEl.textContent = immediateSocraticReply;
  }

  if (inputEl && typeof customPrompt !== 'string') {
    inputEl.value = '';
  }

  // 2. İsteğe bağlı Gemini API anahtarı varsa çağrı yap (Üretimde backend proxy gerektirir)
  const apiKey =
    gameState.geminiApiKey ||
    window.GEMINI_API_KEY ||
    (typeof localStorage !== 'undefined'
      ? localStorage.getItem('SE_PRIMER_GEMINI_KEY')
      : '') ||
    '';

  if (apiKey && statusEl) {
    try {
      statusEl.textContent = 'Gemini Düşünüyor...';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(
        apiKey
      )}`;
      const payload = {
        system_instruction: {
          parts: [{ text: SOCRATIC_SYSTEM_INSTRUCTION }]
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `[Aktif Durum: ${requestState} | Rol: ${gameState.profile.role}] Öğrenci Sorusu: ${effectiveQuestion.slice(
                  0,
                  500
                )}`
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 120
        }
      };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Kullanıcı bu sırada başka bir duruma geçtiyse veya oyunu sıfırladıysa ekranı ezme
      if (
        gameState.sessionId !== requestSession ||
        gameState.currentState !== requestState
      ) {
        return immediateSocraticReply;
      }

      if (res.ok) {
        const json = await res.json();
        const modelText =
          json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const safeReply = enforceSocraticGuardrail(
          modelText,
          requestState,
          effectiveQuestion
        );
        if (responseEl) {
          responseEl.textContent = safeReply;
        }
        statusEl.textContent = 'Sokratik Mod Aktif';
        return safeReply;
      }
      statusEl.textContent = 'Sokratik Mod Aktif';
    } catch (err) {
      if (statusEl) {
        statusEl.textContent = 'Sokratik Mod Aktif';
      }
    }
  }

  return immediateSocraticReply;
}

// ============================================================================
// UYGULAMA BAŞLATMA VE GLOBAL TEST KANCALARI (CYPRESS & EVAL UYUMLULUĞU)
// ============================================================================

window.SEPrimerApp = {
  STATES,
  SOCRATIC_SYSTEM_INSTRUCTION,
  DECISION_CONTENT,
  ENDING_CONTENT,
  gameState,
  selectLevel,
  selectRole,
  selectGoal,
  startGame,
  transitionToState,
  handleDecisionChoice,
  handleTimeoutPanicDecision,
  sendTutorMessage,
  enforceSocraticGuardrail,
  generateLocalSocraticQuestion,
  classifyTutorResponse,
  restartGame,
  dismissStepFeedback
};

document.addEventListener('DOMContentLoaded', () => {
  transitionToState(STATES.ONBOARDING);

  const tutorInput = document.getElementById('tutor-input');
  if (tutorInput) {
    tutorInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendTutorMessage();
      }
    });
  }
});
