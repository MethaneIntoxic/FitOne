# FitOne

FitOne is a performance-focused, privacy-first fitness companion built as a single-page Progressive Web App (PWA). It helps lifters, athletes, and health-conscious users track nutrition, training, body composition, hydration, and readiness in one streamlined workflow.

Train with intent, recover smarter, and stay consistent with analytics that turn daily logs into actionable decisions.

## Why FitOne

- **All-in-one tracking**: food, macros, workouts, body measurements, and water intake
- **Actionable performance analytics**: calorie, macro, weight, workout, meal timing, readiness, and adaptive TDEE views
- **PWA-ready**: installable, mobile-optimized, and offline-capable with service worker caching
- **Privacy-first**: all data is stored locally in your browser via `localStorage`
- **Fast training workflow**: no backend setup required, open `index.html` and start logging

## Features

- Daily dashboard with macro rings, calorie progress, net calories, and streaks
- Food logging with edit/duplicate, favorites, and search/filter
- Workout logging with exercise rows and protocol templates
- Body metric logging with trend visualization
- Water tracking with quick-add, custom amount, and undo
- Insight engine for nutrition, hydration, consistency, and readiness signals
- Data export/import (`.json`) for backup and portability
- Theme toggle and accessibility-minded interactions

## Project Structure

- `index.html` — main app UI, styles, and logic
- `sw.js` — service worker for offline cache support
- `uiux_best_practices.md` — UX architecture and behavior design reference

## Quick Start

1. Clone or download this folder.
2. Open `index.html` in your browser.
3. (Recommended) Serve locally for best PWA behavior:
   - Python: `python -m http.server 5500`
   - Then open `http://localhost:5500`

## Browser UAT Automation (Playwright)

FitOne includes browser-based UAT automation powered by Playwright.

1. Start the static server on the expected test URL:
   - `npm run dev`
   - This serves the app at `http://localhost:4173`

2. In a second terminal, run the UAT suite:
   - `npm run test:e2e`
   - or `npx playwright test`

3. After test completion:
   - Review Playwright artifacts in `test-results/`
   - Review generated failure tickets in `tickets/` (`.json` and `.md`)

## Data & Privacy

- FitOne stores data in browser `localStorage` only.
- No server-side data collection is included by default.
- Use Export regularly if you want durable backups.

## Recommended GitHub Repo Settings

- **Repository name**: `FitOne`
- **Description**: `FitOne is a privacy-first PWA for tracking nutrition, workouts, body metrics, hydration, and readiness with rich on-device analytics.`
- **Topics**: `fitness`, `pwa`, `health-tech`, `javascript`, `offline-first`, `nutrition-tracker`, `workout-tracker`

## License

This project is licensed under the MIT License. See `LICENSE` for details.
