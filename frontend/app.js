import { fetchDashboard } from "./api.js";

const MONTH_PALETTES = [
  { bg: "#F5EDE3", accent: "#C17F5B", dot: "#E8C4A2" },
  { bg: "#EAF0E8", accent: "#6A8F6A", dot: "#B7D1B7" },
  { bg: "#F0EAF5", accent: "#9B7BB8", dot: "#D4BFE8" },
  { bg: "#F5EDEA", accent: "#C16B6B", dot: "#E8BEBE" },
  { bg: "#EAF0F5", accent: "#5B87A8", dot: "#B2CFE3" },
  { bg: "#F5F1E6", accent: "#A0844F", dot: "#E3D3A7" }
];

const LOGS_PER_PAGE = 7;

const state = {
  uid: "",
  tab: "overview",
  expandedMonth: null,
  logPage: 1,
  dashboard: null
};

const loginCard = document.getElementById("login-card");
const dashboardRoot = document.getElementById("dashboard");
const loginForm = document.getElementById("login-form");
const uidInput = document.getElementById("uid-input");
const loginError = document.getElementById("login-error");
const profileHeader = document.getElementById("profile-header");
const tabButtons = document.getElementById("tab-buttons");
const tabContent = document.getElementById("tab-content");
const logoutButton = document.getElementById("logout-btn");

function normalizeUid(uid = "") {
  return uid.trim().toUpperCase().replace(/\s+/g, "");
}

function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2);
}

function formatLongDate(dateString) {
  if (!dateString) {
    return "Unknown Date";
  }

  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function formatShortDate(dateString) {
  if (!dateString) {
    return "";
  }

  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric"
  });
}

function formatTime(dateString) {
  if (!dateString) {
    return null;
  }

  const date = new Date(dateString);
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function pctColor(pct) {
  if (pct >= 85) return "#6A8F6A";
  if (pct >= 60) return "#C17F5B";
  return "#C16B6B";
}

function buildRadialProgress(pct, color, size = 90, stroke = 8) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;

  return `
    <svg width="${size}" height="${size}" style="transform:rotate(-90deg)">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="#E8DDD4" stroke-width="${stroke}"></circle>
      <circle
        cx="${size / 2}"
        cy="${size / 2}"
        r="${r}"
        fill="none"
        stroke="${color}"
        stroke-width="${stroke}"
        stroke-dasharray="${circ}"
        stroke-dashoffset="${offset}"
        stroke-linecap="round"
        style="transition:stroke-dashoffset .9s cubic-bezier(.4,0,.2,1)"
      ></circle>
    </svg>
  `;
}

function buildMonthlyData(records) {
  const grouped = new Map();

  records.forEach((record) => {
    const date = new Date(record.attendanceDate || record.firstScannedAt || record.createdAt);
    const monthKey = `${date.getFullYear()}-${date.getMonth()}`;

    if (!grouped.has(monthKey)) {
      grouped.set(monthKey, {
        month: date.toLocaleDateString("en-IN", { month: "long" }),
        sortKey: `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`,
        present: 0,
        completed: 0,
        dates: []
      });
    }

    const monthEntry = grouped.get(monthKey);
    monthEntry.present += 1;
    monthEntry.completed += record.exitScannedAt ? 1 : 0;
    monthEntry.dates.push({
      label: formatShortDate(record.attendanceDate || record.firstScannedAt),
      completed: Boolean(record.exitScannedAt)
    });
  });

  return [...grouped.values()].sort((a, b) => b.sortKey.localeCompare(a.sortKey));
}

function renderHeader(student) {
  const subtitle = [
    student.department || "Department not set",
    student.year ? `Year ${student.year}` : ""
  ]
    .filter(Boolean)
    .join(" · ");

  const badgeParts = [
    `UID: ${student.uid || state.uid}`,
    student.rollNo ? `Roll No: ${student.rollNo}` : "",
    student.section ? `Sec ${student.section}` : ""
  ].filter(Boolean);

  profileHeader.innerHTML = `
    <div class="avatar">${initials(student.name || "Student")}</div>
    <div class="htext">
      <h1>${student.name || "Student"}</h1>
      <p>${subtitle || "Attendance details synced from Firebase"}</p>
      <span class="badge">${badgeParts.join(" · ")}</span>
    </div>
  `;
}

