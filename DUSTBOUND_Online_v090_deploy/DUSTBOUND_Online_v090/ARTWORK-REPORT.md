# Blackwater test: artwork and rules audit

All 26 approved people and Scrap Drone keep their assigned illustrations. Each was compared against the approved character package and matched its gameplay ID. Inspection/catalogue and expanded hand cards display the whole portrait. Board portraits now use contain framing to prevent cropped heads.

The previous artwork problems were placeholder mappings and tiny base prototypes, not failed image URLs. All 22 events/tactics now have individual pictures: 18 original source panels at native resolution, and four newly illustrated missing scenes (Viscous Flood, Rallying Cry, Battle Frenzy, Corrosive Rain). This includes reserve catalogue cards.

Acid Rain Rig, Ash Collector and Storm Redirector previously used 116 by 48 pixel prototypes. They now have full-resolution reconstructions of the same designs with separate intact, damaged and destroyed states. These are reconstructions, not recovered original high-resolution masters. Other bases retain their existing native state pictures. Distress Beacon uses its existing full-resolution picture across states, with updated health/state labels.

Base art fills the entire box, with title, water cost and health overlaid. The approved Blackwater arena is unchanged (SHA256 a6554db518c87cdad07b28b7cd1a6c5e5eef20a6c72534b6552bbffe531c5c9d).

Replacement dimensions, hashes and provenance: public/artwork-manifest.json. Exact built-in image-generation prompts: ARTWORK-PROMPTS.md. Full PNG masters: ../artwork-masters/. No battlefield was generated.

History retains complete public actions, including player, card, event/tactic type, water cost, target, resolutions, movement and silo use. Private hands and unrevealed supply cards remain hidden.

Change Lanes moves or swaps for only the selected person's printed water cost. Anchored people cannot move. Readiness/exhaustion is preserved; moving never grants another attack. Fresh Rush moved into Toxic Goo cannot attack.

Empty Silo returns all stored water immediately, even on the same turn. Make room within the six-water reserve first so the refund loses nothing. Base turn income remains three, with the established four-water first turn for Player 2.

All bases start at 10 HP. Exposed-base attacks deal the person's effective attack, including modifiers. Breachworks doubles that next attack. Explicit one-hit tactics/events/base abilities still deal one damage per printed hit. Repairs restore living damaged bases to maximum health and cannot revive destroyed bases.

Field Medic now prefers a wounded ally in its own column, then itself; the old first-occupied-slot lookup could mask that ally. Radio Operator reveals the scanned card and bottom/keep result in history and a toast. Scrap Hound attacks an enemy person in its own column immediately, then exhausts. Bone Lottery now also respects its Rush. Fresh Rush cannot attack bases or through Toxic Goo, as stated on the card.

The release remains v0.10.0 on blackwater-test. Stable main is unchanged. Online rooms are held in memory and reset when the service restarts.
