/* Boxi Math interactive pages — shared runtime. No network, no dependencies.
 *
 * Page skeleton (see 14-cone-volume.html):
 *   <link rel="stylesheet" href="play.css"> <script src="play.js"></script>
 *   elements with data-t="key" get their text from the dictionary given to Play.i18n.
 *
 * API
 *   Play.lang                      "en" | "zh"  (from ?lang=, default en)
 *   Play.t({en, zh})               pick the current language
 *   Play.i18n(dict)                dict = {key: {en, zh}}; fills [data-t] (textContent) and [data-th] (innerHTML);
 *                                  also sets <html lang>, document.title from dict.title, and the language link.
 *   Play.steps(nav, n => ...)      wires .steps buttons (data-step="1".."n"); calls back on change; returns {set, get}
 *   Play.canvas(el, draw)          HiDPI canvas; draw(ctx, w, h) is called on resize/theme change and on .redraw();
 *                                  returns {ctx, el, w, h, redraw()}
 *   Play.drag(el, {down(x,y,e)->truthy, move(x,y,dx,dy,e), up(e)})  pointer + touch; coords in CSS px of el
 *   Play.keys(el, {ArrowLeft: fn, ...})  key handler on a focusable element
 *   Play.color(name)               resolved CSS colour, e.g. Play.color('--a'); Play.rgba(color, alpha)
 *   Play.onTheme(fn)               called when light/dark changes
 *   Play.loop(fn)                  rAF loop, fn(dt seconds); pauses when the tab is hidden
 *   Play.reduced                   prefers-reduced-motion
 *   Play.fmt(x, digits)            number for display (trims zeros, real minus sign)
 *   Play.text(ctx, s, x, y, opt)   label with a halo; opt = {color, size, italic, align, base, font, weight, halo=true}
 *   new Play.View3D(canvas, {yaw, pitch, zoom, onChange})   orbit view (drag = rotate, pinch or Ctrl/⌘+wheel = zoom,
 *                                  double-click = reset, arrows / + - / 0 on focus). Methods:
 *       .fit(points)  .project(p) -> [x, y, depth]  .reset()  .manual (true once the user moved it)
 *       .solid(mesh)  mesh = {pts:[[x,y,z]...], faces:[[i,j,k,...]...], color, alpha=1, smooth:Set(faceIdx)}
 *                     returns a drawable; Play.View3D.draw(view, [drawables]) depth-sorts faces then edges
 *                     (solid = visible edge, dashed = hidden edge; smooth faces only show silhouettes)
 *       .line(a, b, color, width, dash)  .poly(points, fill, stroke, width, dash)  .label(p, text, opt)
 *   Play.mesh.box(x0,y0,z0,x1,y1,z1)  Play.mesh.pyramid(basePts, apex)  Play.mesh.cone(c, r, h, n)  Play.mesh.cylinder(c, r, h, n)
 *   Play.v  small vector helpers: add, sub, mul, dot, cross, norm, unit, avg, lerp
 *   Play.clamp(x, a, b)
 *   Play.rrect(ctx, x, y, w, h, r)   beginPath + rounded-rectangle path (plain rect where roundRect is missing)
 *   Play.dot(ctx, x, y, r, fill, stroke, lw = 2)   filled / stroked circle (either colour may be null)
 *   Play.fitHeight(canvasEl, h)    set the element's CSS height to round(h) px; true if it changed (the canvas
 *                                  ResizeObserver then redraws, so a draw function can just return)
 *   Play.rowLabels(ctx, list, y0, size, w, step = -24)   number-line labels: each {x, s, c, bg?} centred on x
 *                                  (kept inside 0..w) at height y0; one overlapping an earlier label in its row moves
 *                                  a row further (y0 + row * step). bg = rounded chip, no halo. Returns [{x, w, row}]
 *   Play.pyRandom(seed)            () -> float in [0, 1), bit for bit Python's random.Random(seed).random()
 *                                  (integer seed >= 0), so pages can replay the videos' random runs
 *   Play.labels(opt)               labels that avoid each other; returns L (state lives in L, one per canvas):
 *       L.reset(w, h, ...boxes)    start a frame: canvas size in CSS px, boxes already taken (e.g. [0, 0, w, 30])
 *       L.place(ctx, s, cands, o)  draw s at the first candidate [x, y, align?] whose box is inside the canvas
 *                                  (pad px margin) and hits nothing; o = Play.text options + size (15) + optional.
 *                                  Nothing free: optional -> skip and return false; otherwise opt.fallback picks:
 *                                  "first" (default) cands[0] · "inside" first candidate inside the canvas ·
 *                                  "fewest" the one hitting the fewest boxes (a soft box counts 1/10; outside the
 *                                  canvas costs opt.outCost, default Infinity = never), ties to the earliest;
 *                                  if that finds none, opt.last(cands, L) or cands[0]. Returns true when drawn.
 *       L.reserve(x, y, r)  L.reserveSeg(p, q, r = opt.segR ?? 4, step = opt.segStep ?? 8)   keep labels off a
 *                                  point / a segment (boxes every `step` px)
 *       L.around(p, side, below, d = 14)   six spots round point p, side (+1 right / -1 left) and below first;
 *                                  opt.wide adds four farther ones
 *       L.boxOf(ctx, s, x, y, size, align) -> [l, t, r, b]   L.hit(a, b)   L.inside(b)   L.free(b)
 *       L.boxes / L.soft           taken boxes (arrays; push to them). Soft boxes (e.g. axes) only count 1/10 in
 *                                  "fewest". L.W / L.H canvas size.
 *       opt = {pad = 2, fallback, outCost, last, slide (first slide each candidate sideways back inside),
 *              segR, segStep, wide, sym (centred box edges computed as x ± w/2 rather than left + w: the
 *              last bit of rounding differs, kept so older pages lay out exactly as before)}
 *
 * Embedding: with ?embed=1 the page hides its own title/footer and posts its height to the parent
 * ({type: "play-height", h}) so the iframe can size itself.
 */
