let player = JSON.parse(localStorage.getItem("lifeSystemPlayer")) || {
    xp: 0,
    coins: 0,
    level: 1,
    streak: 0,
    tasks: [],
    completedToday: 0,
    lastReset: Date.now(),
    giftBoxes: [true, true, true]
};

const XP_PER_LEVEL = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

function getRank(level) {
    if (level >= 50) return "👑 الملك";
    if (level >= 30) return "⚔️ القائد";
    if (level >= 20) return "🔥 المحارب";
    if (level >= 10) return "🛡️ النخبة";
    if (level >= 5) return "⚔️ المقاتل";
    return "🌱 المبتدئ";
}

function save() {
    localStorage.setItem("lifeSystemPlayer", JSON.stringify(player));
}

function addXP(amount) {
    player.xp += amount;

    while (player.xp >= XP_PER_LEVEL) {
        player.xp -= XP_PER_LEVEL;
        player.level++;
        player.coins += 20;
        alert("🎉 LEVEL UP!\n\nأصبحت المستوى " + player.level + "\n\n+20 🪙");
    }

    save();
    updateUI();
}

function removeXP(amount) {
    player.xp = Math.max(0, player.xp - amount);
    save();
    updateUI();
}

function addTask() {
    const name = document.getElementById("task-name").value.trim();
    const difficulty = document.getElementById("task-difficulty").value;

    if (!name) {
        alert("اكتب اسم المهمة أولاً.");
        return;
    }

    let xp = 10, penalty = 5;

    if (difficulty === "medium") { xp = 25; penalty = 15; }
    else if (difficulty === "hard") { xp = 50; penalty = 25; }
    else if (difficulty === "boss") { xp = 100; penalty = 50; }

    player.tasks.push({
        id: Date.now(),
        name,
        xp,
        penalty,
        completed: false,
        failed: false
    });

    document.getElementById("task-name").value = "";
    save();
    updateUI();
}

function completeTask(id) {
    const task = player.tasks.find(t => t.id === id);
    if (!task || task.completed || task.failed) return;

    task.completed = true;
    player.completedToday++;

    addXP(task.xp);
    player.coins += Math.floor(task.xp / 10);

    save();
    updateUI();
}

function failTask(id) {
    const task = player.tasks.find(t => t.id === id);
    if (!task || task.completed || task.failed) return;

    if (!confirm(
        "هل أنت متأكد أنك تريد تسجيل المهمة كفشل؟\n\nالعقوبة: -" +
        task.penalty + " XP"
    )) return;

    task.failed = true;
    removeXP(task.penalty);
    save();
    updateUI();
}

function renderTasks() {
    const container = document.getElementById("task-list");
    container.innerHTML = "";

    if (player.tasks.length === 0) {
        container.innerHTML = "<p style='color:#777'>لا توجد مهام اليوم.</p>";
        return;
    }

    player.tasks.forEach(task => {
        const div = document.createElement("div");
        div.className = "task " + (task.completed ? "completed" : "");

        let status = "";
        if (task.completed) status = "✅ مكتملة";
        else if (task.failed) status = "❌ فشلت";
        else {
            status = `
                <button onclick="completeTask(${task.id})">إكمال</button>
                <button onclick="failTask(${task.id})">فشل</button>
            `;
        }

        div.innerHTML = `
            <div class="task-info">
                <div class="task-name">${escapeHTML(task.name)}</div>
                <div class="task-xp">+${task.xp} XP | العقوبة -${task.penalty} XP</div>
            </div>
            <div>${status}</div>
        `;
        container.appendChild(div);
    });
}

