# Radar Meetup

Opt-in, mutual location sharing with a radar-style display. Join a room with a code, choose to share your location, and see where everyone else in the room is on a sweeping radar. Good for meeting up with a partner, friends, or family.

## How consent works

Consent is built into how the app behaves, not just the wording:

- **Joining a room shares nothing.** You enter a name and a room code, and that's it.
- **Sharing is a deliberate click.** Nobody's location is sent until that person presses *Start sharing my location* and accepts the browser's own permission prompt.
- **It's reciprocal.** You only see other people's locations while you are sharing yours. The server enforces this.
- **Everyone can see who is in the room** and who is currently sharing.
- **Stopping is instant.** *Stop sharing* (or leaving or closing the tab) removes your location from the server immediately.
- **No storage.** Locations live in server memory only. Nothing is written to disk or a database, and there are no accounts or tracking.

Please only use this with people who know about it and have agreed to it.

## Run it

```bash
npm install
npm start
```

Open http://localhost:3000, pick a name and a room code, and share the code with the other person.

Notes:

- Browsers only allow geolocation on `https://` or `localhost`. To use it across two phones, deploy it somewhere with HTTPS (Render, Railway, Fly.io, etc.) or tunnel it with something like `ngrok http 3000`.
- Set the `PORT` environment variable to change the port.

## Radar display

- You are the centre dot. Others appear at their real bearing (north is up) and distance.
- The scale adjusts automatically to the farthest person, and the outer ring shows its range.
- Blips light up and send out a ping ring each time the sweep passes over them.

## Files

| File | Purpose |
| --- | --- |
| `server.js` | Express + WebSocket server, in-memory rooms |
| `index.html`, `style.css` | UI |
| `app.js` | Client logic, geolocation, radar canvas animation |

## License

MIT
