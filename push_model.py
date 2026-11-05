#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
SE Primer v2 — Hugging Face Model Deposu Yükleme Betiği (push_model.py)
Ders: YZM301 Yazılım Gerçekleme ve Test

Amaç:
    Eğitilmiş model paketini (model/model.onnx, model/config.json, model/README.md)
    Hugging Face Hub üzerindeki özel veya genel model deposuna yükler ve
    sürümleme için kesin Commit SHA değerini döner.

Güvenlik Kuralları:
    - Token ASLA bu kaynak koda yazılmaz.
    - Kimlik doğrulama HF_TOKEN veya HUGGING_FACE_HUB_TOKEN ortam değişkeninden
      ya da interaktif getpass() üzerinden kullanıcıdan güvenle alınır.
    - Repo ID HF_REPO_ID ortam değişkeninden veya komut satırı argümanından alınır.
"""

import os
import sys
import argparse
import getpass
from huggingface_hub import HfApi, create_repo

REQUIRED_FILES = [
    os.path.join("model", "model.onnx"),
    os.path.join("model", "config.json"),
    os.path.join("model", "README.md")
]

def parse_args():
    parser = argparse.ArgumentParser(description="Hugging Face Model Yükleyici (SE Primer v2)")
    parser.add_argument(
        "--repo-id",
        type=str,
        default=os.environ.get("HF_REPO_ID"),
        help="Hugging Face Repo ID (örn: kullanici_adi/se-primer-hint-model). Belirtilmezse HF_REPO_ID ortam değişkeni kullanılır."
    )
    parser.add_argument(
        "--private",
        action="store_true",
        help="Yeni repo oluşturuluyorsa private olarak oluştur."
    )
    parser.add_argument(
        "--commit-message",
        type=str,
        default="feat(model): release SE Primer v2.0 adaptive hint ONNX model package",
        help="Hugging Face commit mesajı."
    )
    return parser.parse_args()

def get_auth_token():
    """
    Güvenli token alma mekanizması:
    1. HF_TOKEN ortam değişkeni
    2. HUGGING_FACE_HUB_TOKEN ortam değişkeni
    3. Terminal üzerinden gizli girdi (getpass)
    """
    token = os.environ.get("HF_TOKEN") or os.environ.get("HUGGING_FACE_HUB_TOKEN")
    if token and token.strip():
        print("✓ Token ortam değişkeninden (HF_TOKEN) başarıyla okundu.")
        return token.strip()

    print("\n[GÜVENLİ KİMLİK DOĞRULAMA]")
    print("HF_TOKEN ortam değişkeni bulunamadı. Lütfen Hugging Face Write Token'ınızı giriniz:")
    token = getpass.getpass("Hugging Face Token (girdi gizlenir): ")
    if not token or not token.strip():
        print("[HATA]: Boş token girildi. İşlem iptal edildi.")
        sys.exit(1)
    return token.strip()

def verify_local_files():
    """
    Yüklenecek dosyaların yerel varlığını ve geçerliliğini denetler.
    """
    print("\n1. YEREL MODEL DOSYALARI KONTROLÜ:")
    for path in REQUIRED_FILES:
        if not os.path.exists(path):
            print(f"[HATA]: Zorunlu model dosyası eksik: {path}")
            print("Lütfen önce 'python train.py' çalıştırınız.")
            sys.exit(1)
        size_bytes = os.path.getsize(path)
        print(f"  • {path:<25} ({size_bytes} bayt) ✓")

def push_to_hub(repo_id, token, is_private, commit_message):
    api = HfApi(token=token)

    # 1. Kullanıcı kimliğini doğrula
    try:
        user_info = api.whoami()
        username = user_info.get("name") or user_info.get("fullname")
        print(f"✓ Hugging Face oturumu doğrulandı: {username}")
    except Exception as e:
        print(f"[HATA]: Hugging Face kimlik doğrulaması başarısız: {e}")
        sys.exit(1)

    # Repo ID formatı kontrolü
    if "/" not in repo_id:
        repo_id = f"{username}/{repo_id}"

    print(f"\n2. HUGGING FACE REPO KONTROLÜ: {repo_id}")
    try:
        api.repo_info(repo_id=repo_id, repo_type="model")
        print(f"✓ Mevcut repo bulundu: https://huggingface.co/{repo_id}")
    except Exception:
        print(f"• Repo bulunamadı, yeni model reposu oluşturuluyor: {repo_id} (private={is_private})...")
        create_repo(repo_id=repo_id, token=token, private=is_private, repo_type="model", exist_ok=True)
        print(f"✓ Repo başarıyla oluşturuldu: https://huggingface.co/{repo_id}")

    # 3. Dosyaları yükle
    print(f"\n3. MODEL PAKETİ YÜKLENİYOR (model/ -> {repo_id})...")
    commit_info = api.upload_folder(
        folder_path="model",
        repo_id=repo_id,
        repo_type="model",
        commit_message=commit_message
    )

    commit_sha = commit_info.oid if hasattr(commit_info, "oid") else str(commit_info)
    print("\n" + "=" * 70)
    print("✓ MODEL BAŞARIYLA HUGGING FACE'E YÜKLENDİ")
    print("=" * 70)
    print(f"• Model Repo URL : https://huggingface.co/{repo_id}")
    print(f"• Commit SHA     : {commit_sha}")
    print(f"• Sabit URL (ONNX): https://huggingface.co/{repo_id}/resolve/{commit_sha}/model.onnx")
    print("=" * 70)

    # RELEASE.md içine commit SHA yazma tavsiyesi
    print("\n[SONRAKİ ADIM]:")
    print(f"Tarayıcıda main dalına bağımlılığı kaldırmak için RELEASE.md ve app.js içindeki")
    print(f"model URL'sini yukarıdaki commit SHA ile güncelleyiniz.")
    return commit_sha

def main():
    print("=" * 70)
    print("SE PRIMER v2 — HUGGING FACE MODEL DEPLOYMENT (push_model.py)")
    print("=" * 70)

    args = parse_args()
    if not args.repo_id:
        print("[HATA]: Repo ID belirtilmedi.")
        print("Kullanım: python push_model.py --repo-id <kullanici_adi>/se-primer-hint-model")
        print("Veya ortam değişkeni: set HF_REPO_ID=<kullanici_adi>/se-primer-hint-model")
        sys.exit(1)

    verify_local_files()
    token = get_auth_token()
    push_to_hub(
        repo_id=args.repo_id,
        token=token,
        is_private=args.private,
        commit_message=args.commit_message
    )

if __name__ == "__main__":
    main()

