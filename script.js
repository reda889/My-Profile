const DISCORD_ID = "907591107200827442";

// ---------- Music ----------
const bgMusic = document.getElementById("bg-music");
bgMusic.src = "./song.mp3";

const muteBtn = document.getElementById("mute-btn");
const muteIcon = document.getElementById("mute-icon");

document.addEventListener("click", () => {
  if (bgMusic.paused) bgMusic.play().catch(() => {});
}, { once: true });

muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bgMusic.muted || bgMusic.paused) {
    bgMusic.muted = false;
    bgMusic.play().catch(() => {});
    muteIcon.className = "fa-solid fa-volume-high";
  } else {
    bgMusic.muted = true;
    muteIcon.className = "fa-solid fa-volume-xmark";
  }
});

// ---------- Lanyard ----------
async function fetchProfileData() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const json = await res.json();
    if (json.success && json.data) {
      updateProfile(json.data);
    } else {
      console.error("Lanyard error:", json);
    }
  } catch (err) {
    console.error("Error fetching REST API:", err);
  }
}

let ws;
let heartbeat;

function connectSocket() {
  ws = new WebSocket("wss://api.lanyard.rest/socket");

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    // op 1 = Hello -> subscribe + start heartbeat
    if (msg.op === 1) {
      ws.send(JSON.stringify({ op: 2, d: { subscribe_to_id: DISCORD_ID } }));
      clearInterval(heartbeat);
      heartbeat = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ op: 3 }));
      }, msg.d.heartbeat_interval);
      return;
    }

    if (msg.t === "INIT_STATE" || msg.t === "PRESENCE_UPDATE") {
      updateProfile(msg.d);
    }
  };

  ws.onclose = () => {
    clearInterval(heartbeat);
    setTimeout(connectSocket, 3000);
  };
}

function initLanyard() {
  fetchProfileData();
  connectSocket();
}

// helper: set text safely if element exists
function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function updateProfile(userData) {
  const user = userData.discord_user;

  // 1. Names
  setText("display-name", user.global_name || user.username);
  setText("username", `@${user.username}`);

  // 2. Avatar
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  const avatarElem = document.getElementById("avatar");
  if (avatarElem) avatarElem.src = avatarUrl;

  // 3. Avatar Decoration
  const decorElem = document.getElementById("decoration");
  if (decorElem) {
    if (user.avatar_decoration_data) {
      decorElem.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png`;
      decorElem.style.display = "block";
    } else {
      decorElem.style.display = "none";
    }
  }

  // 4. Nameplate
  const nameplateBox = document.getElementById("nameplate");
  if (nameplateBox) {
    const asset = user.collectibles?.nameplate?.asset;
    nameplateBox.style.backgroundImage = asset
      ? `url('https://cdn.discordapp.com/assets/collectibles/${asset}static.png')`
      : "none";
  }

  // 5. Status Dot
  const statusDot = document.getElementById("status-dot");
  if (statusDot) statusDot.className = `status-dot ${userData.discord_status}`;

  // 6. Bio (Lanyard لا يرجع bio، فقط من KV إن وُجد)
  setText("bio", userData.kv?.bio || "No bio available.");

  // 7. Activity
  const activeGame = userData.activities?.find(a => a.type !== 4);
  const customStatus = userData.activities?.find(a => a.type === 4);

  let text = "No recent activity";
  if (activeGame) {
    text = activeGame.name;
    if (activeGame.details) text += ` - ${activeGame.details}`;
  } else if (customStatus && (customStatus.state || customStatus.emoji)) {
    const emoji = customStatus.emoji ? customStatus.emoji.name + " " : "";
    text = `${emoji}${customStatus.state || ""}`;
  }
  setText("activity-content", text);
}

initLanyard();
