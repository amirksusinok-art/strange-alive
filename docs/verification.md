# Verification — 2026-10-26

- `node --test`: 8/8 passed. Care, clamped stats, spam restriction, timed secret, varied care requirement, visits/evolution, offline freezing, malformed/denied storage, emotion priority.
- `node scripts/build.mjs`: static output generated successfully.
- Google Chrome through Playwright: desktop 1440px, tablet 768px, mobile 375px; no horizontal overflow and usable action sizes.
- Exercised keyboard help/Escape, care and spam, secret after simulated visible time, sound toggle, reload and visit count, reset/cancel, evolution after return, corrupt storage recovery, denied localStorage, reduced motion.
- Simulated document.hidden timer guard: activeSeconds stayed unchanged. This is a visibility-guard test, not an actual hour-long background-tab observation.
- No uncaught browser errors in the checked journeys.
- Independent code review found an idle-cycle reset bug. Reproduced with browser clock, fixed by resetting idleLevel on pointer/key activity; regression passed.
- Desktop and mobile screenshots inspected. Font is local; no runtime CDN dependency.

The browser checks use simulated elapsed time for long-running mechanics. Real-world long-term gameplay across several days was not observed.

## Publication

- Public repository: https://github.com/amirksusinok-art/strange-alive
- Live URL: https://strange-alive.onrender.com
- Render service: srv-dbfh5hq9lscs73a4trgg, static site, auto-deploy from main.
- Application commit e3d3146f2fd60baf765554632c062e6a7e799f28 deployed successfully. Render status Live; build log confirms static output upload and site publication.
- Public URL verification from this environment was blocked by a Cloudflare managed browser challenge. The public browser suite timed out before loading the game; it must not be reported as passing. Local Chrome suite passed 16 journeys, including the idle-cycle regression.
