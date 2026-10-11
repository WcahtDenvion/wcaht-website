# WCAHT Website

Frontend source for the WCAHT public website at [denvion.com](https://denvion.com).

The homepage presents the public testnet, wallet access, EVM compatibility,
validator roadmap, transaction finality, and live-network entry points. Its
motion system is code-rendered and includes reduced-motion and data-saver
fallbacks.

## Repository contents

- `templates/landing.html` — Jinja homepage template.
- `static/landing/styles.css` — responsive consumer-site design.
- `static/landing/script.js` — homepage interaction and canvas animation.
- `static/js/activation.js` — privacy-limited activation funnel helper.
- `static/landing/assets/` — public visual assets used by the homepage.
- `static/images/` — favicon and application icons.

## Runtime boundary

This repository intentionally contains the public website frontend only. The
validator implementation, private configuration, databases, operational
scripts, server inventory, and wallet keys are not part of this repository.

The template expects a Jinja-compatible application to serve `/static`, provide
the public API routes used by the live metrics, and optionally supply
`operator_bypass` and `turnstile_site_key`. Wallet installers and extension ZIP
files are release artifacts and are deliberately excluded from Git history.

## Basic validation

```sh
node --check static/landing/script.js
node --check static/js/activation.js
```

The production release is verified separately against both WCAHT website
origins and the public domains.
