"""
Mobile Scanner HTTPS Server
Serves library-scanner.html over HTTPS for mobile camera access.
"""
import http.server
import ssl
import socketserver
import os
import socket
import sys
import ipaddress

PORT = 9443  # HTTPS port for mobile scanner

class MobileScannerHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def do_GET(self):
        if self.path == '/' or self.path == '/scanner':
            self.path = '/library-scanner.html'
        super().do_GET()

def get_local_ip():
    """Get the local IP address"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except:
        return "localhost"

def create_certificates():
    """Create self-signed certificates using cryptography library"""
    cert_dir = os.path.dirname(os.path.abspath(__file__))
    cert_path = os.path.join(cert_dir, 'cert.pem')
    key_path = os.path.join(cert_dir, 'key.pem')
    
    if os.path.exists(cert_path) and os.path.exists(key_path):
        print("✓ Using existing SSL certificates")
        return cert_path, key_path
    
    print("Creating self-signed SSL certificates...")
    
    try:
        from cryptography import x509
        from cryptography.x509.oid import NameOID
        from cryptography.hazmat.primitives import hashes
        from cryptography.hazmat.backends import default_backend
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        import datetime
        
        # Generate private key
        key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        
        # Generate certificate
        local_ip = get_local_ip()
        subject = issuer = x509.Name([
            x509.NameAttribute(NameOID.COUNTRY_NAME, u"IN"),
            x509.NameAttribute(NameOID.STATE_OR_PROVINCE_NAME, u"State"),
            x509.NameAttribute(NameOID.LOCALITY_NAME, u"City"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, u"CampusIntell"),
            x509.NameAttribute(NameOID.COMMON_NAME, local_ip),
        ])
        
        cert = x509.CertificateBuilder().subject_name(
            subject
        ).issuer_name(
            issuer
        ).public_key(
            key.public_key()
        ).serial_number(
            x509.random_serial_number()
        ).not_valid_before(
            datetime.datetime.utcnow()
        ).not_valid_after(
            datetime.datetime.utcnow() + datetime.timedelta(days=365)
        ).add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName(u"localhost"),
                x509.DNSName(local_ip),
                x509.IPAddress(ipaddress.ip_address(local_ip if local_ip != "localhost" else "127.0.0.1"))
            ]),
            critical=False,
        ).sign(key, hashes.SHA256(), default_backend())
        
        # Write key
        with open(key_path, "wb") as f:
            f.write(key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.TraditionalOpenSSL,
                encryption_algorithm=serialization.NoEncryption()
            ))
        
        # Write certificate
        with open(cert_path, "wb") as f:
            f.write(cert.public_bytes(serialization.Encoding.PEM))
        
        print("✓ SSL certificates created successfully")
        return cert_path, key_path
        
    except ImportError:
        print("Installing cryptography library...")
        os.system(f'{sys.executable} -m pip install cryptography')
        print("Please run this script again after installation.")
        return None, None
    except Exception as e:
        print(f"❌ Error creating certificates: {e}")
        return None, None

if __name__ == '__main__':
    # Change to public directory (frontend/web/public from project root)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(script_dir)  # Go up from backend-lib
    public_dir = os.path.join(project_root, 'frontend', 'web', 'public')
    
    if os.path.exists(public_dir):
        os.chdir(public_dir)
        print(f"Serving files from: {public_dir}")
    else:
        print(f"⚠️ Public directory not found: {public_dir}")
        print("   Scanner HTML may not be accessible.")

    cert_path, key_path = create_certificates()
    
    if cert_path is None:
        input("Press Enter to exit...")
        sys.exit(1)
    
    local_ip = get_local_ip()
    
    print("\n" + "="*60)
    print("📱 MOBILE SCANNER HTTPS SERVER")
    print("="*60)
    print(f"\n📱 Scanner URL: https://{local_ip}:{PORT}/scanner")
    print(f"   Local access: https://localhost:{PORT}/scanner")
    print("\n⚠️  Accept the security warning on your phone to proceed")
    print("="*60 + "\n")
    
    try:
        with socketserver.TCPServer(("0.0.0.0", PORT), MobileScannerHandler) as httpd:
            context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
            context.load_cert_chain(cert_path, key_path)
            httpd.socket = context.wrap_socket(httpd.socket, server_side=True)
            print(f"Server running on https://0.0.0.0:{PORT}")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
    except Exception as e:
        print(f"\n❌ Error: {e}")
        input("Press Enter to exit...")