function renderTabs() {
  const tabs = [
    ["overview", "Overview"],
    ["monthly", "Monthly"],
    ["log", "Log"]
  ];

  tabButtons.innerHTML = tabs
    .map(
      ([key, label]) =>
        `<button class="tab-btn${state.tab === key ? " active" : ""}" data-tab="${key}">${label}</button>`
    )
    .join("");

  tabButtons.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      state.tab = button.dataset.tab;
      renderDashboard();
    });
  });
}

function renderOverview(records, logs) {
  const totalPresent = records.length;
  const completedExits = records.filter((record) => record.exitScannedAt).length;
  const pendingExits = totalPresent - completedExits;
  const completionPct = totalPresent
    ? Math.round((completedExits / totalPresent) * 100)
    : 0;
  const completionColor = pctColor(completionPct);
  const statusLabel =
    completionPct >= 85 ? "Complete" : completionPct >= 60 ? "In Progress" : "Pending";

  return `
    <div class="overall-card">
      <div class="overall-left">
        <h2>Attendance Completion</h2>
        <div class="big-num">${totalPresent} <span>recorded days</span></div>
        <p class="overall-sub">Live data from RFID entry and exit scans</p>
      </div>
      <div class="radial-wrap">
        ${buildRadialProgress(completionPct, completionColor)}
        <div class="radial-label">${completionPct}%<span class="sl">Exit logged</span></div>
      </div>
    </div>

    <div class="chip-row">
      <div class="chip"><span class="cl">Days Present</span><span class="cv" style="color:#6A8F6A">${totalPresent}</span></div>
      <div class="chip"><span class="cl">Exit Recorded</span><span class="cv" style="color:#5B87A8">${completedExits}</span></div>
      <div class="chip"><span class="cl">Exit Pending</span><span class="cv" style="color:#C16B6B">${pendingExits}</span></div>
      <div class="chip"><span class="cl">Scan Events</span><span class="cv">${logs.length}</span></div>
      <div class="chip"><span class="cl">Status</span><span class="cv" style="color:${completionColor};font-size:15px">${statusLabel}</span></div>
    </div>

    <p class="fnote">Portal shows live RFID-based attendance synced from the Firebase backend.</p>
  `;
}

function renderMonthly(records) {
  const monthlyData = buildMonthlyData(records);

  if (!monthlyData.length) {
    return `<div class="empty-state">No monthly attendance records available yet for this UID.</div>`;
  }

  const cards = monthlyData
    .map((month, index) => {
      const pct = month.present ? Math.round((month.completed / month.present) * 100) : 0;
      const palette = MONTH_PALETTES[index % MONTH_PALETTES.length];
      const isOpen = state.expandedMonth === index;
      const details = month.dates
        .map(
          (dateItem) =>
            `<span class="detail-chip" style="background:${palette.accent}15;border-color:${palette.accent}40;color:${palette.accent}">
              ${dateItem.label}${dateItem.completed ? " · exit" : " · entry only"}
            </span>`
        )
        .join("");

      return `
        <div class="month-card" style="background:${palette.bg}" data-month-index="${index}">
          <div class="mhdr">
            <div class="micon" style="background:${palette.dot};color:${palette.accent}">${month.month.slice(0, 3).toUpperCase()}</div>
            <div class="minfo">
              <div class="mname">${month.month}</div>
              <div class="mfrac">${month.present} recorded day(s) · ${month.completed} with exit log</div>
            </div>
            <div class="mbar-wrap">
              <div class="bar-bg"><div class="bar-fill" style="width:${pct}%;background:${palette.accent}"></div></div>
              <div class="bar-pct" style="color:${palette.accent}">${pct}%</div>
            </div>
            <div class="arrow" style="color:${palette.accent};transform:${isOpen ? "rotate(180deg)" : "none"}">▾</div>
          </div>
          ${
            isOpen
              ? details
                ? `<div class="detail-list"><span style="font-size:10.5px;color:#8C7B6E;width:100%;margin-bottom:2px">Recorded on:</span>${details}</div>`
                : `<p class="no-abs">No records for this month.</p>`
              : ""
          }
        </div>
      `;
    })
    .join("");

  return `
    <div class="stitle">Monthly Breakdown</div>
    <div class="month-grid">${cards}</div>
    <p class="fnote" style="margin-top:18px">Tap a month to see recorded dates and whether exit was scanned.</p>
  `;
}

