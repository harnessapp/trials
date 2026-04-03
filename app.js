let rawPayload = null;
let filteredMeetings = [];
let selectedState = "";
let selectedMeetingKey = "";
let selectedRaceKey = "";
let expandedHorse = null;
let activeTrialFilter = "ALL";

document.addEventListener("DOMContentLoaded", async () => {
  const meetingSelect = document.getElementById("meetingSelect");
  const trialFilters = document.getElementById("trialFilters");

  if (trialFilters) {
    trialFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".trial-filter-btn");
      if (!btn) return;

      activeTrialFilter = btn.dataset.filter || "ALL";
      expandedHorse = null;

      document.querySelectorAll(".trial-filter-btn").forEach((b) => {
        b.classList.toggle("active", b.dataset.filter === activeTrialFilter);
      });

      const meeting = filteredMeetings.find((m) => m.meetingKey === selectedMeetingKey);
      const race = meeting?.races?.find((r) => r.raceKey === selectedRaceKey);

      if (race) {
        renderTrials(race.runners || []);
      }
    });
  }

  try {
    const response = await fetch("./data/trials.json");
    if (!response.ok) {
      throw new Error(`Failed to load trials.json (${response.status})`);
    }

    rawPayload = await response.json();

    meetingSelect.addEventListener("change", () => {
      selectedMeetingKey = meetingSelect.value;
      selectedRaceKey = "";
      expandedHorse = null;
      rebuildRaceOptions();
    });

    // 👇 restore saved state, otherwise default to VIC
    const savedState = localStorage.getItem("selectedState");
    selectedState = savedState || "VIC";

    buildStateOptions();
    rebuildMeetingOptions();

    // --- Legal modal ---
    const openLegalBtn = document.getElementById("openLegalBtn");
    const closeLegalBtn = document.getElementById("closeLegalBtn");
    const legalModal = document.getElementById("legalModal");

    if (openLegalBtn && closeLegalBtn && legalModal) {
      openLegalBtn.addEventListener("click", () => {
        legalModal.classList.remove("hidden");
        document.body.style.overflow = "hidden";
      });

      closeLegalBtn.addEventListener("click", () => {
        legalModal.classList.add("hidden");
        document.body.style.overflow = "";
      });

      legalModal.addEventListener("click", (e) => {
        if (e.target === legalModal) {
          legalModal.classList.add("hidden");
          document.body.style.overflow = "";
        }
      });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && !legalModal.classList.contains("hidden")) {
          legalModal.classList.add("hidden");
          document.body.style.overflow = "";
        }
      });
    }
  } catch (err) {
    console.error(err);
    document.getElementById("raceTitle").textContent = "Load error";
    document.getElementById("trialsContainer").innerHTML =
      `<div class="empty">Failed to load data: ${escapeHtml(err.message)}</div>`;
  }
});


function buildStateOptions() {
  const container = document.getElementById("stateTabs");
  const states = Array.isArray(rawPayload?.states) ? rawPayload.states : [];

  container.innerHTML = "";

  const allBtn = document.createElement("button");
  allBtn.type = "button";
  allBtn.className = "state-tab";
  if (!selectedState) allBtn.classList.add("active");
  allBtn.textContent = "ALL";

  allBtn.addEventListener("click", () => {
    selectedState = "";
    localStorage.setItem("selectedState", "");
    selectedMeetingKey = "";
    selectedRaceKey = "";
    expandedHorse = null;
    buildStateOptions();
    rebuildMeetingOptions();
  });

  container.appendChild(allBtn);

  for (const state of states) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "state-tab";

    if (state === selectedState) {
      btn.classList.add("active");
    }

    btn.textContent = state;

    btn.addEventListener("click", () => {
      selectedState = state;
      localStorage.setItem("selectedState", state);
      selectedMeetingKey = "";
      selectedRaceKey = "";
      expandedHorse = null;
      buildStateOptions();
      rebuildMeetingOptions();
    });

    container.appendChild(btn);
  }
}

