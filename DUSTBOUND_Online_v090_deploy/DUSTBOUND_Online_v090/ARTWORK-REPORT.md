# Artwork troubleshooting — Blackwater test build

No card image is failing to load. The problem is artwork selection and incomplete integration, rather than broken image URLs.

## Characters: verified against the approved package

All 26 character illustrations and Scrap Drone match their assigned source files in the approved v2 character ZIP. The encoded game images were compared against every source image; all 27 were closest to the correct gameplay ID, with a maximum mean RGB difference of 0.84/255 on comparison thumbnails (normal WebP compression).

Field Medic, Dust Stalker, Bone Collector, Chem Thrower and Radio Operator deliberately use alien redesigns in that package. Goo Alchemist uses the approved human female design. These were not silently swapped to older human versions.

## Events and tactics: legacy placeholders remain

All 22 defined events/tactics still reference older assets; 15 of these are in the current 41-card shared deck. The character export explicitly excludes events and tactics. Their source sheets exist in the Visual Library, but the game does not contain a verified per-card mapping to those sheets. No replacement was guessed or generated during this troubleshooting pass.

| Card | Currently displayed illustration | In shared deck |
|---|---|---|
| Scrounge | old Scrounge illustration | Yes |
| Sandstorm | old Sandstorm illustration | Reserve/catalogue only |
| Mortar Strike | old turret illustration | Yes |
| Sabotage | old raider illustration | Reserve/catalogue only |
| Patch Kit | old Water Runner illustration | Yes |
| Water Cache | old Scrounge illustration | Yes |
| Supply Drop | old convoy illustration | Yes |
| Fallout Front | old Sandstorm illustration | Yes |
| Dust Ambush | old Dune Raider illustration | Yes |
| Salvage Caravan | old Convoy Truck illustration | Yes |
| Repair Convoy | old Field Medic illustration | Yes |
| Toxic Ashfall | old Sandstorm illustration | Reserve/catalogue only |
| Crossfire | old Harpoon Gunner illustration | Reserve/catalogue only |
| Emergency Barricade | old Road Warden illustration | Reserve/catalogue only |
| Scrap Tempest | old Sandstorm illustration | Reserve/catalogue only |
| Reinforcement Signal | old Junker Engineer illustration | Yes |
| Nightfall Strike | old Desert Marksman illustration | Reserve/catalogue only |
| Recon Sweep | old Radio Operator illustration | Yes |
| Viscous Flood | old Sandstorm illustration | Yes |
| Rallying Cry | old Road Warden illustration | Yes |
| Battle Frenzy | old Dune Raider illustration | Yes |
| Corrosive Rain | old Sandstorm illustration | Yes |

Source folders: [Events](https://drive.google.com/drive/folders/1_lqfdbeMm7_w9kpqXHYXnx015JpG5DPV), [Tactics](https://drive.google.com/drive/folders/1zasizj5paN3pHefJdRbHVSU9mYILzJ4I). These contain composite source sheets, not an integrated card-to-file manifest. The next artwork step is to identify each approved panel, extract it without changing its artwork, and map it to the correct event/tactic ID.

## Base artwork limitations

- Ash Collector, Acid Rain Rig and Storm Redirector still use low-resolution prototypes in all three states.
- Distress Beacon uses one high-resolution illustration for intact, damaged and destroyed. The game changes the health/state label, but the artwork itself does not change.
- The other base images exist in all three states, but their source metadata still marks them as candidates needing visual QA. Their thematic assignments have not been certified by this character-only audit.
- The Blackwater artwork contains painted base structures and concept health values. The test board overlays real base names and 2-health values. Unique base illustrations remain available through inspection/catalogue; the painted structures are not individual base-card art.

## Display and online fixes in this test build

- Removed the layout rule that letterboxed the whole board. It now fills the browser viewport. A 16:9 screen uses the approved composition at 16:9; differently shaped windows adapt without blank bars. FULL SCREEN expands the browser document while keeping inspection overlays available.
- Widened the hand from 29% to 67% of the window, with larger cards and multi-line text. Hover or select to read longer effects. Hands above five cards overlap.
- Added a visible water tank to the silo, animated fill level, actual capacity and next-turn gain. Capacity and water income rules are unchanged.
- The earlier 127.0.0.1 link was a local preview address. A separate GitHub branch and public Render test service provide a shareable address. The stable live service remains on main.

The existing version remains v0.10.0. No card balance or gameplay rules were changed.