function escapeHTML(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

/* =========================
   نظام التحديث كل 24 ساعة
   ========================= */

function resetDailySystem() {
    const now = Date.now();

    if (!player.lastReset) player.lastReset = now;

    if (now - player.lastReset >= DAY_MS) {
        if (player.completedToday > 0) player.streak++;
        else player.streak = 0;

        player.tasks = [];
        player.completedToday = 0;
        player.lastReset = now;
        player.giftBoxes = [true, true, true];

        save();

        alert(
            "🌅 بدأ يوم جديد!\n\n" +
            "تم تحديث المهام وظهرت 3 صناديق هدايا جديدة."
        );
    }
}

function updateResetTimer() {
    const el = document.getElementById("reset-timer");
    if (!el) return;

    const nextReset = player.lastReset + DAY_MS;
    let remaining = Math.max(0, nextReset - Date.now());

    const h = Math.floor(remaining / 3600000);
    remaining %= 3600000;
    const m = Math.floor(remaining / 60000);
    const s = Math.floor((remaining % 60000) / 1000);

    el.textContent =
        `التحديث القادم: ${String(h).padStart(2,"0")}:` +
        `${String(m).padStart(2,"0")}:` +
        `${String(s).padStart(2,"0")}`;
}

/* =========================
   صناديق الهدايا المجهولة
   ========================= */

const giftRewards = [
    { text: "🎮 ساعة Gaming", min: 10, max: 30 },
    { text: "🪙 مكافأة عملات", min: 20, max: 60 },
    { text: "✨ XP إضافية", min: 25, max: 100 },
    { text: "🎁 مكافأة نادرة: +100 🪙", min: 100, max: 100 },
    { text: "🔥 تعزيز XP", min: 50, max: 150 }
];

function openGift(index) {
    if (!player.giftBoxes || !player.giftBoxes[index]) {
        alert("هذا الصندوق مفتوح بالفعل.");
        return;
    }

    player.giftBoxes[index] = false;

    const reward = giftRewards[Math.floor(Math.random() * giftRewards.length)];
    let amount = Math.floor(
        Math.random() * (reward.max - reward.min + 1)
    ) + reward.min;

    let message = "";

    if (reward.text.includes("Gaming")) {
        message = `🎁 حصلت على ${reward.text}!`;
    } else if (reward.text.includes("عملات")) {
        player.coins += amount;
        message = `🎁 حصلت على +${amount} 🪙`;
    } else if (reward.text.includes("XP")) {
        addXP(amount);
        message = `🎁 حصلت على +${amount} XP`;
    } else if (reward.text.includes("نادرة")) {
        player.coins += amount;
        message = `🌟 مكافأة نادرة!\n\n+${amount} 🪙`;
    } else {
        addXP(amount);
        message = `🔥 تعزيز!\n\n+${amount} XP`;
    }

    save();
    updateUI();

    alert(message);
}

/* =========================
   الإنجازات
   ========================= */

function renderAchievements() {
    const container = document.getElementById("achievements");

    const achievements = [
        {
            name: "🌱 البداية",
            description: "أكمل أول مهمة في اليوم",
            unlocked: player.completedToday >= 1
        },
        {
            name: "⚔️ مقاتل",
            description: "الوصول إلى المستوى 5",
            unlocked: player.level >= 5
        },
        {
            name: "🔥 انضباط",
            description: "7 أيام متتالية",
            unlocked: player.streak >= 7
        },
        {
            name: "👑 الملك",
            description: "الوصول إلى المستوى 50",
            unlocked: player.level >= 50
        }
    ];

    container.innerHTML = "";

    achievements.forEach(a => {
        const div = document.createElement("div");
        div.className = "achievement " + (!a.unlocked ? "locked" : "");

        div.innerHTML = `
            <strong>${a.name}</strong>
            <p>${a.description}</p>
        `;

        container.appendChild(div);
    });
}

function updateUI() {
    document.getElementById("level").textContent = player.level;
    document.getElementById("xp").textContent = player.xp;
    document.getElementById("coins").textContent = player.coins;
    document.getElementById("streak").textContent = player.streak;
    document.getElementById("rank").textContent = getRank(player.level);

    const percentage = (player.xp / XP_PER_LEVEL) * 100;
    document.getElementById("xp-bar").style.width = percentage + "%";
    document.getElementById("xp-text").textContent =
        player.xp + " / " + XP_PER_LEVEL + " XP";

    renderTasks();
    renderAchievements();

    document.querySelectorAll(".gift-box").forEach((box, index) => {
        if (player.giftBoxes && !player.giftBoxes[index]) {
            box.classList.add("opened");
            box.innerHTML = "<span>📦</span><small>تم الفتح</small>";
        }
    });
}

/* بدء النظام */
resetDailySystem();
updateUI();
updateResetTimer();

setInterval(() => {
    resetDailySystem();
    updateResetTimer();
    updateUI();
}, 1000);
