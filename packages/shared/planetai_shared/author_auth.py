"""Studio API-key hashing helpers.

Author login secrets live on `authors.api_key_hash` (SHA-256 of the plaintext
key). Keys are high-entropy random tokens, so a plain SHA-256 digest is enough —
same pattern as many API-token stores.
"""

from __future__ import annotations

import hashlib
import secrets


def hash_api_key(secret: str) -> str:
    return hashlib.sha256(secret.encode("utf-8")).hexdigest()


def verify_api_key(secret: str, api_key_hash: str | None) -> bool:
    if not secret or not api_key_hash:
        return False
    return secrets.compare_digest(hash_api_key(secret), api_key_hash)
