/* Bếp Nhà — dựng cảnh 3D minh họa từng bước nấu (Three.js r128, bản global). */
(function () {
  'use strict';

  /* ---------- 1. Nhận diện thao tác của bước ---------- */
  const ACTIONS = {
    serve:    { label: 'Bày ra đĩa',       icon: '🍽️' },
    caramel:  { label: 'Thắng nước màu',   icon: '🍯' },
    soak:     { label: 'Ngâm / rửa',       icon: '💧' },
    wrap:     { label: 'Gói / nặn',        icon: '🥟' },
    steam:    { label: 'Hấp',              icon: '♨️' },
    grill:    { label: 'Nướng',            icon: '🔥' },
    fry:      { label: 'Chiên',            icon: '🍳' },
    braise:   { label: 'Kho / rim / om',   icon: '🍲' },
    stirfry:  { label: 'Xào / phi / rang', icon: '🥘' },
    boil:     { label: 'Nấu / luộc',       icon: '🫕' },
    season:   { label: 'Nêm nếm',          icon: '🧂' },
    marinate: { label: 'Ướp / trộn',       icon: '🥣' },
    prep:     { label: 'Sơ chế',           icon: '🔪' },
  };

  // Thứ tự quan trọng: từ khóa cụ thể đứng trước.
  const RULES = [
    ['serve',    /^(dùng|hoàn thành|hoàn thiện|bày|trình bày|trang trí|múc)/],
    ['caramel',  /thắng|nước hàng|nước màu|caramel|lên màu/],
    ['wrap',     /gói|nhồi|nặn|vo viên|tạo hình|cuốn|tạo váng|làm thịt viên|làm chả/],
    ['steam',    /hấp/],
    ['grill',    /nướng/],
    ['fry',      /chiên|rán/],
    ['caramel',  /làm muối/],
    ['braise',   /kho|rim|(^|\s)om(\s|$)|ram|sém cạnh|cạn nước/],
    ['stirfry',  /xào|phi|rang|đảo|áp chảo|xóc|sốt|thêm rau/],
    ['boil',     /luộc|nấu|đun|hầm|chần|trụng|lọc nước|miến/],
    ['season',   /nêm|nếm|thử vị/],
    ['soak',     /ngâm|khử tanh|khử mùi|rửa/],
    ['marinate', /ướp|trộn|pha|khuấy|xay|quết|áo bột|tẩm|lọc/],
    ['prep',     /sơ chế|cắt|thái|băm|khứa|chặt|tách|làm sạch|bóc|chia|tước/],
  ];

  function classifyStep(step) {
    const title = (step.title || '').toLowerCase();
    const body = ((step.text || '') + ' ' + (step.subs || []).join(' ')).toLowerCase();
    for (const [a, re] of RULES) if (re.test(title)) return a;
    for (const [a, re] of RULES) if (a !== 'serve' && re.test(body)) return a;
    return 'prep';
  }

  /* ---------- 2. Nhận diện nguyên liệu ---------- */
  const KINDS = {
    pork:     { color: 0xd9826c, shape: 'cube' },
    rib:      { color: 0xd98a72, shape: 'rib' },
    beef:     { color: 0x9b3b2e, shape: 'slice' },
    chicken:  { color: 0xe3a865, shape: 'cube' },
    duck:     { color: 0xb5674c, shape: 'cube' },
    shrimp:   { color: 0xff8a4c, shape: 'shrimp' },
    fish:     { color: 0xd3dbe2, shape: 'fish' },
    clam:     { color: 0xe9dcc2, shape: 'shell' },
    squid:    { color: 0xf7f1ea, shape: 'ring' },
    egg:      { color: 0xffd34d, shape: 'egg' },
    quail:    { color: 0xf3ead8, shape: 'quail' },
    tofu:     { color: 0xeadbb0, shape: 'cube' },
    tomato:   { color: 0xe23b2e, shape: 'sphere' },
    onion:    { color: 0xe6d6f0, shape: 'ring' },
    shallot:  { color: 0xa45a8c, shape: 'small' },
    garlic:   { color: 0xfbf6e9, shape: 'small' },
    lemongrass:{ color: 0xd7e3a0, shape: 'stick' },
    ginger:   { color: 0xe7c27a, shape: 'small' },
    pepper:   { color: 0x3fae4a, shape: 'slice' },
    chili:    { color: 0xd92b1f, shape: 'stick' },
    potato:   { color: 0xf0d27a, shape: 'cube' },
    pumpkin:  { color: 0xf29b38, shape: 'cube' },
    carrot:   { color: 0xf07a22, shape: 'disc' },
    mushroom: { color: 0x9a6b45, shape: 'mushroom' },
    leaf:     { color: 0x3e9b3a, shape: 'leaf' },
    herb:     { color: 0x58b947, shape: 'leaf' },
    bean:     { color: 0x5aa83c, shape: 'stick' },
    gourd:    { color: 0x7fbf5a, shape: 'disc' },
    pineapple:{ color: 0xf6d35b, shape: 'slice' },
    corn:     { color: 0xf5d547, shape: 'stick' },
    sauce:    { color: 0x7a3a12, shape: 'small' },
  };

  const ING_RULES = [
    ['shrimp', 'tôm'], ['clam', 'nghêu|ngao'], ['squid', 'mực'],
    ['fish', 'cá(?! chua| rốt)'], ['duck', 'vịt'], ['rib', 'sườn'],
    ['chicken', 'gà|cánh gà|đùi gà'], ['beef', 'bò'],
    ['pork', 'thịt(?! gà| bò| vịt| cá)|ba chỉ|ba rọi|nạc dăm|giò sống|heo'],
    ['quail', 'trứng cút'], ['egg', 'trứng'], ['tofu', 'đậu hũ|đậu phụ|đậu trắng'],
    ['tomato', 'cà chua'], ['onion', 'hành tây'], ['shallot', 'hành tím|hành khô|củ nén'],
    ['garlic', 'tỏi'], ['lemongrass', 'sả'], ['ginger', 'gừng'],
    ['pepper', 'ớt chuông'], ['chili', 'ớt'], ['potato', 'khoai'],
    ['pumpkin', 'bí đỏ'], ['gourd', 'bí đao|bầu|mướp|dưa leo|khổ qua|đu đủ|củ sen'],
    ['carrot', 'cà rốt'], ['mushroom', 'nấm'], ['bean', 'đậu que|bông hẹ|đậu hà lan|măng tây'],
    ['pineapple', 'thơm|dứa'], ['corn', 'bắp'],
    ['leaf', 'rau muống|mồng tơi|rau ngót|cải|bắp cải|xà lách|dưa cải|rau cần|cần nước|lá lốt|bạc hà'],
    ['herb', 'hành lá|ngò|rau răm|rau om|thì là|húng|lá chanh|rau thơm|rau mùi|lá quế'],
    ['sauce', 'nước mắm|nước tương|dầu hào|sa tế|tương|me'],
  ].map(([k, p]) => [k, new RegExp('(^|[^\\p{L}])(' + p + ')(?![\\p{L}])', 'iu')]);

  function detectKinds(text, limit) {
    const found = [];
    const t = (text || '').toLowerCase();
    for (const [k, re] of ING_RULES) {
      if (re.test(t) && !found.includes(k)) found.push(k);
      if (found.length >= (limit || 4)) break;
    }
    return found;
  }

  function stepKinds(step, recipe) {
    const main = detectKinds(recipe.title, 2);
    const txt = [step.title, step.text, (step.subs || []).join(' '), step.after].join(' ');
    let kinds = detectKinds(txt, 4);
    if (!kinds.some(k => main.includes(k)) && main.length) kinds = [main[0]].concat(kinds).slice(0, 4);
    if (!kinds.length) kinds = main.length ? main : ['pork'];
    return kinds;
  }

  /* ---------- 3. Tiện ích hình khối ---------- */
  const T = () => window.THREE;
  const rnd = (a, b) => a + Math.random() * (b - a);

  function mat(color, o) {
    const THREE = T();
    return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.6, metalness: 0.05 }, o || {}));
  }
  function mesh(geo, material, cast) {
    const m = new (T().Mesh)(geo, material);
    m.castShadow = cast !== false; m.receiveShadow = true;
    return m;
  }
  function lathe(profile, color, o) {
    const THREE = T();
    const pts = profile.map(([x, y]) => new THREE.Vector2(x, y));
    return mesh(new THREE.LatheGeometry(pts, 48), mat(color, Object.assign({ side: THREE.DoubleSide }, o || {})));
  }

  function makePiece(kind) {
    const THREE = T();
    const k = KINDS[kind] || KINDS.pork;
    const m = mat(k.color, { roughness: 0.55 });
    let g, obj;
    switch (k.shape) {
      case 'cube': g = new THREE.BoxGeometry(0.34, 0.22, 0.3); break;
      case 'rib': {
        obj = new THREE.Group();
        obj.add(mesh(new THREE.BoxGeometry(0.42, 0.2, 0.26), m));
        const bone = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.56, 8), mat(0xf5ecd9));
        bone.rotation.z = Math.PI / 2; obj.add(bone);
        break;
      }
      case 'slice': g = new THREE.BoxGeometry(0.46, 0.06, 0.28); break;
      case 'shrimp': g = new THREE.TorusGeometry(0.15, 0.065, 8, 18, Math.PI * 1.35); break;
      case 'fish': g = new THREE.SphereGeometry(0.22, 16, 12); break;
      case 'shell': g = new THREE.SphereGeometry(0.17, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2); break;
      case 'ring': g = new THREE.TorusGeometry(0.14, 0.045, 8, 20); break;
      case 'egg': g = new THREE.SphereGeometry(0.2, 16, 12); break;
      case 'quail': g = new THREE.SphereGeometry(0.11, 14, 10); break;
      case 'sphere': g = new THREE.SphereGeometry(0.17, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2); break;
      case 'small': g = new THREE.DodecahedronGeometry(0.07); break;
      case 'stick': g = new THREE.CylinderGeometry(0.035, 0.035, 0.42, 8); break;
      case 'disc': g = new THREE.CylinderGeometry(0.14, 0.14, 0.05, 18); break;
      case 'leaf': g = new THREE.SphereGeometry(0.2, 12, 6); break;
      case 'mushroom': {
        obj = new THREE.Group();
        const cap = mesh(new THREE.SphereGeometry(0.15, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m);
        cap.position.y = 0.08; obj.add(cap);
        const stem = mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.14, 10), mat(0xeadfc8));
        obj.add(stem);
        break;
      }
      default: g = new THREE.BoxGeometry(0.3, 0.2, 0.3);
    }
    if (!obj) obj = mesh(g, m);
    if (k.shape === 'fish') obj.scale.set(1.8, 0.55, 0.8);
    if (k.shape === 'leaf') obj.scale.set(1.1, 0.12, 0.7);
    if (k.shape === 'egg') obj.scale.set(1, 1.25, 1);
    if (k.shape === 'shell') obj.scale.set(1, 0.6, 0.85);
    obj.userData.kind = kind;
    return obj;
  }

  function pieceSet(kinds, n) {
    const out = [];
    for (let i = 0; i < n; i++) out.push(makePiece(kinds[i % kinds.length]));
    return out;
  }

  /* Hạt hơi nước / khói bay lên */
  function Steam(group, opts) {
    const THREE = T();
    const o = Object.assign({ count: 26, radius: 0.9, y: 1.2, height: 2.4, color: 0xffffff, opacity: 0.35, size: 0.18, speed: 0.55 }, opts || {});
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const parts = [];
    for (let i = 0; i < o.count; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: o.color, transparent: true, opacity: 0, depthWrite: false }));
      m.userData = { life: Math.random(), x: rnd(-o.radius, o.radius), z: rnd(-o.radius, o.radius), drift: rnd(-0.3, 0.3) };
      group.add(m); parts.push(m);
    }
    return function update(dt) {
      for (const p of parts) {
        const d = p.userData;
        d.life += dt * o.speed / (o.height / 2.4);
        if (d.life > 1) { d.life = 0; d.x = rnd(-o.radius, o.radius); d.z = rnd(-o.radius, o.radius); }
        const s = o.size * (0.6 + d.life * 2.2);
        p.scale.setScalar(s);
        p.position.set(d.x + Math.sin(d.life * 6 + d.drift * 10) * 0.15 + d.drift * d.life, o.y + d.life * o.height, d.z);
        p.material.opacity = o.opacity * Math.sin(Math.PI * d.life);
      }
    };
  }

  /* Bọt khí trong nồi/chảo */
  function Bubbles(group, opts) {
    const THREE = T();
    const o = Object.assign({ count: 18, radius: 0.9, y: 0.6, rise: 0.25, color: 0xffffff, size: 0.05, speed: 1.4 }, opts || {});
    const parts = [];
    const geo = new THREE.SphereGeometry(1, 8, 6);
    for (let i = 0; i < o.count; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: o.color, transparent: true, opacity: 0.7, roughness: 0.1 }));
      const r = Math.sqrt(Math.random()) * o.radius, a = rnd(0, Math.PI * 2);
      m.userData = { life: Math.random(), x: Math.cos(a) * r, z: Math.sin(a) * r };
      group.add(m); parts.push(m);
    }
    return function update(dt) {
      for (const p of parts) {
        const d = p.userData;
        d.life += dt * o.speed * rnd(0.6, 1.4);
        if (d.life > 1) {
          d.life = 0; const r = Math.sqrt(Math.random()) * o.radius, a = rnd(0, Math.PI * 2);
          d.x = Math.cos(a) * r; d.z = Math.sin(a) * r;
        }
        p.position.set(d.x, o.y + d.life * o.rise, d.z);
        p.scale.setScalar(o.size * (0.5 + d.life));
        p.material.opacity = 0.75 * (1 - d.life);
      }
    };
  }

  /* Bếp gas với ngọn lửa */
  function Stove(group, flameScale) {
    const THREE = T();
    const base = mesh(new THREE.BoxGeometry(3.2, 0.3, 3.2), mat(0x2f3236, { metalness: 0.4, roughness: 0.35 }));
    base.position.y = 0.15; group.add(base);
    const ring = mesh(new THREE.TorusGeometry(0.7, 0.06, 8, 32), mat(0x1a1a1a, { metalness: 0.7, roughness: 0.3 }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.34; group.add(ring);
    const flames = [];
    const fs = flameScale == null ? 1 : flameScale;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.3, 8),
        new THREE.MeshBasicMaterial({ color: i % 2 ? 0x3d8bff : 0xff9a2e, transparent: true, opacity: 0.85 }));
      f.position.set(Math.cos(a) * 0.62, 0.45, Math.sin(a) * 0.62);
      f.userData.phase = rnd(0, 6);
      group.add(f); flames.push(f);
    }
    return function update(t) {
      for (const f of flames) {
        const s = fs * (0.75 + 0.35 * Math.sin(t * 18 + f.userData.phase));
        f.scale.set(1, s, 1);
        f.position.y = 0.36 + 0.15 * s;
      }
    };
  }

  function Pot(group, color, y) {
    const THREE = T();
    const pot = lathe([[0.01, 0], [1.05, 0], [1.1, 0.06], [1.12, 1.15], [1.18, 1.2]], color || 0xb8bec6, { metalness: 0.75, roughness: 0.28 });
    pot.position.y = y; group.add(pot);
    for (const s of [-1, 1]) {
      const h = mesh(new THREE.TorusGeometry(0.16, 0.04, 8, 16, Math.PI), mat(0x222222));
      h.position.set(s * 1.2, y + 1.0, 0); h.rotation.z = s > 0 ? -Math.PI / 2 : Math.PI / 2; group.add(h);
    }
    return pot;
  }

  function Liquid(group, radius, y, color, opacity) {
    const THREE = T();
    const m = new THREE.Mesh(new THREE.CircleGeometry(radius, 40),
      new THREE.MeshStandardMaterial({ color, transparent: true, opacity: opacity == null ? 0.85 : opacity, roughness: 0.15, metalness: 0.1 }));
    m.rotation.x = -Math.PI / 2; m.position.y = y; m.receiveShadow = true;
    group.add(m); return m;
  }

  function placeRing(pieces, radius, y, group, jitter) {
    pieces.forEach((p, i) => {
      const a = (i / pieces.length) * Math.PI * 2 + rnd(-0.2, 0.2);
      const r = radius * Math.sqrt(rnd(0.15, 1));
      p.position.set(Math.cos(a) * r, y + rnd(0, jitter || 0), Math.sin(a) * r);
      p.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3));
      p.userData.home = p.position.clone();
      p.userData.phase = rnd(0, Math.PI * 2);
      group.add(p);
    });
  }

  /* ---------- 4. Các cảnh theo thao tác ---------- */
  const BUILDERS = {
    prep(g, kinds) {
      const THREE = T();
      const board = mesh(new THREE.BoxGeometry(3.6, 0.16, 2.3), mat(0x9a6a40, { roughness: 0.8 }));
      board.position.y = 0.08; g.add(board);
      const knife = new THREE.Group();
      const blade = mesh(new THREE.BoxGeometry(1.5, 0.42, 0.03), mat(0xdfe4ea, { metalness: 0.9, roughness: 0.2 }));
      blade.position.x = -0.2; knife.add(blade);
      const handle = mesh(new THREE.BoxGeometry(0.7, 0.16, 0.1), mat(0x3b2a20));
      handle.position.set(0.85, 0.12, 0); knife.add(handle);
      knife.rotation.y = Math.PI / 2; g.add(knife);
      const pieces = pieceSet(kinds, 12);
      pieces.forEach((p, i) => {
        const col = i % 6, row = Math.floor(i / 6);
        p.position.set(-1.25 + col * 0.42, 0.28, -0.35 + row * 0.6);
        p.rotation.set(0, rnd(-0.4, 0.4), 0);
        p.userData.home = p.position.clone(); g.add(p);
      });
      return (t) => {
        const cut = Math.abs(Math.sin(t * 5));
        const xs = -1.25 + ((t * 0.55) % 1) * 2.5;
        knife.position.set(xs, 0.4 + cut * 0.7, 0.05);
        pieces.forEach(p => {
          const d = Math.abs(p.position.x - xs);
          const near = d < 0.25 && cut < 0.25;
          p.position.y = p.userData.home.y + (near ? 0.05 : 0);
          p.scale.x = near ? 0.85 : 1;
        });
      };
    },

    marinate(g, kinds) {
      const THREE = T();
      const bowl = lathe([[0.01, 0], [0.7, 0], [1.25, 0.45], [1.55, 1.05], [1.6, 1.12]], 0xf3efe7, { roughness: 0.35 });
      bowl.position.y = 0.02; g.add(bowl);
      const inner = Liquid(g, 1.25, 0.5, 0x8a4a1c, 0.55);
      const pieces = pieceSet(kinds, 12);
      placeRing(pieces, 1.0, 0.6, g, 0.15);
      const spoon = new THREE.Group();
      const stick = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.8, 8), mat(0xc79b62));
      stick.position.y = 0.9; spoon.add(stick);
      const head = mesh(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(0xc79b62, { side: THREE.DoubleSide }));
      head.rotation.x = Math.PI; spoon.add(head);
      spoon.rotation.z = 0.35; g.add(spoon);
      const sprinkle = [];
      const sg = new THREE.SphereGeometry(0.035, 6, 4);
      const colors = [0xffffff, 0x3a2a1a, 0xd9351f, 0xf2d06b];
      for (let i = 0; i < 40; i++) {
        const s = new THREE.Mesh(sg, mat(colors[i % colors.length]));
        s.userData = { life: Math.random(), x: rnd(-0.5, 0.5), z: rnd(-0.5, 0.5) };
        g.add(s); sprinkle.push(s);
      }
      return (t, dt) => {
        const a = t * 1.6;
        spoon.position.set(Math.cos(a) * 0.55, 0.45, Math.sin(a) * 0.55);
        spoon.rotation.y = -a;
        pieces.forEach((p, i) => {
          const h = p.userData.home; const r = Math.hypot(h.x, h.z); const b = Math.atan2(h.z, h.x) + t * 0.9;
          p.position.set(Math.cos(b) * r, h.y + Math.sin(t * 3 + i) * 0.05, Math.sin(b) * r);
          p.rotation.y += dt * 1.2;
        });
        for (const s of sprinkle) {
          const d = s.userData; d.life += dt * 0.7;
          if (d.life > 1) { d.life = 0; d.x = rnd(-0.5, 0.5); d.z = rnd(-0.5, 0.5); }
          s.position.set(d.x, 3.0 - d.life * 2.4, d.z);
          s.visible = d.life < 0.97;
        }
        inner.material.opacity = 0.45 + 0.1 * Math.sin(t * 2);
      };
    },

    stirfry(g, kinds) {
      const THREE = T();
      const stove = Stove(g, 1.2);
      const wok = new THREE.Group();
      const body = lathe([[0.01, 0], [0.6, 0.02], [1.2, 0.3], [1.55, 0.7], [1.6, 0.74]], 0x2b2b2e, { metalness: 0.65, roughness: 0.35 });
      wok.add(body);
      const handle = mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.4, 10), mat(0x4a3324));
      handle.rotation.z = Math.PI / 2; handle.position.set(2.25, 0.62, 0); wok.add(handle);
      const oil = Liquid(wok, 0.75, 0.08, 0xf2c14e, 0.5);
      wok.position.y = 0.6; g.add(wok);
      const pieces = pieceSet(kinds, 14);
      placeRing(pieces, 0.85, 0.3, wok, 0.1);
      const smoke = Steam(g, { y: 1.5, radius: 0.7, count: 18, opacity: 0.22, color: 0xe8e2da });
      return (t, dt) => {
        stove(t);
        const toss = Math.max(0, Math.sin(t * 3.2));
        wok.rotation.z = -0.12 * toss; wok.position.x = 0.15 * toss;
        pieces.forEach((p, i) => {
          const h = p.userData.home; const ph = p.userData.phase;
          const jump = Math.max(0, Math.sin(t * 3.2 - 0.4 + ph * 0.15)) ** 2 * 1.1;
          p.position.set(h.x - 0.25 * jump, h.y + jump, h.z);
          p.rotation.x += dt * (2 + i % 3); p.rotation.z += dt * 1.5;
        });
        oil.material.opacity = 0.4 + 0.1 * Math.sin(t * 9);
        smoke(dt);
      };
    },

    fry(g, kinds) {
      const THREE = T();
      const stove = Stove(g, 1);
      const pan = lathe([[0.01, 0], [1.3, 0], [1.38, 0.08], [1.42, 0.62], [1.48, 0.66]], 0x2b2b2e, { metalness: 0.6, roughness: 0.35 });
      pan.position.y = 0.6; g.add(pan);
      const handle = mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.5, 10), mat(0x1d1d1d));
      handle.rotation.z = Math.PI / 2; handle.position.set(2.2, 1.1, 0); g.add(handle);
      Liquid(g, 1.38, 0.95, 0xf0b93a, 0.75);
      const pieces = pieceSet(kinds, 10);
      placeRing(pieces, 0.95, 0.98, g, 0);
      const bubbles = Bubbles(g, { y: 0.93, rise: 0.12, radius: 1.2, count: 40, color: 0xfff1c2, size: 0.05, speed: 2.2 });
      const base = pieces.map(p => p.children.length ? null : p.material.color.clone());
      const gold = new THREE.Color(0xc77a1e);
      return (t, dt) => {
        stove(t); bubbles(dt);
        const k = (Math.sin(t * 0.5) + 1) / 2;
        pieces.forEach((p, i) => {
          const h = p.userData.home;
          p.position.y = h.y + Math.sin(t * 6 + p.userData.phase) * 0.03;
          p.rotation.y += dt * 0.3;
          if (base[i]) p.material.color.copy(base[i]).lerp(gold, k * 0.65);
        });
      };
    },

    boil(g, kinds, opt) {
      const THREE = T();
      const stove = Stove(g, 1);
      Pot(g, 0xb8bec6, 0.5);
      const water = Liquid(g, 1.08, 1.35, (opt && opt.liquid) || 0x9fd0e0, 0.7);
      const pieces = pieceSet(kinds, 10);
      placeRing(pieces, 0.75, 1.3, g, 0.05);
      const bubbles = Bubbles(g, { y: 1.2, rise: 0.2, radius: 0.95, count: 30, color: 0xffffff, size: 0.06, speed: 1.8 });
      const steam = Steam(g, { y: 1.8, radius: 0.6, count: 26 });
      return (t, dt) => {
        stove(t); bubbles(dt); steam(dt);
        water.position.y = 1.35 + Math.sin(t * 7) * 0.012;
        pieces.forEach((p, i) => {
          const h = p.userData.home; const b = Math.atan2(h.z, h.x) + t * 0.4; const r = Math.hypot(h.x, h.z);
          p.position.set(Math.cos(b) * r, h.y + Math.sin(t * 3 + i) * 0.06, Math.sin(b) * r);
          p.rotation.y += dt * 0.5;
        });
      };
    },

    season(g, kinds) {
      const THREE = T();
      const upd = BUILDERS.boil(g, kinds, { liquid: 0xd9a066 });
      const bottle = new THREE.Group();
      const body = mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.9, 16), mat(0x8a3b16, { roughness: 0.2, transparent: true, opacity: 0.9 }));
      bottle.add(body);
      const neck = mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.35, 12), mat(0x8a3b16, { roughness: 0.2 }));
      neck.position.y = 0.62; bottle.add(neck);
      const cap = mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), mat(0xd62f2f));
      cap.position.y = 0.84; bottle.add(cap);
      bottle.position.set(0.9, 3.0, 0); g.add(bottle);
      const drops = [];
      for (let i = 0; i < 10; i++) {
        const d = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 6), mat(0x8a3b16, { roughness: 0.1 }));
        d.userData.life = i / 10; g.add(d); drops.push(d);
      }
      return (t, dt) => {
        upd(t, dt);
        const tilt = 0.9 + 0.5 * Math.max(0, Math.sin(t * 1.2));
        bottle.rotation.z = tilt;
        const pouring = tilt > 1.2;
        for (const d of drops) {
          d.userData.life += dt * 1.5; if (d.userData.life > 1) d.userData.life = 0;
          d.visible = pouring;
          d.position.set(0.35 - d.userData.life * 0.15, 2.85 - d.userData.life * 1.5, 0);
        }
      };
    },

    braise(g, kinds) {
      const THREE = T();
      const stove = Stove(g, 0.7);
      const pot = lathe([[0.01, 0], [0.85, 0], [1.15, 0.25], [1.25, 0.8], [1.15, 1.05], [1.2, 1.1]], 0x8a4b2a, { roughness: 0.9 });
      pot.position.y = 0.5; g.add(pot);
      const sauce = Liquid(g, 1.18, 1.25, 0x7a3510, 0.92);
      const pieces = pieceSet(kinds, 10);
      placeRing(pieces, 0.8, 1.28, g, 0.04);
      const bubbles = Bubbles(g, { y: 1.22, rise: 0.12, radius: 0.95, count: 16, color: 0xc0703a, size: 0.07, speed: 0.9 });
      const steam = Steam(g, { y: 1.6, radius: 0.6, count: 16, opacity: 0.25 });
      const c1 = new THREE.Color(0xa0541f), c2 = new THREE.Color(0x5a2208);
      return (t, dt) => {
        stove(t); bubbles(dt); steam(dt);
        const k = (Math.sin(t * 0.35) + 1) / 2;
        sauce.material.color.copy(c1).lerp(c2, k);
        pieces.forEach((p, i) => { p.position.y = p.userData.home.y + Math.sin(t * 1.5 + i) * 0.03; });
      };
    },

    steam(g, kinds) {
      const THREE = T();
      const stove = Stove(g, 0.9);
      Pot(g, 0xb8bec6, 0.5);
      const baskets = [];
      for (let i = 0; i < 2; i++) {
        const b = mesh(new THREE.CylinderGeometry(1.15, 1.1, 0.5, 32, 1, true), mat(0xd9b46a, { side: THREE.DoubleSide, roughness: 0.9 }));
        b.position.y = 1.95 + i * 0.52; g.add(b); baskets.push(b);
        const rim = mesh(new THREE.TorusGeometry(1.15, 0.04, 6, 32), mat(0xb88d44));
        rim.rotation.x = Math.PI / 2; rim.position.y = 2.2 + i * 0.52; g.add(rim);
      }
      const lid = lathe([[0.01, 0.45], [0.6, 0.38], [1.0, 0.18], [1.18, 0]], 0xd9b46a, { roughness: 0.9 });
      lid.position.y = 2.7; g.add(lid);
      const pieces = pieceSet(kinds, 6);
      placeRing(pieces, 0.6, 1.8, g, 0);
      const steam = Steam(g, { y: 2.8, radius: 1.0, count: 40, opacity: 0.4, height: 2.2, speed: 0.7 });
      const leak = Steam(g, { y: 2.2, radius: 1.2, count: 14, opacity: 0.25, height: 1.2, size: 0.12 });
      return (t, dt) => {
        stove(t); steam(dt); leak(dt);
        lid.position.y = 2.7 + Math.max(0, Math.sin(t * 2.5)) * 0.04;
      };
    },

    grill(g, kinds) {
      const THREE = T();
      const box = mesh(new THREE.BoxGeometry(3.4, 0.9, 2.2), mat(0x2b2b2b, { metalness: 0.5, roughness: 0.4 }));
      box.position.y = 0.45; g.add(box);
      const coals = [];
      for (let i = 0; i < 18; i++) {
        const c = mesh(new THREE.DodecahedronGeometry(rnd(0.12, 0.2)), new THREE.MeshStandardMaterial({ color: 0x3a1206, emissive: 0xff4a12, emissiveIntensity: 0.6 }), false);
        c.position.set(rnd(-1.4, 1.4), 0.95, rnd(-0.8, 0.8)); c.userData.phase = rnd(0, 6); g.add(c); coals.push(c);
      }
      for (let i = 0; i < 11; i++) {
        const bar = mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.2, 6), mat(0x9aa0a6, { metalness: 0.9, roughness: 0.3 }));
        bar.rotation.x = Math.PI / 2; bar.position.set(-1.5 + i * 0.3, 1.2, 0); g.add(bar);
      }
      const pieces = pieceSet(kinds, 8);
      pieces.forEach((p, i) => {
        p.position.set(-1.2 + (i % 4) * 0.8, 1.35, i < 4 ? -0.45 : 0.45);
        p.userData.home = p.position.clone(); p.userData.phase = i * 0.7; g.add(p);
      });
      const smoke = Steam(g, { y: 1.5, radius: 1.0, count: 22, color: 0xbdb6ad, opacity: 0.18, size: 0.14 });
      const grilled = new THREE.Color(0x9b4a1c);
      pieces.forEach(p => { if (p.material) p.material.color.lerp(grilled, 0.35); });
      return (t, dt) => {
        smoke(dt);
        coals.forEach(c => { c.material.emissiveIntensity = 0.45 + 0.35 * Math.sin(t * 4 + c.userData.phase); });
        pieces.forEach(p => {
          const cyc = ((t * 0.35 + p.userData.phase * 0.1) % 2);
          const flip = cyc < 0.25 ? cyc / 0.25 : 1;
          p.position.y = p.userData.home.y + Math.sin(Math.min(flip, 1) * Math.PI) * 0.5;
          p.rotation.x = Math.floor(t * 0.35 + p.userData.phase * 0.1) * Math.PI + flip * Math.PI;
        });
      };
    },

    caramel(g) {
      const THREE = T();
      const stove = Stove(g, 0.7);
      const pan = lathe([[0.01, 0], [1.0, 0], [1.06, 0.06], [1.1, 0.45], [1.15, 0.5]], 0xc9ced4, { metalness: 0.8, roughness: 0.25 });
      pan.position.y = 0.6; g.add(pan);
      const handle = mesh(new THREE.CylinderGeometry(0.06, 0.07, 1.3, 10), mat(0x1d1d1d));
      handle.rotation.z = Math.PI / 2; handle.position.set(1.8, 0.95, 0); g.add(handle);
      const syrup = Liquid(g, 0.95, 0.72, 0xffffff, 0.95);
      const bubbles = Bubbles(g, { y: 0.7, rise: 0.08, radius: 0.85, count: 30, color: 0xffe2a8, size: 0.06, speed: 1.6 });
      const sugar = new THREE.Color(0xfbf7ee), amber = new THREE.Color(0x9a4a0e);
      return (t, dt) => {
        stove(t); bubbles(dt);
        const k = Math.min(1, (t % 10) / 8);
        syrup.material.color.copy(sugar).lerp(amber, k);
      };
    },

    soak(g, kinds) {
      const THREE = T();
      const bowl = lathe([[0.01, 0], [0.9, 0], [1.4, 0.4], [1.65, 1.1], [1.7, 1.15]], 0xcfe7f3, { transparent: true, opacity: 0.45, roughness: 0.05 });
      bowl.position.y = 0.02; g.add(bowl);
      const water = Liquid(g, 1.58, 0.95, 0x7fc3e2, 0.55);
      const pieces = pieceSet(kinds, 10);
      placeRing(pieces, 1.0, 0.7, g, 0.25);
      const bubbles = Bubbles(g, { y: 0.3, rise: 0.65, radius: 1.1, count: 22, color: 0xffffff, size: 0.04, speed: 0.6 });
      return (t, dt) => {
        bubbles(dt);
        water.position.y = 0.95 + Math.sin(t * 2) * 0.015;
        pieces.forEach((p, i) => {
          p.position.y = p.userData.home.y + Math.sin(t * 1.3 + i) * 0.08;
          p.rotation.y += dt * 0.3;
        });
      };
    },

    wrap(g, kinds) {
      const THREE = T();
      const board = mesh(new THREE.BoxGeometry(3.6, 0.16, 2.3), mat(0x9a6a40, { roughness: 0.8 }));
      board.position.y = 0.08; g.add(board);
      const leafMat = mat(0x5fae4a, { side: THREE.DoubleSide });
      const left = mesh(new THREE.PlaneGeometry(0.6, 1.0), leafMat);
      const right = mesh(new THREE.PlaneGeometry(0.6, 1.0), leafMat);
      const hingeL = new THREE.Group(), hingeR = new THREE.Group();
      left.position.x = -0.3; right.position.x = 0.3;
      hingeL.add(left); hingeR.add(right);
      hingeL.position.set(-0.08, 0.18, 0); hingeR.position.set(0.08, 0.18, 0);
      hingeL.rotation.x = hingeR.rotation.x = 0;
      const wrapG = new THREE.Group(); wrapG.add(hingeL, hingeR);
      left.rotation.x = right.rotation.x = -Math.PI / 2;
      wrapG.position.x = -0.9; g.add(wrapG);
      const filling = makePiece(kinds[0]);
      filling.scale.multiplyScalar(1.2); filling.position.set(-0.9, 0.3, 0); g.add(filling);
      const balls = [];
      const kc = (KINDS[kinds[0]] || KINDS.pork).color;
      for (let i = 0; i < 6; i++) {
        const b = mesh(new THREE.SphereGeometry(0.2, 16, 12), mat(kc));
        b.position.set(0.5 + (i % 3) * 0.5, 0.36, i < 3 ? -0.4 : 0.4); g.add(b); balls.push(b);
      }
      return (t) => {
        const cyc = (t % 4) / 4;
        const fold = Math.min(1, Math.max(0, (cyc - 0.2) / 0.5));
        hingeL.rotation.z = -fold * Math.PI * 0.92;
        hingeR.rotation.z = fold * Math.PI * 0.92;
        balls.forEach((b, i) => {
          const s = Math.min(1, Math.max(0.05, (t * 0.8 - i * 0.35) % 4));
          b.scale.set(s, s * (0.9 + 0.1 * Math.sin(t * 6 + i)), s);
          b.rotation.y = t * 2;
        });
      };
    },

    serve(g, kinds) {
      const THREE = T();
      const plate = mesh(new THREE.CylinderGeometry(1.6, 1.3, 0.12, 48), mat(0xffffff, { roughness: 0.25 }));
      plate.position.y = 0.06; g.add(plate);
      const rim = mesh(new THREE.TorusGeometry(1.55, 0.05, 8, 48), mat(0x3c7bd4, { roughness: 0.3 }));
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.13; g.add(rim);
      const pieces = pieceSet(kinds, 14);
      pieces.forEach((p, i) => {
        const a = i * 2.4, r = 0.15 + (i / 14) * 0.85;
        p.position.set(Math.cos(a) * r, 0.25 + (1 - r) * 0.35, Math.sin(a) * r);
        p.rotation.set(rnd(0, 3), rnd(0, 3), rnd(0, 3)); g.add(p);
      });
      const herbs = [];
      for (let i = 0; i < 12; i++) {
        const h = makePiece('herb'); h.scale.multiplyScalar(0.45);
        h.userData = { life: i / 12, x: rnd(-0.8, 0.8), z: rnd(-0.8, 0.8) }; g.add(h); herbs.push(h);
      }
      const sparkle = Steam(g, { y: 0.8, radius: 0.7, count: 14, opacity: 0.2 });
      return (t, dt) => {
        g.rotation.y = t * 0.25; sparkle(dt);
        herbs.forEach(h => {
          const d = h.userData; d.life += dt * 0.35;
          if (d.life > 1) { d.life = 0; d.x = rnd(-0.8, 0.8); d.z = rnd(-0.8, 0.8); }
          h.position.set(d.x, Math.max(0.55, 3 - d.life * 3.2), d.z);
          h.rotation.y += dt;
        });
      };
    },
  };

  // Góc máy theo từng cảnh: y = điểm nhìn, r = hệ số khoảng cách.
  const CAM = {
    steam: { y: 1.7, r: 1.18 }, season: { y: 1.45, r: 1.05 }, boil: { y: 1.1, r: 1 },
    serve: { y: 0.5, r: 0.82 }, prep: { y: 0.35, r: 0.82 }, wrap: { y: 0.35, r: 0.8 },
    marinate: { y: 0.8, r: 0.9 }, soak: { y: 0.7, r: 0.9 }, caramel: { y: 0.8, r: 0.85 },
    fry: { y: 0.9, r: 0.92 }, grill: { y: 1.0, r: 0.95 },
  };

  /* ---------- 5. Sân khấu: renderer + camera + điều khiển kéo xoay ---------- */
  function supportsWebGL() {
    try {
      const c = document.createElement('canvas');
      return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
    } catch (e) { return false; }
  }

  function Stage(container) {
    const THREE = T();
    this.container = container;
    this.ok = !!THREE && supportsWebGL();
    if (!this.ok) return;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputEncoding = THREE.sRGBEncoding;
    container.appendChild(r.domElement);
    r.domElement.setAttribute('aria-label', 'Hoạt cảnh 3D minh họa bước nấu. Kéo để xoay, cuộn để phóng to.');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.orbit = { theta: 0.6, phi: 1.0, radius: 9, target: new THREE.Vector3(0, 1.0, 0), user: false };
    const hemi = new THREE.HemisphereLight(0xfff6ea, 0x8d7b68, 0.55);
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(4, 9, 5); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5 });
    const fill = new THREE.PointLight(0xffc48a, 0.35, 20); fill.position.set(-4, 3, -3);
    this.scene.add(hemi, sun, fill);
    this.counter = mesh(new THREE.BoxGeometry(14, 0.4, 9), mat(0xd7c3a6, { roughness: 0.9 }));
    this.counter.position.y = -0.2; this.scene.add(this.counter);
    this.root = new THREE.Group(); this.scene.add(this.root);
    this.clock = new THREE.Clock();
    this.update = null; this.running = false;
    this._theme();
    this._bindControls();
    this._resize = this._resize.bind(this);
    if (window.ResizeObserver) { this.ro = new ResizeObserver(this._resize); this.ro.observe(container); }
    window.addEventListener('resize', this._resize);
    this._mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    if (this._mq && this._mq.addEventListener) this._mq.addEventListener('change', () => this._theme());
    this._resize();
    this._loop = this._loop.bind(this);
  }

  Stage.prototype._theme = function () {
    const dark = document.documentElement.dataset.theme === 'dark' ||
      (document.documentElement.dataset.theme !== 'light' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const THREE = T();
    this.scene.background = new THREE.Color(dark ? 0x23201d : 0xf7efe4);
    this.scene.fog = new THREE.Fog(dark ? 0x23201d : 0xf7efe4, 14, 26);
    this.counter.material.color.set(dark ? 0x5b4a3a : 0xc9ad8a);
  };

  Stage.prototype._bindControls = function () {
    const el = this.renderer.domElement, o = this.orbit;
    let drag = null;
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY, th: o.theta, ph: o.phi }; o.user = true; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!drag) return;
      o.theta = drag.th - (e.clientX - drag.x) * 0.008;
      o.phi = Math.min(1.45, Math.max(0.35, drag.ph - (e.clientY - drag.y) * 0.006));
    });
    const end = () => { drag = null; };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
    el.addEventListener('wheel', e => {
      e.preventDefault(); o.radius = Math.min(14, Math.max(5, o.radius + e.deltaY * 0.005));
    }, { passive: false });
    el.addEventListener('dblclick', () => this.resetView());
  };

  Stage.prototype.resetView = function () {
    Object.assign(this.orbit, { theta: 0.6, phi: 1.0, radius: (this._baseRadius || 9) * (this._camK || 1), user: false });
  };

  Stage.prototype._resize = function () {
    const w = this.container.clientWidth || 300, h = this.container.clientHeight || 200;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = w + 'px';
    this.renderer.domElement.style.height = h + 'px';
    this.camera.aspect = w / h;
    // Màn hình dọc (điện thoại) thì lùi camera xa hơn để thấy trọn vật thể.
    this._baseRadius = w / h < 1 ? 11.5 : 8.2;
    if (!this.orbit.user) this.orbit.radius = this._baseRadius * (this._camK || 1);
    this.camera.updateProjectionMatrix();
  };

  Stage.prototype._clear = function () {
    const root = this.root;
    root.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
    while (root.children.length) root.remove(root.children[0]);
    root.rotation.set(0, 0, 0);
  };

  Stage.prototype.show = function (action, kinds) {
    if (!this.ok) return;
    this._clear();
    const g = new (T().Group)();
    this.root.add(g);
    const build = BUILDERS[action] || BUILDERS.prep;
    this.update = build(g, kinds && kinds.length ? kinds : ['pork']);
    const cam = CAM[action] || { y: 1.0, r: 1 };
    this.orbit.target.y = cam.y; this._camK = cam.r;
    if (!this.orbit.user) this.orbit.radius = this._baseRadius * cam.r;
    this.t0 = this.clock.getElapsedTime();
    g.scale.setScalar(0.01); this._pop = 0;
    this._group = g;
    this.start();
  };

  Stage.prototype.start = function () {
    if (!this.ok || this.running) return;
    this.running = true; this.clock.getDelta();
    requestAnimationFrame(this._loop);
  };
  Stage.prototype.stop = function () { this.running = false; };

  Stage.prototype._loop = function () {
    if (!this.running) return;
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.getElapsedTime() - (this.t0 || 0);
    const o = this.orbit;
    if (!o.user) o.theta = 0.6 + Math.sin(t * 0.25) * 0.35;
    const c = this.camera;
    c.position.set(
      o.target.x + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
      o.target.y + o.radius * Math.cos(o.phi),
      o.target.z + o.radius * Math.sin(o.phi) * Math.cos(o.theta));
    c.lookAt(o.target);
    if (this._group && this._pop < 1) {
      this._pop = Math.min(1, this._pop + dt * 3.5);
      const e = 1 - Math.pow(1 - this._pop, 3);
      this._group.scale.setScalar(Math.max(0.01, e));
    }
    if (this.update) { try { this.update(t, dt); } catch (e) { console.error(e); this.update = null; } }
    this.renderer.render(this.scene, c);
    requestAnimationFrame(this._loop);
  };

  Stage.prototype.dispose = function () {
    if (!this.ok) return;
    this.stop(); this._clear();
    if (this.ro) this.ro.disconnect();
    window.removeEventListener('resize', this._resize);
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
  };

  window.Cook3D = { Stage, classifyStep, stepKinds, detectKinds, ACTIONS, KINDS };
})();
