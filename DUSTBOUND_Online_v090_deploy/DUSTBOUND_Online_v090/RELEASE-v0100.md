# DUSTBOUND Online 0.10.0

This release updates the existing multiplayer game and the same Render website.

## Visuals and controls

- Replaced Distress Beacon's thumbnail with a detailed reconstruction. The new artwork is used in the draft, board and catalogue; damaged/destroyed states have explicit state labels and impact effects.
- Added a clean version of the earlier scrap arena concept as a full-width, full-height background. The board is designed for landscape 16:9 screens and adapts to other viewport sizes without desktop side bars.
- Water costs and reserves use droplet shapes. Cost badges sit inside card artwork boundaries.
- Opponent bases open a readable inspection panel. Friendly bases can be inspected with right-click or keyboard focus and Enter.
- Detail and catalogue art uses `contain` so the entire image, including faces, is visible. Hand and battlefield art is anchored toward the top of the source illustrations.
- End Turn is centred on the battlefield divider.
- Cards display explicit PERSON, DELAYED EVENT and TACTIC labels, with distinct blue, purple and amber accents.
- Silo and raid controls have revised tank/metal panel styling, stored-water feedback and raid progress.
- Removed redundant information buttons. People use an EXHAUSTED label and dimmed artwork; shielded people have a visible barrier outline and label.
- Single-click a hand card to select; drag to play. Right-click or double-click to read. A selected card has a bright cyan glow.
- Drag a ready person onto a legal target to attack. Target lines show available attacks. Click a person to inspect it and choose SELECT THIS PERSON TO ATTACK for click targeting.
- Clicking away or an invalid target cancels a pending action; Escape and Cancel also work.
- Hands containing more than five cards overlap within the available width. Hover enlarges a card and makes longer text scrollable.
- The catalogue includes people, bases, events and tactics. Cards outside the default shared pool are marked RESERVE CARD.

## Shared feedback

All players receive public action metadata with each projected game state. It contains no private hand or draft choices. Both browsers animate attacks, deployments, destruction, base impacts and newly drawn own cards. Base hits show a flash, hit count and destruction effect. Barrier application, turn starts, event/raid progress and silo water income have explicit feedback. Reduced-motion users receive static feedback.

## Water balance

Normal turn income remains 3; player 2 retains 4 on their first turn. The holding cap remains 6.

- Water Cache: generate 2 instead of 1.
- Water Runner: generate 2 on deployment instead of 1; generate 1 at each later owner turn start while it survives.
- Salvage Caravan: generate 3 after 1 owner turn instead of 2 after 2 turns. Added to the shared pool, making 41 physical cards.
- End Turn stores remaining water automatically up to unused silo capacity: 1 normally, 2 with a surviving Reservoir Nine. Stored water is paid for at 1 reserve water per stored water and consumed once at the next owner turn start.

These are initial balance changes and should be assessed through further playtesting.

## Development and validation

The browser page is assembled at server startup from the preserved original artwork bundle, rules.cjs, ui-patch.cjs and client/upgrade.js. Run `npm run build:client` to validate that assembly. Run `npm run check` before publishing; it validates syntax, browser/server rule consistency, privacy projections, water balance, automatic storage, barriers and Rush restrictions.

The live game still uses one server process and in-memory rooms. Deployments/restarts reset ongoing matches.

## Artwork provenance

The built-in image-generation tool reconstructed the Distress Beacon tower from the original low-resolution reference and prepared a clean background plate from the existing scrap arena reference. Prompts requested preservation of the gritty industrial setting, removal of baked UI for the arena, and no text or icons. Final web assets: public/beacon.webp and public/arena.webp.
