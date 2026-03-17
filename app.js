let rawPayload = null;
let filteredMeetings = [];
let selectedMeetingKey = "";
let selectedRaceKey = "";
let expandedHorse = null;

document.addEventListener("DOMContentLoaded", async () => {
  const stateSelect = document.getElementById("stateSelect");
  const meetingSelect = document.getElementById("meetingSelect");
  const raceSelect = document.getElementById("raceSelect");

  try {
    const response = await fetch("./data/trials.json");
    if (!response.ok) {
      throw new Error(`Failed to load trials.json (${response.status})`);
    }

    rawPayload = await response.json();

    stateSelect.addEventListener("change", () => {
      selectedMeetingKey = "";
      selectedRaceKey = "";
      expandedHorse = null;
      rebuildMeetingOptions();
    });

    meetingSelect.addEventListener("change", () => {
      selectedMeetingKey = meetingSelect.value;
      selectedRaceKey = "";
      expandedHorse = null;
      rebuildRaceOptions();
    });

    raceSelect.addEventListener("change", () => {
      selectedRaceKey = raceSelect.value;
      expandedHorse = null;
      renderSelectedRace();
    });

    buildStateOptions();
    rebuildMeetingOptions();
  } catch (err) {
    console.error(err);
    document.getElementById("raceTitle").textContent = "Load error";
    document.getElementById("trialsContainer").innerHTML =
      `<div class="empty">Failed to load data: ${escapeHtml(err.message)}</div>`;
  }
});

function buildStateOptions() {
  const stateSelect = document.getElementById("stateSelect");
  const states = Array.isArray(rawPayload?.states) ? rawPayload.states : [];

  stateSelect.innerHTML = `<option value="">All states</option>`;

  for (const state of states) {
    const option = document.createElement("option");
    option.value = state;
    option.textContent = state;
    stateSelect.appendChild(option);
  }
}

function rebuildMeetingOptions() {
  const stateSelect = document.getElementById("stateSelect");
  const meetingSelect = document.getElementById("meetingSelect");
  const chosenState = stateSelect.value;

  const meetings = Array.isArray(rawPayload?.meetings) ? rawPayload.meetings : [];
  filteredMeetings = meetings.filter((m) => {
    if (!chosenState) return true;
    return (m.state || "") === chosenState;
  });

  meetingSelect.innerHTML = "";

  if (filteredMeetings.length === 0) {
    meetingSelect.innerHTML = `<option value="">No meetings found</option>`;
    document.getElementById("raceSelect").innerHTML = `<option value="">No races found</option>`;
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

  rebuildRaceOptions();
}

function rebuildRaceOptions() {
  const raceSelect = document.getElementById("raceSelect");
  const meeting = filteredMeetings.find((m) => m.meetingKey === selectedMeetingKey);

  raceSelect.innerHTML = "";

  if (!meeting || !Array.isArray(meeting.races) || meeting.races.length === 0) {
    raceSelect.innerHTML = `<option value="">No races found</option>`;
    document.getElementById("raceTitle").textContent = "No race selected";
    document.getElementById("trialsContainer").innerHTML = `<div class="empty">(no races found)</div>`;
    document.getElementById("summaryText").textContent = "";
    return;
  }

  for (const race of meeting.races) {
    const option = document.createElement("option");
    option.value = race.raceKey;
    const raceNo = race.raceNo ? `R${race.raceNo}` : "Race";
    const raceTime = race.time ? ` — ${race.time}` : "";
    option.textContent = `${raceNo}${raceTime}`;
    raceSelect.appendChild(option);
  }

  selectedRaceKey = meeting.races.some((r) => r.raceKey === selectedRaceKey)
    ? selectedRaceKey
    : meeting.races[0].raceKey;

  raceSelect.value = selectedRaceKey;

  renderSelectedRace();
}

function renderSelectedRace() {
  const meeting = filteredMeetings.find((m) => m.meetingKey === selectedMeetingKey);
  if (!meeting) return;

  const race = meeting.races.find((r) => r.raceKey === selectedRaceKey);
  if (!race) return;

  document.getElementById("raceTitle").textContent = race.raceTitle || race.raceKey || "";
  renderTrials(race.runners || []);
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

  summaryText.textContent = `${withTrials.length} runner${withTrials.length === 1 ? "" : "s"} with trials`;

  if (withTrials.length === 0) {
    container.innerHTML = `<div class="empty">(no trials found for runners)</div>`;
    return;
  }

  container.innerHTML = "";

  for (const runner of withTrials) {
    const horse = ((runner["Horse"] ?? "") + "").trim();
    const isOpen = expandedHorse === horse;
    const hasPostRunTrial = hasPostRunTrialAny(runner);

    const card = document.createElement("div");
    card.className = `trial-card${hasPostRunTrial ? " post-run" : ""}`;

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

    headerBtn.innerHTML = `
      <span class="horse-label">
        <span class="horse-main">${no ? `${no}. ` : ""}${escapeHtml(horseDisplay.toUpperCase())}</span>
        <span class="horse-sub">${escapeHtml(suffix)}</span>
      </span>
      <span class="chevron">${isOpen ? "▴" : "▾"}</span>
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
    venue || date || posRaw || distRaw || mgnRaw || winner ||
    start || rateRaw || halfRaw || visionUrl || pageUrl;

  if (!hasAny) return null;

  const pos = posRaw ? (ordinal(posRaw) === "1st" ? "*WIN*" : ordinal(posRaw)) : "";
  const ven4 = venue4(venue);
  const dte = date ? dateFmt(date) : "";
  const dist = distRaw ? distFmt(distRaw) : "";
  const ssms = startShort(start);
  const isWinner = pos.trim() === "*WIN*";

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

  // Build styled content
  textLink.innerHTML = `
    <span class="trial-header-bold">${escapeHtml(headerMainText)}</span>
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
  if (t.includes("stand")) return "SS";
  if (t.includes("mobile")) return "MS";
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
