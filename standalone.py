"""Serve the Our Stuff dashboard on this device using Python's standard library."""

from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit

ADDRESS = "127.0.0.1"
PORT = 8768
AUTHORITY = f"{ADDRESS}:{PORT}"
ROOT = Path(__file__).resolve().parent


class Dashboard(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_head(self):
        if self.headers.get("Host") != AUTHORITY:
            self.send_error(403, "Open the dashboard using its loopback address.")
            return None

        path = unquote(urlsplit(self.path).path)
        if path == "/":
            self.path = "/index.html"
            path = self.path
        parts = path.strip("/").split("/")
        if (
            any(not part or part.startswith(".") or "\\" in part for part in parts)
            or not (parts == ["index.html"] or parts[0] in {"assets", "text"})
        ):
            self.send_error(404)
            return None

        resolved = (ROOT / Path(*parts)).resolve()
        if ROOT not in resolved.parents or not resolved.is_file():
            self.send_error(404)
            return None
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        super().end_headers()


if __name__ == "__main__":
    try:
        with ThreadingHTTPServer((ADDRESS, PORT), Dashboard) as server:
            print(f"Our Stuff is running at http://{AUTHORITY}/", flush=True)
            print("Your data stays in this browser profile. Use Data Controls to export a backup.", flush=True)
            server.serve_forever()
    except KeyboardInterrupt:
        pass
    except OSError as error:
        raise SystemExit(f"Could not start Our Stuff at http://{AUTHORITY}/: {error}") from error
