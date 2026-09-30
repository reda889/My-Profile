const DISCORD_ID = "907591107200827442";

// اكتب البايو هنا إن أردت (يتقدم على أي مصدر آخر). اتركه فارغاً للجلب التلقائي.
const BIO = "";

// ---------- Music ----------
const bgMusic = document.getElementById("bg-music");
bgMusic.src = "./song.mp3";
const muteBtn = document.getElementById("mute-btn");
const muteIcon = document.getElementById("mute-icon");

function syncIcon() {
  muteIcon.className = (bgMusic.paused || bgMusic.muted)
    ? "fa-solid fa-volume-xmark"
    : "fa-solid fa-volume-high";
}
["play", "pause", "volumechange"].forEach(ev => bgMusic.addEventListener(ev, syncIcon));

document.addEventListener("click", () => {
  if (bgMusic.paused) bgMusic.play().catch(() => {});
}, { once: true });

muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bgMusic.paused) { bgMusic.muted = false; bgMusic.play().catch(() => {}); }
  else bgMusic.muted = !bgMusic.muted;
});

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
function setText(id, text) { const e = $(id); if (e) e.textContent = text; }
function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ---------- Lanyard ----------
let lastPresence = null;

async function fetchProfileData() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const json = await res.json();
    if (json.success && json.data) updateProfile(json.data);
    else console.error("Lanyard error:", json);
  } catch (err) {
    console.error("Error fetching REST API:", err);
  }
}

let ws, heartbeat;
function connectSocket() {
  ws = new WebSocket("wss://api.lanyard.rest/socket");
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
      }, msg.d.heartbeat_interval);
      return;
    }
    if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") updateProfile(msg.d);
  };
  ws.onclose = () => { clearInterval(heartbeat); setTimeout(connectSocket, 3000); };
}

// ---------- Bio ----------
// Lanyard لا يرجع البايو. الأولوية: الثابت BIO ثم kv.bio ثم خدمة خارجية (dcdn.dstn.to)
let externalBio = null;
async function fetchExternalBio() {
  try {
    const res = await fetch(`https://dcdn.dstn.to/profile/${DISCORD_ID}`);
    const json = await res.json();
    externalBio = json?.user_profile?.bio || "";
    if (lastPresence) renderBio(lastPresence);
  } catch (e) { console.warn("Bio fetch failed:", e); }
}
function renderBio(d) {
  setText("bio", BIO || d.kv?.bio || externalBio || "No bio available.");
}

// ---------- Nameplate (animated webm + static fallback) ----------
let currentPlate = null;
function renderNameplate(user) {
  const video = $("nameplate-video");
  const box = $("nameplate");
  const asset = user.collectibles?.nameplate?.asset;
  if (!asset) { video.style.display = "none"; return; }
  if (asset === currentPlate) return;
  currentPlate = asset;

  const base = `https://cdn.discordapp.com/assets/collectibles/${asset}`;
  video.style.display = "block";
  video.poster = `${base}static.png`;
  video.src = `${base}asset.webm`;
  video.play().catch(() => {});
  // إذا لم يدعم المتصفح webm: نعرض الصورة الثابتة كخلفية
  video.onerror = () => {
    video.style.display = "none";
    box.style.backgroundImage = `url('${base}static.png')`;
    box.style.backgroundSize = "cover";
    box.style.backgroundPosition = "center";
  };
}

// ---------- Activity ----------
let spotifyTimer = null;
function renderActivity(d) {
  const box = $("activity-content");
  clearInterval(spotifyTimer);
  box.replaceChildren();

  // Spotify
  if (d.listening_to_spotify && d.spotify) {
    const sp = d.spotify;
    const card = h("div", "spotify");
    const art = h("img"); art.src = sp.album_art_url; art.alt = "";
    const info = h("div", "spotify-info");
    info.append(h("div", "t", sp.song), h("div", "a", sp.artist));
    const bar = h("div", "spotify-bar"); const fill = h("span"); bar.append(fill);
    info.append(bar);
    card.append(art, info);
    box.append(card);

    const tick = () => {
      const { start, end } = sp.timestamps;
      const pct = Math.min(100, Math.max(0, ((Date.now() - start) / (end - start)) * 100));
      fill.style.width = pct + "%";
    };
    tick();
    spotifyTimer = setInterval(tick, 1000);
  }

  // Games / apps (skip custom status type 4 and Spotify type 2)
  (d.activities || []).filter(a => a.type !== 4 && a.type !== 2).forEach(a => {
    const line = h("div", "status-line");
    line.textContent = a.name + (a.details ? ` - ${a.details}` : "") + (a.state ? ` (${a.state})` : "");
    box.append(line);
  });

  // Custom status
  const custom = (d.activities || []).find(a => a.type === 4);
  if (custom && (custom.state || custom.emoji)) {
    box.append(h("div", "status-line", `${custom.emoji ? custom.emoji.name + " " : ""}${custom.state || ""}`));
  }

  if (!box.children.length) box.textContent = "No recent activity";
}

// ---------- Main render ----------
function updateProfile(d) {
  lastPresence = d;
  if (location.search.includes("debug")) console.log("Lanyard data:", d);

  const user = d.discord_user;
  setText("display-name", user.global_name || user.username);
  setText("username", `@${user.username}`);

  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=512`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  $("avatar").src = avatarUrl;
  $("avatar-small").src = avatarUrl;

  const decor = $("decoration");
  if (user.avatar_decoration_data) {
    // passthrough=true يعطي النسخة المتحركة
    decor.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png?size=240&passthrough=true`;
    decor.style.display = "block";
  } else {
    decor.style.display = "none";
  }

  $("status-dot").className = `status-dot ${d.discord_status}`;

  renderNameplate(user);
  renderBio(d);
  renderActivity(d);
}

fetchProfileData();
connectSocket();
fetchExternalBio();
