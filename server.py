#!/usr/bin/env python3
import http.server
import socketserver
import socket
import os
import json

PORT = 8080

def get_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        # doesn't even have to be reachable
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add headers for PWA / Service Worker caching compatibility & CORS
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path.startswith('/api/lijekovi'):
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            if os.path.exists(DATA_FILE):
                try:
                    with open(DATA_FILE, 'r', encoding='utf-8') as f:
                        content = f.read()
                    self.wfile.write(content.encode('utf-8'))
                    return
                except Exception as e:
                    print(f" Greška pri čitanju datoteke {DATA_FILE}: {e}")
            self.wfile.write(b"[]")
            return

        return super().do_GET()

    def do_POST(self):
        if self.path.startswith('/api/lijekovi'):
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode('utf-8'))
                with open(DATA_FILE, 'w', encoding='utf-8') as f:
                    json.dump(data, f, ensure_ascii=False, indent=2)
                
                self.send_response(200)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {"status": "ok", "message": "Podaci su uspješno spremljeni u bazu na poslužitelju"}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                print(f" [SERVER] Podaci o lijekovima spremljeni u datoteku '{DATA_FILE}' ({len(data)} stavki)")
                return
            except Exception as e:
                print(f" [SERVER ERROR] Greška pri spremanju: {e}")
                self.send_response(400)
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                response = {"status": "error", "message": str(e)}
                self.wfile.write(json.dumps(response).encode('utf-8'))
                return

        self.send_response(404)
        self.end_headers()

DATA_FILE = 'lijekovi_baza.json'

if __name__ == '__main__':
    web_dir = os.path.dirname(os.path.realpath(__file__))
    os.chdir(web_dir)
    
    local_ip = get_ip()
    print("=" * 65)
    print(" 💊 LIJEKOVI TRACKER - MOBILNI SERVER (Samsung A23 / Android 14)")
    print("=" * 65)
    print(f" Lokalna adresa na ovom računalu:  http://localhost:{PORT}")
    print(f" MOBILNA ADRESA ZA SAMSUNGA:       http://{local_ip}:{PORT}")
    print("=" * 65)
    print(" Upute za Samsung Galaxy A23 (Android 14):")
    print(f" 1. Spojite mobitel na isti Wi-Fi kao i ovo računalo.")
    print(f" 2. Otvorite Chrome ili Samsung Internet i idite na: http://{local_ip}:{PORT}")
    print(" 3. Dodirnite tri točke (Izbornik) -> 'Instaliraj aplikaciju' ili 'Dodaj na Početni zaslon'.")
    print("=" * 65)
    print(f" Podaci se automatski spremaju u datoteku: {DATA_FILE}")
    print(" Server je pokrenut! Pritisnite Ctrl+C za zaustavljanje.")
    print("")

    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer zaustavljen.")