(function () {
  "use strict";
  const qs = new URLSearchParams(location.search);
  const lang = qs.get("lang") === "zh" ? "zh" : "en";
  const embed = qs.get("embed") === "1";
  const reduced = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

  const v = {
    add: (a, b) => a.map((x, i) => x + b[i]),
    sub: (a, b) => a.map((x, i) => x - b[i]),
    mul: (a, t) => a.map((x) => x * t),
    dot: (a, b) => a.reduce((s, x, i) => s + x * b[i], 0),
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: (a) => Math.hypot(...a),
    unit: (a) => { const n = Math.hypot(...a) || 1; return a.map((x) => x / n); },
    avg: (ps) => ps.reduce((s, p) => s.map((x, i) => x + p[i]), ps[0].map(() => 0)).map((x) => x / ps.length),
    lerp: (a, b, t) => a.map((x, i) => x + (b[i] - x) * t),
  };

  const t = (o) => (o == null ? "" : typeof o === "string" ? o : o[lang] ?? o.en ?? "");

  let dict = {};
  function i18n(d) {
    dict = d;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    if (d.title) document.title = t(d.title) + " · Boxi Math";
    document.querySelectorAll("[data-t]").forEach((el) => { el.textContent = t(d[el.dataset.t]); });
    document.querySelectorAll("[data-th]").forEach((el) => { el.innerHTML = t(d[el.dataset.th]); });
    document.querySelectorAll("a.langlink").forEach((a) => {
      const q = new URLSearchParams(location.search); q.set("lang", lang === "zh" ? "en" : "zh");
      a.href = "?" + q.toString(); a.textContent = lang === "zh" ? "English" : "中文";
    });
    postHeight();
  }

  function steps(nav, cb) {
    const btns = [...nav.querySelectorAll("[data-step]")];
    let cur = 0;
    function set(n) {
      cur = n;
      btns.forEach((b) => { const on = +b.dataset.step === n; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
      document.body.dataset.step = n;
      cb(n);
      postHeight();
    }
    btns.forEach((b) => b.addEventListener("click", () => set(+b.dataset.step)));
    return { set, get: () => cur };
  }

  // colours
  const probe = document.createElement("span");
  const cache = new Map();
  function color(name) {
    if (cache.has(name)) return cache.get(name);
    if (!probe.isConnected) { probe.style.display = "none"; document.body.appendChild(probe); }
    probe.style.color = `var(${name})`;
    const c = getComputedStyle(probe).color;
    cache.set(name, c);
    return c;
  }
  function rgba(c, a) {
    const m = c.match(/[\d.]+/g);
    if (!m) return c;
    return `rgba(${m[0]},${m[1]},${m[2]},${a})`;
  }
  const themeFns = [];
  function onTheme(fn) { themeFns.push(fn); }
  if (window.matchMedia) {
    const mq = matchMedia("(prefers-color-scheme: dark)");
    const fire = () => { cache.clear(); themeFns.forEach((f) => f()); };
    mq.addEventListener ? mq.addEventListener("change", fire) : mq.addListener(fire);
  }

  function canvas(el, draw) {
    const ctx = el.getContext("2d");
    const o = { el, ctx, w: 0, h: 0, dpr: 1, redraw };
    function size() {
      const r = el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (r.width !== o.w || r.height !== o.h || dpr !== o.dpr) {
        o.w = r.width; o.h = r.height; o.dpr = dpr;
        el.width = Math.round(r.width * dpr); el.height = Math.round(r.height * dpr);
      }
    }
    function redraw() {
      size();
      if (o.w < 2 || o.h < 2) return;
      ctx.setTransform(o.dpr, 0, 0, o.dpr, 0, 0);
      ctx.clearRect(0, 0, o.w, o.h);
      draw(ctx, o.w, o.h);
    }
    if (window.ResizeObserver) new ResizeObserver(redraw).observe(el);
    onTheme(redraw);
    requestAnimationFrame(redraw);
    return o;
  }

  function drag(el, h) {
    let id = null, last = null;
    const pos = (e) => { const r = el.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    el.addEventListener("pointerdown", (e) => {
      const [x, y] = pos(e);
      if (h.down && !h.down(x, y, e)) return;
      id = e.pointerId; last = [x, y];
      el.setPointerCapture(id); el.focus({ preventScroll: true }); e.preventDefault();
    });
    el.addEventListener("pointermove", (e) => {
      if (e.pointerId !== id) { if (h.hover) h.hover(...pos(e), e); return; }
      const [x, y] = pos(e);
      h.move && h.move(x, y, x - last[0], y - last[1], e); last = [x, y]; e.preventDefault();
    });
    const up = (e) => { if (e.pointerId !== id) return; id = null; h.up && h.up(e); };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
  }

  function keys(el, map) {
    if (!el.hasAttribute("tabindex")) el.tabIndex = 0;
    el.addEventListener("keydown", (e) => { const f = map[e.key]; if (f) { e.preventDefault(); f(e); } });
  }

  function loop(fn) {
    let last = performance.now();
    function tick(now) {
      const dt = Math.min((now - last) / 1000, 0.05); last = now;
      fn(dt);
      requestAnimationFrame(tick);
    }
    document.addEventListener("visibilitychange", () => { last = performance.now(); });
    requestAnimationFrame(tick);
  }

  function fmt(x, d = 2) {
    if (!isFinite(x)) return "—";
    let s = (+x.toFixed(d)).toString();
    if (s === "-0") s = "0";
    return s.replace("-", "−");
  }

  function text(ctx, s, x, y, o = {}) {
    const size = o.size || 15;
    ctx.font = `${o.italic ? "italic " : ""}${o.weight || 500} ${size}px ${o.font || (o.italic ? '"Cambria Math","Times New Roman",serif' : "Inter, system-ui, sans-serif")}`;
    ctx.textAlign = o.align || "center"; ctx.textBaseline = o.base || "middle";
    if (o.halo !== false) { ctx.lineJoin = "round"; ctx.lineWidth = 4; ctx.strokeStyle = rgba(color("--surface"), 0.92); ctx.strokeText(s, x, y); }
    ctx.fillStyle = o.color || color("--fg");
    ctx.fillText(s, x, y);
  }

  // ---------- 3D ----------
  class View3D {
    constructor(el, o = {}) {
      this.el = el; this.ctx = el.getContext("2d"); this.o = o;
      this.home = [o.yaw ?? -0.55, o.pitch ?? 0.42, o.zoom ?? 1];
      [this.yaw, this.pitch, this.zoom] = this.home;
      this.manual = false; this.w = 0; this.h = 0; this.cx = 0; this.cy = 0; this.scale = 1;
      this.pointers = new Map(); this.followers = [];
      this.bind();
    }
    reset() { [this.yaw, this.pitch, this.zoom] = this.home; this.manual = false; this.changed(); }
    set(yaw, pitch, zoom = 1) { this.yaw = yaw; this.pitch = pitch; this.zoom = zoom; this.manual = true; this.changed(); }
    changed() { this.followers.forEach((f) => { f.yaw = this.yaw; f.pitch = this.pitch; f.zoom = this.zoom; f.manual = this.manual; }); this.o.onChange && this.o.onChange(this); }
    // z is up. Returns [screen-x, screen-y-down, depth toward viewer]
    raw(p) {
      const c = Math.cos(this.yaw), s = Math.sin(this.yaw), cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
      const x = c * p[0] - s * p[1], y = s * p[0] + c * p[1];
      return [x, sp * y - cp * p[2], cp * y + sp * p[2]];
    }
    size() {
      const r = this.el.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
      if (r.width !== this.w || r.height !== this.h || dpr !== this.dpr) {
        this.w = r.width; this.h = r.height; this.dpr = dpr;
        this.el.width = Math.round(r.width * dpr); this.el.height = Math.round(r.height * dpr);
      }
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.ctx.clearRect(0, 0, this.w, this.h);
      return this.w > 2 && this.h > 2;
    }
    fit(pts, pad = 34) {
      const q = pts.map((p) => this.raw(p)), xs = q.map((p) => p[0]), ys = q.map((p) => p[1]);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      this.cx = (x0 + x1) / 2; this.cy = (y0 + y1) / 2;
      this.scale = Math.min((this.w - 2 * pad) / Math.max(0.5, x1 - x0), (this.h - 2 * pad) / Math.max(0.5, y1 - y0)) * this.zoom;
    }
    project(p) { const q = this.raw(p); return [this.w / 2 + (q[0] - this.cx) * this.scale, this.h / 2 + (q[1] - this.cy) * this.scale, q[2]]; }
    line(a, b, c, w = 1.5, dash = []) {
      const x = this.ctx, p = this.project(a), q = this.project(b);
      x.beginPath(); x.moveTo(p[0], p[1]); x.lineTo(q[0], q[1]);
      x.strokeStyle = c; x.lineWidth = w; x.setLineDash(dash); x.stroke(); x.setLineDash([]);
    }
    poly(pts, fill, stroke, w = 1.5, dash = []) {
      const x = this.ctx; x.beginPath();
      pts.forEach((p, i) => { const q = this.project(p); i ? x.lineTo(q[0], q[1]) : x.moveTo(q[0], q[1]); });
      x.closePath();
      if (fill) { x.fillStyle = fill; x.fill(); }
      if (stroke) { x.strokeStyle = stroke; x.lineWidth = w; x.setLineDash(dash); x.stroke(); x.setLineDash([]); }
    }
    label(p, s, o = {}) { const q = this.project(p); text(this.ctx, s, q[0] + (o.dx || 0), q[1] + (o.dy || 0), o); }
    solid(m) {
      const pts = m.pts, center = v.avg(pts), alpha = m.alpha ?? 1;
      const faces = m.faces.map((f, k) => {
        const P = f.map((i) => pts[i]), fc = v.avg(P);
        let n = v.cross(v.sub(P[1], P[0]), v.sub(P[2], P[0]));
        if (v.norm(n) < 1e-9 && P.length > 3) n = v.cross(v.sub(P[2], P[0]), v.sub(P[3], P[0]));
        if (v.dot(n, v.sub(fc, center)) < 0) n = v.mul(n, -1);
        return { f, P, front: this.raw(v.unit(n))[2] > 1e-6, depth: this.raw(fc)[2], smooth: !!(m.smooth && m.smooth.has(k)), m };
      });
      const edges = new Map();
      faces.forEach((F) => F.f.forEach((a, i) => {
        const b = F.f[(i + 1) % F.f.length], key = a < b ? a + "," + b : b + "," + a;
        if (!edges.has(key)) edges.set(key, { a, b, faces: [] });
        edges.get(key).faces.push(F);
      }));
      return { m, pts, faces, edges: [...edges.values()], alpha, depth: this.raw(center)[2] };
    }
    bind() {
      const c = this.el;
      if (!c.hasAttribute("tabindex")) c.tabIndex = 0;
      c.addEventListener("pointerdown", (e) => {
        if (this.o.grab && this.o.grab(e)) return;
        c.setPointerCapture(e.pointerId); this.pointers.set(e.pointerId, [e.clientX, e.clientY]); this.pinch = null;
        this.manual = true; e.preventDefault();
      });
      c.addEventListener("pointermove", (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        const old = this.pointers.get(e.pointerId); this.pointers.set(e.pointerId, [e.clientX, e.clientY]);
        if (this.pointers.size === 1) {
          this.yaw += (e.clientX - old[0]) * 0.009; this.pitch = clamp(this.pitch + (e.clientY - old[1]) * 0.008, -1.45, 1.45);
        } else {
          const ps = [...this.pointers.values()], d = Math.hypot(ps[0][0] - ps[1][0], ps[0][1] - ps[1][1]);
          if (this.pinch) this.zoom = clamp(this.zoom * d / this.pinch, 0.5, 2.5);
          this.pinch = d;
        }
        this.changed(); e.preventDefault();
      });
      const rel = (e) => { this.pointers.delete(e.pointerId); this.pinch = null; };
      c.addEventListener("pointerup", rel); c.addEventListener("pointercancel", rel); c.addEventListener("lostpointercapture", rel);
      // plain wheel scrolls the page (pages are embedded); trackpad pinch and Ctrl/⌘ + wheel zoom
      c.addEventListener("wheel", (e) => { if (!e.ctrlKey && !e.metaKey) return; e.preventDefault(); this.zoom = clamp(this.zoom * Math.exp(-e.deltaY * 0.001), 0.5, 2.5); this.manual = true; this.changed(); }, { passive: false });
      c.addEventListener("dblclick", () => this.reset());
      c.addEventListener("keydown", (e) => {
        const k = e.key, m = { ArrowLeft: () => (this.yaw -= 0.13), ArrowRight: () => (this.yaw += 0.13),
          ArrowUp: () => (this.pitch = clamp(this.pitch + 0.1, -1.45, 1.45)), ArrowDown: () => (this.pitch = clamp(this.pitch - 0.1, -1.45, 1.45)),
          "+": () => (this.zoom = clamp(this.zoom * 1.1, 0.5, 2.5)), "=": () => (this.zoom = clamp(this.zoom * 1.1, 0.5, 2.5)),
          "-": () => (this.zoom = clamp(this.zoom / 1.1, 0.5, 2.5)), 0: () => this.reset() };
        if (!m[k]) return; e.preventDefault(); this.manual = true; m[k](); this.changed();
      });
    }
  }
  // depth-sorted faces of all solids, then edges (back ones dashed first, front ones on top)
  View3D.draw = function (view, solids) {
    const x = view.ctx;
    solids.flatMap((s) => s.faces).sort((a, b) => a.depth - b.depth).forEach((F) => {
      const s = F.m, a = (F.front ? 0.26 : 0.1) * (s.alpha ?? 1) * (s.fill ?? 1);
      view.poly(F.P, rgba(s.color, a));
    });
    const pass = (front) => solids.forEach((s) => s.edges.forEach((E) => {
      const vis = E.faces.some((F) => F.front);
      const sharp = E.faces.some((F) => !F.smooth) || E.faces.length < 2 || E.faces[0].front !== E.faces[1].front;
      if (!sharp || vis !== front) return;
      if (!vis && s.m.hideBack) return;
      const al = s.alpha ?? 1;
      view.line(s.pts[E.a], s.pts[E.b], rgba(s.m.color, (vis ? 0.95 : 0.5) * al), s.m.width || 1.8, vis ? [] : [5, 4]);
    }));
    pass(false); pass(true);
    x.setLineDash([]);
  };

  const mesh = {
    box(x0, y0, z0, x1, y1, z1) {
      return { pts: [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]],
        faces: [[0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]] };
    },
    pyramid(base, apex) {
      const n = base.length, pts = [...base, apex], faces = [base.map((_, i) => i)];
      for (let i = 0; i < n; i++) faces.push([i, (i + 1) % n, n]);
      return { pts, faces };
    },
    cone(c, r, h, n = 48) {
      const pts = [], faces = [[]], smooth = new Set();
      for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n; pts.push([c[0] + r * Math.cos(a), c[1] + r * Math.sin(a), c[2]]); faces[0].push(i); }
      pts.push([c[0], c[1], c[2] + h]);
      for (let i = 0; i < n; i++) { smooth.add(faces.length); faces.push([i, (i + 1) % n, n]); }
      return { pts, faces, smooth };
    },
    cylinder(c, r, h, n = 48) {
      const pts = [], faces = [[], []], smooth = new Set();
      for (let i = 0; i < n; i++) { const a = (2 * Math.PI * i) / n, x = c[0] + r * Math.cos(a), y = c[1] + r * Math.sin(a); pts.push([x, y, c[2]], [x, y, c[2] + h]); faces[0].push(2 * i); faces[1].push(2 * i + 1); }
      for (let i = 0; i < n; i++) { const j = (i + 1) % n; smooth.add(faces.length); faces.push([2 * i, 2 * j, 2 * j + 1, 2 * i + 1]); }
      return { pts, faces, smooth };
    },
  };

  // ---------- small 2D helpers ----------
  function rrect(x, X, Y, w, h, r) { x.beginPath(); x.roundRect ? x.roundRect(X, Y, w, h, r) : x.rect(X, Y, w, h); }
  function dot(x, px, py, r, fill, stroke, lw = 2) {
    x.beginPath(); x.arc(px, py, r, 0, 2 * Math.PI);
    if (fill) { x.fillStyle = fill; x.fill(); }
    if (stroke) { x.strokeStyle = stroke; x.lineWidth = lw; x.stroke(); }
  }
  function fitHeight(el, h) {
    const want = Math.round(h) + "px";
    if (el.style.height !== want) { el.style.height = want; return true; }
    return false;
  }

  // labels centred on o.x at height y0; one that would overlap an earlier one in its row moves a row on (step px)
  function rowLabels(x, list, y0, size, w, step = -24) {
    const placed = [];
    list.forEach((o) => {
      x.font = `750 ${size}px Inter, system-ui, sans-serif`;
      const lw = x.measureText(o.s).width + 10, cx = clamp(o.x, lw / 2 + 4, w - lw / 2 - 4);
      let row = 0;
      while (placed.some((p) => p.row === row && Math.abs(p.x - cx) < (p.w + lw) / 2)) row++;
      placed.push({ x: cx, w: lw, row });
      const y = y0 + row * step;
      if (o.bg) { x.fillStyle = o.bg; rrect(x, cx - lw / 2, y - size * 0.75, lw, size * 1.5, 6); x.fill(); }
      text(x, o.s, cx, y, { size, weight: 750, color: o.c, halo: !o.bg });
    });
    return placed;
  }

  // Python's random.Random(seed).random(): MT19937 seeded with init_by_array([seed]), 53-bit floats
  function pyRandom(seed) {
    const n = 624, m = 397, mt = new Uint32Array(n); let mti;
    const mul = (a, b) => Math.imul(a, b) >>> 0;
    mt[0] = 19650218; for (mti = 1; mti < n; mti++) mt[mti] = (mul(1812433253, mt[mti - 1] ^ (mt[mti - 1] >>> 30)) + mti) >>> 0;
    let i = 1;
    for (let k = n; k; k--) { mt[i] = ((mt[i] ^ mul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1664525)) + (seed >>> 0)) >>> 0; i++; if (i >= n) { mt[0] = mt[n - 1]; i = 1; } }
    for (let k = n - 1; k; k--) { mt[i] = ((mt[i] ^ mul(mt[i - 1] ^ (mt[i - 1] >>> 30), 1566083941)) - i) >>> 0; i++; if (i >= n) { mt[0] = mt[n - 1]; i = 1; } }
    mt[0] = 0x80000000;
    function next() {
      if (mti >= n) {
        for (let k = 0; k < n; k++) { const y = (mt[k] & 0x80000000) | (mt[(k + 1) % n] & 0x7fffffff); mt[k] = mt[(k + m) % n] ^ (y >>> 1) ^ (y & 1 ? 0x9908b0df : 0); }
        mti = 0;
      }
      let y = mt[mti++];
      y ^= y >>> 11; y ^= (y << 7) & 0x9d2c5680; y ^= (y << 15) & 0xefc60000; y ^= y >>> 18;
      return y >>> 0;
    }
    return () => ((next() >>> 5) * 67108864 + (next() >>> 6)) / 9007199254740992;
  }

  // ---------- labels that avoid each other ----------
  function labels(opt = {}) {
    const pad = opt.pad ?? 2, fallback = opt.fallback || "first", outCost = opt.outCost ?? Infinity;
    const boxes = [], soft = [];
    const L = { boxes, soft, W: 0, H: 0 };
    const hit = (a, b) => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];
    function boxOf(x, s, px, py, size, align) {
      x.font = `700 ${size}px Inter, system-ui, sans-serif`;
      const w = x.measureText(s).width + 8, h = size + 6;
      if (opt.sym && align !== "left" && align !== "right") return [px - w / 2, py - h / 2, px + w / 2, py + h / 2];
      const l = align === "left" ? px - 4 : align === "right" ? px - w + 4 : px - w / 2;
      return [l, py - h / 2, l + w, py + h / 2];
    }
    const inside = (b) => b[0] >= pad && b[2] <= L.W - pad && b[1] >= pad && b[3] <= L.H - pad;
    const free = (b) => inside(b) && !boxes.some((a) => hit(a, b)) && !soft.some((a) => hit(a, b));
    function reset(w, h, ...init) { L.W = w; L.H = h; boxes.length = 0; soft.length = 0; boxes.push(...init); }
    const reserve = (px, py, r) => boxes.push([px - r, py - r, px + r, py + r]);
    function reserveSeg(p, q, r = opt.segR ?? 4, step = opt.segStep ?? 8) {
      const n = Math.max(1, Math.ceil(Math.hypot(q[0] - p[0], q[1] - p[1]) / step));
      for (let i = 0; i <= n; i++) reserve(p[0] + (q[0] - p[0]) * i / n, p[1] + (q[1] - p[1]) * i / n, r);
    }
    function place(x, s, cands, o = {}) {
      const size = o.size || 15, bx = (c) => boxOf(x, s, c[0], c[1], size, c[2] || "center");
      if (opt.slide) cands = cands.map((c) => {
        const b = bx(c), dx = b[0] < pad ? pad - b[0] : b[2] > L.W - pad ? L.W - pad - b[2] : 0;
        return dx ? [c[0] + dx, c[1], c[2]] : c;
      });
      let p = cands.find((c) => free(bx(c))) || null;
      if (!p) {
        if (o.optional) return false;
        if (fallback === "inside") p = cands.find((c) => inside(bx(c)));
        else if (fallback === "fewest") {
          let best = Infinity;
          for (const c of cands) {
            const b = bx(c), cost = 10 * boxes.filter((a) => hit(a, b)).length + soft.filter((a) => hit(a, b)).length + (inside(b) ? 0 : 10 * outCost);
            if (cost < best) { best = cost; p = c; }
          }
        }
        p = p || (opt.last ? opt.last(cands, L) : cands[0]);
      }
      boxes.push(bx(p));
      text(x, s, p[0], p[1], { weight: 700, ...o, size, align: p[2] || "center" });
      return true;
    }
    function around(p, side, below, d = 14) {
      const r = [p[0] + d, p[1], "left"], l = [p[0] - d, p[1], "right"];
      const v1 = below ? d + 4 : -(d + 4), v2 = -v1;
      const S = side >= 0 ? [r, l] : [l, r];
      const out = [[S[0][0], S[0][1] + v1, S[0][2]], [S[1][0], S[1][1] + v1, S[1][2]], [p[0], p[1] + v1 + Math.sign(v1) * 4],
        [S[0][0], S[0][1] + v2, S[0][2]], [S[1][0], S[1][1] + v2, S[1][2]], [p[0], p[1] + v2 + Math.sign(v2) * 4]];
      if (opt.wide) out.push([p[0] - d - 8, p[1], "right"], [p[0] + d + 8, p[1], "left"], [p[0], p[1] + 2 * d + 6], [p[0], p[1] - 2 * d - 6]);
      return out;
    }
    return Object.assign(L, { boxOf, hit, inside, free, reset, reserve, reserveSeg, place, around });
  }

  function postHeight() {
    if (!embed || parent === window) return;
    requestAnimationFrame(() => parent.postMessage({ type: "play-height", h: Math.ceil(document.body.getBoundingClientRect().height) + 4 }, "*"));
  }
  if (embed) {
    document.addEventListener("DOMContentLoaded", () => { document.body.classList.add("embed"); postHeight(); });
    document.addEventListener("DOMContentLoaded", () => { if (window.ResizeObserver) new ResizeObserver(postHeight).observe(document.body); });
    document.addEventListener("toggle", postHeight, true);
  }

  window.Play = { lang, embed, reduced, t, i18n, steps, canvas, drag, keys, color, rgba, onTheme, loop, fmt, text, View3D, mesh, v, clamp,
    rrect, dot, fitHeight, pyRandom, labels, rowLabels };
})();