function renderLog(records) {
  if (!records.length) {
    return `<div class="empty-state">No attendance logs recorded for this student yet.</div>`;
  }

  const totalPages = Math.ceil(records.length / LOGS_PER_PAGE);
  const pagedRecords = records.slice(
    (state.logPage - 1) * LOGS_PER_PAGE,
    state.logPage * LOGS_PER_PAGE
  );

  const rows = pagedRecords
    .map((record) => {
      const hasExit = Boolean(record.exitScannedAt);
      return `
        <div class="log-row${hasExit ? "" : " ab"}">
          <span class="ldate">${formatLongDate(record.attendanceDate || record.firstScannedAt)}</span>
          <span>${record.firstScannedAt ? `<span class="tval">${formatTime(record.firstScannedAt)}</span>` : `<span class="tdash">—</span>`}</span>
          <span>${record.exitScannedAt ? `<span class="tval">${formatTime(record.exitScannedAt)}</span>` : `<span class="tdash">—</span>`}</span>
          <span class="pill ${hasExit ? "p" : "a"}">${hasExit ? "Complete" : "Entry Only"}</span>
        </div>
      `;
    })
    .join("");

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .map(
      (pageNumber) =>
        `<button class="pbtn${state.logPage === pageNumber ? " on" : ""}" data-page="${pageNumber}">${pageNumber}</button>`
    )
    .join("");

  return `
    <div class="log-wrap">
      <div class="log-head">
        <h2>Attendance Log</h2>
        <p>Daily entry and exit records for this student UID</p>
      </div>
      <div class="log-cols">
        <span class="lcol">Date</span>
        <span class="lcol">Entry</span>
        <span class="lcol">Exit</span>
        <span class="lcol">Status</span>
      </div>
      ${rows}
      <div class="paging">${pages}</div>
    </div>
    <p class="fnote">Entry-only means the exit scanner has not recorded a departure yet.</p>
  `;
}

function bindMonthlyToggles() {
  tabContent.querySelectorAll("[data-month-index]").forEach((card) => {
    card.addEventListener("click", () => {
      const monthIndex = Number(card.dataset.monthIndex);
      state.expandedMonth = state.expandedMonth === monthIndex ? null : monthIndex;
      renderDashboard();
    });
  });
}

function bindLogPagination() {
  tabContent.querySelectorAll("[data-page]").forEach((button) => {
    button.addEventListener("click", () => {
      state.logPage = Number(button.dataset.page);
      renderDashboard();
    });
  });
}

function renderDashboard() {
  if (!state.dashboard) {
    return;
  }

  const { student, records, logs } = state.dashboard;
  renderHeader(student);
  renderTabs();

  if (state.tab === "overview") {
    tabContent.innerHTML = renderOverview(records, logs);
    return;
  }

  if (state.tab === "monthly") {
    tabContent.innerHTML = renderMonthly(records);
    bindMonthlyToggles();
    return;
  }

  tabContent.innerHTML = renderLog(records);
  bindLogPagination();
}

function showDashboard() {
  loginCard.classList.add("hidden");
  dashboardRoot.classList.remove("hidden");
}

function showLogin() {
  dashboardRoot.classList.add("hidden");
  loginCard.classList.remove("hidden");
}

async function loadStudent(uid) {
  state.uid = normalizeUid(uid);
  state.logPage = 1;
  state.expandedMonth = null;
  loginError.textContent = "";

  try {
    const dashboard = await fetchDashboard(state.uid);
    state.dashboard = dashboard;
    localStorage.setItem("studentUid", state.uid);
    showDashboard();
    renderDashboard();
  } catch (error) {
    state.dashboard = null;
    showLogin();
    loginError.textContent = error.message;
  }
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const uid = normalizeUid(uidInput.value);

  if (!uid) {
    loginError.textContent = "Please enter a valid UID.";
    return;
  }

  await loadStudent(uid);
});

logoutButton.addEventListener("click", () => {
  localStorage.removeItem("studentUid");
  state.dashboard = null;
  state.uid = "";
  uidInput.value = "";
  showLogin();
});

const savedUid = normalizeUid(localStorage.getItem("studentUid") || "");
if (savedUid) {
  uidInput.value = savedUid;
  loadStudent(savedUid);
}
