# CARL design handoff

- `tokens.css` — both theme token sets, plus the two Deco components (frame corners, hex button) as CSS. Treat this as the spec; copy it into the app and refactor as you like, but keep the geometry.
- `button-tip.svg` — the button end cap. Exact proportions; do not redraw.
- `mockups/*.dc.html` — one self-contained HTML file per screen. The `<helmet><style>` block and the inline styles are the real values (sizes, spacing, colors). The `<x-dc>`, `<helmet>` and `support.js` wrappers are from the design tool; ignore them.
- `renders/*.png` — each mockup rendered at 2x. Look at these first, then read the HTML for numbers.

Screens: Main (blank home, Surprise me), MainTyping (ghost completion state), Editor, Share, Screen (show-my-screen portrait), ScreenLandscape (landscape with safe-area guides drawn), About, OgCard (1200x630 link preview). *Dark variants are the reference theme.*

Fonts: Cormorant Garamond (500/600/700) and Alegreya (400/500/italic), both SIL OFL. Self-host subsetted woff2; the OG renderer uses the same Cormorant subset.
