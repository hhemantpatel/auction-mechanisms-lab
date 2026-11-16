// UI for the Auction Lab. All math lives in core.js.
(function () {
  "use strict";
  const C = window.Core;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const f2 = (x) => x.toFixed(2), f3 = (x) => x.toFixed(3), f4 = (x) => x.toFixed(4);
  const COL = { you: "#4ea1ff", rival: "#ffa040", win: "#ff5c5c", exact: "#e6e6e6", warn: "#ff5c5c", n3: "#4cc38a", faint: "#555555" };
  const MAX = 300000;

  // ---------------- tiny SVG chart helper ----------------
  function niceTicks(a, b, n) {
    const raw = (b - a) / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p;
    const step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, out = [];
    for (let t = Math.ceil(a / step - 1e-9) * step; t <= b + 1e-9; t += step) out.push(+t.toFixed(10));
    return out;
  }
  function logTicks(a, b) { const o = []; for (let e = Math.ceil(Math.log10(a)); Math.pow(10, e) <= b; e++) o.push(Math.pow(10, e)); return o; }
  function yRange(arrs, includeZero) {
    let lo = Infinity, hi = -Infinity;
    arrs.forEach((a) => a.forEach((y) => { if (isFinite(y)) { lo = Math.min(lo, y); hi = Math.max(hi, y); } }));
    if (includeZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
    if (!(hi > lo)) { hi = lo + 1; }
    const pad = (hi - lo) * 0.08;
    return [lo - (lo === 0 && includeZero ? 0 : pad), hi + pad];
  }
  function Chart(svg, o) {
    const W = 640, H = o.h || 320, L = o.bare ? 6 : 58, R = o.bare ? 6 : 30, T = 16, B = o.bare ? 6 : 42, s = [];
    const lg = Math.log10;
    const sx = (x) => L + ((o.xlog ? lg(x) - lg(o.xmin) : x - o.xmin) / (o.xlog ? lg(o.xmax) - lg(o.xmin) : o.xmax - o.xmin)) * (W - L - R);
    const sy = (y) => H - B - ((y - o.ymin) / (o.ymax - o.ymin)) * (H - B - T);
    if (!o.bare) (o.xlog ? logTicks(o.xmin, o.xmax) : niceTicks(o.xmin, o.xmax, o.mini ? 4 : 6)).forEach((t) =>
      s.push(`<line class="grid" x1="${sx(t)}" x2="${sx(t)}" y1="${T}" y2="${H - B}"/><text x="${sx(t)}" y="${H - B + 15}" text-anchor="middle">${o.xlog && t >= 1000 ? t / 1000 + "k" : +t.toPrecision(4)}</text>`));
    if (!o.bare) niceTicks(o.ymin, o.ymax, o.mini ? 3 : 5).forEach((t) =>
      s.push(`<line class="grid" x1="${L}" x2="${W - R}" y1="${sy(t)}" y2="${sy(t)}"/><text x="${L - 6}" y="${sy(t) + 4}" text-anchor="end">${+t.toPrecision(3)}</text>`));
    s.push(`<line class="axis" x1="${L}" x2="${W - R}" y1="${H - B}" y2="${H - B}"/><line class="axis" x1="${L}" x2="${L}" y1="${T}" y2="${H - B}"/>`);
    if (o.xlabel) s.push(`<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle">${o.xlabel}</text>`);
    if (o.ylabel) s.push(`<text transform="translate(12 ${(T + H - B) / 2}) rotate(-90)" text-anchor="middle">${o.ylabel}</text>`);
    if (o.title) s.push(`<text x="${L + 6}" y="${T + 12}" style="fill:var(--text)">${o.title}</text>`);
    const clipY = (y) => Math.max(o.ymin, Math.min(o.ymax, y));
    return {
      sx, sy,
      line(pts, color, w, dash) {
        if (!pts.length) return this;
        s.push(`<path d="${pts.map((p, i) => (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(clipY(p[1])).toFixed(1)).join("")}" fill="none" stroke="${color}" stroke-width="${w || 2}" ${dash ? `stroke-dasharray="${dash}"` : ""} stroke-linejoin="round"/>`);
        return this;
      },
      dots(pts, color, r) { pts.forEach((p) => s.push(`<circle cx="${sx(p[0]).toFixed(1)}" cy="${sy(clipY(p[1])).toFixed(1)}" r="${r || 2.5}" fill="${color}"/>`)); return this; },
      vline(x, color, label, dash) {
        s.push(`<line x1="${sx(x)}" x2="${sx(x)}" y1="${T}" y2="${H - B}" stroke="${color}" stroke-width="1.5" stroke-dasharray="${dash || "4 4"}"/>`);
        if (label) s.push(`<text x="${sx(x) + 4}" y="${T + 24}" style="fill:${color}">${label}</text>`);
        return this;
      },
      band(upper, lower, color) {
        if (!upper.length) return this;
        const d = upper.map((p, i) => (i ? "L" : "M") + sx(p[0]).toFixed(1) + " " + sy(clipY(p[1])).toFixed(1)).join("") +
          lower.slice().reverse().map((p) => "L" + sx(p[0]).toFixed(1) + " " + sy(clipY(p[1])).toFixed(1)).join("") + "Z";
        s.push(`<path d="${d}" fill="${color}" opacity=".22"/>`); return this;
      },
      bars(vals, x0, dx, color) {
        vals.forEach((v, i) => { const x = sx(x0 + i * dx), w = sx(x0 + (i + 1) * dx) - x - 2, y = sy(v);
          s.push(`<rect x="${x + 1}" y="${y}" width="${Math.max(1, w)}" height="${Math.max(0, sy(0) - y)}" fill="${color}" rx="2"/>`); });
        return this;
      },
      legend(items) {
        const x = W - R - 250;
        s.push(`<rect x="${x - 8}" y="${T}" width="256" height="${items.length * 24 + 8}" fill="var(--panel)" stroke="var(--line)"/>`);
        items.forEach((it, i) => s.push(`<rect x="${x}" y="${T + 10 + i * 24}" width="12" height="12" fill="${it[1]}"/><text x="${x + 18}" y="${T + 21 + i * 24}">${it[0]}</text>`));
        return this;
      },
      text(x, y, t, color) { s.push(`<text x="${sx(x)}" y="${sy(y)}" style="fill:${color || "var(--text)"}">${t}</text>`); return this; },
      done() { svg.innerHTML = s.join(""); },
    };
  }

  // ---------------- arena (animated bid bars) ----------------
  function Arena(el) {
    let names = "";
    return {
      draw(rows, verdictHTML) { // rows: [{name,val,cls}]
        const key = rows.map((r) => r.name).join("|");
        if (key !== names) {
          names = key;
          el.innerHTML = rows.map((r, i) => `<div class="bar-row" data-i="${i}"><div class="name">${r.name}</div><div class="track"><div class="fill"></div></div><div class="val"></div></div>`).join("") + '<div class="verdict"></div>';
        }
        rows.forEach((r, i) => {
          const row = el.children[i];
          row.className = "bar-row " + (r.cls || "");
          row.querySelector(".fill").style.width = Math.min(100, (r.val / (r.max || 1)) * 100) + "%";
          row.querySelector(".val").textContent = r.val.toFixed(3);
        });
        el.querySelector(".verdict").innerHTML = verdictHTML;
      },
    };
  }

  function chipGroup(sel, attr, cb) {
    $$(sel + " button").forEach((b) => b.addEventListener("click", () => {
      $$(sel + " button").forEach((x) => x.classList.remove("on")); b.classList.add("on"); cb(b.dataset[attr]);
    }));
  }
  function setChip(sel, attr, val) { $$(sel + " button").forEach((b) => b.classList.toggle("on", b.dataset[attr] === String(val))); }
  function raf(fn) { let q = false; return () => { if (!q) { q = true; requestAnimationFrame(() => { q = false; fn(); }); } }; }
  const perTick = (speed) => Math.max(1, Math.round((speed * speed) / 30));

  // ---------------- tabs ----------------
  $$("#tabs button").forEach((b) => b.addEventListener("click", () => {
    $$("#tabs button").forEach((x) => x.classList.toggle("active", x === b));
    $$(".tab").forEach((t) => t.classList.toggle("active", t.id === b.dataset.tab));
    stop1(); stop2();
    if (b.dataset.tab === "t1") draw1(); else if (b.dataset.tab === "t2") draw2(); else draw3();
  }));

  // =====================================================================
  // TAB 1: second-price
  // =====================================================================
  const S1 = { v: 0.8, strat: "truthful", nR: 1, b: 0.8, mode: "random", fixed: 0.4, n: 0, rm: new Float32Array(MAX),
    sum: new Float64Array(101), last: null, rng: null, timer: null };
  const arena1 = Arena($("#arena1"));
  const STRAT_NAME = { truthful: "bids its value", half: "bids value / 2", random: "bids U[0,1]" };

  const uOf = (rm, b, v) => (b > rm ? v - rm : b === rm ? (v - rm) / 2 : 0);
  const exact1 = (b) => S1.mode === "fixed"
    ? C.fixedBidUtility(S1.v, Array(S1.nR).fill(Math.round(S1.fixed * 100)), Math.round(b * 100))
    : C.exactSecondPrice(S1.v, S1.strat, S1.nR, b);

  function reset1() { S1.rng = C.mulberry32(12345); S1.n = 0; S1.sum.fill(0); S1.last = null; draw1(); }
  function step1() {
    if (S1.n >= MAX) { stop1(); return false; }
    const bids = [], values = [];
    for (let i = 0; i < S1.nR; i++) {
      if (S1.mode === "fixed") { bids.push(S1.fixed); values.push(null); }
      else { const r = C.drawRival(S1.strat, S1.rng); bids.push(r.bid); values.push(r.value); }
    }
    const rm = Math.max.apply(null, bids);
    S1.rm[S1.n] = rm;
    for (let j = 0; j <= 100; j++) if (j / 100 > rm) S1.sum[j] += S1.v - rm;
    S1.n++; S1.last = { bids, values, rm };
    return true;
  }
  function runBatch1(k) { for (let i = 0; i < k && step1(); i++); draw1(); }
  function stop1() { if (S1.timer) { clearInterval(S1.timer); S1.timer = null; $("#play").innerHTML = "Play"; } }
  function play1() {
    if (S1.timer) return stop1();
    $("#play").innerHTML = "Pause";
    S1.timer = setInterval(() => { const k = perTick(+$("#speed").value); for (let i = 0; i < k; i++) if (!step1()) break; draw1(); }, 80);
  }

  function scan1() { // one pass over stored auctions: total profit, sparkline, convergence
    const n = S1.n, b = S1.b, v = S1.v;
    const sparkStep = Math.max(1, Math.floor(n / 220)), spark = [];
    const cps = []; if (n >= 2) { const set = new Set(); for (let k = 0; k <= 90; k++) set.add(Math.max(2, Math.round(Math.pow(10, Math.log10(2) + (Math.log10(n) - Math.log10(2)) * k / 90)))); set.forEach((x) => cps.push(x)); cps.sort((a, b2) => a - b2); }
    let tot = 0, sq = 0, p = 0; const conv = [];
    for (let i = 0; i < n; i++) {
      const u = uOf(S1.rm[i], b, v); tot += u; sq += u * u;
      if ((i + 1) % sparkStep === 0 || i === n - 1) spark.push([i + 1, tot]);
      if (p < cps.length && i + 1 === cps[p]) { const m = tot / (i + 1), sd = Math.sqrt(Math.max(0, sq / (i + 1) - m * m)); conv.push([i + 1, m, 1.96 * sd / Math.sqrt(i + 1)]); p++; }
    }
    return { tot, spark, conv };
  }

  const heatCache = {};
  function drawHeat() {
    const key = S1.strat + S1.nR; let d = heatCache[key];
    if (!d) {
      d = new Float32Array(101 * 101); let mx = 0;
      for (let vi = 0; vi <= 100; vi++) { const v = vi / 100, best = C.exactSecondPrice(v, S1.strat, S1.nR, v);
        for (let bi = 0; bi <= 100; bi++) { const r = Math.max(0, Math.max(best, C.exactSecondPrice(v, S1.strat, S1.nR, bi / 100)) - C.exactSecondPrice(v, S1.strat, S1.nR, bi / 100)); d[vi * 101 + bi] = r; mx = Math.max(mx, r); } }
      d.max = mx; heatCache[key] = d;
    }
    const cv = $("#heat1"), ctx = cv.getContext("2d"), img = ctx.createImageData(101, 101);
    const ramp = (t) => { t = Math.sqrt(t); const a = [23, 23, 23], m = [40, 110, 190], z = [190, 225, 255];
      const [c0, c1, u] = t < 0.5 ? [a, m, t * 2] : [m, z, (t - 0.5) * 2]; return c0.map((x, i) => x + (c1[i] - x) * u); };
    for (let i = 0; i < 101 * 101; i++) { const c = ramp(d[i] / (d.max || 1)); img.data.set([c[0], c[1], c[2], 255], i * 4); }
    ctx.putImageData(img, 0, 0);
    ctx.fillStyle = COL.win; ctx.fillRect(Math.round(S1.b * 100) - 1, Math.round(S1.v * 100) - 1, 3, 3);
  }

  function draw1() {
    if (!$("#t1").classList.contains("active")) return;
    const v = S1.v, b = S1.b, last = S1.last;
    $("#v-out").textContent = f2(v); $("#b-out").textContent = f2(b);
    // arena
    const rows = [{ name: "You", val: b, cls: "you" }];
    for (let i = 0; i < S1.nR; i++) rows.push({ name: "Rival " + (i + 2), val: last ? last.bids[i] : 0 });
    let html = `<span class="muted">Your value is ${f2(v)}. Press Play or Step to run auctions.</span>`;
    if (last) {
      const rm = last.rm;
      if (b > rm) { rows[0].cls += " win"; const u = v - rm;
        html = `<b style="color:var(--win)">You win</b> and pay the highest rival bid <b>${f3(rm)}</b>. Utility = ${f2(v)} &minus; ${f3(rm)} = <b>${f3(u)}</b>${u < 0 ? " &mdash; a loss: you overbid." : "."}`; }
      else if (b === rm) html = `Tie at ${f3(rm)}: coin flip, expected utility ${f3((v - rm) / 2)}.`;
      else { let wi = last.bids.indexOf(rm); rows[wi + 1].cls = "win";
        html = `<b style="color:var(--rival)">Rival ${wi + 2} wins</b> with ${f3(rm)}. You get 0.` + (rm < v ? ` <span class="muted">A profitable auction (${f3(v - rm)}) was lost by underbidding.</span>` : ` <span class="muted">Good: it would have cost more than your value.</span>`); }
    }
    arena1.draw(rows, html);
    // stats + sparkline + convergence
    const sc = scan1(), n = S1.n, ex = exact1(b);
    $("#s1-n").textContent = n.toLocaleString(); $("#s1-avg").textContent = n ? f4(sc.tot / n) : "–";
    $("#s1-exact").textContent = f4(ex); $("#s1-profit").textContent = f2(sc.tot);
    { const ys = sc.spark.map((p) => p[1]); const [lo, hi] = yRange([ys], true);
      const ch = Chart($("#spark1"), { xmin: 0, xmax: Math.max(10, n), ymin: lo, ymax: hi, h: 90, bare: true });
      ch.line([[0, 0]].concat(sc.spark), COL.you, 2).done(); }
    // curve
    const xs = Array.from({ length: 101 }, (_, i) => i / 100);
    const exactPts = xs.map((x) => [x, exact1(x)]);
    const mc = S1.mode === "random" && n ? xs.map((x, j) => [x, S1.sum[j] / n]) : [];
    const [lo, hi] = yRange([exactPts.map((p) => p[1])].concat(mc.length ? [mc.map((p) => p[1])] : []), true);
    const ch = Chart($("#curve1"), { xmin: 0, xmax: 1, ymin: lo, ymax: hi, xlabel: "your bid b", ylabel: "average utility" });
    ch.vline(v, COL.warn, "b = v", "3 4");
    if (S1.mode === "fixed") ch.line(exactPts, COL.exact, 2.5); else ch.line(exactPts, COL.exact, 1.5, "5 4").dots(mc, COL.you, 2.4);
    ch.vline(b, COL.you, "your bid", "1 0").done();
    // convergence
    const cv = Chart($("#conv1"), { xmin: 2, xmax: Math.max(20, n), ymin: ex - 0.15, ymax: ex + 0.15, xlog: true, xlabel: "auctions simulated (log scale)", ylabel: "estimate of utility" });
    if (S1.mode === "random" && sc.conv.length) {
      const all = sc.conv.flatMap((p) => [p[1] - p[2], p[1] + p[2]]), r = yRange([all.concat([ex])], false);
      const cv2 = Chart($("#conv1"), { xmin: 2, xmax: Math.max(20, n), ymin: Math.max(r[0], ex - 0.4), ymax: Math.min(r[1], ex + 0.4), xlog: true, xlabel: "auctions simulated (log scale)", ylabel: "estimate of utility" });
      cv2.band(sc.conv.map((p) => [p[0], p[1] + p[2]]), sc.conv.map((p) => [p[0], p[1] - p[2]]), COL.you)
        .line(sc.conv.map((p) => [p[0], p[1]]), COL.you, 2).line([[2, ex], [Math.max(20, n), ex]], COL.exact, 1.5, "5 4").legend([["estimate ± 1.96 SE", COL.you], ["exact value", COL.exact]]).done();
    } else { cv.line([[2, ex], [Math.max(20, n), ex]], COL.exact, 1.5, "5 4").text(3, ex + 0.02, S1.mode === "fixed" ? "fixed rival bids: utility is deterministic" : "run some auctions to see convergence", COL.rival).done(); }
    drawHeat();
    // badge
    const bd = $("#badge1");
    if (S1.mode === "fixed") {
      const hc = Math.round(S1.fixed * 100), vc = Math.round(v * 100), uv = C.fixedBidUtility(v, Array(S1.nR).fill(hc), vc);
      let mx = -Infinity; for (let c = 0; c <= 100; c++) mx = Math.max(mx, C.fixedBidUtility(v, Array(S1.nR).fill(hc), c));
      const ok = uv >= mx - 1e-12; bd.className = "badge " + (ok ? "ok" : "bad");
      bd.innerHTML = `Part B check: rival bids ${S1.fixed}. u(b=v) = ${f3(uv)}, best of all 101 bids = ${f3(mx)} ${ok ? "&#10003; truthful is optimal" : "&#10007;"}`;
    } else {
      const uv = C.exactSecondPrice(v, S1.strat, S1.nR, v); let mx = -Infinity; for (let c = 0; c <= 100; c++) mx = Math.max(mx, C.exactSecondPrice(v, S1.strat, S1.nR, c / 100));
      const ok = uv >= mx - 1e-9; bd.className = "badge " + (ok ? "ok" : "bad");
      bd.innerHTML = `Rival ${STRAT_NAME[S1.strat]}: u(b=v) = ${f4(uv)}, best of all bids = ${f4(mx)} ${ok ? "&#10003; b = v is optimal" : "&#10007;"}`;
    }
  }
  const draw1r = raf(draw1);

  chipGroup("#v-chips", "v", (x) => { S1.v = +x; $("#v-slider").value = x; if (S1.follow) { S1.b = S1.v; $("#b-slider").value = S1.v; } reset1(); });
  $("#v-slider").addEventListener("input", (e) => { S1.v = +e.target.value; setChip("#v-chips", "v", e.target.value); if (S1.follow) { S1.b = S1.v; $("#b-slider").value = S1.v; } reset1(); });
  chipGroup("#strat-chips", "s", (x) => { S1.strat = x; reset1(); });
  chipGroup("#rivals-chips", "r", (x) => { S1.nR = +x; reset1(); });
  chipGroup("#mode-chips", "m", (x) => { S1.mode = x; $("#fixed-chips").hidden = x !== "fixed"; reset1(); });
  chipGroup("#fixed-chips", "f", (x) => { S1.fixed = +x; reset1(); });
  $("#b-slider").addEventListener("input", (e) => { S1.b = +e.target.value; S1.follow = false; draw1r(); });
  $("#b-truth").addEventListener("click", () => { S1.b = S1.v; S1.follow = true; $("#b-slider").value = S1.v; draw1(); });
  $("#play").addEventListener("click", play1);
  $("#step").addEventListener("click", () => { stop1(); step1(); draw1(); });
  $("#run10k").addEventListener("click", () => runBatch1(10000));
  $("#run100k").addEventListener("click", () => runBatch1(100000));
  $("#reset").addEventListener("click", () => { stop1(); reset1(); });
  S1.follow = true;

  // 3x3 grid of exact curves (Part A layout)
  function drawGrid9() {
    const host = $("#grid9"); host.innerHTML = "";
    ["truthful", "half", "random"].forEach((st) => [0.2, 0.5, 0.8].forEach((v) => {
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", "0 0 640 200"); host.appendChild(svg);
      const pts = Array.from({ length: 101 }, (_, i) => [i / 100, C.exactSecondPrice(v, st, S1.nR, i / 100)]);
      const [lo, hi] = yRange([pts.map((p) => p[1])], true);
      Chart(svg, { xmin: 0, xmax: 1, ymin: lo, ymax: hi, h: 200, mini: true, title: `v=${v}, rival ${STRAT_NAME[st]}` }).line(pts, COL.you, 2.5).vline(v, COL.warn, "", "3 4").done();
    }));
  }
  $("#grid-toggle").addEventListener("click", () => { const h = $("#grid9"); h.hidden = !h.hidden; if (!h.hidden) drawGrid9(); });
  $("#rivals-chips").addEventListener("click", () => { if (!$("#grid9").hidden) drawGrid9(); });

  // =====================================================================
  // TAB 2: first-price
  // =====================================================================
  const KG = 20;
  const S2 = { n: 2, ki: 4, cnt: 0, rng: null, timer: null, u: new Float64Array(KG), gap: new Float64Array(KG), o0: new Float64Array(KG),
    o1: new Float64Array(KG), bins: Array.from({ length: KG }, () => new Float64Array(20)), last: null };
  const arena2 = Arena($("#arena2"));
  const fpExact = {};
  function fpCurve(n) { if (!fpExact[n]) fpExact[n] = Array.from({ length: 40 }, (_, i) => [(i + 1) / 20, C.exactFirstPrice((i + 1) / 20, n)]); return fpExact[n]; }
  const kOf = (i) => (i + 1) / 10;

  function reset2() { S2.rng = C.mulberry32(777); S2.cnt = 0; S2.u.fill(0); S2.gap.fill(0); S2.o0.fill(0); S2.o1.fill(0); S2.bins.forEach((b) => b.fill(0)); S2.last = null; draw2(); }
  function step2() {
    if (S2.cnt >= MAX) { stop2(); return false; }
    const n = S2.n, vals = []; for (let i = 0; i < n; i++) vals.push(S2.rng());
    const oth = vals.slice(1).map((v) => ((n - 1) / n) * v).sort((a, b) => b - a), top = oth[0], sec = oth.length > 1 ? oth[1] : -1;
    for (let i = 0; i < KG; i++) {
      const b1 = kOf(i) * vals[0], win = b1 > top, hi = Math.max(b1, top), second = Math.max(Math.min(b1, top), sec), g = hi - second;
      if (win) S2.u[i] += vals[0] - b1;
      S2.gap[i] += g; if (g > 0) S2.o0[i]++; if (g > 0.01) S2.o1[i]++;
      S2.bins[i][Math.min(19, Math.floor(g * 20))]++;
    }
    S2.cnt++; S2.last = C.evalFirstPrice(vals, n, kOf(S2.ki)); return true;
  }
  function stop2() { if (S2.timer) { clearInterval(S2.timer); S2.timer = null; $("#play2").innerHTML = "Play"; } }
  function play2() {
    if (S2.timer) return stop2();
    $("#play2").innerHTML = "Pause";
    S2.timer = setInterval(() => { const k = perTick(+$("#speed2").value); for (let i = 0; i < k; i++) if (!step2()) break; draw2(); }, 80);
  }
  function draw2() {
    if (!$("#t2").classList.contains("active")) return;
    const n = S2.n, k = kOf(S2.ki), ks = C.kStar(n), cnt = S2.cnt, last = S2.last;
    $("#k-out").textContent = k.toFixed(1); $("#kstar-out").textContent = `(equilibrium k* = ${ks.toFixed(3)})`;
    const rows = last ? last.bids.map((b, i) => ({ name: i ? "Bidder " + (i + 1) : "You", val: b, cls: (i === 0 ? "you " : "") + (i === last.winner ? "win" : ""), max: Math.max(1, k) }))
      : Array.from({ length: n }, (_, i) => ({ name: i ? "Bidder " + (i + 1) : "You", val: 0, cls: i ? "" : "you", max: Math.max(1, k) }));
    let html = `<span class="muted">You bid ${k.toFixed(1)} &times; value. Press Play or Step.</span>`;
    if (last) {
      const w = last.winner === 0 ? "<b style='color:var(--win)'>You win</b>" : `<b style='color:var(--rival)'>Bidder ${last.winner + 1} wins</b>`;
      html = `${w} and pays its own bid <b>${f3(last.price)}</b>. Second-highest bid was ${f3(last.second)}, so the winner could have paid <b>${f3(last.gap)}</b> less and still won.` + (last.winner === 0 ? ` Your utility: ${f3(last.u1)}.` : " Your utility: 0.");
    }
    arena2.draw(rows, html);
    const ex = C.exactFirstPrice(k, n);
    $("#s2-n").textContent = cnt.toLocaleString(); $("#s2-avg").textContent = cnt ? f4(S2.u[S2.ki] / cnt) : "–";
    $("#s2-exact").textContent = f4(ex); $("#s2-frac").textContent = cnt ? (100 * S2.o1[S2.ki] / cnt).toFixed(1) + "%" : "–";
    // E[u] vs k
    const mc = cnt ? Array.from({ length: KG }, (_, i) => [kOf(i), S2.u[i] / cnt]) : [];
    const all = [2, 3, 4].map((m) => fpCurve(m).map((p) => p[1]));
    const [lo, hi] = yRange(all, true);
    const ch = Chart($("#curve2"), { xmin: 0, xmax: 2, ymin: lo, ymax: hi, xlabel: "k (you bid k · v)", ylabel: "expected utility" });
    [2, 3, 4].forEach((m) => ch.line(fpCurve(m), m === n ? COL.exact : COL.faint, m === n ? 2.4 : 1.4, m === n ? "" : "4 3"));
    ch.dots(mc, COL.you, 3).vline(ks, COL.rival, "k*", "4 4").vline(k, COL.you, "", "1 0").legend([["exact, current n", COL.exact], ["simulated", COL.you]]).done();
    // overpayment
    const gs = cnt ? Array.from({ length: KG }, (_, i) => [kOf(i), S2.gap[i] / cnt]) : [], f1 = cnt ? Array.from({ length: KG }, (_, i) => [kOf(i), S2.o1[i] / cnt]) : [];
    Chart($("#over2"), { xmin: 0, xmax: 2, ymin: 0, ymax: 1.4, xlabel: "k", ylabel: "" })
      .line(gs, COL.rival, 2).dots(gs, COL.rival, 3).line(f1, COL.n3, 2).dots(f1, COL.n3, 3).vline(k, COL.you, "", "1 0")
      .legend([["mean overpayment", COL.rival], ["fraction overpaying > 0.01", COL.n3]]).done();
    // histogram
    const hv = Array.from(S2.bins[S2.ki]).map((c) => (cnt ? c / cnt : 0));
    Chart($("#hist2"), { xmin: 0, xmax: 1, ymin: 0, ymax: Math.max(0.1, Math.max.apply(null, hv) * 1.15), h: 260, xlabel: "overpayment = winning bid − second-highest bid (last bin = ≥ 0.95)", ylabel: "share of auctions" })
      .bars(hv, 0, 0.05, COL.win).done();
  }
  chipGroup("#n-chips", "n", (x) => { S2.n = +x; reset2(); });
  $("#k-slider").addEventListener("input", (e) => { S2.ki = Math.round(+e.target.value * 10) - 1; if (S2.cnt) S2.last = null; draw2(); });
  $("#k-eq").addEventListener("click", () => { S2.ki = Math.round(C.kStar(S2.n) * 10) - 1; $("#k-slider").value = kOf(S2.ki); draw2(); });
  $("#play2").addEventListener("click", play2);
  $("#step2").addEventListener("click", () => { stop2(); step2(); draw2(); });
  $("#run10k2").addEventListener("click", () => { for (let i = 0; i < 10000 && step2(); i++); draw2(); });
  $("#run100k2").addEventListener("click", () => { for (let i = 0; i < 100000 && step2(); i++); draw2(); });
  $("#reset2").addEventListener("click", () => { stop2(); reset2(); });

  // =====================================================================
  // TAB 3: VCG
  // =====================================================================
  const POS = { A: [60, 160], B: [210, 50], C: [210, 270], D: [410, 50], E: [410, 270], F: [560, 160] };
  const S3 = { costs: Object.assign({}, C.BOOK_EDGES), sel: "BE", rep: C.BOOK_EDGES.BE };
  const EDGE_KEYS = Object.keys(C.BOOK_EDGES);
  const REPORTS = Array.from({ length: 21 }, (_, i) => i / 2);

  function build3() {
    $("#costs3").innerHTML = EDGE_KEYS.map((e) => `<div data-e="${e}"><label>${e[0]}&rarr;${e[1]} <b id="c-${e}">${S3.costs[e]}</b></label><input type="range" min="0" max="10" step="0.5" value="${S3.costs[e]}" data-e="${e}"></div>`).join("");
    $$("#costs3 input").forEach((inp) => inp.addEventListener("input", () => { S3.costs[inp.dataset.e] = +inp.value; $("#c-" + inp.dataset.e).textContent = inp.value; if (inp.dataset.e === S3.sel) { S3.rep = +inp.value; $("#rep-slider").value = S3.rep; } draw3(); }));
    $$("#costs3 label").forEach((l) => l.addEventListener("click", () => select3(l.parentElement.dataset.e)));
  }
  function select3(e) { S3.sel = e; S3.rep = S3.costs[e]; $("#rep-slider").value = S3.rep; draw3(); }

  function draw3() {
    if (!$("#t3").classList.contains("active")) return;
    const costs = S3.costs, o = C.vcg(costs), on = o.chosen.path;
    $$("#costs3 > div").forEach((d) => d.classList.toggle("sel", d.dataset.e === S3.sel));
    // graph
    const R = 24; let svg = '<defs><marker id="arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#8a8a8a"/></marker></defs>';
    EDGE_KEYS.forEach((e) => {
      const [x1, y1] = POS[e[0]], [x2, y2] = POS[e[1]], dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L;
      const ax = x1 + ux * R, ay = y1 + uy * R, bx = x2 - ux * (R + 4), by = y2 - uy * (R + 4), t = e === "CF" ? 0.6 : 0.5;
      const mx = ax + (bx - ax) * t - uy * 13, my = ay + (by - ay) * t + ux * 13;
      svg += `<g class="edge ${on.indexOf(e) >= 0 ? "on" : ""} ${e === S3.sel ? "sel" : ""}" data-e="${e}"><line x1="${ax}" y1="${ay}" x2="${bx}" y2="${by}" marker-end="url(#arr)"/><text x="${mx}" y="${my + 5}">${costs[e]}</text></g>`;
    });
    Object.keys(POS).forEach((n) => (svg += `<g class="node"><circle cx="${POS[n][0]}" cy="${POS[n][1]}" r="${R}"/><text x="${POS[n][0]}" y="${POS[n][1]}">${n}</text></g>`));
    $("#graph3").innerHTML = svg;
    $$("#graph3 .edge").forEach((g) => g.addEventListener("click", () => select3(g.dataset.e)));
    // table
    let tb = "<tr><th>edge</th><th>cost</th><th>payment</th><th>utility</th></tr>";
    EDGE_KEYS.forEach((e) => { const p = o.pay[e], u = on.indexOf(e) >= 0 ? p - costs[e] : 0;
      tb += `<tr class="${on.indexOf(e) >= 0 ? "onpath" : ""} ${e === S3.sel ? "sel" : ""}"><td>${e[0]}&rarr;${e[1]}</td><td>${costs[e]}</td><td>${isFinite(p) ? p : "&infin;"}</td><td>${isFinite(u) ? u : "&infin;"}</td></tr>`; });
    $("#table3").innerHTML = tb + `<tr><td colspan="4" class="muted" style="text-align:left">Chosen path <b>${o.chosen.name}</b>, cost ${o.chosen.cost}. Total paid ${EDGE_KEYS.reduce((s, e) => s + (isFinite(o.pay[e]) ? o.pay[e] : 0), 0)}.</td></tr>`;
    // book badge
    const isBook = EDGE_KEYS.every((e) => costs[e] === C.BOOK_EDGES[e]), b3 = $("#badge3");
    if (isBook) { const ok = o.chosen.name === "ABEF" && o.pay.AB === 4 && o.pay.BE === 2 && o.pay.EF === 3; b3.className = "badge " + (ok ? "ok" : "bad"); b3.innerHTML = ok ? "&#10003; Reproduces the book: ABEF, AB paid 4, BE paid 2, EF paid 3" : "&#10007; does not match the book"; }
    else { b3.className = "badge"; b3.textContent = "custom costs"; }
    // misreport
    const e = S3.sel; $("#sel3").textContent = e[0] + "→" + e[1]; $("#rep-out").textContent = S3.rep;
    const rep = Object.assign({}, costs); rep[e] = S3.rep; const ro = C.vcg(rep), won = ro.chosen.path.indexOf(e) >= 0, u = won ? ro.pay[e] - costs[e] : 0;
    $("#rep-result").innerHTML = `If ${e} reports <b>${S3.rep}</b> (true cost ${costs[e]}): chosen path <b>${ro.chosen.name}</b>. ` + (won ? `${e} is paid ${ro.pay[e]}, utility = ${ro.pay[e]} &minus; ${costs[e]} = <b>${u}</b>.` : "it is not selected, utility <b>0</b>.");
    const pts = REPORTS.map((r) => [r, C.vcgUtility(costs, e, r)]), uTrue = C.vcgUtility(costs, e, costs[e]);
    const [lo, hi] = yRange([pts.map((p) => p[1])], true);
    const stepPts = []; pts.forEach((p, i) => { if (i) stepPts.push([p[0] - 0.25, pts[i - 1][1]], [p[0] - 0.25, p[1]]); else stepPts.push(p); });
    Chart($("#util3"), { xmin: 0, xmax: 10, ymin: Math.min(lo, -0.5), ymax: Math.max(hi, 0.5), h: 300, xlabel: "reported cost", ylabel: "utility" })
      .vline(costs[e], COL.warn, "true cost", "3 4").line(stepPts, COL.you, 2.5).dots(pts, COL.you, 3).vline(S3.rep, COL.rival, "", "1 0").done();
    const ok = uTrue >= Math.max.apply(null, pts.map((p) => p[1])) - 1e-12, b = $("#badge3b");
    b.className = "badge " + (ok ? "ok" : "bad"); b.innerHTML = ok ? `&#10003; Telling the truth (utility ${uTrue}) is at least as good as any report from 0 to 10` : "&#10007; a misreport beats the truth";
  }
  $("#rep-slider").addEventListener("input", (e) => { S3.rep = +e.target.value; draw3(); });
  $("#reset3").addEventListener("click", () => { S3.costs = Object.assign({}, C.BOOK_EDGES); build3(); select3("BE"); });

  // ---------------- init ----------------
  build3(); reset1(); reset2(); draw3();
  const first = $("#t1"); first.classList.add("active"); draw1();
})();
