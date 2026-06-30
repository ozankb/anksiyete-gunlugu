/* ============================================================
   Sakin — Anksiyete Günlüğü
   app.js — v1.1.0

   VERİ MODELİ
   -------------------------------------------------------------
   localStorage anahtarları:
     "sakin_entries"      -> Array<Entry>      (günlük kayıtları)
     "sakin_achievements" -> Array<Achievement> (maruz kalma başarıları)
     "sakin_settings"     -> Settings           (tema, vb.)
     "sakin_app_version"  -> string             (cache/migration takibi)

   Entry = {
     id: string,
     date: string (ISO),
     anxietyLevel: number (0-10),
     mood: string,              // bkz MOODS
     triggers: string[],        // bkz TRIGGERS
     symptoms: string[],        // bkz SYMPTOMS
     copingMethods: string[],   // bkz COPING
     note: string,
     type: "log" | "panic_before" | "panic_after"
   }

   Achievement = {
     id: string,
     date: string (ISO),
     key: string,        // bkz ACHIEVEMENTS
     label: string,
     note: string
   }

   Settings = {
     theme: "light" | "dark" | "system"
   }
   ============================================================ */

(function () {
  "use strict";

  var APP_VERSION = "1.2.0";

  // ---------------- Sabit veri sözlükleri ----------------
  var MOODS = [
    { key: "iyi", emoji: "🙂", label: "İyi" },
    { key: "normal", emoji: "😐", label: "Normal" },
    { key: "huzursuz", emoji: "😕", label: "Huzursuz" },
    { key: "kaygili", emoji: "😟", label: "Kaygılı" },
    { key: "panik", emoji: "😣", label: "Panik" },
    { key: "yorgun", emoji: "😴", label: "Yorgun" }
  ];

  var TRIGGERS = [
    { key: "metro", emoji: "🚇", label: "Metro" },
    { key: "kalabalik", emoji: "👥", label: "Kalabalık" },
    { key: "is", emoji: "💼", label: "İş" },
    { key: "saglik", emoji: "🩺", label: "Sağlık kaygısı" },
    { key: "uyku", emoji: "🌙", label: "Uyku azlığı" },
    { key: "kafein", emoji: "☕", label: "Kafein" },
    { key: "trafik", emoji: "🚗", label: "Trafik" },
    { key: "sosyal", emoji: "🎤", label: "Sosyal ortam" },
    { key: "diger_t", emoji: "➕", label: "Diğer" }
  ];

  var SYMPTOMS = [
    { key: "carpinti", emoji: "💓", label: "Çarpıntı" },
    { key: "nefes", emoji: "😮‍💨", label: "Nefes darlığı" },
    { key: "bas_donmesi", emoji: "💫", label: "Baş dönmesi" },
    { key: "mide", emoji: "🤢", label: "Mide" },
    { key: "titreme", emoji: "🫨", label: "Titreme" },
    { key: "gogus", emoji: "🫷", label: "Göğüs sıkışması" },
    { key: "uyusma", emoji: "🤲", label: "Uyuşma" },
    { key: "diger_s", emoji: "➕", label: "Diğer" }
  ];

  var COPING = [
    { key: "nefes_eg", emoji: "🌬️", label: "Nefes egzersizi" },
    { key: "yuruyus", emoji: "🚶", label: "Yürüyüş" },
    { key: "spor", emoji: "🏃", label: "Spor" },
    { key: "konusma", emoji: "💬", label: "Konuşma" },
    { key: "ilac", emoji: "💊", label: "İlaç notu" },
    { key: "meditasyon", emoji: "🧘", label: "Meditasyon" },
    { key: "devam", emoji: "✅", label: "Devam ettim" },
    { key: "kacindim", emoji: "↩️", label: "Kaçındım" }
  ];

  var ACHIEVEMENTS = [
    { key: "metro", emoji: "🚇", label: "Metroya bindim" },
    { key: "kalabalik", emoji: "👥", label: "Kalabalık yere girdim" },
    { key: "spor_salonu", emoji: "🏋️", label: "Spor salonuna gittim" },
    { key: "ana_yol", emoji: "🛣️", label: "Ana yoldan geçtim" },
    { key: "ise_gittim", emoji: "💼", label: "İşe gittim" },
    { key: "devam_ettim", emoji: "✅", label: "Kaçınmadım, devam ettim" }
  ];

  var CALM_QUOTES = [
    "Bu his geçici. Şu anda güvendesin.",
    "Nefes al, nefes ver. Vücudun ne yapacağını biliyor.",
    "Bunu daha önce de atlattın. Bunu da atlatacaksın.",
    "Anksiyete tehlikeli değildir, sadece rahatsız edicidir.",
    "Şu an burada, bu nefeste kal. Gerisi bekleyebilir.",
    "Bedenin alarm veriyor ama gerçek bir tehlike yok.",
    "Sen bu hissin fazlasısın. Geçecek."
  ];

  // ---------------- Depolama yardımcıları ----------------
  var STORE_KEYS = {
    entries: "sakin_entries",
    achievements: "sakin_achievements",
    settings: "sakin_settings",
    version: "sakin_app_version"
  };

  function loadJSON(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  var state = {
    entries: loadJSON(STORE_KEYS.entries, []),
    achievements: loadJSON(STORE_KEYS.achievements, []),
    settings: loadJSON(STORE_KEYS.settings, { theme: "system" })
  };

  function persistEntries() { saveJSON(STORE_KEYS.entries, state.entries); }
  function persistAchievements() { saveJSON(STORE_KEYS.achievements, state.achievements); }
  function persistSettings() { saveJSON(STORE_KEYS.settings, state.settings); }

  function uid() {
    return "id" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // ---------------- Tema ----------------
  function applyTheme() {
    var t = state.settings.theme || "system";
    var root = document.documentElement;
    if (t === "system") {
      root.removeAttribute("data-theme");
    } else {
      root.setAttribute("data-theme", t);
    }
  }

  // ---------------- Tarih yardımcıları ----------------
  function fmtDateLong(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
  }
  function fmtDateShort(iso) {
    var d = new Date(iso);
    return d.toLocaleDateString("tr-TR", { day: "numeric", month: "short" });
  }
  function fmtTime(iso) {
    var d = new Date(iso);
    return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  }
  function relTime(iso) {
    var d = new Date(iso);
    var now = new Date();
    var diffMin = Math.round((now - d) / 60000);
    if (diffMin < 1) return "az önce";
    if (diffMin < 60) return diffMin + " dk önce";
    var diffH = Math.round(diffMin / 60);
    if (diffH < 24) return diffH + " sa önce";
    var diffD = Math.round(diffH / 24);
    if (diffD < 7) return diffD + " gün önce";
    var diffW = Math.round(diffD / 7);
    return diffW + " hafta önce";
  }
  function startOfDay(d) { var x = new Date(d); x.setHours(0,0,0,0); return x; }
  function daysAgo(n) { var d = new Date(); d.setDate(d.getDate() - n); return d; }
  function isSameDay(a, b) {
    var da = new Date(a), db = new Date(b);
    return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
  }
  function startOfWeek(d) {
    var x = startOfDay(d);
    var day = x.getDay();
    var diff = (day === 0 ? -6 : 1) - day;
    x.setDate(x.getDate() + diff);
    return x;
  }

  function escapeHtml(s) {
    var div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
  }

  function dictByKey(list) {
    var m = {};
    list.forEach(function (i) { m[i.key] = i; });
    return m;
  }
  var MOOD_MAP = dictByKey(MOODS);
  var TRIGGER_MAP = dictByKey(TRIGGERS);
  var SYMPTOM_MAP = dictByKey(SYMPTOMS);
  var COPING_MAP = dictByKey(COPING);
  var ACH_MAP = dictByKey(ACHIEVEMENTS);

  // ---------------- Toast ----------------
  var toastTimer;
  function showToast(msg) {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove("show"); }, 2200);
  }

  // ============================================================
  // GÖRÜNÜM: BUGÜN (Hızlı Kayıt)
  // ============================================================
  var formSel = { mood: null, triggers: [], symptoms: [], coping: [] };

  function resetFormSelections() {
    formSel = { mood: null, triggers: [], symptoms: [], coping: [] };
  }

  function renderLogView() {
    var el = document.getElementById("view-today");
    el.innerHTML =
      '<div class="card">' +
        '<h2>Bugün nasılsın?</h2>' +
        '<p class="sub">' + fmtDateLong(new Date().toISOString()) + '</p>' +

        '<div class="metric-head">' +
          '<span class="metric-label">😌 Anksiyete seviyesi</span>' +
          '<span class="metric-value" id="lvl-out">5</span>' +
        '</div>' +
        '<input type="range" min="0" max="10" step="1" value="5" id="lvl-range">' +
        '<div class="scale-ticks"><span>0</span><span>5</span><span>10</span></div>' +

        '<label class="field-label">Ruh hali</label>' +
        '<div class="mood-grid" id="mood-grid"></div>' +

        '<label class="field-label">Tetikleyiciler</label>' +
        '<div class="chip-grid" id="trigger-grid"></div>' +

        '<label class="field-label">Fiziksel belirtiler</label>' +
        '<div class="chip-grid" id="symptom-grid"></div>' +

        '<label class="field-label">Baş etme yöntemi</label>' +
        '<div class="chip-grid" id="coping-grid"></div>' +

        '<label class="field-label" for="note-input">Not <span style="font-weight:400;color:var(--ink-faint)">(opsiyonel)</span></label>' +
        '<textarea id="note-input" placeholder="Bugün dikkatini çeken bir şey oldu mu?"></textarea>' +

        '<hr class="divider">' +
        '<button class="btn btn-primary btn-block" id="save-entry-btn">Kaydet</button>' +
      '</div>' +
      '<div id="today-list-wrap"></div>';

    var range = document.getElementById("lvl-range");
    var out = document.getElementById("lvl-out");
    range.addEventListener("input", function () { out.textContent = range.value; });

    renderSingleSelectGrid("mood-grid", MOODS, formSel.mood);
    renderMultiSelectGrid("trigger-grid", TRIGGERS, formSel.triggers, "triggers");
    renderMultiSelectGrid("symptom-grid", SYMPTOMS, formSel.symptoms, "symptoms");
    renderMultiSelectGrid("coping-grid", COPING, formSel.coping, "coping");

    document.getElementById("save-entry-btn").addEventListener("click", saveEntryFromForm);

    renderTodayList();
  }

  function renderSingleSelectGrid(containerId, list, selectedKey) {
    var container = document.getElementById(containerId);
    container.className = "mood-grid";
    container.innerHTML = list.map(function (item) {
      var sel = item.key === selectedKey ? " selected" : "";
      return '<button type="button" class="mood-opt' + sel + '" data-key="' + item.key + '">' +
        '<span class="ic">' + item.emoji + '</span><span class="lbl">' + item.label + '</span></button>';
    }).join("");
    container.querySelectorAll(".mood-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-key");
        formSel.mood = (formSel.mood === k) ? null : k;
        renderSingleSelectGrid(containerId, list, formSel.mood);
      });
    });
  }

  function renderMultiSelectGrid(containerId, list, selectedArr, stateKey) {
    var container = document.getElementById(containerId);
    container.innerHTML = list.map(function (item) {
      var sel = selectedArr.indexOf(item.key) > -1 ? " selected" : "";
      return '<button type="button" class="chip-opt' + sel + '" data-key="' + item.key + '">' +
        item.emoji + ' ' + item.label + '</button>';
    }).join("");
    container.querySelectorAll(".chip-opt").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var k = btn.getAttribute("data-key");
        var arr = formSel[stateKey];
        var idx = arr.indexOf(k);
        if (idx > -1) arr.splice(idx, 1); else arr.push(k);
        renderMultiSelectGrid(containerId, list, arr, stateKey);
      });
    });
  }

  function saveEntryFromForm() {
    var level = parseInt(document.getElementById("lvl-range").value, 10);
    var note = document.getElementById("note-input").value.trim();

    var entry = {
      id: uid(),
      date: new Date().toISOString(),
      anxietyLevel: level,
      mood: formSel.mood,
      triggers: formSel.triggers.slice(),
      symptoms: formSel.symptoms.slice(),
      copingMethods: formSel.coping.slice(),
      note: note,
      type: "log"
    };

    state.entries.unshift(entry);
    persistEntries();
    resetFormSelections();
    renderLogView();
    showToast("Kaydın eklendi");
  }

  function renderTodayList() {
    var wrap = document.getElementById("today-list-wrap");
    var todays = state.entries.filter(function (e) { return isSameDay(e.date, new Date()) && e.type === "log"; });
    if (todays.length === 0) {
      wrap.innerHTML = "";
      return;
    }
    var html = '<p class="section-title">Bugünkü kayıtların</p>';
    todays.forEach(function (e) { html += entryCardHTML(e); });
    wrap.innerHTML = html;
    bindEntryDeleteButtons(wrap);
  }

  // ============================================================
  // Ortak: kayıt kartı HTML üretimi
  // ============================================================
  function levelBadgeClass(level) {
    if (level <= 3) return "badge-low";
    if (level <= 6) return "badge-mid";
    return "badge-high";
  }
  function levelBadgeLabel(level) {
    if (level <= 3) return "Sakin";
    if (level <= 6) return "Orta";
    return "Yüksek";
  }

  function entryCardHTML(e) {
    var tags = "";
    (e.triggers || []).forEach(function (k) {
      var t = TRIGGER_MAP[k];
      if (t) tags += '<span class="tag">' + t.emoji + " " + t.label + "</span>";
    });
    (e.symptoms || []).forEach(function (k) {
      var s = SYMPTOM_MAP[k];
      if (s) tags += '<span class="tag">' + s.emoji + " " + s.label + "</span>";
    });
    (e.copingMethods || []).forEach(function (k) {
      var c = COPING_MAP[k];
      if (c) tags += '<span class="tag">' + c.emoji + " " + c.label + "</span>";
    });
    var moodTxt = e.mood && MOOD_MAP[e.mood] ? (MOOD_MAP[e.mood].emoji + " " + MOOD_MAP[e.mood].label) : "";
    var typeLabel = e.type === "panic_before" ? "Atak öncesi" : (e.type === "panic_after" ? "Atak sonrası" : "");

    return (
      '<div class="entry-card" data-id="' + e.id + '">' +
        '<div class="entry-top">' +
          '<div>' +
            '<div class="entry-date">' + fmtTime(e.date) + (moodTxt ? " · " + moodTxt : "") + '</div>' +
            '<div class="entry-meta">' + relTime(e.date) + (typeLabel ? " · " + typeLabel : "") + '</div>' +
          '</div>' +
          '<span class="level-badge ' + levelBadgeClass(e.anxietyLevel) + '">' + e.anxietyLevel + "/10 · " + levelBadgeLabel(e.anxietyLevel) + '</span>' +
        '</div>' +
        (tags ? '<div class="tag-row">' + tags + '</div>' : '') +
        (e.note ? '<div class="note-text">' + escapeHtml(e.note) + '</div>' : '') +
        '<div class="entry-actions"><button class="btn btn-danger-ghost" data-del="' + e.id + '">Sil</button></div>' +
      '</div>'
    );
  }

  function bindEntryDeleteButtons(scope) {
    scope.querySelectorAll("[data-del]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-del");
        state.entries = state.entries.filter(function (e) { return e.id !== id; });
        persistEntries();
        showToast("Kayıt silindi");
        renderActiveView();
      });
    });
  }

  // ============================================================
  // GÖRÜNÜM: ATAK ANI MODU
  // ============================================================
  var panicState = { beforeLevel: null, breathing: false, breathTimer: null, countdownTimer: null };

  function openPanicMode() {
    panicState.beforeLevel = null;
    var overlay = document.getElementById("panic-overlay");
    overlay.style.display = "flex";
    renderPanicScreen();
  }

  function closePanicMode() {
    stopBreathing();
    clearInterval(panicState.countdownTimer);
    document.getElementById("panic-overlay").style.display = "none";
  }

  function renderPanicScreen() {
    var quote = CALM_QUOTES[Math.floor(Math.random() * CALM_QUOTES.length)];
    var screen = document.getElementById("panic-overlay");
    screen.innerHTML =
      '<div class="panic-screen">' +
        '<div class="panic-header">' +
          '<h2>Şu an zorlanıyorum</h2>' +
          '<button class="icon-btn" id="panic-close">✕</button>' +
        '</div>' +
        '<div class="panic-body">' +
          '<div class="calm-quote">' + quote + '</div>' +

          '<p class="section-title">Şu anki anksiyete seviyen</p>' +
          '<div class="card" style="margin-bottom:14px;">' +
            '<div class="metric-head"><span class="metric-label">Seviye</span><span class="metric-value" id="panic-lvl-out">5</span></div>' +
            '<input type="range" min="0" max="10" step="1" value="5" id="panic-lvl-range">' +
            '<div class="scale-ticks"><span>0</span><span>5</span><span>10</span></div>' +
            '<button class="btn btn-soft btn-block btn-sm" id="panic-save-before">Bu puanı kaydet (atak öncesi)</button>' +
          '</div>' +

          '<p class="section-title">60 saniyelik nefes egzersizi</p>' +
          '<div class="card" style="margin-bottom:14px;">' +
            '<div class="breathe-circle-wrap">' +
              '<div class="breathe-circle" id="breathe-circle">Başla</div>' +
              '<div class="breathe-timer" id="breathe-timer">Dokun ve başlat</div>' +
            '</div>' +
            '<button class="btn btn-primary btn-block" id="breathe-toggle">Nefes egzersizini başlat</button>' +
          '</div>' +

          '<p class="section-title">5-4-3-2-1 topraklama egzersizi</p>' +
          '<div class="card" style="margin-bottom:14px;">' +
            groundingStepsHTML() +
          '</div>' +

          '<p class="section-title">Sonraki adım</p>' +
          '<div class="card">' +
            '<p style="font-size:13.5px;color:var(--ink-soft);margin:0 0 14px;line-height:1.6;">10 dakika sonra kendini tekrar değerlendir. O zamana kadar nefes egzersizine veya topraklama adımlarına devam edebilirsin.</p>' +
            '<button class="btn btn-ghost btn-block" id="panic-recheck">10 dakika sonra tekrar değerlendir</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById("panic-close").addEventListener("click", closePanicMode);

    var plvlRange = document.getElementById("panic-lvl-range");
    var plvlOut = document.getElementById("panic-lvl-out");
    plvlRange.addEventListener("input", function () { plvlOut.textContent = plvlRange.value; });

    document.getElementById("panic-save-before").addEventListener("click", function () {
      var level = parseInt(plvlRange.value, 10);
      panicState.beforeLevel = level;
      state.entries.unshift({
        id: uid(), date: new Date().toISOString(), anxietyLevel: level,
        mood: null, triggers: [], symptoms: [], copingMethods: [], note: "", type: "panic_before"
      });
      persistEntries();
      showToast("Atak öncesi puan kaydedildi");
    });

    document.getElementById("breathe-toggle").addEventListener("click", toggleBreathing);

    document.getElementById("panic-recheck").addEventListener("click", function () {
      openRecheckModal();
    });
  }

  function groundingStepsHTML() {
    var steps = [
      { n: "5", t: "Gör", d: "Etrafında gördüğün 5 şeyi say." },
      { n: "4", t: "Dokun", d: "Dokunabildiğin 4 şeyi fark et." },
      { n: "3", t: "Dinle", d: "Duyduğun 3 sesi tanımla." },
      { n: "2", t: "Kokla", d: "Alabildiğin 2 kokuyu fark et." },
      { n: "1", t: "Tat al", d: "Fark edebildiğin 1 tadı düşün." }
    ];
    return steps.map(function (s) {
      return '<div class="grounding-step"><div class="num">' + s.n + '</div>' +
        '<div class="txt"><b>' + s.t + '</b><span>' + s.d + '</span></div></div>';
    }).join("");
  }

  function toggleBreathing() {
    if (panicState.breathing) { stopBreathing(); return; }
    panicState.breathing = true;
    var circle = document.getElementById("breathe-circle");
    var timerEl = document.getElementById("breathe-timer");
    var btn = document.getElementById("breathe-toggle");
    if (btn) btn.textContent = "Egzersizi durdur";

    var totalSeconds = 60;
    var remaining = totalSeconds;
    var phase = "inhale";

    function setPhase(p) {
      phase = p;
      if (!circle) return;
      circle.classList.remove("inhale", "exhale");
      if (p === "inhale") { circle.classList.add("inhale"); circle.textContent = "Nefes al"; }
      else if (p === "exhale") { circle.classList.add("exhale"); circle.textContent = "Nefes ver"; }
      else { circle.textContent = "Tut"; }
    }

    var phaseSeq = ["inhale", "hold", "exhale", "hold"];
    var phaseIdx = 0;
    setPhase(phaseSeq[0]);

    panicState.breathTimer = setInterval(function () {
      remaining -= 1;
      if (timerEl) timerEl.textContent = remaining > 0 ? remaining + " saniye kaldı" : "Tamamlandı";
      if (remaining % 4 === 0 && remaining > 0) {
        phaseIdx = (phaseIdx + 1) % phaseSeq.length;
        setPhase(phaseSeq[phaseIdx]);
      }
      if (remaining <= 0) {
        stopBreathing();
        showToast("Nefes egzersizi tamamlandı");
      }
    }, 1000);
  }

  function stopBreathing() {
    panicState.breathing = false;
    clearInterval(panicState.breathTimer);
    var circle = document.getElementById("breathe-circle");
    var timerEl = document.getElementById("breathe-timer");
    var btn = document.getElementById("breathe-toggle");
    if (circle) { circle.classList.remove("inhale", "exhale"); circle.textContent = "Başla"; }
    if (timerEl) timerEl.textContent = "Dokun ve başlat";
    if (btn) btn.textContent = "Nefes egzersizini başlat";
  }

  function openRecheckModal() {
    var overlay = document.getElementById("modal-root");
    overlay.innerHTML =
      '<div class="modal-overlay" id="recheck-overlay">' +
        '<div class="modal-sheet">' +
          '<h3>Şimdi nasılsın?</h3>' +
          '<p class="msub">10 dakika beklemen gerekmiyor — istediğin an tekrar değerlendirebilirsin.</p>' +
          '<div class="metric-head"><span class="metric-label">Şu anki seviye</span><span class="metric-value" id="recheck-out">5</span></div>' +
          '<input type="range" min="0" max="10" step="1" value="5" id="recheck-range">' +
          '<div class="scale-ticks"><span>0</span><span>5</span><span>10</span></div>' +
          '<div class="modal-actions">' +
            '<button class="btn btn-ghost" id="recheck-cancel">Vazgeç</button>' +
            '<button class="btn btn-primary" id="recheck-save">Kaydet</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    var range = document.getElementById("recheck-range");
    var out = document.getElementById("recheck-out");
    range.addEventListener("input", function () { out.textContent = range.value; });

    document.getElementById("recheck-cancel").addEventListener("click", function () { overlay.innerHTML = ""; });
    document.getElementById("recheck-save").addEventListener("click", function () {
      var level = parseInt(range.value, 10);
      state.entries.unshift({
        id: uid(), date: new Date().toISOString(), anxietyLevel: level,
        mood: null, triggers: [], symptoms: [], copingMethods: [], note: "", type: "panic_after"
      });
      persistEntries();
      overlay.innerHTML = "";
      showToast("Atak sonrası puan kaydedildi");
      closePanicMode();
    });
  }

  // ============================================================
  // GÖRÜNÜM: KAYITLAR (Geçmiş)
  // ============================================================
  var historyFilter = "all";

  function renderHistoryView() {
    var el = document.getElementById("view-history");
    el.innerHTML =
      '<div class="range-pills" id="history-pills">' +
        '<button class="range-pill" data-r="7">Son 7 gün</button>' +
        '<button class="range-pill" data-r="30">Son 30 gün</button>' +
        '<button class="range-pill" data-r="all">Tümü</button>' +
      '</div>' +
      '<div id="history-list"></div>';

    el.querySelectorAll(".range-pill").forEach(function (btn) {
      btn.addEventListener("click", function () {
        historyFilter = btn.getAttribute("data-r");
        renderHistoryView();
      });
    });
    var activeBtn = el.querySelector('[data-r="' + historyFilter + '"]');
    if (activeBtn) activeBtn.classList.add("active");

    renderHistoryList();
  }

  function filteredEntries(rangeKey) {
    var list = state.entries.slice();
    if (rangeKey === "7") {
      var cutoff7 = daysAgo(7);
      list = list.filter(function (e) { return new Date(e.date) >= cutoff7; });
    } else if (rangeKey === "30") {
      var cutoff30 = daysAgo(30);
      list = list.filter(function (e) { return new Date(e.date) >= cutoff30; });
    }
    list.sort(function (a, b) { return new Date(b.date) - new Date(a.date); });
    return list;
  }

  function renderHistoryList() {
    var list = filteredEntries(historyFilter);
    var wrap = document.getElementById("history-list");
    if (list.length === 0) {
      wrap.innerHTML =
        '<div class="empty">' +
          '<div class="icon-wrap">🗒️</div>' +
          '<h3>Henüz kayıt yok</h3>' +
          '<p>Bugün sekmesinden ilk kaydını eklediğinde burada görünecek.</p>' +
        '</div>';
      return;
    }
    var html = "";
    list.forEach(function (e) { html += entryCardHTML(e); });
    wrap.innerHTML = html;
    bindEntryDeleteButtons(wrap);
  }

  // ============================================================
  // GÖRÜNÜM: ATAK MODU sekmesi
  // ============================================================
  function renderPanicTabView() {
    var el = document.getElementById("view-panic");
    el.innerHTML =
      '<div class="card" style="text-align:center;">' +
        '<div class="icon-wrap" style="margin:4px auto 14px;background:var(--clay-light);">🫶</div>' +
        '<h2 style="margin-bottom:6px;">Zor bir an mı yaşıyorsun?</h2>' +
        '<p class="sub" style="margin-bottom:18px;">Nefes egzersizi, topraklama ve sakinleştirici adımlar için dokun.</p>' +
        '<button class="btn btn-primary btn-block" id="panic-tab-open">Atak modunu aç</button>' +
      '</div>' +
      '<p class="section-title">Bu hafta kaydedilen atak puanları</p>' +
      '<div id="panic-entries-list"></div>';

    document.getElementById("panic-tab-open").addEventListener("click", openPanicMode);

    var weekStart = startOfWeek(new Date());
    var panicEntries = state.entries.filter(function (e) {
      return (e.type === "panic_before" || e.type === "panic_after") && new Date(e.date) >= weekStart;
    }).sort(function (a, b) { return new Date(b.date) - new Date(a.date); });

    var wrap = document.getElementById("panic-entries-list");
    if (panicEntries.length === 0) {
      wrap.innerHTML = '<div class="empty"><p>Bu hafta henüz atak kaydı yok. Bu iyi bir işaret olabilir.</p></div>';
    } else {
      var html = "";
      panicEntries.forEach(function (e) { html += entryCardHTML(e); });
      wrap.innerHTML = html;
      bindEntryDeleteButtons(wrap);
    }
  }

  // ============================================================
  // GÖRÜNÜM: GRAFİKLER (Dashboard)
  // ============================================================
  function renderChartsView() {
    var el = document.getElementById("view-charts");

    var logEntries = state.entries.filter(function (e) { return e.type === "log"; });
    var last7 = logEntries.filter(function (e) { return new Date(e.date) >= daysAgo(7); });
    var last30 = logEntries.filter(function (e) { return new Date(e.date) >= daysAgo(30); });

    var avg7 = average(last7.map(function (e) { return e.anxietyLevel; }));
    var avg7prevWindow = average(
      logEntries.filter(function (e) {
        var d = new Date(e.date);
        return d >= daysAgo(14) && d < daysAgo(7);
      }).map(function (e) { return e.anxietyLevel; })
    );

    var trend = (avg7 != null && avg7prevWindow != null) ? (avg7 - avg7prevWindow) : null;

    var triggerCounts = countTags(logEntries, "triggers", TRIGGER_MAP);
    var symptomCounts = countTags(logEntries, "symptoms", SYMPTOM_MAP);

    var copingAll = [];
    logEntries.forEach(function (e) { (e.copingMethods || []).forEach(function (k) { copingAll.push(k); }); });
    var avoidCount = copingAll.filter(function (k) { return k === "kacindim"; }).length;
    var continueCount = copingAll.filter(function (k) { return k === "devam"; }).length;
    var totalAC = avoidCount + continueCount;
    var continuePct = totalAC > 0 ? Math.round((continueCount / totalAC) * 100) : null;

    var weekStart = startOfWeek(new Date());
    var weeklyAch = state.achievements.filter(function (a) { return new Date(a.date) >= weekStart; }).length;

    var html = "";

    html += '<div class="stat-grid">';
    html += statCardHTML("😌 Son 7 gün ortalama", avg7 != null ? avg7.toFixed(1) + "/10" : "—", trendSubLabel(trend));
    html += statCardHTML("🏆 Bu hafta başarı", String(weeklyAch), weeklyAch > 0 ? "harika gidiyor" : "henüz yok");
    html += statCardHTML("✅ Devam etme oranı", continuePct != null ? continuePct + "%" : "—", totalAC > 0 ? (continueCount + "/" + totalAC + " kez") : "veri yok");
    html += statCardHTML("📈 Son 30 gün kayıt", String(last30.length), "toplam kayıt");
    html += "</div>";

    html += '<div class="card">';
    html += '<h2>Son 30 gün anksiyete trendi</h2>';
    html += '<p class="sub">Günlük ortalama seviyeler</p>';
    html += buildTrendChartSvg(logEntries);
    html += "</div>";

    html += '<div class="card">';
    html += '<h2>En sık tetikleyiciler</h2>';
    html += '<p class="sub">Son 30 gün</p>';
    html += buildBarList(triggerCounts);
    html += "</div>";

    html += '<div class="card">';
    html += '<h2>En sık fiziksel belirtiler</h2>';
    html += '<p class="sub">Son 30 gün</p>';
    html += buildBarList(symptomCounts);
    html += "</div>";

    el.innerHTML = html;
  }

  function trendSubLabel(trend) {
    if (trend == null) return "karşılaştırma için veri yok";
    if (Math.abs(trend) < 0.05) return "değişim yok";
    var improved = trend < 0;
    var arrow = improved ? "▼" : "▲";
    return arrow + " " + Math.abs(trend).toFixed(1) + " önceki haftaya göre";
  }

  function statCardHTML(label, value, sub) {
    return '<div class="stat-card"><div class="label">' + label + '</div><div class="value">' + value + '</div><div class="sub2">' + sub + '</div></div>';
  }

  function average(arr) {
    if (!arr || arr.length === 0) return null;
    var sum = arr.reduce(function (a, b) { return a + b; }, 0);
    return sum / arr.length;
  }

  function countTags(entries, field, mapDict) {
    var counts = {};
    entries.forEach(function (e) {
      (e[field] || []).forEach(function (k) {
        if (!mapDict[k]) return;
        counts[k] = (counts[k] || 0) + 1;
      });
    });
    var arr = Object.keys(counts).map(function (k) {
      return { key: k, label: mapDict[k].label, emoji: mapDict[k].emoji, count: counts[k] };
    });
    arr.sort(function (a, b) { return b.count - a.count; });
    return arr.slice(0, 6);
  }

  function buildBarList(items) {
    if (items.length === 0) {
      return '<p style="font-size:13px;color:var(--ink-faint);margin:0;">Henüz yeterli veri yok.</p>';
    }
    var max = Math.max.apply(null, items.map(function (i) { return i.count; }));
    var html = "";
    items.forEach(function (i) {
      var pct = max > 0 ? Math.round((i.count / max) * 100) : 0;
      html += '<div class="bar-row">' +
        '<span class="blabel">' + i.emoji + " " + i.label + '</span>' +
        '<span class="bar-track"><span class="bar-fill" style="width:' + pct + '%"></span></span>' +
        '<span class="bcount">' + i.count + '</span>' +
      '</div>';
    });
    return html;
  }

  function buildTrendChartSvg(logEntries) {
    var days = [];
    for (var i = 29; i >= 0; i--) {
      var d = daysAgo(i);
      var dayEntries = logEntries.filter(function (e) { return isSameDay(e.date, d); });
      var avg = average(dayEntries.map(function (e) { return e.anxietyLevel; }));
      days.push({ date: d, avg: avg });
    }

    var withData = days.filter(function (d) { return d.avg != null; });
    if (withData.length < 2) {
      return '<p style="font-size:13px;color:var(--ink-faint);margin:0;">Trend görmek için en az 2 farklı günde kayıt ekle.</p>';
    }

    var W = 320, H = 170, padL = 24, padR = 8, padT = 10, padB = 20;
    var plotW = W - padL - padR, plotH = H - padT - padB;
    var n = days.length;

    function x(i) { return padL + (plotW * i / (n - 1)); }
    function y(v) { return padT + plotH - (plotH * v / 10); }

    var gridLines = "";
    [0, 5, 10].forEach(function (v) {
      var gy = y(v);
      gridLines += '<line x1="' + padL + '" y1="' + gy + '" x2="' + (W - padR) + '" y2="' + gy + '" stroke="var(--line)" stroke-width="1"/>';
      gridLines += '<text x="' + (padL - 5) + '" y="' + (gy + 3) + '" font-size="9" fill="var(--ink-faint)" text-anchor="end">' + v + '</text>';
    });

    var points = [];
    var dots = "";
    days.forEach(function (d, i) {
      if (d.avg == null) return;
      points.push(x(i) + "," + y(d.avg));
      dots += '<circle cx="' + x(i) + '" cy="' + y(d.avg) + '" r="2.2" fill="#8b85c4"/>';
    });

    var labelIdx = [0, Math.floor(n / 2), n - 1];
    var xLabels = "";
    labelIdx.forEach(function (i) {
      xLabels += '<text x="' + x(i) + '" y="' + (H - 4) + '" font-size="9" fill="var(--ink-faint)" text-anchor="middle">' + fmtDateShort(days[i].date) + '</text>';
    });

    return '<svg class="svg-chart" viewBox="0 0 ' + W + ' ' + H + '" width="100%" height="auto" role="img" aria-label="Son 30 gün anksiyete trend grafiği">' +
      gridLines +
      '<polyline points="' + points.join(" ") + '" fill="none" stroke="#8b85c4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
      dots + xLabels +
    "</svg>";
  }

  // ============================================================
  // GÖRÜNÜM: İLERLEME (Maruz Kalma)
  // ============================================================
  function renderProgressView() {
    var el = document.getElementById("view-progress");
    var weekStart = startOfWeek(new Date());
    var weeklyCount = state.achievements.filter(function (a) { return new Date(a.date) >= weekStart; }).length;

    var html = "";
    html += '<div class="card" style="text-align:center;">';
    html += '<p class="sub" style="margin-bottom:2px;">Bu haftaki başarıların</p>';
    html += '<div style="font-size:34px;font-weight:700;color:var(--lavender-dark);">' + weeklyCount + '</div>';
    html += '</div>';

    html += '<p class="section-title">Bir başarı ekle</p>';
    html += '<div class="ach-grid">';
    ACHIEVEMENTS.forEach(function (a) {
      html += '<div class="ach-item" data-add="' + a.key + '">' +
        '<div class="ic">' + a.emoji + '</div>' +
        '<div class="lbl">' + a.label + '</div>' +
        '<div class="plus">+</div>' +
      '</div>';
    });
    html += "</div>";

    html += '<p class="section-title">Geçmiş başarılar</p>';
    html += '<div class="card" id="ach-log"></div>';

    el.innerHTML = html;

    el.querySelectorAll("[data-add]").forEach(function (item) {
      item.addEventListener("click", function () {
        var key = item.getAttribute("data-add");
        openAchievementNoteModal(key);
      });
    });

    renderAchievementLog();
  }

  function openAchievementNoteModal(key) {
    var a = ACH_MAP[key];
    var overlay = document.getElementById("modal-root");
    overlay.innerHTML =
      '<div class="modal-overlay">' +
        '<div class="modal-sheet">' +
          '<h3>' + a.emoji + " " + a.label + '</h3>' +
          '<p class="msub">İstersen kısa bir not ekleyebilirsin.</p>' +
          '<textarea id="ach-note" placeholder="Nasıl geçti?"></textarea>' +
          '<div class="modal-actions">' +
            '<button class="btn btn-ghost" id="ach-cancel">Vazgeç</button>' +
            '<button class="btn btn-primary" id="ach-confirm">Kaydet</button>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById("ach-cancel").addEventListener("click", function () { overlay.innerHTML = ""; });
    document.getElementById("ach-confirm").addEventListener("click", function () {
      var note = document.getElementById("ach-note").value.trim();
      state.achievements.unshift({ id: uid(), date: new Date().toISOString(), key: key, label: a.label, note: note });
      persistAchievements();
      overlay.innerHTML = "";
      showToast("Başarı kaydedildi 🎉");
      renderProgressView();
    });
  }

  function renderAchievementLog() {
    var wrap = document.getElementById("ach-log");
    var list = state.achievements.slice().sort(function (a, b) { return new Date(b.date) - new Date(a.date); }).slice(0, 30);
    if (list.length === 0) {
      wrap.innerHTML = '<p style="font-size:13px;color:var(--ink-faint);margin:0;">Henüz başarı kaydı yok. Yukarıdan bir tane ekleyebilirsin.</p>';
      return;
    }
    var html = "";
    list.forEach(function (a) {
      var icon = ACH_MAP[a.key] ? ACH_MAP[a.key].emoji : "🏆";
      html += '<div class="ach-log-item"><span class="l">' + icon + " " + escapeHtml(a.label) + '</span><span class="d">' + relTime(a.date) + '</span></div>';
    });
    wrap.innerHTML = html;
  }

  // ============================================================
  // GÖRÜNÜM: AYARLAR
  // ============================================================
  function renderSettingsView() {
    var el = document.getElementById("view-settings");
    var theme = state.settings.theme || "system";

    var html = "";

    html += '<p class="section-title">Görünüm</p>';
    html += '<div class="card">';
    html += settingsRowRadio("Açık tema", "theme", "light", theme === "light");
    html += settingsRowRadio("Koyu tema", "theme", "dark", theme === "dark");
    html += settingsRowRadio("Sistemi takip et", "theme", "system", theme === "system");
    html += "</div>";

    html += '<p class="section-title">Rapor ve dışa aktarma</p>';
    html += '<div class="card">';
    html += '<p class="sub" style="margin-bottom:14px;">Kayıtlarını terapiste veya doktora göstermek için dışa aktarabilirsin.</p>';
    html += '<div class="range-pills" id="report-pills">' +
      '<button class="range-pill" data-r="7">Son 7 gün</button>' +
      '<button class="range-pill" data-r="30">Son 30 gün</button>' +
      '<button class="range-pill" data-r="all">Tümü</button>' +
    "</div>";
    html += '<button class="btn btn-soft btn-block" id="export-csv-btn" style="margin-bottom:10px;">CSV olarak dışa aktar</button>';
    html += '<button class="btn btn-ghost btn-block" id="print-report-btn">Yazdır / PDF\'e aktar</button>';
    html += "</div>";

    html += '<p class="section-title">Gizlilik</p>';
    html += '<div class="card">';
    html += '<p class="sub" style="margin-bottom:14px;">Tüm verilerin yalnızca bu cihazda saklanır. Hiçbir bilgi bir sunucuya veya buluta gönderilmez. Uygulamayı sildiğinde ya da verileri temizlediğinde kayıtların geri getirilemez.</p>';
    html += '<button class="btn btn-danger-ghost btn-block" id="delete-all-btn">Tüm verileri sil</button>';
    html += "</div>";

    html += '<div class="version-tag">Sakin · sürüm ' + APP_VERSION + '</div>';

    el.innerHTML = html;

    var reportFilter = "7";
    var pillsWrap = document.getElementById("report-pills");
    pillsWrap.querySelectorAll(".range-pill").forEach(function (btn) {
      if (btn.getAttribute("data-r") === reportFilter) btn.classList.add("active");
      btn.addEventListener("click", function () {
        pillsWrap.querySelectorAll(".range-pill").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        reportFilter = btn.getAttribute("data-r");
      });
    });

    el.querySelectorAll('input[name="theme"]').forEach(function (radio) {
      radio.addEventListener("change", function () {
        state.settings.theme = radio.value;
        persistSettings();
        applyTheme();
        updateThemeIcon();
      });
    });

    document.getElementById("export-csv-btn").addEventListener("click", function () {
      exportCSV(reportFilter);
    });
    document.getElementById("print-report-btn").addEventListener("click", function () {
      openPrintReport(reportFilter);
    });
    document.getElementById("delete-all-btn").addEventListener("click", confirmDeleteAll);
  }

  function settingsRowRadio(label, name, value, checked) {
    var id = name + "-" + value;
    return '<label class="settings-row" for="' + id + '" style="cursor:pointer;">' +
      '<div class="l"><b>' + label + '</b></div>' +
      '<input type="radio" name="' + name + '" id="' + id + '" value="' + value + '"' + (checked ? " checked" : "") + ' style="width:20px;height:20px;accent-color:var(--lavender);flex-shrink:0;">' +
    '</label>';
  }

  function confirmDeleteAll() {
    var overlay = document.getElementById("modal-root");
    overlay.innerHTML =
      '<div class="modal-overlay">' +
        '<div class="modal-sheet">' +
          '<h3>Tüm verileri sil</h3>' +
          '<p class="msub">Bu işlem geri alınamaz. Tüm günlük kayıtların ve başarıların kalıcı olarak silinecek.</p>' +
          '<div class="modal-actions">' +
            '<button class="btn btn-ghost" id="del-cancel">Vazgeç</button>' +
            '<button class="btn btn-primary" id="del-confirm" style="background:var(--red);">Evet, sil</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById("del-cancel").addEventListener("click", function () { overlay.innerHTML = ""; });
    document.getElementById("del-confirm").addEventListener("click", function () {
      state.entries = [];
      state.achievements = [];
      persistEntries();
      persistAchievements();
      overlay.innerHTML = "";
      showToast("Tüm veriler silindi");
      renderActiveView();
    });
  }

  // ---------------- CSV / Yazdırma raporu ----------------
  function getReportEntries(rangeKey) {
    return filteredEntries(rangeKey).filter(function (e) { return e.type === "log"; });
  }

  function exportCSV(rangeKey) {
    var entries = getReportEntries(rangeKey);
    if (entries.length === 0) {
      showToast("Bu aralıkta kayıt yok");
      return;
    }
    var header = ["Tarih", "Saat", "Anksiyete (0-10)", "Ruh hali", "Tetikleyiciler", "Fiziksel belirtiler", "Baş etme yöntemi", "Not"];
    var rows = [header];
    entries.forEach(function (e) {
      rows.push([
        fmtDateLong(e.date),
        fmtTime(e.date),
        String(e.anxietyLevel),
        e.mood && MOOD_MAP[e.mood] ? MOOD_MAP[e.mood].label : "",
        (e.triggers || []).map(function (k) { return TRIGGER_MAP[k] ? TRIGGER_MAP[k].label : k; }).join("; "),
        (e.symptoms || []).map(function (k) { return SYMPTOM_MAP[k] ? SYMPTOM_MAP[k].label : k; }).join("; "),
        (e.copingMethods || []).map(function (k) { return COPING_MAP[k] ? COPING_MAP[k].label : k; }).join("; "),
        (e.note || "").replace(/\n/g, " ")
      ]);
    });

    var csv = rows.map(function (row) {
      return row.map(function (cell) {
        var s = String(cell == null ? "" : cell);
        if (s.indexOf(",") > -1 || s.indexOf('"') > -1 || s.indexOf("\n") > -1) {
          s = '"' + s.replace(/"/g, '""') + '"';
        }
        return s;
      }).join(",");
    }).join("\r\n");

    var blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "sakin-rapor-" + new Date().toISOString().slice(0, 10) + ".csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("CSV indirildi");
  }

  function openPrintReport(rangeKey) {
    var entries = getReportEntries(rangeKey);
    var rangeLabel = rangeKey === "7" ? "Son 7 gün" : (rangeKey === "30" ? "Son 30 gün" : "Tüm kayıtlar");
    var avg = average(entries.map(function (e) { return e.anxietyLevel; }));

    var win = window.open("", "_blank");
    if (!win) { showToast("Yeni pencere açılamadı"); return; }

    var rowsHtml = entries.map(function (e) {
      return "<tr>" +
        "<td>" + fmtDateLong(e.date) + " " + fmtTime(e.date) + "</td>" +
        "<td>" + e.anxietyLevel + "/10</td>" +
        "<td>" + (e.mood && MOOD_MAP[e.mood] ? MOOD_MAP[e.mood].label : "-") + "</td>" +
        "<td>" + (e.triggers || []).map(function (k) { return TRIGGER_MAP[k] ? TRIGGER_MAP[k].label : k; }).join(", ") + "</td>" +
        "<td>" + (e.symptoms || []).map(function (k) { return SYMPTOM_MAP[k] ? SYMPTOM_MAP[k].label : k; }).join(", ") + "</td>" +
        "<td>" + (e.copingMethods || []).map(function (k) { return COPING_MAP[k] ? COPING_MAP[k].label : k; }).join(", ") + "</td>" +
        "<td>" + escapeHtml(e.note || "") + "</td>" +
      "</tr>";
    }).join("");

    var doc = "<!DOCTYPE html><html lang='tr'><head><meta charset='UTF-8'><title>Sakin — Anksiyete raporu</title>" +
      "<style>" +
      "body{font-family:Arial,sans-serif;color:#222;padding:24px;max-width:900px;margin:0 auto;}" +
      "h1{font-size:20px;margin-bottom:2px;} .meta{color:#666;font-size:13px;margin-bottom:18px;}" +
      "table{width:100%;border-collapse:collapse;font-size:12.5px;} th,td{border:1px solid #ddd;padding:6px 8px;text-align:left;vertical-align:top;}" +
      "th{background:#f3f1fb;} .summary{margin-bottom:18px;font-size:13.5px;}" +
      "@media print{ body{padding:0;} }" +
      "</style></head><body>" +
      "<h1>Sakin — Anksiyete günlüğü raporu</h1>" +
      "<div class='meta'>" + rangeLabel + " · oluşturulma: " + fmtDateLong(new Date().toISOString()) + "</div>" +
      "<div class='summary'>Toplam kayıt: " + entries.length + (avg != null ? " · Ortalama anksiyete: " + avg.toFixed(1) + "/10" : "") + "</div>" +
      "<table><thead><tr><th>Tarih</th><th>Seviye</th><th>Ruh hali</th><th>Tetikleyiciler</th><th>Belirtiler</th><th>Baş etme</th><th>Not</th></tr></thead>" +
      "<tbody>" + (rowsHtml || "<tr><td colspan='7'>Kayıt yok</td></tr>") + "</tbody></table>" +
      "</body></html>";

    win.document.open();
    win.document.write(doc);
    win.document.close();
    win.focus();
    setTimeout(function () { win.print(); }, 350);
  }

  // ============================================================
  // GEZİNME / GENEL UYGULAMA AKIŞI
  // ============================================================
  function renderActiveView() {
    var active = document.querySelector(".nav-item.active");
    var name = active ? active.getAttribute("data-view") : "today";
    renderViewByName(name);
  }

  function renderViewByName(name) {
    if (name === "today") renderLogView();
    else if (name === "panic") renderPanicTabView();
    else if (name === "history") renderHistoryView();
    else if (name === "charts") renderChartsView();
    else if (name === "progress") renderProgressView();
    else if (name === "settings") renderSettingsView();
  }

  function setActiveTab(name) {
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-view") === name);
    });
    document.querySelectorAll(".view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + name);
    });
    renderViewByName(name);
    window.scrollTo(0, 0);
  }

  function initNav() {
    document.querySelectorAll(".nav-item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setActiveTab(btn.getAttribute("data-view"));
      });
    });
  }

  function initPanicEntry() {
    var btn = document.getElementById("home-panic-btn");
    if (btn) btn.addEventListener("click", openPanicMode);
  }

  function initThemeToggleHeader() {
    var btn = document.getElementById("theme-quick-toggle");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var current = state.settings.theme || "system";
      var next = current === "dark" ? "light" : "dark";
      state.settings.theme = next;
      persistSettings();
      applyTheme();
      updateThemeIcon();
    });
    updateThemeIcon();
  }

  function updateThemeIcon() {
    var btn = document.getElementById("theme-quick-toggle");
    if (!btn) return;
    var current = state.settings.theme || "system";
    var isDark = current === "dark" || (current === "system" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
    btn.textContent = isDark ? "☀️" : "🌙";
  }

  // ---------------- Sürüm / migrasyon kontrolü ----------------
  function checkVersion() {
    var stored = localStorage.getItem(STORE_KEYS.version);
    if (stored !== APP_VERSION) {
      localStorage.setItem(STORE_KEYS.version, APP_VERSION);
    }
  }

  // ---------------- Başlangıç ----------------
  function init() {
    checkVersion();
    applyTheme();
    initNav();
    initPanicEntry();
    initThemeToggleHeader();
    setActiveTab("today");

    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("./sw.js").then(function (reg) {
          reg.addEventListener("updatefound", function () {
            var newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener("statechange", function () {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                showUpdateToast();
              }
            });
          });
        }).catch(function () {});

        var refreshing = false;
        navigator.serviceWorker.addEventListener("controllerchange", function () {
          if (refreshing) return;
          refreshing = true;
          window.location.reload();
        });
      });
    }
  }

  function showUpdateToast() {
    var el = document.getElementById("toast");
    if (!el) return;
    el.textContent = "Yeni sürüm hazır, dokunarak güncelle";
    el.style.cursor = "pointer";
    el.classList.add("show");
    el.onclick = function () {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.getRegistration().then(function (reg) {
          if (reg && reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
          else window.location.reload();
        });
      } else {
        window.location.reload();
      }
    };
  }

  document.addEventListener("DOMContentLoaded", init);
})();
