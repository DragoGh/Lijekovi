#!/usr/bin/env python3
import http.server
import socketserver
import socket
import os

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
        # Add headers for PWA / Service Worker caching compatibility
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()

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
    print(" Server je pokrenut! Pritisnite Ctrl+C za zaustavljanje.")
    print("")

    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer zaustavljen.")
