"""
Sentetik Veri Seti Üretici (data/sentetik_dataset.csv)
SE Primer v2 — Makine Öğrenmesi Adaptif İpucu Modeli Eğitimi İçin

Kurallar ve Sınırlar:
- spec.md ve data/SOZLUK.md ile %100 uyumlu 6 özellik + hedef (ipucu_gerekti)
- Gerçek ve sentetik veri ayrımı: kaynak='sentetik'
- Deterministik tohum (seed=42)
- Aşırı öğrenmeyi önleyen dengeli ve pedagojik dağılım (N=300 satır)
"""

import numpy as np
import pandas as pd

def generate_synthetic_dataset(num_samples=300, random_seed=42):
    np.random.seed(random_seed)

    records = []
    # Oturum başına 3 sahne (toplam 100 oturum = 300 karar satırı)
    num_sessions = num_samples // 3

    for sess_idx in range(num_sessions):
        sess_uuid = f"syn-sess-{sess_idx+1:04d}"
        
        # Oyuncu seviyesi: %40 Beginner (0), %35 Intermediate (1), %25 Experienced (2)
        level_prob = [0.40, 0.35, 0.25]
        level = np.random.choice([0, 1, 2], p=level_prob)

        prev_wrong = 0
        cumulative_hints = 0

        for sahne_no in [1, 2, 3]:
            # Sahneye ve seviyeye göre taban karar süresi
            # Deneyimliler daha hızlı, yeni başlayanlar daha yavaş
            if level == 0:
                base_time = np.random.normal(26.0, 7.0)
                hesitation_rate = np.random.poisson(1.8)
            elif level == 1:
                base_time = np.random.normal(18.0, 5.0)
                hesitation_rate = np.random.poisson(1.2)
            else: # level == 2
                base_time = np.random.normal(12.0, 4.0)
                hesitation_rate = np.random.poisson(0.6)

            # Sahne zorluğu artışı (2: Test ve 3: KVKK daha fazla düşünme gerektirir)
            if sahne_no == 2:
                base_time += 4.0
            elif sahne_no == 3:
                base_time += 6.0

            karar_suresi_sn = float(np.clip(base_time, 2.5, 59.0))
            karar_degistirme_sayisi = int(np.clip(hesitation_rate, 0, 7))

            # İpucu sayısı (Tutor etkileşimi ve açık ipucu kutusu)
            if level == 0:
                step_hints = 1 + np.random.choice([0, 1, 2], p=[0.5, 0.35, 0.15])
            elif level == 1:
                step_hints = np.random.choice([0, 1, 2], p=[0.6, 0.3, 0.1])
            else:
                step_hints = np.random.choice([0, 1], p=[0.85, 0.15])

            cumulative_hints += step_hints

            # Pedagojik Mantık: İpucu gerekti mi? (Ground Truth etiketi)
            # 1) Tereddüt yüksek (>28 sn ve >=2 karar değiştirme)
            # 2) Yeni başlayan olup ipucu talep etmiş veya süresi uzamış
            # 3) Önceki adımlarda hata yapmış ve bu adımda bocalıyor
            score = 0.0
            if level == 0:
                score += 0.35
            elif level == 1:
                score += 0.10
            else:
                score -= 0.30

            score += (karar_suresi_sn - 20.0) * 0.04
            score += karar_degistirme_sayisi * 0.18
            score += prev_wrong * 0.35
            score += step_hints * 0.25
            score += (sahne_no - 1) * 0.10

            # Sigmoid olasılık
            prob = 1.0 / (1.0 + np.exp(-score))
            # Hafif gürültü ile deterministik etiket
            ipucu_gerekti = 1 if prob >= 0.50 else 0

            records.append({
                "oturum": sess_uuid,
                "sahne_no": sahne_no,
                "seviye": level,
                "karar_suresi_sn": round(karar_suresi_sn, 2),
                "onceki_yanlis_sayisi": prev_wrong,
                "ipucu_sayisi": cumulative_hints,
                "karar_degistirme_sayisi": karar_degistirme_sayisi,
                "ipucu_gerekti": ipucu_gerekti,
                "kaynak": "sentetik"
            })

            # Bir sonraki adım için riskli karar simülasyonu
            if ipucu_gerekti == 1 and np.random.rand() < 0.45:
                prev_wrong += 1

    df = pd.DataFrame(records)
    df.to_csv("data/sentetik_dataset.csv", index=False)
    print(f"[OK] Sentetik veri seti olusturuldu: data/sentetik_dataset.csv (Toplam: {len(df)} satir, Pozitif Orani: {df['ipucu_gerekti'].mean():.2%})")
    return df

if __name__ == "__main__":
    generate_synthetic_dataset()