function rebuildMeetingOptions() {
  const meetingSelect = document.getElementById("meetingSelect");
  const meetingTabs = document.getElementById("meetingTabs");
  const chosenState = selectedState;

  const meetings = Array.isArray(rawPayload?.meetings) ? rawPayload.meetings : [];
  filteredMeetings = meetings.filter((m) => {
    if (!chosenState) return true;
    return (m.state || "") === chosenState;
  });

  meetingSelect.innerHTML = "";
  meetingTabs.innerHTML = "";

  if (filteredMeetings.length === 0) {
    showMeetingDropdown();
    meetingSelect.innerHTML = `<option value="">No meetings found</option>`;
    document.getElementById("raceTabs").innerHTML = `<button type="button" class="race-tab empty">No races</button>`;
    document.getElementById("raceTitle").textContent = "No meeting selected";
    document.getElementById("trialsContainer").innerHTML = `<div class="empty">(no meetings found)</div>`;
    document.getElementById("summaryText").textContent = "";
    return;
  }

  for (const meeting of filteredMeetings) {
    const option = document.createElement("option");
    option.value = meeting.meetingKey;
    option.textContent = meeting.meetingLabel;
    meetingSelect.appendChild(option);
  }

  selectedMeetingKey = filteredMeetings.some((m) => m.meetingKey === selectedMeetingKey)
    ? selectedMeetingKey
    : filteredMeetings[0].meetingKey;

  meetingSelect.value = selectedMeetingKey;

  const useMeetingTabs = !!chosenState && filteredMeetings.length <= 6;

  if (useMeetingTabs) {
    showMeetingTabs();

    for (const meeting of filteredMeetings) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "meeting-tab";

      if (meeting.meetingKey === selectedMeetingKey) {
        btn.classList.add("active");
      }

      btn.textContent = shortMeetingLabel(meeting);

      btn.addEventListener("click", () => {
        selectedMeetingKey = meeting.meetingKey;
        selectedRaceKey = "";
        expandedHorse = null;
        rebuildMeetingOptions();
        rebuildRaceOptions();
      });

      meetingTabs.appendChild(btn);
    }
  } else {
    showMeetingDropdown();
  }

  rebuildRaceOptions();
}

function showMeetingDropdown() {
  document.getElementById("meetingSelect").classList.remove("hidden");
  document.getElementById("meetingTabs").classList.add("hidden");
}

function showMeetingTabs() {
  document.getElementById("meetingSelect").classList.add("hidden");
  document.getElementById("meetingTabs").classList.remove("hidden");
}

function shortMeetingLabel(meeting) {
  const dateText = formatMeetingDateShort(meeting.date);
  const venue = cleanText(meeting.venue);
  return dateText && venue ? `${dateText} — ${venue}` : (dateText || venue || cleanText(meeting.meetingLabel));
}

function formatMeetingDateShort(dateStr) {
  const dt = parseDateValue(dateStr);
  if (!dt) return cleanText(dateStr);

  const today = new Date();
  const todayMid = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dtMid = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate());

  const diffDays = Math.round((dtMid - todayMid) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[dt.getDay()];
}

function parseDateValue(s) {
  const text = cleanText(s);
  if (!text) return null;

  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const y = Number(isoMatch[1]);
    const m = Number(isoMatch[2]) - 1;
    const d = Number(isoMatch[3]);
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const d = Number(slashMatch[1]);
    const m = Number(slashMatch[2]) - 1;
    const y = Number(slashMatch[3]);
    const dt = new Date(y, m, d);
    return isNaN(dt.getTime()) ? null : dt;
  }

  const dt = new Date(text);
  return isNaN(dt.getTime()) ? null : dt;
}

function rebuildRaceOptions() {
  const raceTabs = document.getElementById("raceTabs");
  const meeting = filteredMeetings.find((m) => m.meetingKey === selectedMeetingKey);

  raceTabs.innerHTML = "";

  if (!meeting || !Array.isArray(meeting.races) || meeting.races.length === 0) {
    raceTabs.innerHTML = `<button type="button" class="race-tab empty">No races</button>`;
    document.getElementById("raceTitle").textContent = "No race selected";
    document.getElementById("trialsContainer").innerHTML = `<div class="empty">(no races found)</div>`;
    document.getElementById("summaryText").textContent = "";
    return;
  }

  selectedRaceKey = meeting.races.some((r) => r.raceKey === selectedRaceKey)
    ? selectedRaceKey
    : meeting.races[0].raceKey;

  for (const race of meeting.races) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "race-tab";

    if (race.raceKey === selectedRaceKey) {
      btn.classList.add("active");
    }

    if (raceHasPostRunRunner(race)) {
      btn.classList.add("has-post-run");
    } else if (raceHasFirstStarterRunner(race)) {
      btn.classList.add("has-first-starter");
    }

    btn.textContent = cleanRaceNo(race.raceNo) || "?";

    btn.addEventListener("click", () => {
      selectedRaceKey = race.raceKey;
      expandedHorse = null;
      rebuildRaceOptions();
      renderSelectedRace();
    });

    raceTabs.appendChild(btn);
  }

  renderSelectedRace();
}

