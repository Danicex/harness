"""
One-time setup. Run locally (NOT on a shared server):

    pip install pyotp "qrcode[pil]"
    python setup_totp.py

Scan admin_totp_qr.png with Google Authenticator / Authy / 1Password,
copy the printed env lines into your server's environment, then DELETE the PNG.
"""
import secrets

import pyotp
import qrcode

ISSUER = "Harness"      # shown in the authenticator app
ACCOUNT = "admin"           # label under the issuer

secret = pyotp.random_base32()  # 160-bit base32 secret
uri = pyotp.TOTP(secret).provisioning_uri(name=ACCOUNT, issuer_name=ISSUER)

qrcode.make(uri).save("admin_totp_qr.png")

print("Scan admin_totp_qr.png with your authenticator app, then delete it.\n")
print("Add these to your server environment (never commit them):\n")
print(f"ADMIN_TOTP_SECRET={secret}")
print(f"ADMIN_JWT_SECRET={secrets.token_urlsafe(48)}")
print("\nManual entry key (if you can't scan):", secret)