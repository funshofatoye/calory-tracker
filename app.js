// ===== Calorie Tracker — Vanilla JS with localStorage =====

(function () {
  "use strict";

  // ---- Helpers ----
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function todayKey() {
    return formatDateKey(new Date());
  }

  function formatDateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function friendlyDate(dateKey) {
    const today = todayKey();
    if (dateKey === today) return "Today";
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    if (dateKey === formatDateKey(yesterday)) return "Yesterday";
    const d = new Date(dateKey + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  function formatFullDate(dateKey) {
    const d = new Date(dateKey + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const mealIcons = {
    breakfast: "🍳",
    lunch: "🥗",
    dinner: "🍝",
    snack: "🍎",
  };

  const mealLabels = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
  };

  // ---- Storage ----
  const STORAGE_KEY = "calorieTracker";

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.warn("Failed to parse localStorage data:", e);
    }
    return { goal: 2000, entries: {} };
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  // ---- State ----
  let data = loadData();
  let currentDate = todayKey();

  // ---- DOM Refs ----
  const headerDate = $("#header-date");
  const totalCalories = $("#total-calories");
  const goalCalories = $("#goal-calories");
  const remainingCalories = $("#remaining-calories");
  const ringFill = $("#ring-fill");
  const entriesList = $("#entries-list");
  const emptyState = $("#empty-state");
  const weeklyChart = $("#weekly-chart");

  const modalAdd = $("#modal-add");
  const modalGoal = $("#modal-goal");
  const modalHistory = $("#modal-history");
  const addForm = $("#add-form");
  const goalForm = $("#goal-form");
  const goalInput = $("#goal-input");
  const historyList = $("#history-list");
  const toast = $("#toast");

  // Meal cal labels
  const mealCalEls = {
    breakfast: $("#breakfast-cal"),
    lunch: $("#lunch-cal"),
    dinner: $("#dinner-cal"),
    snack: $("#snack-cal"),
  };

  // Meal bar fills
  const mealBarEls = {
    breakfast: $("#breakfast-bar"),
    lunch: $("#lunch-bar"),
    dinner: $("#dinner-bar"),
    snack: $("#snack-bar"),
  };

  // ---- Modal Helpers ----
  function openModal(modal) {
    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    // Focus first input
    const firstInput = modal.querySelector("input, select");
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  function closeModal(modal) {
    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2500);
  }

  // ---- Rendering ----
  function render() {
    renderHeader();
    renderSummary();
    renderEntries();
    renderWeeklyChart();
  }

  function renderHeader() {
    headerDate.textContent = formatFullDate(currentDate);
  }

  function getEntriesForDate(dateKey) {
    return data.entries[dateKey] || [];
  }

  function getMealCalories(entries, meal) {
    return entries
      .filter((e) => e.meal === meal)
      .reduce((sum, e) => sum + e.calories, 0);
  }

  function renderSummary() {
    const entries = getEntriesForDate(currentDate);
    const total = entries.reduce((sum, e) => sum + e.calories, 0);
    const goal = data.goal;
    const remaining = Math.max(0, goal - total);

    totalCalories.textContent = total.toLocaleString();
    goalCalories.textContent = goal.toLocaleString();
    remainingCalories.textContent =
      total > goal
        ? `+${(total - goal).toLocaleString()}`
        : remaining.toLocaleString();

    // Ring
    const circumference = 2 * Math.PI * 52; // ~326.73
    const pct = Math.min(total / goal, 1.5);
    const offset = circumference - pct * circumference;
    ringFill.style.strokeDashoffset = Math.max(0, offset);
    ringFill.classList.toggle("over", total > goal);

    // Meal bars
    const meals = ["breakfast", "lunch", "dinner", "snack"];
    meals.forEach((meal) => {
      const cal = getMealCalories(entries, meal);
      mealCalEls[meal].textContent = `${cal} kcal`;
      const pctMeal = goal > 0 ? Math.min((cal / goal) * 100, 100) : 0;
      mealBarEls[meal].style.width = pctMeal + "%";
    });
  }

  function renderEntries() {
    const entries = getEntriesForDate(currentDate);

    if (entries.length === 0) {
      entriesList.innerHTML = "";
      entriesList.appendChild(emptyState);
      emptyState.style.display = "block";
      return;
    }

    emptyState.style.display = "none";

    // Group by meal order
    const mealOrder = ["breakfast", "lunch", "dinner", "snack"];
    const sorted = [...entries].sort(
      (a, b) => mealOrder.indexOf(a.meal) - mealOrder.indexOf(b.meal)
    );

    entriesList.innerHTML = "";
    sorted.forEach((entry) => {
      const card = document.createElement("div");
      card.className = "entry-card";
      card.innerHTML = `
        <div class="entry-icon ${entry.meal}">${mealIcons[entry.meal]}</div>
        <div class="entry-info">
          <div class="entry-name">${escapeHtml(entry.name)}</div>
          <div class="entry-meta">${mealLabels[entry.meal]}</div>
        </div>
        <div class="entry-calories">${entry.calories} kcal</div>
        <button class="entry-delete" data-id="${entry.id}" title="Delete">🗑️</button>
      `;
      entriesList.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  function renderWeeklyChart() {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0=Sun
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      days.push(formatDateKey(d));
    }

    const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const goal = data.goal;

    // Find max for scaling
    let maxCal = goal;
    days.forEach((dk) => {
      const entries = getEntriesForDate(dk);
      const total = entries.reduce((sum, e) => sum + e.calories, 0);
      if (total > maxCal) maxCal = total;
    });

    weeklyChart.innerHTML = "";
    days.forEach((dk, i) => {
      const entries = getEntriesForDate(dk);
      const total = entries.reduce((sum, e) => sum + e.calories, 0);
      const heightPct = maxCal > 0 ? (total / maxCal) * 100 : 0;

      const isToday = dk === todayKey();
      const isOver = total > goal;

      const dayEl = document.createElement("div");
      dayEl.className = "week-day";
      dayEl.innerHTML = `
        <span class="week-cal">${total > 0 ? total : ""}</span>
        <div class="week-bar-wrapper">
          <div class="week-bar ${isToday ? "today" : ""} ${isOver ? "over" : ""}" style="height: ${Math.max(heightPct, 3)}%"></div>
        </div>
        <span class="week-label">${dayLabels[i]}</span>
      `;
      weeklyChart.appendChild(dayEl);
    });
  }

  function renderHistory() {
    const dateKeys = Object.keys(data.entries)
      .filter((dk) => data.entries[dk].length > 0)
      .sort()
      .reverse();

    if (dateKeys.length === 0) {
      historyList.innerHTML =
        '<p class="history-empty">No history yet. Start tracking to see your progress!</p>';
      return;
    }

    historyList.innerHTML = "";
    dateKeys.forEach((dk) => {
      const entries = data.entries[dk];
      const total = entries.reduce((sum, e) => sum + e.calories, 0);
      const goal = data.goal;
      const isOver = total > goal;

      const item = document.createElement("div");
      item.className = "history-item";
      item.innerHTML = `
        <div>
          <div class="history-date">${friendlyDate(dk)}</div>
          <div class="history-goal" style="font-size:0.7rem; margin-top:2px; color: var(--clr-text-muted)">${new Date(dk + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
        </div>
        <div class="history-detail">
          <span class="history-cal">${total.toLocaleString()} kcal</span>
          <span class="history-badge ${isOver ? "badge-over" : "badge-under"}">${isOver ? "Over" : "Under"}</span>
          <div class="history-goal">Goal: ${goal.toLocaleString()}</div>
        </div>
      `;
      historyList.appendChild(item);
    });
  }

  // ---- Event Handlers ----

  // Add Entry
  $("#btn-add-entry").addEventListener("click", () => openModal(modalAdd));
  $("#modal-add-close").addEventListener("click", () => closeModal(modalAdd));
  modalAdd.addEventListener("click", (e) => {
    if (e.target === modalAdd) closeModal(modalAdd);
  });

  addForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#food-name").value.trim();
    const calories = parseInt($("#food-calories").value, 10);
    const meal = $("#food-meal").value;

    if (!name || isNaN(calories) || calories < 1) return;

    const entry = { id: uid(), name, calories, meal, time: Date.now() };

    if (!data.entries[currentDate]) data.entries[currentDate] = [];
    data.entries[currentDate].push(entry);
    saveData(data);

    addForm.reset();
    closeModal(modalAdd);
    render();
    showToast(`Added "${name}" — ${calories} kcal`);
  });

  // Set Goal
  $("#btn-set-goal").addEventListener("click", () => {
    goalInput.value = data.goal;
    openModal(modalGoal);
  });
  $("#modal-goal-close").addEventListener("click", () =>
    closeModal(modalGoal)
  );
  modalGoal.addEventListener("click", (e) => {
    if (e.target === modalGoal) closeModal(modalGoal);
  });

  $$(".preset-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      goalInput.value = btn.dataset.value;
    });
  });

  goalForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const val = parseInt(goalInput.value, 10);
    if (isNaN(val) || val < 500) return;
    data.goal = val;
    saveData(data);
    closeModal(modalGoal);
    render();
    showToast(`Goal set to ${val.toLocaleString()} kcal`);
  });

  // History
  $("#btn-view-history").addEventListener("click", () => {
    renderHistory();
    openModal(modalHistory);
  });
  $("#modal-history-close").addEventListener("click", () =>
    closeModal(modalHistory)
  );
  modalHistory.addEventListener("click", (e) => {
    if (e.target === modalHistory) closeModal(modalHistory);
  });

  // Delete Entry
  entriesList.addEventListener("click", (e) => {
    const btn = e.target.closest(".entry-delete");
    if (!btn) return;
    const id = btn.dataset.id;
    const entries = data.entries[currentDate];
    if (!entries) return;

    const idx = entries.findIndex((en) => en.id === id);
    if (idx === -1) return;

    const removed = entries.splice(idx, 1)[0];
    if (entries.length === 0) delete data.entries[currentDate];
    saveData(data);
    render();
    showToast(`Removed "${removed.name}"`);
  });

  // Date Navigation
  function changeDate(offset) {
    const d = new Date(currentDate + "T00:00:00");
    d.setDate(d.getDate() + offset);
    currentDate = formatDateKey(d);
    render();
  }

  $("#prev-day").addEventListener("click", () => changeDate(-1));
  $("#next-day").addEventListener("click", () => changeDate(1));
  $("#today-btn").addEventListener("click", () => {
    currentDate = todayKey();
    render();
  });

  // Keyboard: Escape to close modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      [modalAdd, modalGoal, modalHistory].forEach((m) => {
        if (m.classList.contains("active")) closeModal(m);
      });
    }
  });

  // ---- Init ----
  render();
})();

