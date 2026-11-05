#!/usr/bin/env python3
"""Gộp app thành một file HTML duy nhất: dist/bep-nha.html.

Chạy (sau build_data.py): python3 tools/bundle.py
"""
import os, re

APP = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(APP, 'dist', 'bep-nha.html')

def read(rel):
    with open(os.path.join(APP, rel), encoding='utf8') as f:
        return f.read()

html = read('index.html')
html = html.replace('<link rel="stylesheet" href="css/style.css">', '<style>\n' + read('css/style.css') + '\n</style>')
html = html.replace('<script src="data/recipes.js"></script>',
                    "<script>window.BEPNHA_IMG_BASE = '../';</script>\n  <script src=\"data/recipes.js\"></script>")
for rel in ('data/recipes.js', 'js/scene3d.js', 'js/app.js'):
    code = read(rel).replace('</script', '<\\/script')
    html = html.replace(f'<script src="{rel}"></script>', '<script>\n' + code + '\n</script>')
assert 'src="js/' not in html and 'href="css/' not in html
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w', encoding='utf8') as f:
    f.write(html)
print(f'{os.path.relpath(OUT, APP)}: {len(html.encode()) // 1024} KB')
