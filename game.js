/* Cloud9 Flick Shot — 60-second aim trainer.
 * Vanilla JS + Canvas. No third-party assets, no build step.
 * Flow: menu -> countdown -> 60s play -> score screen -> local top-10 -> Play Again.
 */
(function () {
  'use strict';

  var GAME_DURATION = 60; // seconds
  var LB_KEY = 'c9fs_leaderboard_v1';
  var LB_MAX = 10;

  var canvas = document.getElementById('game');
  var ctx = canvas.getContext('2d');
  var hud = document.getElementById('hud');
  var hudScore = document.getElementById('hudScore');
  var hudTime = document.getElementById('hudTime');
  var hudCombo = document.getElementById('hudCombo');
  var hudHits = document.getElementById('hudHits');
  var menuEl = document.getElementById('menu');
  var countdownEl = document.getElementById('countdown');
  var countNum = document.getElementById('countNum');
  var scoreEl = document.getElementById('scoreScreen');
  var startBtn = document.getElementById('startBtn');
  var againBtn = document.getElementById('againBtn');
  var menuBtn = document.getElementById('menuBtn');
  var saveBtn = document.getElementById('saveBtn');
  var nameInput = document.getElementById('nameInput');
  var saveMsg = document.getElementById('saveMsg');
  var soundBtn = document.getElementById('soundBtn');
  var menuBoard = document.getElementById('menuBoard');
  var scoreBoard = document.getElementById('scoreBoard');

  var W = 0, H = 0, DPR = 1;
  var state = 'menu'; // menu | countdown | playing | score
  var targets = [];
  var particles = [];
  var floaters = [];
  var score = 0, hits = 0, misses = 0, combo = 0, bestStreak = 0;
  var timeLeft = GAME_DURATION;
  var lastTs = 0, elapsed = 0, spawnAcc = 0;
  var rafId = 0;
  var soundOn = true;
  var audioCtx = null;
  var savedThisRound = false;
  var dots = [];

  // ---------- audio (WebAudio blips, no files) ----------
  function beep(freq, dur, type, vol) {
    if (!soundOn) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      var o = audioCtx.createOscillator();
      var g = audioCtx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.12, audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) { /* audio is optional */ }
  }
  function sfxHit() { beep(880, 0.08, 'sine', 0.14); beep(1320, 0.06, 'sine', 0.07); }
  function sfxMiss() { beep(160, 0.12, 'triangle', 0.10); }
  function sfxCount() { beep(520, 0.09, 'sine', 0.12); }
  function sfxGo() { beep(1040, 0.18, 'sine', 0.14); }
  function sfxEnd() { beep(660, 0.12, 'sine', 0.12); setTimeout(function () { beep(880, 0.2, 'sine', 0.12); }, 130); }

  soundBtn.addEventListener('click', function () {
    soundOn = !soundOn;
    soundBtn.textContent = soundOn ? 'SOUND: ON' : 'SOUND: OFF';
  });

  // ---------- sizing ----------
  function resize() {
    var wrap = document.getElementById('arena-wrap');
    var rect = wrap.getBoundingClientRect();
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = rect.width; H = rect.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildDots();
  }
  function buildDots() {
    dots = [];
    var step = 46;
    for (var x = step / 2; x < W; x += step) {
      for (var y = step / 2; y < H; y += step) {
        dots.push({ x: x, y: y, r: 1 + Math.random() * 1.2, a: 0.05 + Math.random() * 0.09 });
      }
    }
  }
  window.addEventListener('resize', resize);

  // ---------- leaderboard (localStorage, top 10) ----------
  function loadBoard() {
    try {
      var raw = localStorage.getItem(LB_KEY);
      var arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function saveBoard(arr) {
    try { localStorage.setItem(LB_KEY, JSON.stringify(arr)); } catch (e) { /* private mode */ }
  }
  function renderBoard(listEl) {
    var board = loadBoard();
    listEl.innerHTML = '';
    if (!board.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No scores yet — be the first.';
      listEl.appendChild(li);
      return;
    }
    board.forEach(function (entry, i) {
      var li = document.createElement('li');
      if (i === 0) li.className = 'top1';
      var rank = document.createElement('span'); rank.className = 'rank'; rank.textContent = (i + 1) + '.';
      var who = document.createElement('span'); who.className = 'who'; who.textContent = entry.name + '  ·  ' + entry.acc + '% acc';
      var pts = document.createElement('span'); pts.className = 'pts'; pts.textContent = entry.score;
      li.appendChild(rank); li.appendChild(who); li.appendChild(pts);
      listEl.appendChild(li);
    });
  }
  function renderBoards() { renderBoard(menuBoard); renderBoard(scoreBoard); }

  // ---------- targets ----------
  function difficulty() {
    // 0 at start -> 1 at the end of the round
    return 1 - timeLeft / GAME_DURATION;
  }
  function spawnTarget() {
    var d = difficulty();
    var margin = 64;
    var top = 84; // keep clear of the HUD
    var x = margin + Math.random() * Math.max(40, W - margin * 2);
    var y = top + Math.random() * Math.max(40, H - top - 50);
    var baseR = 26 + Math.random() * 26; // 26–52 px
    var life = 1150 - d * 380; // faster despawn late in the round
    targets.push({ x: x, y: y, r: baseR, born: performance.now(), life: life });
  }
  function spawnTick(dt) {
    var d = difficulty();
    var interval = 720 - d * 300; // 720ms -> 420ms
    spawnAcc += dt * 1000;
    if (spawnAcc >= interval) {
      spawnAcc = 0;
      if (targets.length < 3) spawnTarget();
    }
  }

  function burst(x, y, color) {
    for (var i = 0; i < 12; i++) {
      var a = Math.random() * Math.PI * 2;
      var sp = 90 + Math.random() * 190;
      particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.45 + Math.random() * 0.25, t: 0, color: color, r: 2 + Math.random() * 3 });
    }
  }
  function ringMiss(x, y) {
    particles.push({ x: x, y: y, vx: 0, vy: 0, life: 0.3, t: 0, color: '#ff5d73', r: 14, ring: true });
  }

  // ---------- game flow ----------
  function showOnly(el) {
    [menuEl, countdownEl, scoreEl].forEach(function (o) { o.classList.add('hidden'); });
    if (el) el.classList.remove('hidden');
    hud.classList.toggle('hidden', state !== 'playing');
  }

  function resetRound() {
    targets = []; particles = []; floaters = [];
    score = 0; hits = 0; misses = 0; combo = 0; bestStreak = 0;
    timeLeft = GAME_DURATION; elapsed = 0; spawnAcc = 0;
    savedThisRound = false;
    saveBtn.disabled = false;
    saveMsg.classList.add('hidden');
    updateHud();
  }

  function startCountdown() {
    resetRound();
    state = 'countdown';
    showOnly(countdownEl);
    var steps = ['3', '2', '1', 'GO!'];
    var i = 0;
    countNum.textContent = steps[0];
    sfxCount();
    var tick = setInterval(function () {
      i++;
      if (i >= steps.length) {
        clearInterval(tick);
        startPlay();
        return;
      }
      countNum.textContent = steps[i];
      if (steps[i] === 'GO!') { sfxGo(); } else { sfxCount(); }
    }, 650);
  }

  function startPlay() {
    state = 'playing';
    showOnly(null);
    lastTs = performance.now();
    spawnTarget();
  }

  function endRound() {
    state = 'score';
    targets = [];
    sfxEnd();
    document.getElementById('finalScore').textContent = score;
    var total = hits + misses;
    var acc = total ? Math.round((hits / total) * 100) : 0;
    document.getElementById('statAcc').textContent = acc + '%';
    document.getElementById('statHits').textContent = hits;
    document.getElementById('statMiss').textContent = misses;
    document.getElementById('statStreak').textContent = bestStreak;
    renderBoards();
    showOnly(scoreEl);
  }

  function updateHud() {
    hudScore.textContent = score;
    hudTime.textContent = Math.ceil(timeLeft);
    hudTime.classList.toggle('danger', timeLeft <= 10);
    hudCombo.textContent = 'x' + (1 + Math.min(combo, 20) * 0.1).toFixed(1);
    hudHits.textContent = hits;
  }

  // ---------- input ----------
  function canvasPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener('pointerdown', function (e) {
    if (state !== 'playing') return;
    e.preventDefault();
    var p = canvasPos(e);
    var now = performance.now();
    // topmost target first
    for (var i = targets.length - 1; i >= 0; i--) {
      var t = targets[i];
      var age = now - t.born;
      var scale = age < 120 ? age / 120 : (age > t.life - 220 ? Math.max(0.35, (t.life - age) / 220) : 1);
      var rr = t.r * scale;
      var dx = p.x - t.x, dy = p.y - t.y;
      if (dx * dx + dy * dy <= rr * rr) {
        targets.splice(i, 1);
        hits++;
        combo++;
        if (combo > bestStreak) bestStreak = combo;
        var gained = 100 + Math.min(combo, 20) * 10;
        score += gained;
        burst(t.x, t.y, '#6ea8ff');
        floaters.push({ x: t.x, y: t.y - t.r, text: '+' + gained, t: 0, life: 0.8 });
        sfxHit();
        updateHud();
        return;
      }
    }
    // miss: clicked empty arena
    misses++;
    combo = 0;
    ringMiss(p.x, p.y);
    sfxMiss();
    updateHud();
  });
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  startBtn.addEventListener('click', startCountdown);
  againBtn.addEventListener('click', startCountdown);
  menuBtn.addEventListener('click', function () {
    state = 'menu';
    renderBoards();
    showOnly(menuEl);
  });
  saveBtn.addEventListener('click', function () {
    if (savedThisRound || state !== 'score') return;
    var name = (nameInput.value || 'ACE').trim().toUpperCase().slice(0, 10) || 'ACE';
    var total = hits + misses;
    var acc = total ? Math.round((hits / total) * 100) : 0;
    var board = loadBoard();
    board.push({ name: name, score: score, acc: acc, date: new Date().toISOString().slice(0, 10) });
    board.sort(function (a, b) { return b.score - a.score; });
    board = board.slice(0, LB_MAX);
    saveBoard(board);
    savedThisRound = true;
    saveBtn.disabled = true;
    saveMsg.classList.remove('hidden');
    renderBoards();
  });

  // ---------- render loop ----------
  function drawBackground(now) {
    var g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#0a1a3f');
    g.addColorStop(1, '#04081a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    // faint dot grid, gently twinkling
    for (var i = 0; i < dots.length; i++) {
      var d = dots[i];
      ctx.globalAlpha = d.a * (0.7 + 0.3 * Math.sin(now / 900 + i));
      ctx.fillStyle = '#6ea8ff';
      ctx.beginPath();
      ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTarget(t, now) {
    var age = now - t.born;
    var scale = age < 120 ? age / 120 : (age > t.life - 220 ? Math.max(0.35, (t.life - age) / 220) : 1);
    var r = t.r * scale;
    if (r <= 1) return;
    // glow
    var glow = ctx.createRadialGradient(t.x, t.y, r * 0.2, t.x, t.y, r * 2.1);
    glow.addColorStop(0, 'rgba(110,168,255,0.55)');
    glow.addColorStop(1, 'rgba(110,168,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(t.x, t.y, r * 2.1, 0, Math.PI * 2); ctx.fill();
    // body
    var body = ctx.createRadialGradient(t.x - r * 0.3, t.y - r * 0.3, r * 0.1, t.x, t.y, r);
    body.addColorStop(0, '#bcd8ff');
    body.addColorStop(0.55, '#2f7bff');
    body.addColorStop(1, '#1748b5');
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(t.x, t.y, r, 0, Math.PI * 2); ctx.fill();
    // ring + core
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(t.x, t.y, r * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(3, r * 0.2), 0, Math.PI * 2); ctx.fill();
  }

  function loop(ts) {
    rafId = requestAnimationFrame(loop);
    var dt = lastTs ? (ts - lastTs) / 1000 : 0.016;
    lastTs = ts;
    if (dt > 0.05) dt = 0.05;

    drawBackground(ts);

    if (state === 'playing') {
      elapsed += dt;
      timeLeft = Math.max(0, GAME_DURATION - elapsed);
      spawnTick(dt);
      var now = performance.now();
      // expire old targets
      for (var i = targets.length - 1; i >= 0; i--) {
        if (now - targets[i].born > targets[i].life) targets.splice(i, 1);
      }
      updateHud();
      if (timeLeft <= 0) { endRound(); }
    }

    for (var j = 0; j < targets.length; j++) drawTarget(targets[j], performance.now());

    // particles
    for (var k = particles.length - 1; k >= 0; k--) {
      var p = particles[k];
      p.t += dt;
      if (p.t >= p.life) { particles.splice(k, 1); continue; }
      var a = 1 - p.t / p.life;
      if (p.ring) {
        ctx.globalAlpha = a;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + p.t * 90, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = 1;
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * a + 0.5, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // floating score text
    ctx.font = '800 20px "Segoe UI", system-ui, sans-serif';
    ctx.textAlign = 'center';
    for (var f = floaters.length - 1; f >= 0; f--) {
      var fl = floaters[f];
      fl.t += dt;
      if (fl.t >= fl.life) { floaters.splice(f, 1); continue; }
      ctx.globalAlpha = 1 - fl.t / fl.life;
      ctx.fillStyle = '#ffd75e';
      ctx.fillText(fl.text, fl.x, fl.y - fl.t * 46);
      ctx.globalAlpha = 1;
    }
  }

  // ---------- init ----------
  resize();
  renderBoards();
  showOnly(menuEl);
  requestAnimationFrame(loop);
})();
