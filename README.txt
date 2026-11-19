UGC Policy Atlas: expected value

Interactive calculator: https://devdatalab.github.io/ugc-policy-atlas-ev/
Source: https://github.com/devdatalab/ugc-policy-atlas-ev

Purpose
Estimate additional economic benefits from direct policy engagement and independent use of open policy data. This is an editable scenario model, not an empirical forecast or a measure directly comparable to cash transfers or health interventions.

Full-scale assumptions
- UGC data universe: 10,000 cities.
- Direct engagement: five selected Indian megacities; 100% usable data; screened reform opportunities; adoption probability increased by 5 percentage points.
- Open platform: the 1,000 largest remaining cities; 70% usable data; feasible reform opportunities in 50% of usable-data cities; adoption probability increased by 2.5 percentage points (50% of the direct-engagement effect).
- Policymaker consideration: 100% in both channels by default.
- Adopted reforms that deliver benefits: 55%, shared across both channels.
- Expected successful reforms: 5 * 1 * 1 * 1 * .05 * .55 + 1000 * .70 * .50 * 1 * .025 * .55 = 4.95.

The opportunity share and implementation success rate are scenario inputs, not estimates from the cited studies. All inputs are editable.

Benefits and costs
The annual worker-benefit benchmark is 0.123% of city GDP, derived from the worker component of the ADB Bengaluru transit/land-use complementarity estimate. The model retains 25% of that benchmark for successful reforms. Population and GDP inputs are provisional size-band assumptions, not an imported UGC city ranking.

Benefits are annual flows lasting ten years, beginning at the end of year 6 for direct engagement and year 9 for the open platform, discounted at 5% in constant 2026 USD. Default full-scale expected annual benefits are about $3.81m and $10.33m, respectively, during each channel's benefit period. Their combined present value is about $77.03m.

The $1m Atlas investment is upfront and includes planned maintenance and engagement. The $1m cost per additional adopted reform is a total present-value allowance, including recurring costs and costs of adopted reforms that fail to deliver benefits. Nine expected additional adoptions imply $9m of expected policy costs. Net expected present value is therefore approximately $67.03m. No PPP or beneficiary-income welfare weighting has been applied.

Availability of data, political feasibility, and actual implementation require separate validation. If the same reform would happen later anyway, shorten the additional benefit period. Count each city only once and include any omitted harms or costs. Check that the Atlas budget can deliver the chosen coverage.

Running and testing
Three scenario buttons load pessimistic, median, or optimistic assumptions. Median preserves the full-scale assumptions above. The comparison table in the app lists the changing inputs; project scope, budget, city sizes, GDP, study benchmark, policy costs, benefit duration, and discount rate stay fixed. Direct-engagement data coverage stays at 100%, and each scenario uses one shared implementation-success rate. The scenarios are illustrative, not statistical confidence bounds. Manual edits clear the active preset indicator.

The app uses static HTML, CSS, and JavaScript. There is no backend, paid API, dependency installation, or build step. To run the model tests with Node.js installed: npm test.
For a local preview: python3 -m http.server 8769 --bind 127.0.0.1

Publishing
GitHub Pages publishes the root of the main branch. The .nojekyll file disables Jekyll processing. A public repository is eligible for Pages on GitHub Free for organizations. Edits pushed to main are published automatically.
https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

Evidence
Source links, assumptions, equations, and limitations are provided in the app. Settings are saved locally in the browser.
