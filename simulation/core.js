// Pure math / simulation logic for the Auction Lab. No DOM access, so it can be tested in Node.
// Mirrors part1_second_price.py, part2_first_price.py and part3_vcg.py.
(function (root) {
  "use strict";

  // ---------- seeded RNG ----------
  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ---------- Part 1: second-price ----------
  const STRATS = ["truthful", "half", "random"];
  const strategyMax = (s) => (s === "half" ? 0.5 : 1); // rival bid ~ U[0, m]

  // one rival draw -> {value, bid}
  function drawRival(strategy, rng) {
    const value = rng();
    if (strategy === "truthful") return { value, bid: value };
    if (strategy === "half") return { value, bid: value / 2 };
    return { value, bid: rng() }; // random: ignores its value
  }

  // exact E[u] of bidding b when the top of k rival bids is the max of k U[0,m] draws:
  // (v-b) F(b) + integral_0^b F(x) dx,  F(x) = (x/m)^k on [0,m]
  function exactSecondPrice(v, strategy, k, b) {
    const m = strategyMax(strategy);
    const t = Math.min(b, m);
    const F = Math.pow(t / m, k);
    const integral = Math.pow(t, k + 1) / ((k + 1) * Math.pow(m, k)) + (b - t);
    return (v - b) * F + integral;
  }

  // utility of bid b (in cents) against fixed rival bid(s); ties split 50/50
  function fixedBidUtility(v, rivalCents, bCents) {
    const h = Math.max.apply(null, rivalCents);
    const price = h / 100;
    if (bCents > h) return v - price;
    if (bCents === h) return (v - price) / 2;
    return 0;
  }

  // ---------- Part 2: first-price ----------
  // E over v~U[0,1] of (1-k) v min(1, k v n/(n-1))^(n-1)   (trapezoid rule)
  function exactFirstPrice(k, n) {
    const steps = 4000;
    let acc = 0;
    for (let i = 0; i <= steps; i++) {
      const v = i / steps;
      const f = (1 - k) * v * Math.pow(Math.min(1, (k * v * n) / (n - 1)), n - 1);
      acc += i === 0 || i === steps ? f / 2 : f;
    }
    return acc / steps;
  }
  const kStar = (n) => (n - 1) / n;

  // one auction: bidder 1 value v1 bids k*v1; others bid ((n-1)/n) v_i. Returns details.
  function firstPriceAuction(n, k, rng) {
    const values = [];
    for (let i = 0; i < n; i++) values.push(rng());
    return evalFirstPrice(values, n, k);
  }
  function evalFirstPrice(values, n, k) {
    const bids = values.map((v, i) => (i === 0 ? k * v : ((n - 1) / n) * v));
    let top = -1, winner = -1;
    bids.forEach((b, i) => { if (b > top) { top = b; winner = i; } });
    const sorted = bids.slice().sort((a, b) => b - a);
    const second = sorted[1];
    return { values, bids, winner, price: top, second, gap: top - second,
             u1: winner === 0 ? values[0] - bids[0] : 0 };
  }

  // ---------- Part 3: VCG shortest path ----------
  const BOOK_EDGES = { AB: 3, AC: 2, BD: 2, BE: 1, CE: 3, CF: 5, DF: 2, EF: 1 };
  const SOURCE = "A", TARGET = "F";

  function allPaths(costs, node, seen) {
    node = node || SOURCE; seen = seen || [];
    if (node === TARGET) return [[]];
    const out = [];
    Object.keys(costs).forEach((e) => {
      if (e[0] === node && seen.indexOf(e[1]) < 0) {
        allPaths(costs, e[1], seen.concat(node)).forEach((rest) => out.push([e].concat(rest)));
      }
    });
    return out;
  }
  const pathName = (p) => p.map((e) => e[0]).join("") + TARGET;

  // cheapest path avoiding `banned`; ties -> lexicographically first node sequence
  function cheapest(costs, banned) {
    let best = null;
    allPaths(costs).forEach((p) => {
      if (banned && p.indexOf(banned) >= 0) return;
      const c = p.reduce((s, e) => s + costs[e], 0);
      const name = pathName(p);
      if (!best || c < best.cost || (c === best.cost && name < best.name)) best = { cost: c, name, path: p };
    });
    return best; // null if no path
  }

  function vcg(reports) {
    const chosen = cheapest(reports);
    const pay = {};
    Object.keys(reports).forEach((e) => (pay[e] = 0));
    chosen.path.forEach((e) => {
      const without = cheapest(reports, e);
      pay[e] = (without ? without.cost : Infinity) - (chosen.cost - reports[e]);
    });
    return { chosen, pay };
  }

  function vcgUtility(trueCosts, edge, report) {
    const r = Object.assign({}, trueCosts); r[edge] = report;
    const o = vcg(r);
    return o.chosen.path.indexOf(edge) >= 0 ? o.pay[edge] - trueCosts[edge] : 0;
  }

  const Core = { mulberry32, STRATS, strategyMax, drawRival, exactSecondPrice, fixedBidUtility,
    exactFirstPrice, kStar, firstPriceAuction, evalFirstPrice, BOOK_EDGES, allPaths, pathName, cheapest,
    vcg, vcgUtility };
  if (typeof module !== "undefined" && module.exports) module.exports = Core;
  else root.Core = Core;
})(typeof window !== "undefined" ? window : globalThis);
