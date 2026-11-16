"""Part 1: second-price sealed-bid auction, bidder 1 (bids truthfully) vs rival(s).

Runs parts A, B (one rival) and C (the same two experiments with two rivals).
Bidder 1 wins if its bid is strictly above the highest rival bid and then pays
that highest rival bid; utility = v - (highest rival bid) on a win, 0 on a loss.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

SEED = 0
N_AUCTIONS = 200_000                    # >= 100000 required
VALUES = (0.2, 0.5, 0.8)                # bidder 1's fixed true values
STRATEGIES = ("truthful", "half", "random")
BID_CENTS = np.arange(0, 101)           # bids 0.00, 0.01, ..., 1.00 as integer cents
BIDS = BID_CENTS / 100
FIXED_RIVAL_BIDS = (0.1, 0.4, 0.9)      # part B
STRAT_LABEL = {"truthful": "rival bids truthfully",
               "half": "rival bids v/2",
               "random": "rival bids U[0,1] (ignores value)"}


def rival_bids(strategy, n_rivals, n, rng):
    """Bids of n_rivals independent rivals over n auctions, shape (n_rivals, n)."""
    values = rng.random((n_rivals, n))          # rival true values ~ U[0,1]
    if strategy == "truthful":
        return values
    if strategy == "half":
        return values / 2
    if strategy == "random":
        return rng.random((n_rivals, n))        # independent of the value
    raise ValueError(strategy)


def simulated_utility(v, top_rival_bid):
    """Average utility of bidder 1 for every bid in BIDS (common random numbers)."""
    return np.array([np.where(b > top_rival_bid, v - top_rival_bid, 0.0).mean() for b in BIDS])


def theoretical_utility(v, strategy, n_rivals):
    """Exact E[u] for the highest of n_rivals rival bids: bids are U[0,m], m = 1 or 1/2.

    E[(v-M) 1{M<b}] = (v-b) F(b) + int_0^b F(x) dx with F(x) = (x/m)^k on [0,m].
    """
    m = 0.5 if strategy == "half" else 1.0
    k = n_rivals
    t = np.minimum(BIDS, m)
    F = (t / m) ** k
    integral = t ** (k + 1) / ((k + 1) * m ** k) + (BIDS - t)
    return (v - BIDS) * F + integral


def experiment_a(n_rivals, tag, rng):
    """Part A (and C-A): 9 plots, value x rival strategy."""
    draws = {s: rival_bids(s, n_rivals, N_AUCTIONS, rng).max(axis=0) for s in STRATEGIES}
    fig, axes = plt.subplots(3, 3, figsize=(13, 10), sharex=True)
    rows = []
    for i, s in enumerate(STRATEGIES):
        for j, v in enumerate(VALUES):
            u = simulated_utility(v, draws[s])
            th = theoretical_utility(v, s, n_rivals)
            iv = int(round(v * 100))
            # truthful bidding beats every bid pointwise, so with common random numbers this is exact
            assert u[iv] >= u.max() - 1e-12, (s, v)
            assert np.max(np.abs(u - th)) < 0.005, (s, v, np.max(np.abs(u - th)))
            rows.append((s, v, BIDS[int(u.argmax())], u.max(), u[iv], np.max(np.abs(u - th))))
            ax = axes[i, j]
            ax.plot(BIDS, u, ".", ms=3, label="simulated")
            ax.plot(BIDS, th, "--", lw=1, color="k", label="exact")
            ax.axvline(v, color="r", ls=":", label="b = v")
            ax.set_title(f"v={v}, {STRAT_LABEL[s]}", fontsize=9)
            if i == 2:
                ax.set_xlabel("bid of bidder 1")
            if j == 0:
                ax.set_ylabel("avg utility")
    axes[0, 0].legend(fontsize=8)
    fig.suptitle(f"Part 1 {tag}: second-price auction, {n_rivals} rival(s), {N_AUCTIONS} auctions per point")
    fig.tight_layout()
    fig.savefig(f"figures/part1_{tag}.png", dpi=130)
    plt.close(fig)
    return rows


def fixed_bid_utility(v, rival_bid_cents):
    """Exact utility of bidding each b in BIDS against fixed rival bids (ties split 50/50)."""
    h = max(rival_bid_cents)
    price = h / 100
    return np.where(BID_CENTS > h, v - price, np.where(BID_CENTS == h, (v - price) / 2, 0.0))


def experiment_b(n_rivals, tag):
    """Part B (and C-B): rival bids fixed; check b = v is optimal."""
    pairs = [(c,) for c in (10, 40, 90)] if n_rivals == 1 else \
        [(a, b) for a in (10, 40, 90) for b in (10, 40, 90) if a <= b]
    for v in VALUES:
        for rb in pairs:
            u = fixed_bid_utility(v, rb)
            assert u[int(round(v * 100))] >= u.max() - 1e-12, (v, rb)
    fig, axes = plt.subplots(3, 3, figsize=(13, 10), sharex=True)
    rows = []
    for i, r in enumerate(FIXED_RIVAL_BIDS):
        rb = (int(round(r * 100)),) * n_rivals      # all rivals bid r (utility depends only on the max)
        for j, v in enumerate(VALUES):
            u = fixed_bid_utility(v, rb)
            iv = int(round(v * 100))
            rows.append((r, v, u[iv], u.max()))
            ax = axes[i, j]
            ax.step(BIDS, u, where="post")
            ax.axvline(v, color="r", ls=":", label="b = v")
            ax.axvline(r, color="gray", ls="--", label="rival bid")
            ax.set_title(f"v={v}, rival bid(s) fixed at {r}", fontsize=9)
            if i == 2:
                ax.set_xlabel("bid of bidder 1")
            if j == 0:
                ax.set_ylabel("utility")
    axes[0, 0].legend(fontsize=8)
    fig.suptitle(f"Part 1 {tag}: second-price auction, {n_rivals} rival(s) with fixed bids")
    fig.tight_layout()
    fig.savefig(f"figures/part1_{tag}.png", dpi=130)
    plt.close(fig)
    return rows, len(pairs)


def main():
    rng = np.random.default_rng(SEED)
    for n_rivals, part in ((1, "A/B"), (2, "C")):
        print(f"\n===== Part 1{part}: {n_rivals} rival(s) =====")
        a = experiment_a(n_rivals, f"A_rivals{n_rivals}", rng)
        print("Experiment A: strategy, v, argmax bid, max utility, utility at b=v, max|sim-exact|")
        for s, v, ab, um, uv, err in a:
            print(f"  {s:9s} v={v}  argmax={ab:.2f}  max={um:.4f}  u(b=v)={uv:.4f}  err={err:.4f}")
        b, npairs = experiment_b(n_rivals, f"B_rivals{n_rivals}")
        print(f"Experiment B ({npairs} rival-bid combination(s) checked): rival bid, v, u(b=v), max_b u(b)")
        for r, v, uv, um in b:
            print(f"  rival={r}  v={v}  u(b=v)={uv:.4f}  max={um:.4f}  b=v optimal: {uv >= um - 1e-12}")


if __name__ == "__main__":
    main()
