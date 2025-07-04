import http.server
import socketserver
import datetime

PORT = 8000

class VerboseHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        print(f"[{now}] {self.client_address[0]} {self.requestline} -> {format % args}")

# Launch the server
with socketserver.TCPServer(("", PORT), VerboseHandler) as httpd:
    print(f"🚀 Serving at http://localhost:{PORT}")
    print("📡 Logging detailed request info...\n")
    httpd.serve_forever()

