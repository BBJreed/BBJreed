# Emberhold

A dark-fantasy idle keep-builder, playable in any browser — no build step, no server, no dependencies beyond a Google Fonts stylesheet.

**[Play it live](https://claude.ai/code/artifact/0073e85a-0333-444e-8ba0-99f9eaa0e91f)**, or open `index.html` directly.

## What it is

You hold Emberhold, a keep on the border of the dark. Train the Vigil-Warden at the **Keep Hall**, recruit champions at the **Wanderer's Rest**, pull from the **Rift Gate** for rarer ones, temper your sigil at the **Foundry**, and march the roster into the **Proving Ring** — a stage-based auto-battler where your total Power is weighed against the enemy's. A slow trickle of Ember collects at the **Deep Vein** whether you're watching or not; release spare champions at the **Marrow Altar** for Marrow, then spend it on a guaranteed Legendary. **Trials** (one-time milestones) and **Bounties** (daily resets) round out the loop.

## Stack

Single self-contained `index.html`: vanilla JS, no framework, no build tooling. State persists to `localStorage`, including an offline-progress calc on reload. Typefaces are Cinzel (display), Manrope (UI), and JetBrains Mono (numerals), loaded from Google Fonts.

## Run it

```
open index.html
```

or serve the folder with anything static (`python3 -m http.server`, etc).
