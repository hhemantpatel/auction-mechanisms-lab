"""Part 3: VCG mechanism for buying the cheapest path A -> F, each edge an agent with a private cost.

The chosen path minimises the sum of *reported* costs.  The VCG payment to an agent e on the
chosen path is  p_e = d(G without e) - (d(G) - c_e),  i.e. the cost of the best path that avoids
e minus the cost the other agents incur on the chosen path.  Agents off the path get 0.
Utility of an agent = payment - true cost if on the path, else 0.

GRAPH: Figure 7.3 of the book (directed edges): A->B 3, A->C 2, B->D 2, B->E 1, C->E 3, C->F 5,
D->F 2, E->F 1.  Path costs: ABEF 5, ACEF 6, ABDF 7, ACF 7.
"""
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

EDGES = {"AB": 3.0, "AC": 2.0, "BD": 2.0, "BE": 1.0, "CE": 3.0, "CF": 5.0, "DF": 2.0, "EF": 1.0}
SOURCE, TARGET = "A", "F"
REPORTS = np.arange(0, 10.5, 0.5)          # misreports 0, 0.5, ..., 10


def all_paths(edges, node=SOURCE, seen=()):
    """All simple directed paths SOURCE -> TARGET, as tuples of edge names."""
    if node == TARGET:
        yield ()
        return
    for e in edges:
        if e[0] == node and e[1] not in seen:
            for rest in all_paths(edges, e[1], seen + (node,)):
                yield (e,) + rest


def cheapest(costs, banned=None):
    """(cost, path) of the cheapest path avoiding `banned`; ties go to the lexicographically first path."""
    cands = [(sum(costs[e] for e in p), "".join(e[0] for e in p) + TARGET, p)
             for p in all_paths(costs) if banned not in p]
    cost, _, path = min(cands)
    return cost, path


def vcg(reports):
    """Return (chosen path, {edge: payment}) for the reported costs."""
    total, path = cheapest(reports)
    pay = {e: 0.0 for e in reports}
    for e in path:
        pay[e] = cheapest(reports, banned=e)[0] - (total - reports[e])
    return path, pay


def utility(edge, report, true_costs=EDGES):
    reports = {**true_costs, edge: report}
    path, pay = vcg(reports)
    return pay[edge] - true_costs[edge] if edge in path else 0.0


def main():
    path, pay = vcg(EDGES)
    print("Truthful reports:")
    print("  chosen path:", "".join(e[0] for e in path) + TARGET, " total cost:", sum(EDGES[e] for e in path))
    for e in EDGES:
        print(f"  {e}: cost {EDGES[e]:.1f}  payment {pay[e]:.1f}  utility {utility(e, EDGES[e]):.1f}")
    assert "".join(e[0] for e in path) + TARGET == "ABEF"
    assert (pay["AB"], pay["BE"], pay["EF"]) == (4.0, 2.0, 3.0)
    assert all(pay[e] == 0 for e in EDGES if e not in path)

    # Truthfulness check for every edge, then the two requested edges in detail
    for e in EDGES:
        best = max(utility(e, r) for r in REPORTS)
        assert utility(e, EDGES[e]) >= best - 1e-12, e
    print("\nTruthful report maximises utility for all", len(EDGES), "edges over reports 0..10 (step 0.5).")

    chosen = {"BE": "on the path", "CE": "off the path"}
    fig, axes = plt.subplots(1, 2, figsize=(11, 4))
    for ax, (e, where) in zip(axes, chosen.items()):
        us = [utility(e, r) for r in REPORTS]
        print(f"\nEdge {e} ({where}, true cost {EDGES[e]}): report -> utility")
        print("  " + "  ".join(f"{r:g}:{u:g}" for r, u in zip(REPORTS, us)))
        ax.step(REPORTS, us, where="mid", marker="o", ms=4)
        ax.axvline(EDGES[e], color="r", ls=":", label="true cost")
        ax.set(title=f"Edge {e} ({where}), true cost {EDGES[e]}", xlabel="reported cost", ylabel="utility")
        ax.legend()
    fig.tight_layout()
    fig.savefig("figures/part3_vcg.png", dpi=130)
    plt.close(fig)


if __name__ == "__main__":
    main()
