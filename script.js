const DISCORD_ID = "907591107200827442";

// اكتب البايو هنا إن أردت (يتقدم على أي مصدر آخر). اتركه فارغاً للجلب التلقائي.
const BIO = "";

// ---------- روابط التواصل ----------
// لإضافة موقع: انسخ سطراً وغيّر name و url و icon. للحذف: احذف السطر.
// أسماء الأيقونات من https://fontawesome.com/search?o=r&m=free&f=brands
const SOCIALS = [
  { name: "Discord", url: `https://discord.com/users/${907591107200827442}`, icon: "fa-brands fa-discord" },
  { name: "tiktok",       url: "https://www.tiktok.com/@gaiseric56",              icon: "fa-brands fa-tiktok" },
  { name: "YouTube", url: "https://youtube.com/@gaiseric56",        icon: "fa-brands fa-youtube" },
];

// ---------- Music ----------
const MUSIC_FILE = "./song.mp3";   // اسم الملف (على GitHub Pages الحروف الكبيرة/الصغيرة تفرق)
const bgMusic = document.getElementById("bg-music");
const muteBtn = document.getElementById("mute-btn");
bgMusic.src = MUSIC_FILE;
bgMusic.volume = 0.6;
bgMusic.addEventListener("error", () =>
  console.error("Music failed to load:", MUSIC_FILE, "- تأكد أن الملف مرفوع وأن اسمه مطابق تماماً"));

function syncIcon() { muteBtn.classList.toggle("muted", bgMusic.paused || bgMusic.muted); }
["play", "pause", "volumechange"].forEach(ev => bgMusic.addEventListener(ev, syncIcon));
syncIcon();

// المتصفحات تمنع التشغيل التلقائي حتى أول لمس/نقر
function unlockAudio(e) {
  if (muteBtn.contains(e.target)) return;
  bgMusic.play().then(() => {
    ["click", "touchend", "keydown"].forEach(t => document.removeEventListener(t, unlockAudio));
  }).catch(() => {});
}
["click", "touchend", "keydown"].forEach(t => document.addEventListener(t, unlockAudio));
bgMusic.play().catch(() => {});

muteBtn.addEventListener("click", () => {
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
    box.style.backgroundSize = "auto 100%"; box.style.backgroundRepeat = "no-repeat";
    box.style.backgroundPosition = "right center";
  };
}

// ---------- Activity (Discord-style cards) ----------
let actTimer = null;
const HEADS = { 0: "Playing", 1: "Streaming", 3: "Watching", 5: "Competing in" };

function fmt(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function activityImage(a) {
  const img = a.assets?.large_image;
  if (!img) return null;
  if (img.startsWith("mp:")) return `https://media.discordapp.net/${img.slice(3)}`;
  return a.application_id ? `https://cdn.discordapp.com/app-assets/${a.application_id}/${img}.png` : null;
}

function headRow(text, iconClass) {
  const row = h("div", "act-head");
  row.append(h("span", "", text));
  if (iconClass) row.append(h("i", iconClass));
  return row;
}

function renderActivity(d) {
  const box = $("activity-content");
  clearInterval(actTimer);
  box.replaceChildren();
  const tickers = [];

  // Spotify
  if (d.listening_to_spotify && d.spotify) {
    const sp = d.spotify;
    const { start, end } = sp.timestamps;
    const card = h("div", "act-card");
    const art = h("img", "act-art"); art.src = sp.album_art_url; art.alt = "";
    const txt = h("div", "act-text");
    txt.append(h("div", "act-title", sp.song), h("div", "act-sub", sp.artist));
    const main = h("div", "act-main"); main.append(art, txt);
    const bar = h("div", "act-bar"); const fill = h("span"); bar.append(fill);
    const times = h("div", "act-times"); const cur = h("span", "", "00:00");
    times.append(cur, h("span", "", fmt(end - start)));
    card.append(headRow("Listening to Spotify", "fa-brands fa-spotify"), main, bar, times);
    box.append(card);
    tickers.push(() => {
      const el = Math.min(Math.max(Date.now() - start, 0), end - start);
      fill.style.width = (el / (end - start)) * 100 + "%";
      cur.textContent = fmt(el);
    });
  }

  // Games / apps
  (d.activities || []).filter(a => a.type !== 4 && a.type !== 2).forEach(a => {
    const card = h("div", "act-card");
    const main = h("div", "act-main");
    const imgUrl = activityImage(a);
    if (imgUrl) { const art = h("img", "act-art"); art.src = imgUrl; art.alt = ""; main.append(art); }
    const txt = h("div", "act-text");
    txt.append(h("div", "act-title", a.name));
    if (a.details) txt.append(h("div", "act-sub", a.details));
    if (a.state) txt.append(h("div", "act-sub", a.state));
    if (a.timestamps?.start) {
      const el = h("div", "act-sub", "");
      txt.append(el);
      tickers.push(() => { el.textContent = fmt(Date.now() - a.timestamps.start) + " elapsed"; });
    }
    main.append(txt);
    card.append(headRow(HEADS[a.type] || "Playing"), main);
    box.append(card);
  });

  const hasCards = box.children.length > 0;
  $("activity-title").style.display = hasCards ? "none" : "";

  // Custom status
  const custom = (d.activities || []).find(a => a.type === 4);
  if (custom && (custom.state || custom.emoji)) {
    box.append(h("div", "status-line", `${custom.emoji ? custom.emoji.name + " " : ""}${custom.state || ""}`));
  }
  if (!box.children.length) box.textContent = "No recent activity";

  const run = () => tickers.forEach(f => f());
  run();
  if (tickers.length) actTimer = setInterval(run, 1000);
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

function renderSocials() {
  const box = $("social-links");
  SOCIALS.forEach(s => {
    const a = h("a", "social-icon");
    a.href = s.url; a.target = "_blank"; a.rel = "noopener";
    a.title = s.name; a.setAttribute("aria-label", s.name);
    a.append(h("i", s.icon));
    box.append(a);
  });
}

renderSocials();
fetchProfileData();
connectSocket();
fetchExternalBio();
