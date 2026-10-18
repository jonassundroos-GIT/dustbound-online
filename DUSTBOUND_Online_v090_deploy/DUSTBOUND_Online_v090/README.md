# DUSTBOUND Online — v0.9.0

Play from one public URL without any host/answer codes. Includes automatic Quick Match, private invitation links, authoritative Node.js WebSocket server, reconnection (same browser tab), rematch voting, and the original local/quick-test modes.

## Start locally

- Requires Node.js 20+; no npm dependencies required.
- Run `npm start` in this folder.
- Open `http://localhost:3000` in two separate browser contexts or devices on the same network.
- Click **Quick Match** in both, or **PRIVATE MATCH LINK** then open the generated link in the other browser.

## Deploy to a public website

Deploy this entire folder as a **Node web service** on a host supporting persistent WebSocket connections (e.g. Railway, Fly.io, or another Node.js host). Start command: `npm start`. Health route: `/healthz`. Set PORT if your host doesn't inject it. Enable HTTPS (the browser automatically uses WSS).

Keep a **single server instance** for this in-memory matchmaking beta; multiple replicas will fragment the lobby. Public rooms and reconnect tokens are lost on server restart. For production, add a shared datastore, durable rooms, anti-abuse mechanisms, and game telemetry.

The included `railway.json` and `Dockerfile` support common Node hosting workflows. A custom `.io` domain must be purchased/connected to the hosting service; the build does not itself register a domain.

## Security and gameplay

- The server owns full match state and uses the unmodified v0.8.15 RULES engine.
- Clients send actions only. The server checks legality and sends player-specific projections; the opponent cannot inspect your hidden hand or draft choices.
- WebSocket origin is checked against the host; actions and frame sizes are limited.
- There are no passwords or user accounts. Random private-match links are unguessable, but anyone with the link can join an open private room. Do not share your reconnect token.
- Each player gets a `sessionStorage` reconnect token that survives refresh in the same tab. Reconnect is not durable across server restarts.
- The full-art embedded artwork makes the initial HTML download approximately 13 MB (compresses with gzip).

**Version:** 0.9.0 online beta. Gameplay rules, base artwork, card economy and card description formatting remain unchanged from v0.8.15.
