# Interactive chunk weighting

The homepage places this module immediately after the learning-cycle figure. Three functions share one row: stable progress, insufficient net gain, and a transient setback despite the same positive endpoint gain. They illustrate the accepted branch and the two rejection conditions of the paper's single weighting rule, rather than three different learned estimators.

`model.js` implements Section 4.3 / Equation 8. It requires strictly positive gain above the minimum threshold and regression depth at or below the allowed limit. Accepted weights use the clipped tanh expression; rejected or unreachable chunks receive zero. The examples use δ = 0.003, η = 0.030, β = 0.5, γ = 20 and bounds [0.5, 1.5], within the paper's reported ranges. Curves are explicitly illustrative functions, not recorded trajectories.

Each native range control and draggable curve handle updates the curve, gain, regression depth, mask, and weight from the same calculation. The third example can be changed from rejected to accepted by reducing its dip. Keyboard range controls remain usable. At narrow widths the examples stay in a single, horizontally scrollable row.

The finite GSAP timeline draws the functions, reveals measurements, then retains or masks the action-chunk strips. Replay restores the three defaults; Play can replay the current parameters. Leaving the viewport or hiding the document pauses playback. Reduced motion immediately shows the resolved state. No runtime network service or external CDN is needed.

## Hyperframes

`index.html` is a capture composition scaffolded with Hyperframes 0.5.4 and registered as `weight-lab`. The homepage uses the unbundled ES modules. `capture.js` is generated from exactly the same model and controller for the CLI's query-free file server. The capture composition leaves timeline playback to Hyperframes. `DESIGN.md` records the visual direction.

```sh
python3 scripts/version-homepage-modules.py
node scripts/prepare-weight-lab.mjs
node scripts/check-weight-lab.mjs
hyperframes lint assets/weight-lab
hyperframes validate assets/weight-lab
hyperframes inspect assets/weight-lab --samples 5
```

Lint, browser execution, sampled layout inspection, and the contrast audit pass. The optional skill animation-map script requires `@hyperframes/producer`, which is absent from the installed CLI distribution; timing and final visibility were checked through the CLI's sampled inspection and direct browser interaction instead. No render is required for the interactive website.

GSAP 3.14.2 is vendored from the official npm package. Its original source headers and package metadata retain the standard no-charge license reference, https://gsap.com/standard-license. Only the core and CSS plugin are used. Regenerate `capture.js` after changing the controller or model; the generated header contains their source hash.
