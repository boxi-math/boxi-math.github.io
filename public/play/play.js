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

  function postHeight() {
    if (!embed || parent === window) return;
    requestAnimationFrame(() => parent.postMessage({ type: "play-height", h: Math.ceil(document.body.getBoundingClientRect().height) + 4 }, "*"));
  }
  if (embed) {
    document.addEventListener("DOMContentLoaded", () => { document.body.classList.add("embed"); postHeight(); });
    document.addEventListener("DOMContentLoaded", () => { if (window.ResizeObserver) new ResizeObserver(postHeight).observe(document.body); });
    document.addEventListener("toggle", postHeight, true);
  }

  window.Play = { lang, embed, reduced, t, i18n, steps, canvas, drag, keys, color, rgba, onTheme, loop, fmt, text, View3D, mesh, v, clamp };
})();
