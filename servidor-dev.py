# servidor-dev.py — servidor estático local para desenvolvimento/preview
# (a app funciona igualmente abrindo o index.html diretamente no browser)
import functools
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

RAIZ = os.path.dirname(os.path.abspath(__file__))
os.chdir(RAIZ)

porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8741
handler = functools.partial(SimpleHTTPRequestHandler, directory=RAIZ)
print(f"A servir {RAIZ} em http://localhost:{porta}", flush=True)
ThreadingHTTPServer(("127.0.0.1", porta), handler).serve_forever()
