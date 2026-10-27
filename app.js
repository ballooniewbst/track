(() => {
  const $ = (id) => document.getElementById(id);
  const joinSec = $("join"), appSec = $("app");
  const statusEl = $("status"), membersEl = $("members");
  const startBtn = $("startBtn"), stopBtn = $("stopBtn");
  const canvas = $("radar"), ctx = canvas.getContext("2d");

  let ws = null;
  let watchId = null;
  let members = [];
  let sharing = false;
  const lastPing = new Map(); // member id -> timestamp when the sweep last hit it

  // ---------- networking ----------
  function connect(name, room) {
    const proto = location.protocol === "https:" ? "wss" : "ws";
    ws = new WebSocket(`${proto}://${location.host}`);
    ws.onopen = () => ws.send(JSON.stringify({ type: "join", name, room }));
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.type === "joined") {
        $("roomLabel").textContent = msg.room;
        joinSec.classList.add("hidden");
        appSec.classList.remove("hidden");
      } else if (msg.type === "state") {
        members = msg.members;
        renderList();
      } else if (msg.type === "error") {
        alert(msg.message);
      }
    };
    ws.onclose = () => {
      stopWatching();
      if (!appSec.classList.contains("hidden")) setStatus("Disconnected", false);
    };
  }

  $("joinForm").addEventListener("submit", (e) => {
    e.preventDefault();
    connect($("name").value, $("room").value);
  });

  // ---------- sharing (always explicit) ----------
  startBtn.addEventListener("click", () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported in this browser.");
    setStatus("Waiting for location permission…", false);
    watchId = navigator.geolocation.watchPosition(
      (p) => {
        sharing = true;
        ws.send(JSON.stringify({
          type: "location",
          lat: p.coords.latitude,
          lng: p.coords.longitude,
          acc: p.coords.accuracy,
        }));
        startBtn.classList.add("hidden");
        stopBtn.classList.remove("hidden");
        setStatus("Sharing your location with this room", true);
      },
      (err) => {
        stopWatching();
        setStatus(`Could not get location (${err.message})`, false);
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
  });

  function stopWatching() {
    if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    watchId = null;
    sharing = false;
    startBtn.classList.remove("hidden");
    stopBtn.classList.add("hidden");
  }

  stopBtn.addEventListener("click", () => {
    stopWatching();
    if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "stop" }));
    setStatus("Not sharing", false);
  });

  $("leaveBtn").addEventListener("click", () => {
    stopWatching();
    if (ws) ws.close();
    appSec.classList.add("hidden");
    joinSec.classList.remove("hidden");
    members = [];
    setStatus("Not sharing", false);
  });

  function setStatus(text, on) {
    statusEl.textContent = text;
    statusEl.classList.toggle("on", !!on);
  }

  // ---------- geo helpers ----------
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  function distance(a, b) {
    const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
    const h = Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  function bearing(a, b) { // radians clockwise from north
    const y = Math.sin(rad(b.lng - a.lng)) * Math.cos(rad(b.lat));
    const x = Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
      Math.sin(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.cos(rad(b.lng - a.lng));
    return (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
  }
  const fmt = (m) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

  function others() {
    const me = members.find((m) => m.you);
    if (!me || !me.pos) return [];
    return members
      .filter((m) => !m.you && m.pos)
      .map((m) => ({ ...m, dist: distance(me.pos, m.pos), brg: bearing(me.pos, m.pos) }));
  }

  // ---------- member list ----------
  function renderList() {
    membersEl.innerHTML = "";
    const near = new Map(others().map((o) => [o.id, o]));
    for (const m of members) {
      const li = document.createElement("li");
      const left = document.createElement("span");
      left.textContent = m.name + (m.you ? " (you)" : "");
      const right = document.createElement("span");
      right.className = "meta";
      if (m.you) right.textContent = m.sharing ? "sharing" : "not sharing";
      else if (!m.sharing) right.textContent = "not sharing";
      else if (near.has(m.id)) right.textContent = fmt(near.get(m.id).dist) + " away";
      else right.textContent = "sharing (start sharing to see them)";
      li.append(left, right);
      membersEl.appendChild(li);
    }
  }

  // ---------- radar drawing ----------
  const SWEEP_PERIOD = 4000; // ms per rotation

  function niceMax(d) {
    const steps = [100, 250, 500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000, 1e6, 5e6, 2e7];
    return steps.find((s) => s >= d * 1.15) || 2e7;
  }

  function draw(now) {
    const W = canvas.width, cx = W / 2, cy = W / 2, r = W / 2 - 12;
    ctx.clearRect(0, 0, W, W);

    // rings
    ctx.strokeStyle = "rgba(61,255,139,0.25)";
    ctx.lineWidth = 1.5;
    for (let i = 1; i <= 4; i++) {
      ctx.beginPath(); ctx.arc(cx, cy, (r * i) / 4, 0, Math.PI * 2); ctx.stroke();
    }
    // crosshair + north tick
    ctx.beginPath();
    ctx.moveTo(cx - r, cy); ctx.lineTo(cx + r, cy);
    ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy + r);
    ctx.stroke();
    ctx.fillStyle = "rgba(61,255,139,0.7)";
    ctx.font = "bold 18px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText("N", cx, 24);

    // sweep (angle 0 = north, clockwise)
    const sweep = ((now % SWEEP_PERIOD) / SWEEP_PERIOD) * Math.PI * 2;
    const canvasAngle = sweep - Math.PI / 2;
    if (ctx.createConicGradient) {
      const g = ctx.createConicGradient(canvasAngle - Math.PI * 0.6, cx, cy);
      g.addColorStop(0, "rgba(61,255,139,0)");
      g.addColorStop(0.3, "rgba(61,255,139,0.35)");
      g.addColorStop(0.3001, "rgba(61,255,139,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "rgba(61,255,139,0.95)";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(canvasAngle) * r, cy + Math.sin(canvasAngle) * r);
    ctx.stroke();

    // me, in the middle
    ctx.fillStyle = "#3dff8b";
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill();

    // others as blips
    const list = others();
    const maxD = niceMax(Math.max(0, ...list.map((o) => o.dist)));
    ctx.fillStyle = "rgba(127,184,152,0.9)";
    ctx.font = "13px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(fmt(maxD), cx + 8, cy - r + 36);

    for (const o of list) {
      const a = o.brg - Math.PI / 2;
      const rr = Math.max(14, (o.dist / maxD) * r);
      const x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;

      // detect when the sweep passes this blip
      const diff = (sweep - o.brg + Math.PI * 2) % (Math.PI * 2);
      if (diff < 0.08) lastPing.set(o.id, now);
      const since = now - (lastPing.get(o.id) ?? now - SWEEP_PERIOD);
      const glow = Math.max(0.25, 1 - since / SWEEP_PERIOD);

      // expanding ping ring
      ctx.strokeStyle = `rgba(61,255,139,${glow * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, 8 + (1 - glow) * 22, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = `rgba(255,255,255,${0.4 + glow * 0.6})`;
      ctx.shadowColor = "#3dff8b";
      ctx.shadowBlur = 14 * glow;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;

      ctx.fillStyle = `rgba(214,245,227,${0.5 + glow * 0.5})`;
      ctx.font = "15px ui-monospace, monospace";
      ctx.fillText(`${o.name} · ${fmt(o.dist)}`, x + 12, y + 5);
    }

    if (!sharing) {
      ctx.fillStyle = "rgba(127,184,152,0.9)";
      ctx.font = "16px ui-monospace, monospace";
      ctx.textAlign = "center";
      ctx.fillText("Start sharing to see others", cx, cy + r * 0.55);
    }

    requestAnimationFrame(draw);
  }
  requestAnimationFrame(draw);
  setInterval(renderList, 3000);
})();
