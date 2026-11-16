# Auction Lab (interactive simulation)

Runs entirely in the browser, offline, with no network access and no build step.
Open `simulation/index.html` in any browser (double-click it, or `xdg-open simulation/index.html`).

- **Second-price** (Part 1 A/B/C): live auction replay, utility vs bid (simulated dots over the exact curve),
  convergence with a 95% band, "fixed rival bid" mode for Part B, regret heatmap, 3x3 grid of Part A.
- **First-price** (Part 2): live replay, expected utility vs k for n = 2, 3, 4, overpayment vs k, overpayment histogram.
- **VCG path** (Part 3): book Figure 7.3 graph, editable edge costs, live payments, misreport experiment.

`core.js` holds the math (mirrors the Python scripts), `app.js` the UI. Random numbers are seeded, so runs are reproducible.
