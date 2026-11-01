/* Bếp Nhà — điều hướng, danh sách, chi tiết và chế độ nấu từng bước. */
(function () {
  'use strict';

  const RECIPES = window.RECIPES || [];
  const C3 = window.Cook3D;
  const main = document.getElementById('main');
  const $q = document.getElementById('q');

  const GROUP_EMOJI = { ga: '🍗', heo: '🥓', bo: '🥩', vit: '🦆', ca: '🐟', 'hai-san': '🦐', canh: '🍲', rau: '🥬', 'dau-trung': '🥚' };
  const KIND_EMOJI = { shrimp: '🦐', clam: '🦪', squid: '🦑', fish: '🐟', chicken: '🍗', rib: '🍖', pork: '🥓', beef: '🥩',
    duck: '🦆', egg: '🍳', quail: '🥚', tofu: '🧈', leaf: '🥬', gourd: '🥒', mushroom: '🍄', potato: '🥔', pumpkin: '🎃',
    tomato: '🍅', bean: '🫛', corn: '🌽', pineapple: '🍍', carrot: '🥕' };
  function dishEmoji(r) {
    const k = C3 ? C3.detectKinds(r.title, 3) : [];
    const first = k.map(x => KIND_EMOJI[x]).find(Boolean) || GROUP_EMOJI[r.group] || '🍽️';
    const second = r.group === 'canh' ? '🍲' : (k.slice(1).map(x => KIND_EMOJI[x]).find(e => e && e !== first) || '');
    return first + (second ? `<small>${second}</small>` : '');
  }
  const GROUP_ORDER = ['ga', 'heo', 'bo', 'vit', 'ca', 'hai-san', 'canh', 'rau', 'dau-trung'];

  /* ---------- Lưu trữ cục bộ (an toàn khi bị chặn) ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bepnha:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bepnha:' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
  };
  let favs = new Set(store.get('favs', []));
  const state = { filter: store.get('filter', 'all'), query: '' };

  /* ---------- Tiện ích ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const md = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const byId = id => RECIPES.find(r => r.id === id);

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 2200);
  }

  // Phân loại trước các bước để dùng lại (icon + cảnh 3D).
  RECIPES.forEach(r => {
    r.steps.forEach(s => { s.action = C3 ? C3.classifyStep(s) : 'prep'; });
    r._raw = [r.title, r.groupName, r.tags, r.ingredients.map(g => g.items.join(' ')).join(' ')].join(' ').toLowerCase().replace(/muỗng (canh|cà phê)/g, ' ');
    r._search = norm(r._raw);
  });

  /* ---------- Định lượng theo khẩu phần ---------- */
  const FR = { '½': 0.5, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 0.25, '¾': 0.75 };
  const QTY_RE = /^(\d+(?:[.,]\d+)?)?([½⅓⅔¼¾])?(?:\s*[–-]\s*(\d+(?:[.,]\d+)?)?([½⅓⅔¼¾])?)?/;
  function parseNum(a, f) {
    if (!a && !f) return null;
    return (a ? parseFloat(a.replace(',', '.')) : 0) + (f ? FR[f] : 0);
  }
  function fmt(n) {
    if (n >= 10) return String(Math.round(n));
    const whole = Math.floor(n), rest = n - whole;
    const opts = [[0, ''], [0.25, '¼'], [1 / 3, '⅓'], [0.5, '½'], [2 / 3, '⅔'], [0.75, '¾'], [1, '']];
    let best = opts[0];
    for (const o of opts) if (Math.abs(o[0] - rest) < Math.abs(best[0] - rest)) best = o;
    const w = whole + (best[0] === 1 ? 1 : 0);
    if (!best[1]) return String(w || (n > 0 ? '¼' : '0'));
    return (w ? w : '') + best[1];
  }
  function scaleLine(line, factor) {
    const m = line.match(QTY_RE);
    if (!m || !m[0].trim() || factor === 1) return { q: '', rest: line, scaled: false, raw: m && m[0].trim() ? m[0] : '' };
    const a = parseNum(m[1], m[2]); const b = parseNum(m[3], m[4]);
    if (a == null) return { q: '', rest: line, scaled: false };
    const q = fmt(a * factor) + (b != null ? '–' + fmt(b * factor) : '');
    return { q, rest: line.slice(m[0].length), scaled: true };
  }
  function baseServings(r) { const m = String(r.servings).match(/\d+/); return m ? parseInt(m[0], 10) : 0; }

  /* ---------- Trang chủ ---------- */
  function counts() {
    const c = { all: RECIPES.length, fav: RECIPES.filter(r => favs.has(r.id)).length };
    RECIPES.forEach(r => { c[r.group] = (c[r.group] || 0) + 1; });
    return c;
  }

  function filtered() {
    const raw = String(state.query || '').toLowerCase().trim();
    const accented = raw !== norm(raw);
    const q = accented ? raw : norm(raw);
    return RECIPES.filter(r => {
      if (state.filter === 'fav' && !favs.has(r.id)) return false;
      if (state.filter !== 'all' && state.filter !== 'fav' && r.group !== state.filter) return false;
      const hay = accented ? r._raw : r._search;
      if (q && !q.split(/\s+/).every(w => hay.includes(w))) return false;
      return true;
    });
  }

  function cardHTML(r) {
    const acts = [...new Set(r.steps.map(s => s.action))].slice(0, 4).map(a => C3 ? C3.ACTIONS[a].icon : '').join('');
    const fav = favs.has(r.id);
    return `<a class="card" href="#mon-${r.id}">
      <div class="thumb g-${r.group}${r.image ? ' has-img' : ''}" aria-hidden="true"><span class="em">${dishEmoji(r)}</span>${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" decoding="async" onerror="this.parentNode.classList.remove('has-img');this.remove()">` : ''}<span class="acts">${acts}</span></div>
      <div class="card-body">
        <h3>${esc(r.title)}</h3>
        <div class="meta"><span>👥 ${esc(r.servings || '—')}</span><span>🧾 ${r.steps.length} bước</span></div>
        <span class="badge ${r.mine ? 'mine' : ''}">${r.mine ? 'Công thức nhà mình' : 'Món Ngon Mỗi Ngày'}</span>
      </div>
      <button class="fav" type="button" data-fav="${r.id}" aria-pressed="${fav}" aria-label="${fav ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'} ${esc(r.title)}">${fav ? '❤️' : '🤍'}</button>
    </a>`;
  }

  function renderHome() {
    document.body.classList.remove('cooking');
    document.title = 'Bếp Nhà';
    const c = counts();
    const totalSteps = RECIPES.reduce((n, r) => n + r.steps.length, 0);
    const chips = [['all', 'Tất cả'], ['fav', '❤️ Yêu thích']].concat(
      GROUP_ORDER.filter(g => c[g]).map(g => [g, GROUP_EMOJI[g] + ' ' + RECIPES.find(r => r.group === g).groupName]));
    main.innerHTML = `<div class="wrap">
      <section class="hero">
        <h1>Hôm nay nấu gì?</h1>
        <p>Món ăn gia đình Việt, nguyên liệu dễ mua. Mỗi bước có hoạt cảnh 3D minh họa, hẹn giờ và đánh dấu nguyên liệu đã chuẩn bị.</p>
        <div class="stats"><span class="stat"><b>${RECIPES.length}</b> món</span><span class="stat"><b>${totalSteps}</b> bước có 3D</span><span class="stat"><b>${GROUP_ORDER.filter(g => c[g]).length}</b> nhóm món</span></div>
      </section>
      <div class="chips" role="toolbar" aria-label="Lọc theo nhóm món">
        ${chips.map(([k, l]) => `<button class="chip" type="button" data-filter="${k}" aria-pressed="${state.filter === k}">${esc(l)}<span class="n">${c[k] || 0}</span></button>`).join('')}
      </div>
      <p class="result-info" id="resInfo"></p>
      <div class="grid" id="grid"></div>
    </div>`;
    renderGrid();
  }

  function renderGrid() {
    const grid = document.getElementById('grid');
    if (!grid) return;
    const list = filtered();
    document.getElementById('resInfo').textContent = state.query
      ? `${list.length} món khớp "${state.query}"` : `${list.length} món`;
    grid.innerHTML = list.length ? list.map(cardHTML).join('')
      : `<div class="empty">${state.filter === 'fav' ? 'Chưa có món yêu thích. Bấm 🤍 trên thẻ món để lưu lại.' : 'Không tìm thấy món phù hợp. Thử từ khóa khác nhé.'}</div>`;
  }

  /* ---------- Trang chi tiết ---------- */
  function renderDetail(r) {
    document.body.classList.remove('cooking');
    document.title = r.title + ' · Bếp Nhà';
    const base = baseServings(r);
    const want = store.get('serv:' + r.id, base) || base;
    const factor = base ? want / base : 1;
    const checked = new Set(store.get('chk:' + r.id, []));
    const pills = [r.servings && '👥 ' + r.servings, r.time && '⏱️ ' + r.time, r.difficulty && '📶 ' + r.difficulty].filter(Boolean);
    let idx = 0;
    const ingHTML = r.ingredients.map(g => `<div class="ing-group"><h3>${esc(g.name)}</h3><ul class="ing">${
      g.items.map(it => {
        const k = idx++; const s = scaleLine(it, factor);
        const text = s.scaled ? `<span class="q">${esc(s.q)}</span>${md(s.rest)}` : md(it);
        return `<li><label><input type="checkbox" data-chk="${k}" ${checked.has(k) ? 'checked' : ''}><span>${text}</span></label></li>`;
      }).join('')}</ul></div>`).join('');
    const fav = favs.has(r.id);
    main.innerHTML = `<div class="wrap">
      <a class="back" href="#">← Tất cả món</a>
      <div class="detail">
        <div class="side stack">
          ${r.image ? `<img class="dphoto" src="${esc(r.image)}" alt="Ảnh minh họa món ${esc(r.title)}" decoding="async" onerror="this.remove()">` : ''}
          <div class="dhead g-${r.group}">
            <div class="emoji" aria-hidden="true">${dishEmoji(r)}</div>
            <h1>${esc(r.title)}</h1>
            <div class="tags">${esc(r.tags)}</div>
            <div class="pills">${pills.map(p => `<span class="pill">${esc(p)}</span>`).join('')}</div>
          </div>
          ${r.intro ? `<p class="intro">${md(r.intro)}</p>` : ''}
          <a class="cta" href="#nau-1-${r.id}">▶ Bắt đầu nấu cùng 3D</a>
          <button class="btn" type="button" data-fav="${r.id}" aria-pressed="${fav}">${fav ? '❤️ Đã lưu yêu thích' : '🤍 Lưu vào yêu thích'}</button>
          <section class="panel">
            <h2 class="sec">Nguyên liệu
              ${base ? `<span class="scaler" aria-label="Điều chỉnh khẩu phần">
                <button type="button" data-serv="-1" aria-label="Giảm khẩu phần">−</button>
                <output aria-live="polite">${want} người</output>
                <button type="button" data-serv="1" aria-label="Tăng khẩu phần">+</button></span>` : ''}
            </h2>
            ${factor !== 1 ? `<p class="note">Định lượng đã quy đổi cho ${want} người (gốc ${base} người). Các mục "vừa đủ" giữ nguyên.</p>` : ''}
            ${ingHTML}
          </section>
        </div>
        <div class="stack">
          <section class="panel">
            <h2 class="sec">Các bước <span class="badge">${r.steps.length} bước</span></h2>
            <ol class="steps-list">${r.steps.map((s, i) => `<li><a href="#nau-${i + 1}-${r.id}">
              <span class="step-ico" aria-hidden="true">${C3 ? C3.ACTIONS[s.action].icon : '•'}</span>
              <span><b>${i + 1}. ${esc(s.title || 'Bước ' + (i + 1))}</b><p>${md(s.text || (s.subs || []).join(', '))}</p></span></a></li>`).join('')}</ol>
          </section>
          ${r.tips.length ? `<section class="panel"><h2 class="sec">Mẹo</h2><ul class="tips">${r.tips.map(t => `<li>${md(t)}</li>`).join('')}</ul></section>` : ''}
          ${r.notes.filter(n => !/^Quy ước/.test(n)).map(n => `<p class="note">ℹ️ ${md(n)}</p>`).join('')}
          <p class="source">${r.source ? `Nguồn: <a href="${esc(r.source.url)}" target="_blank" rel="noopener">${esc(r.source.name)}</a>. Định lượng giữ theo bản gốc.` : 'Công thức nhà mình, từ ghi chú cá nhân.'}</p>
        </div>
      </div>
    </div>`;
    main.querySelectorAll('[data-chk]').forEach(cb => cb.addEventListener('change', () => {
      const k = +cb.dataset.chk; cb.checked ? checked.add(k) : checked.delete(k);
      store.set('chk:' + r.id, [...checked]);
    }));
    main.querySelectorAll('[data-serv]').forEach(b => b.addEventListener('click', () => {
      const n = Math.max(1, Math.min(20, want + +b.dataset.serv));
      store.set('serv:' + r.id, n); renderDetail(r);
    }));
  }

  /* ---------- Chế độ nấu ---------- */
  let stage = null, wakeLock = null, timer = null;

  function stopTimer() { if (timer) { clearInterval(timer.id); timer = null; } }
  function beep() {
    try {
      const A = window.AudioContext || window.webkitAudioContext; const ctx = new A();
      [0, 0.35, 0.7].forEach(off => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = 880; o.connect(g); g.connect(ctx.destination);
        g.gain.setValueAtTime(0.0001, ctx.currentTime + off);
        g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + off + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + off + 0.3);
        o.start(ctx.currentTime + off); o.stop(ctx.currentTime + off + 0.32);
      });
    } catch (e) { /* bỏ qua */ }
    try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) { /* bỏ qua */ }
  }
  const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  async function keepAwake(on) {
    try {
      if (on && 'wakeLock' in navigator && !wakeLock) wakeLock = await navigator.wakeLock.request('screen');
      if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; }
  }

  function leaveCook() {
    stopTimer(); keepAwake(false);
    if (stage) { stage.dispose(); stage = null; }
  }

  function renderCook(r, n) {
    const total = r.steps.length;
    const finished = n > total;
    n = Math.max(1, Math.min(n, total + 1));
    document.body.classList.add('cooking');
    document.title = (finished ? 'Hoàn thành' : `Bước ${n}/${total}`) + ' · ' + r.title;
    stopTimer();

    let shell = main.querySelector('.cook');
    if (!shell || shell.dataset.id !== r.id) {
      leaveCook();
      main.innerHTML = `<div class="cook" data-id="${r.id}">
        <div class="stage" id="stage">
          <div class="stage-top">
            <a class="glass btnish" href="#mon-${r.id}" aria-label="Thoát chế độ nấu">✕ Thoát</a>
            <span class="glass" id="actLabel"></span>
          </div>
          <span class="stage-hint">Kéo để xoay · nhấp đúp để đặt lại góc nhìn</span>
        </div>
        <section class="cpanel" aria-live="polite">
          <div class="chead">
            <div class="ctitle-row"><span class="crecipe">${esc(r.title)}</span><a class="glass btnish" href="#mon-${r.id}" style="font-size:13px">🧾 Nguyên liệu</a></div>
            <div class="progress" aria-hidden="true"><i id="prog"></i></div>
            <div class="dots" id="dots" role="tablist" aria-label="Chọn bước"></div>
          </div>
          <div class="cbody" id="cbody"></div>
          <div class="cfoot"><button class="btn" id="prevBtn" type="button">← Trước</button><button class="cta" id="nextBtn" type="button">Tiếp →</button></div>
        </section>
      </div>`;
      shell = main.querySelector('.cook');
      const st = document.getElementById('stage');
      if (C3 && window.THREE) {
        stage = new C3.Stage(st);
        if (!stage.ok) { stage = null; }
      }
      if (!stage) st.insertAdjacentHTML('beforeend', `<div class="fallback"><div><span id="fbIcon">🍳</span><small>Thiết bị không hỗ trợ 3D (WebGL)</small></div></div>`);
      document.getElementById('prevBtn').addEventListener('click', () => go(r, cur() - 1));
      document.getElementById('nextBtn').addEventListener('click', () => go(r, cur() + 1));
      bindSwipe(document.getElementById('cbody'), r);
      keepAwake(true);
    }
    shell.dataset.step = n;

    const step = r.steps[Math.min(n, total) - 1];
    const action = finished ? 'serve' : step.action;
    const A = C3 ? C3.ACTIONS[action] : { icon: '🍳', label: '' };
    document.getElementById('actLabel').textContent = `${A.icon} ${finished ? 'Hoàn thành' : A.label}`;
    const kinds = C3 ? (finished ? C3.detectKinds(r.title, 3) : C3.stepKinds(step, r)) : [];
    if (stage) stage.show(action, kinds.length ? kinds : ['pork']);
    const fb = document.getElementById('fbIcon'); if (fb) fb.textContent = A.icon;

    document.getElementById('prog').style.width = (Math.min(n, total) / total * 100) + '%';
    document.getElementById('dots').innerHTML = r.steps.map((s, i) =>
      `<button type="button" role="tab" class="dot ${i + 1 === n ? 'cur' : i + 1 < n ? 'done' : ''}" aria-selected="${i + 1 === n}" aria-label="Bước ${i + 1}: ${esc(s.title)}" data-go="${i + 1}">${i + 1 < n ? '✓' : i + 1}</button>`).join('');
    document.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => go(r, +b.dataset.go)));

    const body = document.getElementById('cbody');
    if (finished) {
      body.innerHTML = `<div class="done-box">${r.image ? `<img class="dphoto" src="${esc(r.image)}" alt="Ảnh minh họa món ${esc(r.title)}" onerror="this.remove()">` : '<div class="big">🎉</div>'}<h2>Xong rồi, mời cả nhà ăn cơm!</h2>
        <p>Bạn đã hoàn thành <b>${esc(r.title)}</b>.</p>
        ${r.tips.length ? `<p class="note" style="text-align:left">💡 ${md(r.tips[0])}</p>` : ''}</div>`;
    } else {
      body.innerHTML = `<div class="num">Bước ${n} / ${total}</div>
        <h2>${esc(step.title || 'Bước ' + n)}</h2>
        ${step.minutes ? `<div class="timer" id="timer"><span aria-hidden="true">⏲️</span><span class="t" id="tval">${mmss(step.minutes * 60)}</span>
          <button class="btn primary" id="tbtn" type="button">Bắt đầu hẹn giờ ${step.minutes} phút</button>
          <button class="btn" id="treset" type="button" hidden>Đặt lại</button></div>` : ''}
        ${step.text ? `<p>${md(step.text)}</p>` : ''}
        ${step.subs && step.subs.length ? `<ul>${step.subs.map(s => `<li>${md(s)}</li>`).join('')}</ul>` : ''}
        ${step.after ? `<p>${md(step.after)}</p>` : ''}`;
      if (step.minutes) bindTimer(step.minutes * 60);
    }
    body.scrollTop = 0;
    const prev = document.getElementById('prevBtn'), next = document.getElementById('nextBtn');
    prev.disabled = n <= 1;
    if (finished) { next.textContent = '↺ Về trang món'; }
    else next.textContent = n === total ? 'Hoàn thành ✓' : 'Tiếp →';
  }

  function cur() { const s = main.querySelector('.cook'); return s ? +s.dataset.step : 1; }
  function go(r, n) {
    if (n > r.steps.length + 1) { location.hash = '#mon-' + r.id; return; }
    if (n < 1) return;
    location.hash = `#nau-${n}-${r.id}`;
  }

  function bindTimer(total) {
    let left = total;
    const box = document.getElementById('timer'), val = document.getElementById('tval');
    const btn = document.getElementById('tbtn'), reset = document.getElementById('treset');
    const paint = () => { val.textContent = mmss(left); };
    btn.addEventListener('click', () => {
      if (timer) { stopTimer(); btn.textContent = 'Tiếp tục'; return; }
      if (left <= 0) left = total;
      box.classList.remove('ring'); reset.hidden = false; btn.textContent = 'Tạm dừng';
      timer = { id: setInterval(() => {
        left -= 1; paint();
        if (left <= 0) { stopTimer(); box.classList.add('ring'); btn.textContent = 'Chạy lại'; beep(); toast('⏰ Hết giờ! Chuyển sang bước tiếp theo nhé.'); }
      }, 1000) };
    });
    reset.addEventListener('click', () => { stopTimer(); left = total; paint(); box.classList.remove('ring'); btn.textContent = 'Bắt đầu hẹn giờ'; reset.hidden = true; });
  }

  function bindSwipe(el, r) {
    let sx = 0, sy = 0, t0 = 0;
    el.addEventListener('touchstart', e => { const p = e.touches[0]; sx = p.clientX; sy = p.clientY; t0 = Date.now(); }, { passive: true });
    el.addEventListener('touchend', e => {
      const p = e.changedTouches[0]; const dx = p.clientX - sx, dy = p.clientY - sy;
      if (Date.now() - t0 < 600 && Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(r, cur() + (dx < 0 ? 1 : -1));
    }, { passive: true });
  }

  /* ---------- Điều hướng ---------- */
  function route() {
    // #mon-<id> = trang món, #nau-<bước>-<id> = chế độ nấu
    const h = decodeURIComponent(location.hash.replace(/^#/, ''));
    let m = h.match(/^nau-(\d+)-(.+)$/);
    if (m && byId(m[2])) { renderCook(byId(m[2]), parseInt(m[1], 10) || 1); return; }
    m = h.match(/^mon-(.+)$/);
    if (m && byId(m[1])) { leaveCook(); renderDetail(byId(m[1])); window.scrollTo(0, 0); return; }
    leaveCook(); renderHome();
  }

  /* ---------- Sự kiện chung ---------- */
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-fav]');
    if (f) {
      e.preventDefault(); e.stopPropagation();
      const id = f.dataset.fav;
      favs.has(id) ? favs.delete(id) : favs.add(id);
      store.set('favs', [...favs]);
      toast(favs.has(id) ? 'Đã thêm vào yêu thích' : 'Đã bỏ khỏi yêu thích');
      const r = byId(id);
      if (location.hash.startsWith('#mon-')) renderDetail(r); else renderHome();
      return;
    }
    const c = e.target.closest('[data-filter]');
    if (c) {
      state.filter = c.dataset.filter; store.set('filter', state.filter);
      document.querySelectorAll('[data-filter]').forEach(b => b.setAttribute('aria-pressed', b === c));
      renderGrid();
    }
  });

  $q.addEventListener('input', () => {
    state.query = $q.value;
    if (!document.getElementById('grid')) { location.hash = '#'; return; }
    renderGrid();
  });

  document.addEventListener('keydown', e => {
    const s = main.querySelector('.cook');
    if (!s || /input|textarea/i.test(e.target.tagName)) return;
    const r = byId(s.dataset.id);
    if (e.key === 'ArrowRight') go(r, cur() + 1);
    if (e.key === 'ArrowLeft') go(r, cur() - 1);
    if (e.key === 'Escape') location.hash = '#mon-' + r.id;
  });

  document.addEventListener('visibilitychange', () => {
    if (!stage) return;
    if (document.hidden) stage.stop(); else { stage.start(); keepAwake(true); }
  });

  // Giao diện sáng/tối
  const theme = store.get('theme', null);
  if (theme) document.documentElement.dataset.theme = theme;
  document.getElementById('themeBtn').addEventListener('click', () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', document.documentElement.dataset.theme);
    if (stage) stage._theme();
  });

  // Liên kết "bỏ qua" chỉ chuyển tiêu điểm, không đổi hash (hash dùng cho điều hướng).
  document.querySelector('.skip').addEventListener('click', e => { e.preventDefault(); main.focus(); });

  window.addEventListener('hashchange', route);
  route();
})();