function raceHasPostRunRunner(race) {
  const runners = Array.isArray(race?.runners) ? race.runners : [];
  return runners.some((runner) => {
    const b = ((runner["Barrier"] ?? "") + "").trim().toUpperCase();
    const d = ((runner["Driver"] ?? "") + "").trim().toUpperCase();
    if (b === "SCR" || d === "SCRATCHED") return false;
    if (!hasAnyTrial(runner)) return false;
    return hasPostRunTrialAny(runner);
  });
}

function cleanRaceNo(v) {
  const s = ((v ?? "") + "").trim();
  if (s.endsWith(".0")) return s.replaceAll(".0", "");
  return s;
}

function renderSelectedRace() {
  const meeting = filteredMeetings.find((m) => m.meetingKey === selectedMeetingKey);
  if (!meeting) return;

  const race = meeting.races.find((r) => r.raceKey === selectedRaceKey);
  if (!race) return;

  document.getElementById("raceTitle").textContent = buildRaceTitle(meeting, race);
  renderTrials(race.runners || []);
}

function buildRaceTitle(meeting, race) {
  const venue =
    cleanText(race.venue) ||
    cleanText(meeting.venue) ||
    extractVenueFromMeetingLabel(meeting.meetingLabel) ||
    "";

  const raceNoRaw =
    cleanText(race.raceNo) ||
    extractRaceNoFromRaceKey(race.raceKey);

  const raceNo = raceNoRaw ? `R${raceNoRaw}` : "";

  const raceName =
    cleanText(race.raceName) ||
    cleanText(race.name) ||
    extractRaceNameFromRaceTitle(race.raceTitle) ||
    "";

  const distanceRaw =
    cleanText(race.Distance) ||
    cleanText(race.distance) ||
    cleanText(race.dist) ||
    cleanText(race.raceDistance);

  const distance = distanceRaw ? `${cleanIntish(distanceRaw)}m` : "";

  const startRaw =
    cleanText(race.Start) ||
    cleanText(race.start) ||
    cleanText(race.startType);

  const startCode = startShort(startRaw);

  const gaitRaw =
    cleanText(race.Gait) ||
    cleanText(race.gait) ||
    cleanText(race.raceGait);

  const gait = gaitRaw ? `(${toProperCase(gaitRaw)})` : "";

  const time = cleanText(race.time);

  const parts = [];

  let left = "";
  if (venue && raceNo) {
    left = `${venue} ${raceNo}`;
  } else if (venue) {
    left = venue;
  } else if (raceNo) {
    left = raceNo;
  }

  if (left) parts.push(left);
  if (raceName) parts.push(`- ${raceName}`);
  if (distance) parts.push(distance);
  if (startCode) parts.push(startCode);
  if (gait) parts.push(gait);
  if (time) parts.push(time);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function cleanText(v) {
  return ((v ?? "") + "").trim();
}

function extractVenueFromMeetingLabel(meetingLabel) {
  const text = cleanText(meetingLabel);
  if (!text) return "";

  const parts = text.split("—");
  if (parts.length >= 2) {
    const rhs = parts[1].trim();
    return rhs.replace(/\s*\([^)]+\)\s*$/, "").trim();
  }

  return text;
}

function extractRaceNoFromRaceKey(raceKey) {
  const text = cleanText(raceKey);
  const m = text.match(/(?:^|_|\s)R(\d+)(?:$|_|\s)/i);
  return m ? m[1] : "";
}

function extractRaceNameFromRaceTitle(raceTitle) {
  const text = cleanText(raceTitle);
  if (!text) return "";

  let s = text;
  s = s.replace(/\(\d{4}-\d{2}-\d{2}\)/g, "").trim();
  s = s.replace(/\b\d{1,2}:\d{2}\s*(AM|PM)\b/i, "").trim();

  const m = s.match(/^[^-]+-\s*(.*)$/);
  return m ? m[1].trim() : s;
}

