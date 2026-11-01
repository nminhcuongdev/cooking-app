#!/usr/bin/env python3
"""Chuyển các file Markdown trong recipes/ thành data/recipes.js.

Chạy: python3 tools/build_data.py
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'recipes')
OUT = os.path.join(ROOT, 'data', 'recipes.js')

GROUPS = {
    'ga': 'Gà', 'heo': 'Thịt heo', 'bo': 'Bò', 'vit': 'Vịt', 'ca': 'Cá',
    'hai-san': 'Hải sản', 'canh': 'Canh', 'rau': 'Rau', 'dau-trung': 'Trứng & đậu',
}

def minutes(text):
    """'(~5 phút)', '(1–2 giờ)', '(15–20 phút)' -> phút (lấy số lớn nhất)."""
    m = re.search(r'(\d+(?:[.,]\d+)?)(?:\s*[–-]\s*(\d+(?:[.,]\d+)?))?\s*(phút|giờ|tiếng)', text)
    if not m:
        return None
    v = float((m.group(2) or m.group(1)).replace(',', '.'))
    return int(round(v * 60)) if m.group(3) in ('giờ', 'tiếng') else int(round(v))

def parse(path, group):
    lines = open(path, encoding='utf8').read().splitlines()
    r = {'id': os.path.splitext(os.path.basename(path))[0], 'group': group,
         'groupName': GROUPS.get(group, group), 'title': '', 'meta': {},
         'tags': '', 'intro': '', 'ingredients': [], 'steps': [], 'tips': [],
         'notes': [], 'source': None}
    section = None
    header = None
    for raw in lines:
        line = raw.rstrip()
        if line.startswith('# ') and not r['title']:
            r['title'] = line[2:].strip(); continue
        if line.startswith('## '):
            section = line[3:].strip(); continue
        if line.startswith('|') and section is None:
            cells = [c.strip() for c in line.strip('|').split('|')]
            if header is None:
                header = cells
            elif not set(''.join(cells)) <= set('-: '):
                r['meta'] = dict(zip(header, cells))
            continue
        if line.startswith('**Nhóm món:**'):
            r['tags'] = re.sub(r'\*\*', '', line).strip(); continue
        if section is None and line and not line.startswith('|'):
            r['intro'] = (r['intro'] + ' ' + line).strip(); continue
        if section == 'Nguyên liệu':
            if line.startswith('### '):
                r['ingredients'].append({'name': line[4:].strip(), 'items': []})
            elif line.startswith('- '):
                if not r['ingredients']:
                    r['ingredients'].append({'name': 'Nguyên liệu', 'items': []})
                r['ingredients'][-1]['items'].append(line[2:].strip())
            elif line.startswith('>'):
                pass
        elif section == 'Cách làm':
            m = re.match(r'^(\d+)\.\s+(.*)$', line)
            if m:
                body = m.group(2)
                tm = re.match(r'^\*\*(.+?)\*\*\s*(.*)$', body)
                title, text = (tm.group(1), tm.group(2)) if tm else ('', body)
                title = title.rstrip('.').strip()
                r['steps'].append({'title': title, 'text': text.strip(), 'subs': [], 'after': '',
                                   'minutes': minutes(title)})
            elif line.strip().startswith('- ') and r['steps']:
                r['steps'][-1]['subs'].append(line.strip()[2:])
            elif line.strip() and r['steps'] and not line.startswith('>'):
                st = r['steps'][-1]
                key = 'after' if st['subs'] else 'text'
                st[key] = (st[key] + ' ' + line.strip()).strip()
            elif line.startswith('>'):
                r['notes'].append(line.lstrip('> ').strip())
        elif section == 'Mẹo':
            if line.startswith('- '):
                r['tips'].append(line[2:].strip())
            elif line.startswith('>'):
                r['notes'].append(line.lstrip('> ').strip())
        elif section == 'Nguồn':
            m = re.search(r'\[(.+?)\]\((https?://[^)]+)\)', line)
            if m:
                r['source'] = {'name': m.group(1), 'url': m.group(2)}
    m = r['meta']
    r['servings'] = m.get('Khẩu phần', '')
    r['time'] = m.get('Tổng thời gian', '')
    r['difficulty'] = m.get('Độ khó', 'Dễ')
    r['mine'] = r['source'] is None
    return r

def main():
    out = []
    for group in GROUPS:
        d = os.path.join(SRC, group)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith('.md'):
                rec = parse(os.path.join(d, f), group)
                if not rec['steps']:
                    print('WARN no steps:', f, file=sys.stderr)
                out.append(rec)
    with open(OUT, 'w', encoding='utf8') as fh:
        fh.write('// File sinh tự động từ thư mục recipes/ bằng tools/build_data.py. Đừng sửa tay.\n')
        fh.write('window.RECIPES = ')
        json.dump(out, fh, ensure_ascii=False, indent=1)
        fh.write(';\n')
    print(f'{len(out)} công thức -> {os.path.relpath(OUT, ROOT)}')

if __name__ == '__main__':
    main()
