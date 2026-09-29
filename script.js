const DISCORD_ID = "YOUR_DISCORD_ID"; // ضع الـ ID الرقمي الخاص بك هنا

// Music file
const bgMusic = document.getElementById("bg-music");
bgMusic.src = "./song.mp3"; // أكتب اسم ملف الأغنية المرفوعة لدكي بأمان

const muteBtn = document.getElementById("mute-btn");
const muteIcon = document.getElementById("mute-icon");

// Autoplay & Mute Handling
document.addEventListener("click", () => {
  if (bgMusic.paused) {
    bgMusic.play().catch(() => {});
  }
}, { once: true });

muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bgMusic.muted || bgMusic.paused) {
    bgMusic.muted = false;
    bgMusic.play();
    muteIcon.className = "fa-solid fa-volume-high";
  } else {
    bgMusic.muted = true;
    muteIcon.className = "fa-solid fa-volume-xmark";
  }
});


// Lanyard API Fetch
async function fetchProfileData() {
  try {
    const res = await fetch(https://api.lanyard.rest/v1/users/${DISCORD_ID});
    const json = await res.json();
    if (json.success && json.data) {
      updateProfile(json.data);
    }
  } catch (err) {
    console.error("Error fetching REST API:", err);
  }
}

function initLanyard() {
  fetchProfileData();

  const ws = new WebSocket("wss://api.lanyard.rest/socket");

  ws.onopen = () => {
    ws.send(JSON.stringify({
      op: 2,
      d: { subscribe_to_id: DISCORD_ID }
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.t === "INIT_STATE" || data.t === "PRESENCE_UPDATE") {
      updateProfile(data.d);
    }
  };

  ws.onclose = () => setTimeout(initLanyard, 3000);
}

function updateProfile(userData) {
  const user = userData.discord_user;

  // 1. Names
  document.getElementById("display-name").textContent = user.global_name || user.username;
  document.getElementById("username").textContent = @${user.username};

  // 2. Avatar
  const avatarUrl = user.avatar
    ? https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256
    : https://cdn.discordapp.com/embed/avatars/0.png;
  document.getElementById("avatar").src = avatarUrl;

  // 3. Avatar Decoration
  const decorElem = document.getElementById("decoration");
  if (user.avatar_decoration_data) {
    decorElem.src = https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png;
    decorElem.style.display = "block";
  } else {
    decorElem.style.display = "none";
  }

  // 4. Nameplate Image Check
  const nameplateBox = document.getElementById("nameplate");
  const nameplateAsset = user.collectibles?.nameplate?.asset;
  if (nameplateAsset) {
    nameplateBox.style.backgroundImage = url('https://cdn.discordapp.com/${nameplateAsset}.png');
  }

  // 5. Status Dot
  const statusDot = document.getElementById("status-dot");
  statusDot.className = status-dot ${userData.discord_status};

  // 6. Bio Check
  const bioElem = document.getElementById("bio");
  if (user.bio) {
    bioElem.textContent = user.bio;
  } else if (userData.kv && userData.kv.bio) {
    bioElem.textContent = userData.kv.bio;
  } else {
    bioElem.textContent = "No bio available.";
  }

  // 7. Activity Check (Automatic "No recent activity")
  const activityElem = document.getElementById("activity-content");
  
  // Filtering playing/custom activity
  const activeGame = userData.activities?.find(a => a.type !== 4); // Game or app
  const customStatus = userData.activities?.find(a => a.type === 4); // Custom status text

  if (activeGame) {
    let details = activeGame.name;
    if (activeGame.details) details +=  - ${activeGame.details};
    activityElem.textContent = details;
  } else if (customStatus && (customStatus.state || customStatus.emoji)) {
    const emoji = customStatus.emoji ? customStatus.emoji.name + " " : "";
    activityElem.textContent = ${emoji}${customStatus.state || ""};
  } else {
    activityElem.textContent = "No recent activity";
  }
}

initLanyard(); DISCORD_ID = "907591107200827442"; // Replace with your numeric Discord ID

// 1. Array with 10+ Songs (Add your own links or song files inside songs/ folder)
const playlist = [
  "https://files.catbox.moe/7x83a0.mp3",
  "https://files.catbox.moe/391062.mp3",
  "songs/song1.mp3",
  "songs/song2.mp3",
  "songs/song3.mp3",
  "songs/song4.mp3",
  "songs/song5.mp3",
  "songs/song6.mp3",
  "songs/song7.mp3",
  "songs/song8.mp3"
];

const bgMusic = document.getElementById("bg-music");
const muteBtn = document.getElementById("mute-btn");
const muteIcon = document.getElementById("mute-icon");

// Select a random song from array on load
const randomSong = playlist[Math.floor(Math.random() * playlist.length)];
bgMusic.src = randomSong;

// Autoplay & Mute Handling
let isMuted = false;

function playAudio() {
  bgMusic.play().then(() => {
    isMuted = false;
    muteIcon.className = "fa-solid fa-volume-high";
  }).catch(() => {
    // Browsers block autoplay until user clicks anywhere
  });
}

// Play on first user click anywhere on screen
document.addEventListener("click", () => {
  if (bgMusic.paused) playAudio();
}, { once: true });

// Toggle Mute / Unmute Button
muteBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (bgMusic.muted || bgMusic.paused) {
    bgMusic.muted = false;
    bgMusic.play();
    muteIcon.className = "fa-solid fa-volume-high";
  } else {
    bgMusic.muted = true;
    muteIcon.className = "fa-solid fa-volume-xmark";
  }
});


// 2. Fetch Discord Data via Lanyard REST + WebSocket
async function fetchFallbackData() {
  try {
    const res = await fetch(`https://api.lanyard.rest/v1/users/${DISCORD_ID}`);
    const json = await res.json();
    if (json.success && json.data) {
      updateProfile(json.data);
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

    // op 1 = Hello: send init + start heartbeat
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
  fetchFallbackData(); // Instant load via REST API
  connectSocket();
}

function updateProfile(userData) {
  const user = userData.discord_user;

  // Name & Username
  document.getElementById("display-name").textContent = user.global_name || user.username;
  document.getElementById("username").textContent = `@${user.username}`;

  // Avatar
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=512`
    : "https://cdn.discordapp.com/embed/avatars/0.png";
  document.getElementById("avatar").src = avatarUrl;

  // Avatar Decoration
  const decorElem = document.getElementById("decoration");
  if (user.avatar_decoration_data) {
    decorElem.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png`;
    decorElem.style.display = "block";
  } else {
    decorElem.style.display = "none";
  }

  // Status Dot
  const statusDot = document.getElementById("status-dot");
  statusDot.className = `status-dot ${userData.discord_status}`;

  // Custom Status
  const customActivity = userData.activities?.find(a => a.type === 4);
  const statusContainer = document.getElementById("custom-status-container");
  const statusEmoji = document.getElementById("custom-status-emoji");
  const statusText = document.getElementById("custom-status-text");

  if (customActivity && (customActivity.state || customActivity.emoji)) {
    statusContainer.style.display = "inline-flex";
    statusEmoji.textContent = customActivity.emoji ? customActivity.emoji.name : "";
    statusText.textContent = customActivity.state || "";
  } else {
    statusContainer.style.display = "none";
  }
}

// Start
initLanyard();