function renderTrials(runners) {
  const container = document.getElementById("trialsContainer");
  const summaryText = document.getElementById("summaryText");

  if (!Array.isArray(runners) || runners.length === 0) {
    container.innerHTML = `<div class="empty">(no runners)</div>`;
    summaryText.textContent = "";
    return;
  }

  const rows = runners.filter((r) => {
    const b = ((r["Barrier"] ?? "") + "").trim().toUpperCase();
    const d = ((r["Driver"] ?? "") + "").trim().toUpperCase();
    return !(b === "SCR" || d === "SCRATCHED");
  });

  const withTrials = rows
    .filter(hasAnyTrial)
    .sort((a, b) => horseNoValue(a) - horseNoValue(b));

  const totalCount = withTrials.length;
  const postRaceCount = withTrials.filter(hasPostRunTrialAny).length;
  const visionCount = withTrials.filter(hasAnyVisionTrial).length;

  // update toggle labels
  const buttons = document.querySelectorAll(".trial-filter-btn");

  buttons.forEach((btn) => {
    const filter = btn.dataset.filter;

    if (filter === "ALL") {
      btn.textContent = `All (${totalCount})`;
    } else if (filter === "POST_RACE") {
      btn.textContent = `Post-race (${postRaceCount})`;
    } else if (filter === "VISION") {
      btn.textContent = `Vision (${visionCount})`;
    }
  });


  if (withTrials.length === 0) {
    container.innerHTML = `<div class="empty">(no trials found for runners)</div>`;
    return;
  }

  let visibleRunners = withTrials;

  if (activeTrialFilter === "POST_RACE") {
    visibleRunners = withTrials.filter(hasPostRunTrialAny);
  } else if (activeTrialFilter === "VISION") {
    visibleRunners = withTrials.filter(hasAnyVisionTrial);
  }

  if (visibleRunners.length === 0) {
    let emptyText = "(no runners match this filter)";
    if (activeTrialFilter === "POST_RACE") emptyText = "(no post-race trial runners)";
    if (activeTrialFilter === "VISION") emptyText = "(no runners with vision)";
    container.innerHTML = `<div class="empty">${emptyText}</div>`;
    return;
  }

  container.innerHTML = "";

  for (const runner of visibleRunners) {
    const horse = ((runner["Horse"] ?? "") + "").trim();
    const isOpen = expandedHorse === horse;
    const hasPostRunTrial = hasPostRunTrialAny(runner);
    const firstStarter = isFirstStarter(runner);

    const card = document.createElement("div");
    card.className = `trial-card${hasPostRunTrial ? " post-run" : ""}${firstStarter ? " first-starter" : ""}`;

    const headerBtn = document.createElement("button");
    headerBtn.type = "button";
    headerBtn.className = "trial-header";

    const horseDisplay = toProperCase((runner["Horse"] ?? "") + "");
    const trainer = toProperCase((runner["Trainer"] ?? "") + "");
    const driver = toProperCase((runner["Driver"] ?? "") + "");

    const rawNo = ((runner["Horse No"] ?? "") + "").trim();
    const no = rawNo.endsWith(".0") ? rawNo.replaceAll(".0", "") : rawNo;

    let suffix = "";
    if (trainer && driver) {
      suffix = `(${trainer} / ${driver})`;
    } else if (trainer) {
      suffix = `(${trainer})`;
    } else if (driver) {
      suffix = `(${driver})`;
    }

    const rawTrialRank = ((runner["Trial MarketRank"] ?? "") + "").trim();
    const trialRankNum = Number(rawTrialRank);

    function toOrdinal(n) {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }

    let trialRankDisplay = "";

    if (Number.isFinite(trialRankNum)) {
      const rank = Math.trunc(trialRankNum);

      if (rank === 1) {
        trialRankDisplay = `<span class="trial-rank-medal" title="Trial Predictor">🥇</span>`;
      } else if (rank === 2) {
        trialRankDisplay = `<span class="trial-rank-medal" title="Trial Predictor">🥈</span>`;
      } else if (rank === 3) {
        trialRankDisplay = `<span class="trial-rank-medal" title="Trial Predictor">🥉</span>`;
      } else {
        const ordinal = toOrdinal(rank);
        trialRankDisplay = `<span class="trial-rank-ordinal" title="Trial Predictor">${ordinal}</span>`;
      }
    }

    headerBtn.innerHTML = `
      <span class="horse-label">
        <span class="horse-main">${no ? `${no}. ` : ""}${escapeHtml(horseDisplay.toUpperCase())}</span>
        <span class="horse-sub">${escapeHtml(suffix)}</span>
      </span>
      <span class="horse-right-meta">
        ${trialRankDisplay}
        <span class="chevron">${isOpen ? "▴" : "▾"}</span>
      </span>
    `;

    headerBtn.addEventListener("click", () => {
      expandedHorse = isOpen ? null : horse;
      renderTrials(runners);
    });

    card.appendChild(headerBtn);

    if (isOpen) {
      const body = document.createElement("div");
      body.className = "trial-body";

      [1, 2, 3].forEach((n) => {
        const rowEl = buildTrialLine(runner, n);
        if (rowEl) body.appendChild(rowEl);
      });

      card.appendChild(body);
    }

    container.appendChild(card);
  }
}

