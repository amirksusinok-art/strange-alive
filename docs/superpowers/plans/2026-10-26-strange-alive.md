# STRANGE Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Ship the approved Russian creature game to GitHub and Render.
**Architecture:** Static ES modules, pure state transitions with explicit timestamps, DOM renderer and event controller. No runtime dependencies.
**Tech Stack:** HTML, CSS, JavaScript, node:test; real browser verification.
**Spec:** ../specs/2026-10-26-strange-alive-design.md (approved by user: Proceed).

## Global Constraints
- Five stats; reversible mischief; sound opt-in; reduced motion and keyboard support.
- Secret after 180 seconds of visible acquaintance, four actions and trust >= 60.
- Offline stats frozen; evolution requires trust and visits separated by 30 minutes.
- GitHub amirksusinok-art/strange-alive, Render workspace tea-d9nkpflaeets73c5jgqg; static/free.

## Review Focus
- Corrupt and denied storage: safe usable session.
- Rapid clicking/reload: no fast progression.
- Hidden tab: no timer progression or stat changes.
- Small screens and keyboard: accessible controls, no overflow or escaping focus.
- Events/secret/dialog: reversible visuals and working return to game.

### Task 1: State and persistence
Files: public/state.js, tests/state.test.js, package.json.
Interfaces: createState(now), loadState(storage, now), saveState(storage,state), handleAction(state,action,now), tick(state,seconds), updateEmotion(state), openSecret(state).
- [ ] Write tests for action stats, spam restriction, secret timing, evolution visits, offline freezing, malformed/denied storage.
- [ ] Run node --test: observe missing implementation failure.
- [ ] Implement state module, run tests green, commit.

### Task 2: Playable designed interface
Files: public/index.html, public/style.css, public/script.js, public/favicon.svg, scripts/serve.mjs, scripts/build.mjs.
Interfaces: controller consumes Task 1 state API; semantic buttons use data-action.
- [ ] Build a dark editorial creature habitat: mint creature, four action tiles, speech, progress and log.
- [ ] Implement timers, cursor eyes, animation, event scheduler, sound, secret scene, details/settings dialogs and storage notices.
- [ ] Build and check desktop/375/768 layouts, actions, keyboard, dialogs, save/reload, storage denied and reduced motion in real browser.
- [ ] Run all state tests and build, commit.

### Task 3: Review and publish
Files: README.md, render.yaml, .gitignore, docs/verification.md.
- [ ] Fresh independent code review; resolve important issues with regression checks.
- [ ] Verify tests, build and browser paths; document evidence.
- [ ] Create public repository via GitHub fallback if connector cannot create repositories; publish content via GitHub plugin.
- [ ] Create static site through Render plugin, await live deployment and verify real page/assets.
- [ ] Record final links and commit published source locally.

## Execution ledger
Ruling: user approved design and instructed Proceed; execute continuously in this existing empty workspace without another plan approval. Native execution; one final independent review.
Pre-flight: Task 2 consumes pure API from Task 1; Task 3 publishes public/ through build into dist/. Interfaces consistent.
