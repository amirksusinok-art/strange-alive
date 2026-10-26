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
