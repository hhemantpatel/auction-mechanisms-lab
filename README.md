# Auctions and the VCG Mechanism

Simulation study of three mechanisms:

1. **Second-price sealed-bid auction**: bidder 1 against one or two rivals that bid truthfully, bid half their value, or bid at random. Shows that bidding your true value is (weakly) dominant.
2. **First-price auction with n bidders**: bidder 1 deviates from the equilibrium bid (n-1)/n · v by bidding k · v. Measures expected utility and how often the winner overpays, for n = 2, 3, 4.
3. **VCG mechanism for buying the cheapest path A → F** in the transportation network of Figure 7.3. Reproduces the chosen path ABEF and the payments AB 4, BE 2, EF 3, and tests misreported costs.

The full write-up is in [`report.pdf`](report.pdf).

## Interactive simulation

Open [`simulation/index.html`](simulation/index.html) in a browser. It runs offline with no install.

| Tab | What you can do |
| --- | --- |
| Second-price | Watch auctions play out live, see simulated utility build up over the exact curve, check convergence (±1.96 SE), switch to fixed rival bids (Part B), view the regret heatmap and the 3×3 grid |
| First-price | Replay auctions with each winner's overpayment, utility vs k for n = 2, 3, 4, overpayment histogram |
| VCG path | Edit any edge cost, watch the chosen path and payments update, try misreports for any edge |

## Reproducing the results (Python)

```sh
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
./run_all.sh          # writes results/*.txt and figures/*.png
```

| File | Content |
| --- | --- |
| `part1_second_price.py` | Part 1 A, B and C (one and two rivals) |
| `part2_first_price.py` | Part 2, n = 2, 3, 4 |
| `part3_vcg.py` | Part 3, VCG path mechanism |
| `simulation/` | Browser app (`core.js` = math, `app.js` = UI) |
| `report.tex` / `report.pdf` | Report |

Every Monte Carlo estimate is checked against the exact expected utility inside the scripts, and seeds are fixed, so results are reproducible.