function hasAnyTrial(r) {
  for (const n of [1, 2, 3]) {
    const v = ((r[`T${n} Venue`] ?? "") + "").trim();
    const d = ((r[`T${n} Date`] ?? "") + "").trim();
    const u = ((r[`T${n} URL`] ?? "") + "").trim();
    if (v || d || u) return true;
  }
  return false;
}

function hasPostRunTrialAny(r) {
  for (const n of [1, 2, 3]) {
    const raw = ((r[`T${n} SinceLR`] ?? "") + "").trim();
    const v = parseIntLoose(raw);
    if (v !== null && v > 0) return true;
  }
  return false;
}

function isFirstStarter(r) {
  const raw = ((r["Horse Qty"] ?? "") + "").trim();
  return raw === "0";
}

function raceHasFirstStarterRunner(race) {
  const runners = Array.isArray(race?.runners) ? race.runners : [];
  return runners.some((runner) => {
    const b = ((runner["Barrier"] ?? "") + "").trim().toUpperCase();
    const d = ((runner["Driver"] ?? "") + "").trim().toUpperCase();
    if (b === "SCR" || d === "SCRATCHED") return false;
    if (!hasAnyTrial(runner)) return false;
    if (hasPostRunTrialAny(runner)) return false; // green wins
    return isFirstStarter(runner);
  });
}



function hasAnyVisionTrial(r) {
  for (const n of [1, 2, 3]) {
    const vision = ((r[`T${n} Vision`] ?? "") + "").trim();
    if (vision && vision.toUpperCase() !== "_NOVISION") {
      return true;
    }
  }
  return false;
}

function horseNoValue(r) {
  const raw = ((r["Horse No"] ?? "") + "").trim();
  const v = Number(raw);
  if (!Number.isFinite(v)) return 9999;
  return Math.trunc(v);
}

function horseLabel(r) {
  const rawNo = ((r["Horse No"] ?? "") + "").trim();
  const no = rawNo.endsWith(".0") ? rawNo.replaceAll(".0", "") : rawNo;

  const horse = toProperCase((r["Horse"] ?? "") + "");
  const trainer = toProperCase((r["Trainer"] ?? "") + "");
  const driver = toProperCase((r["Driver"] ?? "") + "");

  let suffix = "";
  if (trainer && driver) {
    suffix = ` (${trainer} / ${driver})`;
  } else if (trainer) {
    suffix = ` (${trainer})`;
  } else if (driver) {
    suffix = ` (${driver})`;
  }

  const mainLabel = no ? `${no}. ${horse}` : horse;
  return `${mainLabel}${suffix}`;
}

