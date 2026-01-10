#!/usr/bin/env python3
"""
Test script to verify JWT token decoding
"""
import jwt
import base64
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config.settings import settings

def test_jwt_decode(token_str: str):
    """Test decoding a JWT token"""
    print(f"Testing JWT token decoding...")
    print(f"Token preview: {token_str[:50]}...")
    
    # Decode header first
    try:
        unverified_header = jwt.get_unverified_header(token_str)
        print(f"Token algorithm: {unverified_header.get('alg')}")
        print(f"Token type: {unverified_header.get('typ')}")
    except Exception as e:
        print(f"Error reading header: {e}")
        return
    
    # Try to decode secret
    try:
        secret_bytes = base64.b64decode(settings.jwt_secret)
        print(f"Secret decoded from BASE64: {len(secret_bytes)} bytes")
    except Exception as e:
        print(f"BASE64 decode failed, trying direct: {e}")
        secret_bytes = settings.jwt_secret.encode('utf-8') if isinstance(settings.jwt_secret, str) else settings.jwt_secret
        print(f"Using secret directly: {len(secret_bytes)} bytes")
    
    # Try decoding with different algorithms
    algorithms = ["HS384", "HS256", "HS512"]
    for alg in algorithms:
        try:
            decoded = jwt.decode(
                token_str,
                secret_bytes,
                algorithms=[alg],
                options={"verify_signature": True}
            )
            print(f"✓ Successfully decoded with {alg}")
            print(f"  Claims: {decoded}")
            return decoded
        except jwt.InvalidAlgorithmError as e:
            print(f"✗ {alg}: Algorithm not allowed - {e}")
        except jwt.InvalidTokenError as e:
            print(f"✗ {alg}: Invalid token - {e}")
        except Exception as e:
            print(f"✗ {alg}: Error - {e}")
    
    # Try with all algorithms
    try:
        decoded = jwt.decode(
            token_str,
            secret_bytes,
            algorithms=algorithms,
            options={"verify_signature": True}
        )
        print(f"✓ Successfully decoded with all algorithms")
        print(f"  Claims: {decoded}")
        return decoded
    except Exception as e:
        print(f"✗ All algorithms failed: {e}")
        return None

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python test_jwt.py <jwt_token>")
        print("Example: python test_jwt.py eyJhbGciOiJIUzM4NCJ9...")
        sys.exit(1)
    
    token = sys.argv[1]
    result = test_jwt_decode(token)
    
    if result:
        print("\n✓ Token decoding successful!")
    else:
        print("\n✗ Token decoding failed!")

