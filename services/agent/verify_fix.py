#!/usr/bin/env python3
"""
Quick verification that the auth module has the correct algorithms
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Read the auth.py file and check for HS384
with open('api/middleware/auth.py', 'r') as f:
    content = f.read()
    
    # Check if HS384 is in the algorithms list
    if 'HS384' in content and 'algorithms=' in content:
        print("[OK] HS384 found in algorithms list")
        
        # Try to find the exact line
        lines = content.split('\n')
        for i, line in enumerate(lines, 1):
            if 'algorithms=' in line and 'HS384' in line:
                print(f"[OK] Found on line {i}: {line.strip()}")
                break
    else:
        print("[ERROR] HS384 NOT found in algorithms list!")
        sys.exit(1)
    
    # Check if token_algorithm is being used
    if 'token_algorithm' in content:
        print("[OK] Token algorithm detection is present")
    else:
        print("[ERROR] Token algorithm detection NOT found!")
        sys.exit(1)
    
    print("\n[OK] All checks passed! The code should work.")
    print("[WARNING] Make sure to RESTART the server for changes to take effect!")

