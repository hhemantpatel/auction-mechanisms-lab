"""Part 2: first-price auction with n bidders.

Bidder 1 (value v ~ U[0,1]) bids k*v for k on the grid 0.1..2.0.  The other n-1
bidders (values ~ U[0,1]) bid the symmetric equilibrium bid ((n-1)/n)*v_i.  The
highest bid wins and pays its own bid.

Measured per (n, k):
  * expected utility of bidder 1 (simulation and exact integral)
  * fraction of auctions in which the winner could have paid less and still won,
    i.e. winning bid > second-highest bid (strict), and > second-highest + 0.01
  * mean overpayment = winning bid - second-highest bid
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

SEED = 1
N_AUCTIONS = 200_000
N_BIDDERS = (2, 3, 4)
K_GRID = np.round(np.arange(1, 21) / 10, 1)     # 0.1, 0.2, ..., 2.0
EPS = 0.01                                      # "material" saving threshold


def theoretical_utility(k, n):
    """E over v~U[0,1] of (1-k) v * P(win | v); P(win|v) = min(1, k v n/(n-1))^(n-1)."""
    v = np.linspace(0, 1, 20001)
    win = np.minimum(1.0, k * v * n / (n - 1)) ** (n - 1)
    return np.trapezoid((1 - k) * v * win, v)


def simulate(n, rng):
    v = rng.random((n, N_AUCTIONS))             # row 0 = bidder 1
    others = (n - 1) / n * v[1:]                # equilibrium bids of bidders 2..n
    top_other = others.max(axis=0)
    second_other = np.sort(others, axis=0)[-2] if n > 2 else None
    out = []
    for k in K_GRID:
        b1 = k * v[0]
        win1 = b1 > top_other
        utility = np.where(win1, v[0] - b1, 0.0).mean()
        top = np.maximum(b1, top_other)
        # second-highest of all n bids: the larger of (smaller of b1/top_other) and the next other bid
        second = np.minimum(b1, top_other)
        if second_other is not None:
            second = np.maximum(second, second_other)
        gap = top - second                      # what the winner overpays
        out.append((k, utility, theoretical_utility(k, n), win1.mean(),
                    (gap > 0).mean(), (gap > EPS).mean(), gap.mean()))
    return np.array(out)


def main():
    rng = np.random.default_rng(SEED)
    results = {n: simulate(n, rng) for n in N_BIDDERS}

    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    for n, r in results.items():
        k_star = (n - 1) / n
        line, = axes[0].plot(r[:, 0], r[:, 1], "o-", ms=3, label=f"n={n} simulated")
        ks = np.linspace(0.05, 2.0, 400)
        axes[0].plot(ks, [theoretical_utility(k, n) for k in ks], "--", lw=1, color=line.get_color())
        axes[0].axvline(k_star, color=line.get_color(), ls=":", lw=1)
        axes[1].plot(r[:, 0], r[:, 5], "o-", ms=3, label=f"n={n}")
        axes[2].plot(r[:, 0], r[:, 6], "o-", ms=3, label=f"n={n}")
    axes[0].set(title="Bidder 1 expected utility (dashed: exact; dotted: k*=(n-1)/n)",
                xlabel="k (bid = k v)", ylabel="expected utility")
    axes[1].set(title=f"Fraction of auctions where winner overpays by > {EPS}",
                xlabel="k (bid = k v)", ylabel="fraction")
    axes[2].set(title="Mean overpayment (winning bid - 2nd highest bid)",
                xlabel="k (bid = k v)", ylabel="mean overpayment")
    for ax in axes:
        ax.legend(fontsize=8)
    fig.tight_layout()
    fig.savefig("figures/part2_first_price.png", dpi=130)
    plt.close(fig)

    for n, r in results.items():
        print(f"\n===== Part 2: n={n} bidders, {N_AUCTIONS} auctions, equilibrium k*={(n-1)/n:.3f} =====")
        print("   k  E[u] sim  E[u] exact  P(b1 wins)  frac(gap>0)  frac(gap>0.01)  mean gap")
        for k, u, ut, pw, f0, f1, g in r:
            print(f"  {k:3.1f}  {u:8.4f}  {ut:10.4f}  {pw:10.3f}  {f0:11.4f}  {f1:14.4f}  {g:8.4f}")
        best = r[np.argmax(r[:, 1])]
        k_star = (n - 1) / n
        print(f"  best k on grid: {best[0]:.1f}; exact E[u] at k*={k_star:.3f}: {theoretical_utility(k_star, n):.4f}"
              f"; max over grid exact: {max(theoretical_utility(k, n) for k in K_GRID):.4f}")
        assert np.max(np.abs(r[:, 1] - r[:, 2])) < 0.005


if __name__ == "__main__":
    main()
