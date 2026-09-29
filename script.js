const DISCORD_ID = "907591107200827442"; // ضَع الـ ID الخاص بك هنا

// --- 1. إدارة تشغيل الصوت ---
const bgMusic = document.getElementById("bg-music");
const audioToggle = document.getElementById("audio-toggle");
const audioStatus = document.getElementById("audio-status");

let isPlaying = false;

// تغيير رابط الصوت إلى أغنيتك المفضلة (ضع رابط MP3 مباشر)
// bgMusic.src = "رابط_الأغنية_المباشر.mp3";

audioToggle.addEventListener("click", () => {
  if (isPlaying) {
    bgMusic.pause();
    audioStatus.textContent = "تشغيل الموسيقى";
    audioToggle.querySelector("i").className = "fa-solid fa-music music-icon";
    isPlaying = false;
  } else {
    bgMusic.play();
    audioStatus.textContent = "إيقاف مؤقت";
    audioToggle.querySelector("i").className = "fa-solid fa-pause music-icon";
    isPlaying = true;
  }
});

// محاولة تشغيل الصوت تلقائياً عند أول تفاعل للمستخدم مع الصفحة
document.body.addEventListener("click", () => {
  if (!isPlaying) {
    bgMusic.play().then(() => {
      isPlaying = true;
      audioStatus.textContent = "إيقاف مؤقت";
      audioToggle.querySelector("i").className = "fa-solid fa-pause music-icon";
    }).catch(() => {
      // قيود المتصفح تمنع التشغيل التلقائي الصامت
    });
  }
}, { once: true });


// --- 2. ربط Lanyard API ---
function initLanyard() {
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

  // الأسماء
  document.getElementById("display-name").textContent = user.global_name || user.username;
  document.getElementById("username").textContent = @${user.username};

  // الصورة الشخصية
  const avatarUrl = user.avatar
    ? https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256
    : https://cdn.discordapp.com/embed/avatars/0.png;
  document.getElementById("avatar").src = avatarUrl;

  // الديكور
  const decorElem = document.getElementById("decoration");
  if (user.avatar_decoration_data) {
    decorElem.src = https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png;
    decorElem.style.display = "block";
  } else {
    decorElem.style.display = "none";
  }

  // البنر
  const bannerElem = document.getElementById("banner");
  if (user.banner) {
    const bannerUrl = https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${user.banner.startsWith('a_') ? 'gif' : 'png'}?size=512;
    bannerElem.style.backgroundImage = url('${bannerUrl}');
  } else if (user.accent_color) {
    bannerElem.style.backgroundImage = "none";
    bannerElem.style.backgroundColor = #${user.accent_color.toString(16).padStart(6, '0')};
  } else {
    bannerElem.style.backgroundImage = "none";
    bannerElem.style.backgroundColor = "#c7d2fe";
  }

  // حالة الاتصال
  const statusDot = document.getElementById("status-dot");
  statusDot.className = status-dot ${userData.discord_status};

  // الحالة المخصصة
  const customActivity = userData.activities?.find(a => a.type === 4);
  const statusContainer = document.getElementById("custom-status-container");
  const statusEmoji = document.getElementById("custom-status-emoji");
  const statusText = document.getElementById("custom-status-text");

  if (customActivity && (customActivity.state || customActivity.emoji)) {
    statusContainer.style.display = "flex";
    statusEmoji.textContent = customActivity.emoji ? customActivity.emoji.name : "";
    statusText.textContent = customActivity.state || "";
  } else {
    statusContainer.style.display = "none";
  }
}

initLanyard();