function buildTrialLine(r, n) {
  const p = `T${n}`;

  const venue = ((r[`${p} Venue`] ?? "") + "").trim();
  const date = ((r[`${p} Date`] ?? "") + "").trim();
  const trialNoRaw = ((r[`${p} Trial No`] ?? "") + "").trim();
  const runnersRaw = ((r[`${p} Runners`] ?? "") + "").trim();
  const trialTrainer = toProperCase((r[`${p} Trainer`] ?? "") + "");
  const trialDriver = toProperCase((r[`${p} Driver`] ?? "") + "");
  const posRaw = ((r[`${p} Pos`] ?? "") + "").trim();
  const distRaw = ((r[`${p} Dist`] ?? "") + "").trim();
  const mgnRaw = ((r[`${p} Mgn`] ?? "") + "").trim();
  const winner = ((r[`${p} Winner`] ?? "") + "").trim();
  const start = ((r[`${p} Start`] ?? "") + "").trim();
  const rateRaw = ((r[`${p} Rate`] ?? "") + "").trim();
  const halfRaw = ((r[`${p} Half`] ?? "") + "").trim();
  const visionUrl = ((r[`${p} Vision`] ?? "") + "").trim();
  const pageUrl = ((r[`${p} URL`] ?? "") + "").trim();
  const sinceRaw = ((r[`${p} SinceLR`] ?? "") + "").trim();

  const hasAny =
    venue || date || trialNoRaw || runnersRaw || posRaw || distRaw || mgnRaw || winner ||
    start || rateRaw || halfRaw || visionUrl || pageUrl;

  if (!hasAny) return null;

  const runnersInt = parseIntLoose(runnersRaw);

  let pos = "";
  let isWin = false;

  if (posRaw) {
    const ord = ordinal(posRaw);

    if (ord === "1st") {
      isWin = true;
    }

    if (runnersInt !== null && runnersInt > 0) {
      pos = `${ord} (of ${runnersInt})`;
    } else {
      pos = ord;
    }
  }

  const ven4 = venue4(venue);
  const dte = date ? dateFmt(date) : "";
  const trialNo = cleanIntish(trialNoRaw);
  const trialLabel = trialNo ? `[Trial ${trialNo}]` : "";
  const dist = distRaw ? distFmt(distRaw) : "";
  const ssms = startShort(start);
  const isWinner = isWin;

  let tdSuffix = "";
  if (trialTrainer && trialDriver) {
    tdSuffix = `(${trialTrainer} / ${trialDriver})`;
  } else if (trialTrainer) {
    tdSuffix = `(${trialTrainer})`;
  } else if (trialDriver) {
    tdSuffix = `(${trialDriver})`;
  }

  const headerMainParts = [];
  if (pos) headerMainParts.push(pos);
  if (ven4) headerMainParts.push(ven4);
  if (dte) headerMainParts.push(dte);
  if (trialLabel) headerMainParts.push(trialLabel);

  const headerExtraParts = [];
  if (tdSuffix) headerExtraParts.push(tdSuffix);
  if (dist || ssms) headerExtraParts.push(`${dist}${ssms}`);

  const parts = [];
  if (mgnRaw) parts.push(`btn ${mgnFmt(mgnRaw)}`);
  if (winner && !isWinner) parts.push(`wnr ${winnerShort(winner)}`);
  if (rateRaw) parts.push(secToMinSec1dp(rateRaw));
  if (halfRaw) parts.push(fmt1dp(halfRaw));

  const headerMainText = headerMainParts.join("  ");
  const headerExtraText = headerExtraParts.join("  ");
  const detailText = parts.join(", ");

  const sinceInt = asIntOrNull(sinceRaw);
  const isAfterLastRun = sinceInt !== null && sinceInt > 0;

  const row = document.createElement("div");
  row.className = "trial-row";

  const textLink = document.createElement("a");
  textLink.className = `trial-link${isAfterLastRun ? " after-lr" : ""}`;

  textLink.innerHTML = `
    <span class="trial-header-bold ${isWinner ? "trial-win" : ""}">
      ${escapeHtml(headerMainText)}
    </span>
    ${headerExtraText ? ` <span class="trial-header-extra">${escapeHtml(headerExtraText)}</span>` : ""}
    ${detailText ? `, <span class="trial-detail">${escapeHtml(detailText)}</span>` : ""}
  `;

  if (pageUrl) {
    textLink.href = pageUrl;
    textLink.target = "_blank";
    textLink.rel = "noopener noreferrer";
  }

  row.appendChild(textLink);

  const visionClean = visionUrl.trim().toUpperCase();
  if (visionClean && visionClean !== "_NOVISION") {
    const playBtn = document.createElement("a");
    playBtn.className = "play-glyph";
    playBtn.textContent = "▶";
    playBtn.href = visionUrl;
    playBtn.target = "_blank";
    playBtn.rel = "noopener noreferrer";
    row.appendChild(playBtn);
  }

  return row;
}

function parseIntLoose(s) {
  const t = (s || "").trim();
  if (!t) return null;

  const i = parseInt(t, 10);
  if (!Number.isNaN(i) && String(i) === t) return i;

  const d = Number(t);
  if (!Number.isFinite(d)) return null;
  return Math.round(d);
}

