"""Local preview server that never caches, so edits show up on a normal refresh.
Run:  python serve.py   then open http://localhost:5173
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, max-age=0')
        super().end_headers()


if __name__ == '__main__':
    ThreadingHTTPServer(('0.0.0.0', 5173), NoCache).serve_forever()
