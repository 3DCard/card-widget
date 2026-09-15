"""Static file server for local development that disables caching, so
browser reloads always pick up the latest edits. Same usage as the stdlib
http.server: python3 dev-server.py [port]
"""
import sys
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler


class NoCacheHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    # Threading server: a plain HTTPServer handles one request at a time,
    # and the browser fires several requests per shape switch (a HEAD check
    # plus the GLB download) - switching shapes quickly can pile up requests
    # faster than a single-threaded server can work through them.
    ThreadingHTTPServer(("", port), NoCacheHandler).serve_forever()
