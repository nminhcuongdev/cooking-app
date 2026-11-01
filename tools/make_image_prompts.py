#!/usr/bin/env python3
"""Sinh tools/image_prompts.json: mô tả ảnh minh họa cho từng món, dùng với tools/gen_images.ps1.

Chạy: python3 tools/make_image_prompts.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA = os.path.join(ROOT, 'data', 'recipes.js')
OUT = os.path.join(ROOT, 'tools', 'image_prompts.json')

STYLE = (
    "Realistic, appetizing food photograph for a Vietnamese home-cooking app. "
    "Square 1:1 composition, camera at a 45-degree angle, dish centered and filling most of the frame, "
    "soft natural window light, shallow depth of field, rustic wooden table, simple Vietnamese home tableware, "
    "a bowl of steamed rice and chopsticks softly blurred in the background when it suits the dish. "
    "Home-style portion, not restaurant plating. No text, no logos, no watermark, no people, no hands."
)

SKIP = re.compile(r'^(muối|đường|dầu|nước(?! dừa| cốt)|tiêu|bột ngọt|hạt nêm|giấm|rượu|bột canh|bột năng|bột mì|ngũ vị|xì dầu|tương|mật ong|lòng trắng|chỉ|nước mắm)', re.I)

def vessel(r):
    t = r['title'].lower()
    if r['group'] == 'canh' or t.startswith('canh '):
        return 'served in a large ceramic soup bowl with clear broth'
    if re.search(r'\bkho\b|kho tộ|om ', t):
        return 'served in a small clay pot (nồi đất) with glossy caramelized sauce'
    if 'gỏi' in t:
        return 'served as a fresh salad on a wide plate'
    if 'hấp' in t:
        return 'served on a plate, steamed, with herbs on top'
    if 'canh gà' in t or 'chiên' in t or 'nướng' in t:
        return 'served on a plate lined with lettuce and sliced cucumber'
    return 'served on a ceramic plate'

def clean(item):
    s = re.sub(r'\*\*', '', item)
    s = re.sub(r'\(.*?\)', '', s)
    s = re.sub(r'(?i)^(một ít|ít|một chút)\s+', '', s)
    s = s.split(',')[0].split(':')[0]
    s = re.sub(r'^[\d½⅓⅔¼¾.,\s–-]+', '', s)
    s = re.sub(r'^(g|kg|ml|lít|muỗng canh|muỗng cà phê|muỗng|chén|trái|quả|củ|cây|cọng|tép|con|cái|tai|nhánh|bó|nắm|lọn|khứa|gói|miếng|lát)\s+', '', s.strip())
    return re.sub(r'\s+', ' ', s).strip()

def main():
    raw = open(DATA, encoding='utf8').read()
    recipes = json.loads(raw[raw.index('['):raw.rindex(']') + 1])
    out = []
    for r in recipes:
        ings = []
        for g in r['ingredients']:
            for i in g['items']:
                c = clean(i)
                if c and not SKIP.search(c) and c.lower() not in [x.lower() for x in ings]:
                    ings.append(c)
        ings = ings[:7]
        prompt = (f'Vietnamese dish "{r["title"]}" ({r["groupName"]}), {vessel(r)}. '
                  f'Visible main ingredients: {", ".join(ings)}. {STYLE}')
        out.append({'id': r['id'], 'title': r['title'], 'prompt': prompt})
    with open(OUT, 'w', encoding='utf8') as f:
        json.dump(out, f, ensure_ascii=False, indent=1)
    print(f'{len(out)} prompts -> {os.path.relpath(OUT, ROOT)}')

if __name__ == '__main__':
    main()
