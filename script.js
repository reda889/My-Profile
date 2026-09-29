const DISCORD_ID = "YOUR_DISCORD_ID"; // ضَع الـ ID الخاص بك هنا بين التنصيص

function initLanyard() {
  const ws = new WebSocket("wss://api.lanyard.rest/socket");

  ws.onopen = () => {
    // الاشتراك ببيانات الحساب للحصول على التحديثات اللحظية
    ws.send(JSON.stringify({
      op: 2,
      d: { subscribe_to_id: DISCORD_ID }
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    // عند أول اتصال (INIT_STATE) أو عند تحديث البيانات (PRESENCE_UPDATE)
    if (data.t === "INIT_STATE" || data.t === "PRESENCE_UPDATE") {
      updateProfile(data.d);
    }
  };

  // إعادة الاتصال التلقائي في حال الانقطاع
  ws.onclose = () => setTimeout(initLanyard, 3000);
}

function updateProfile(userData) {
  const user = userData.discord_user;

  // 1. الأسماء
  document.getElementById("display-name").textContent = user.global_name || user.username;
  document.getElementById("username").textContent = `@${user.username}`;

  // 2. الصورة الشخصية
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${user.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256`
    : `https://cdn.discordapp.com/embed/avatars/0.png`;
  document.getElementById("avatar").src = avatarUrl;

  // 3. الديكور (Avatar Decoration)
  const decorElem = document.getElementById("decoration");
  if (user.avatar_decoration_data) {
    decorElem.src = `https://cdn.discordapp.com/avatar-decoration-presets/${user.avatar_decoration_data.asset}.png`;
    decorElem.style.display = "block";
  } else {
    decorElem.style.display = "none";
  }

  // 4. البنر (Banner)
  const bannerElem = document.getElementById("banner");
  if (user.banner) {
    const bannerUrl = `https://cdn.discordapp.com/banners/${user.id}/${user.banner}.${user.banner.startsWith('a_') ? 'gif' : 'png'}?size=512`;
    bannerElem.style.backgroundImage = `url('${bannerUrl}')`;
  } else if (user.accent_color) {
    bannerElem.style.backgroundImage = "none";
    bannerElem.style.backgroundColor = `#${user.accent_color.toString(16).padStart(6, '0')}`;
  } else {
    bannerElem.style.backgroundImage = "none";
    bannerElem.style.backgroundColor = "#2b2d31";
  }

  // 5. حالة الاتصال
  const statusDot = document.getElementById("status-dot");
  statusDot.className = `status-dot ${userData.discord_status}`;

  // 6. الحالة المخصصة (Custom Status)
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

// تشغيل الخدمة
initLanyard();