function asIntOrNull(s) {
  const t = (s || "").trim();
  if (!t) return null;

  const i = parseInt(t, 10);
  if (!Number.isNaN(i) && String(i) === t) return i;

  const d = Number(t);
  if (!Number.isFinite(d)) return null;
  return Math.round(d);
}

function fmt1dp(s) {
  const v = Number((s || "").trim());
  if (!Number.isFinite(v)) return (s || "").trim();
  return v.toFixed(1);
}

function venue4(s) {
  const t = (s || "").trim().toUpperCase();
  if (!t) return "";
  return t.length <= 4 ? t : t.substring(0, 4);
}

function startShort(s) {
  const t = (s || "").trim().toLowerCase();
  if (t === "mobile" || t.includes("mobile")) return "MS";
  if (t === "stand" || t === "standing" || t.includes("stand")) return "SS";
  return "";
}

function cleanIntish(s) {
  const t = (s || "").trim();
  if (t.endsWith(".0")) return t.replaceAll(".0", "");
  return t;
}

function distFmt(s) {
  const t = (s || "").trim().toLowerCase().replaceAll("m", "");
  const firstPart = t.split(".")[0];
  const v = parseInt(firstPart, 10);
  return Number.isNaN(v) ? cleanIntish(s) : String(v);
}

function mgnFmt(s) {
  const t = (s || "").trim();
  if (!t) return "";

  const numVal = Number(t.replaceAll(",", ""));
  if (!Number.isFinite(numVal)) return t;

  return `${cleanIntish(t)}m`;
}

function ordinal(s) {
  const x = parseInt(((s || "").trim().split(".")[0]), 10);
  if (Number.isNaN(x)) return (s || "").trim();
  if (x % 100 >= 11 && x % 100 <= 13) return `${x}th`;

  switch (x % 10) {
    case 1: return `${x}st`;
    case 2: return `${x}nd`;
    case 3: return `${x}rd`;
    default: return `${x}th`;
  }
}

function dateFmt(s) {
  const parts = (s || "").split("/");
  if (parts.length === 3) {
    const dd = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const yyyy = parts[2];
    const yy = yyyy.length === 4 ? yyyy.substring(2) : yyyy;

    const months = {
      "01": "Jan",
      "02": "Feb",
      "03": "Mar",
      "04": "Apr",
      "05": "May",
      "06": "Jun",
      "07": "Jul",
      "08": "Aug",
      "09": "Sep",
      "10": "Oct",
      "11": "Nov",
      "12": "Dec"
    };

    const mon = months[mm] || mm;
    return `${dd}${mon}${yy}`;
  }

  const dt = new Date(s);
  if (!isNaN(dt.getTime())) {
    const dd = String(dt.getDate()).padStart(2, "0");
    const yy = String(dt.getFullYear()).slice(-2);
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${dd}${months[dt.getMonth()]}${yy}`;
  }

  return s || "";
}

function secToMinSec1dp(s) {
  const v = Number((s || "").trim());
  if (!Number.isFinite(v) || v <= 0) return (s || "").trim();

  const mins = Math.floor(v / 60);
  const secs = v - mins * 60;
  let secsStr = secs.toFixed(1);

  if (secs < 10) secsStr = `0${secsStr}`;
  return `${mins}:${secsStr}`;
}

function winnerShort(s) {
  return ((s || "").trim()).toUpperCase();
}

function toProperCase(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function escapeHtml(str) {
  return (str || "").replace(/[&<>"']/g, (m) => {
    switch (m) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      case "'": return "&#039;";
      default: return m;
    }
  });
}

// --- Legal modal ---
const openLegalBtn = document.getElementById("openLegalBtn");
const closeLegalBtn = document.getElementById("closeLegalBtn");
const legalModal = document.getElementById("legalModal");

if (openLegalBtn && closeLegalBtn && legalModal) {
  openLegalBtn.addEventListener("click", () => {
    legalModal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });

  closeLegalBtn.addEventListener("click", () => {
    legalModal.classList.add("hidden");
    document.body.style.overflow = "";
  });

  legalModal.addEventListener("click", (e) => {
    if (e.target === legalModal) {
      legalModal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !legalModal.classList.contains("hidden")) {
      legalModal.classList.add("hidden");
      document.body.style.overflow = "";
    }
  });
}