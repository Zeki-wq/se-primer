#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SE Primer v2 — Diferansiyel Test & Python Oracle Betiği (tests/parite.py)
Ders: YZM301 Yazılım Gerçekleme ve Test

Amaç:
    model/model.onnx dosyasını ONNX Runtime (CPU) ile çalıştırarak 5 referans girdi
    için kesin pozitif sınıf olasılıklarını P(ipucu=1) hesaplar ve tests/parite.json
    dosyasına kaydeder.

    Bu dosya, Cypress tarafından istemci tarafı onnxruntime-web olasılığıyla
    mutlak fark < 1e-4 doğrulaması (Parity Check) yapmak için tüketilir.
"""

import os
import json
import numpy as np
import onnxruntime as ort

MODEL_PATH = os.path.join("model", "model.onnx")
OUTPUT_JSON = os.path.join("tests", "parite.json")

# 5 Farklı Karakteristik Referans Senaryo
# Sıra: [seviye, karar_suresi_sn, onceki_yanlis_sayisi, ipucu_sayisi, sahne_no, karar_degistirme_sayisi]
REFERENCE_CASES = [
    {
        "id": "ref_1_beginner_hesitant",
        "description": "Yeni başlayan, uzun süre tereddüt etmiş ve ipucu kullanmış (Yüksek İhtiyaç)",
        "features": [0, 38.5, 1, 2, 2, 3]
    },
    {
        "id": "ref_2_experienced_fast",
        "description": "Deneyimli mühendis, hızlı ve hatasız karar veriyor (Düşük İhtiyaç)",
        "features": [2, 7.8, 0, 0, 1, 0]
    },
    {
        "id": "ref_3_intermediate_oscillating",
        "description": "Orta seviye, KVKK adımında seçenekler arasında gidip geliyor (Eşik Üstü)",
        "features": [1, 25.0, 0, 1, 3, 4]
    },
    {
        "id": "ref_4_experienced_stuck",
        "description": "Deneyimli mühendis ama test adımında 45 saniyedir takılmış (Adaptif Tetik)",
        "features": [2, 45.0, 1, 0, 2, 2]
    },
    {
        "id": "ref_5_beginner_confident",
        "description": "Yeni başlayan ama ilk adımda net ve hızlı karar vermiş (Eşik Altı)",
        "features": [0, 12.0, 0, 0, 1, 0]
    }
]

def run_oracle():
    print("=" * 70)
    print("SE PRIMER v2 — PYTHON ORACLE DIFERANSIYEL TEST (tests/parite.py)")
    print("=" * 70)

    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model dosyası bulunamadı: {MODEL_PATH}")

    session = ort.InferenceSession(MODEL_PATH, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    prob_output_name = session.get_outputs()[1].name # 0: label, 1: probabilities

    results = []
    print(f"\nModel: {MODEL_PATH}")
    print(f"Giriş: {input_name}, Çıkış: {prob_output_name}\n")
    print(f"{'#':<3} {'ID':<30} {'P(ipucu=1)':<15} {'Karar (tau=0.60)':<18} {'Açıklama'}")
    print("-" * 90)

    for idx, case in enumerate(REFERENCE_CASES, start=1):
        feat_array = np.array([case["features"]], dtype=np.float32)
        outputs = session.run([prob_output_name], {input_name: feat_array})
        probs = outputs[0][0] # [P(0), P(1)]
        pos_prob = float(probs[1])
        decision = 1 if pos_prob >= 0.60 else 0

        res_item = {
            "id": case["id"],
            "description": case["description"],
            "features": case["features"],
            "expected_prob": round(pos_prob, 6),
            "expected_prob_raw": pos_prob,
            "decision": decision,
            "threshold": 0.60
        }
        results.append(res_item)

        dec_text = "YARDIM (1)" if decision == 1 else "NORMAL (0)"
        print(f"{idx:<3} {case['id']:<30} {pos_prob:<15.6f} {dec_text:<18} {case['description']}")

    output_data = {
        "model_file": MODEL_PATH,
        "oracle_framework": "onnxruntime-python",
        "tolerance": 1e-4,
        "feature_order": [
            "seviye",
            "karar_suresi_sn",
            "onceki_yanlis_sayisi",
            "ipucu_sayisi",
            "sahne_no",
            "karar_degistirme_sayisi"
        ],
        "reference_cases": results
    }

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(output_data, f, indent=2, ensure_ascii=False)

    print("-" * 90)
    print(f"[OK] Parite referans tablosu başarıyla kaydedildi: {OUTPUT_JSON}")
    print("=" * 70)

if __name__ == "__main__":
    run_oracle()

