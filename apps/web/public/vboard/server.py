import http.server
import socketserver
import webbrowser
import os
from pathlib import Path

PORT = 8000
DIRECTORY = os.path.dirname(os.path.abspath(__file__))

# Load environment variables from .env file if it exists
def load_env_file():
    """Load environment variables from .env file in the frontend/web directory"""
    # Look for .env file in multiple possible locations:
    # 1. frontend/web/.env (parent of vboard)
    # 2. Current directory
    # 3. Environment variable (if already set)
    
    possible_paths = [
        Path(DIRECTORY).parent.parent / '.env',  # frontend/web/.env
        Path(DIRECTORY).parent / '.env',          # frontend/web/public/.env
        Path('.env'),                             # Current working directory
    ]
    
    for env_file in possible_paths:
        if env_file.exists():
            try:
                with open(env_file, 'r', encoding='utf-8') as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith('#') and '=' in line:
                            key, value = line.split('=', 1)
                            # Only set if not already in environment (env vars take precedence)
                            if key.strip() not in os.environ:
                                os.environ[key.strip()] = value.strip()
                print(f"Loaded environment variables from: {env_file}")
                return
            except Exception as e:
                print(f"Warning: Could not load .env file from {env_file}: {e}")
    
    # If HF_KEY is not set, warn the user
    if 'HF_KEY' not in os.environ or not os.environ.get('HF_KEY'):
        print("Warning: HF_KEY not found in environment variables or .env file")
        print("VBoard voice assistant may not work without a HuggingFace API key")

# Load .env file on startup
load_env_file()

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Ensure .wasm is handled correctly
        if '.wasm' not in self.extensions_map:
            self.extensions_map['.wasm'] = 'application/wasm'
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def do_GET(self):
        if self.path == '/env.js':
            self.send_response(200)
            self.send_header('Content-Type', 'application/javascript')
            self.end_headers()
            hf_key = os.environ.get('HF_KEY', '')
            self.wfile.write(f'window.HF_KEY = "{hf_key}";'.encode())
            return
        return super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        super().end_headers()

with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving at http://localhost:{PORT}")
    print("Press Ctrl+C to stop")
    webbrowser.open(f"http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
