// Tesseract ESM (läuft auf GitHub Pages)
import Tesseract from "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.esm.min.js";

const fileEl = document.getElementById("file");
const runBtn = document.getElementById("run");
const outEl = document.getElementById("out");
const previewEl = document.getElementById("preview");
const summaryEl = document.getElementById("summary");
const icsEl = document.getElementById("ics");
const dlBtn = document.getElementById("download");
const demoBtn = document.getElementById("demo");
const statusEl = document.getElementById("status");
const spinEl = document.getElementById("spin");
const ocrPct = document.getElementById("ocrPct");
const barFill = document.getElementById("barFill");

let lastEvents = [];
let lastIcs = "";

// ---------------- Debug helpers ----------------
function dbg(...args) { console.log("[DBG]", ...args); }
function charCodes(s) {
  return Array.from(s).map(ch => ch.charCodeAt(0));
}
function showLine(label, line) {
  dbg(label, JSON.stringify(line));
  dbg(label + " charCodes", charCodes(line));
}
// ------------------------------------------------

dbg("app.js loaded");

fileEl.addEventListener("change", () => {
  const f = fileEl.files?.[0];
  statusEl.textContent = f ? `Ausgewählt: ${f.name}` : "Warte auf Bild…";
  dbg("file change", f ? { name: f.name, type: f.type, size: f.size } : null);
});

runBtn.addEventListener("click", async () => {
  const file = fileEl.files?.[0];
  if (!file) {
    dbg("run clicked but no file");
    return setStatus("Bitte erst ein Bild auswählen.");
  }

  setBusy(true);
  outEl.textContent = "OCR startet…";
  updateProgress(0);

  dbg("OCR start", { name: file.name, type: file.type, size: file.size });

  try {
    const { data } = await Tesseract.recognize(file, "deu", {
      logger: (m) => {
        if (m.status === "recognizing text" && typeof m.progress === "number") {
          updateProgress(Math.round(m.progress * 100));
        }
      },
    });

    const rawText = (data.text || "");
    const text = rawText.trim();

    dbg("OCR done");
    dbg("OCR raw length", rawText.length);
    dbg("OCR trimmed length", text.length);
    dbg("OCR raw preview", JSON.stringify(rawText.slice(0, 400)));
    dbg("OCR trimmed preview", JSON.stringify(text.slice(0, 400)));

    outEl.textContent = text || "Kein Text erkannt.";

    lastEvents = parseShifts(text);
    lastIcs = buildIcs(lastEvents);

    dbg("events count", lastEvents.length);
    dbg("events", lastEvents);

    render(eventsToLines(lastEvents), lastIcs);
    setStatus(lastEvents.length ? "Termine erkannt ✅" : "Keine Termine erkannt (Text prüfen).");
  } catch (e) {
    console.error(e);
    dbg("OCR error", String(e));
    setStatus("OCR Fehler. (Tipp: anderes Bild / höherer Kontrast)");
    outEl.textContent = String(e);
  } finally {
    setBusy(false);
    dbg("OCR finished (finally)");
  }
});

demoBtn.addEventListener("click", () => {
  dbg("demo clicked");
  lastEvents = [
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 11, 17, 45), new Date(2026, 1, 11, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 15, 13, 45), new Date(2026, 1, 15, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 18, 17, 45), new Date(2026, 1, 18, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 22, 14, 45), new Date(2026, 1, 22, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 1, 25, 17, 45), new Date(2026, 1, 25, 22, 15)),
    mkEvent("Kasse - Total Kriftel", new Date(2026, 2, 1, 14, 45), new Date(2026, 2, 1, 22, 15)),
  ];
  lastIcs = buildIcs(lastEvents);
  render(eventsToLines(lastEvents), lastIcs);
  setStatus("Demo erzeugt ✅");
});

dlBtn.addEventListener("click", () => {
  dbg("download clicked", { events: lastEvents.length, icsLen: lastIcs.length });
  const blob = new Blob([lastIcs], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "dienstplan.ics";
  a.click();
  URL.revokeObjectURL(url);
});

function setBusy(on) {
  dbg("setBusy", on);
  spinEl.style.display = on ? "inline-block" : "none";
  runBtn.disabled = on;
  demoBtn.disabled = on;
  if (on) setStatus("OCR läuft…");
}

function setStatus(t) {
  dbg("status", t);
  statusEl.textContent = t;
}

function updateProgress(p) {
  // dbg("progress", p); // zu spammy
  ocrPct.textContent = p ? `${p}%` : "bereit";
  barFill.style.width = `${p}%`;
}

function render(lines, ics) {
  dbg("render", { lines: lines.length, icsLen: ics.length });
  const has = lines.length > 0;
  previewEl.textContent = has ? lines.join("\n") : "Noch keine Vorschau.";
  summaryEl.textContent = has ? `${lines.length} Termin(e) erkannt.` : "Keine Termine erkannt.";
  icsEl.textContent = has ? ics : "Noch keine ICS erzeugt.";
  dlBtn.disabled = !has;
}

function eventsToLines(events) {
  return events.map((e) => `${fmtDE(e.start)} – ${fmtTime(e.end)} | ${e.title}`);
}

function fmtDE(d) {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}.${mm}.${yyyy} ${fmtTime(d)}`;
}
function fmtTime(d) {
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
}

function mkEvent(title, start, end) {
  return { title, start, end, description: "Automatisch aus Screenshot extrahiert" };
}

// ---------------- Parser ----------------
function normalizeText(t){
  const before = t || "";
  const after = (before)
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/S/g, "5")
    .replace(/O/g, "0")
    .replace(/[ \t]+/g, " ");

  dbg("normalizeText", { beforeLen: before.length, afterLen: after.length });
  dbg("normalize preview", JSON.stringify(after.slice(0, 300)));

  return after;
}

function detectMonthYear(text) {
  const t = (text || "").toLowerCase();

  const monthMap = [
    [["januar","jan"], 1],
    [["februar","feb"], 2],
    [["märz","maerz","mrz"], 3],
    [["april","apr"], 4],
    [["mai"], 5],
    [["juni","jun"], 6],
    [["juli","jul"], 7],
    [["august","aug"], 8],
    [["september","sep"], 9],
    [["oktober","okt"], 10],
    [["november","nov"], 11],
    [["dezember","dez"], 12],
  ];

  let month = null;
  for (const [names, num] of monthMap) {
    if (names.some((n) => new RegExp(`\\b${n}\\.?\\b`, "i").test(t))) {
      month = num; break;
    }
  }

  const y = (t.match(/\b(20\d{2})\b/) || [])[1];
  const res = { year: y ? Number(y) : null, month };

  dbg("detectMonthYear", res);
  return res;
}

function parseShifts(rawText){
  dbg("parseShifts start");
  const text = normalizeText(rawText);

  const now = new Date();
  const { year: yAuto, month: mAuto } = detectMonthYear(text);
  let currentYear = yAuto ?? now.getFullYear();
  let currentMonth = mAuto ?? (now.getMonth() + 1);

  dbg("base date", { currentYear, currentMonth });

  // Pair matching (deine aktuelle Regex-Strategie)
  const rePair =
    /(?:^|\n)\s*(\d{1,2})\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*\n\s*(mo|di|mi|do|fr|sa|so)\s*\.?\s*(.+?)(?=\n|$)/gi;

  dbg("rePair", rePair.toString());

  // Zusätzlich: wir loggen jede Zeile und markieren, welche "time-lines" sind
  const lines = text.split("\n");
  dbg("lines count", lines.length);
  for (let i = 0; i < lines.length; i++) {
    const L = lines[i];
    if (!L.trim()) continue;
    // Zeilen, die wie "15 13:45 - 22:15" aussehen
    if (/\d{1,2}\s+\d{1,2}:\d{2}\s*-\s*\d{1,2}:\d{2}/.test(L)) {
      showLine(`TIME-LINE #${i}`, L);
      if (lines[i+1]) showLine(`NEXT-LINE #${i+1}`, lines[i+1]);
    }
    // Zeilen, die mit So./Mi. etc anfangen
    if (/^(mo|di|mi|do|fr|sa|so)\.?/i.test(L.trim())) {
      showLine(`DOW-LINE #${i}`, L);
    }
  }

  let lastDaySeen = 0;
  const events = [];

  let m;
  let matchIndex = 0;
  while ((m = rePair.exec(text)) !== null) {
    matchIndex++;
    dbg(`MATCH ${matchIndex}`, {
      day: m[1],
      start: m[2],
      end: m[3],
      dow: m[4],
      title: m[5],
      at: m.index
    });

    const day = Number(m[1]);
    const startStr = m[2];
    const endStr = m[3];
    const title = (m[5] || "Dienst").trim();

    // Monatswechsel (25 -> 01)
    if (lastDaySeen && day < lastDaySeen) {
      currentMonth += 1;
      if (currentMonth > 12) { currentMonth = 1; currentYear += 1; }
      dbg("month rollover ->", { currentYear, currentMonth });
    }
    lastDaySeen = day;

    const start = toDateTimeLocal(currentYear, currentMonth, day, startStr);
    const end = toDateTimeLocal(currentYear, currentMonth, day, endStr);
    if (end < start) end.setDate(end.getDate() + 1);

    events.push(mkEvent(title, start, end));
  }

  dbg("parseShifts done", { matches: matchIndex, events: events.length });

  return events;
}

function toDateTimeLocal(y, m, d, hhmm) {
  const [hh, mm] = hhmm.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0);
}

// ---------------- ICS ----------------
function pad(n) { return String(n).padStart(2, "0"); }
function fmtIcsLocal(dt) {
  return (
    dt.getFullYear() +
    pad(dt.getMonth() + 1) +
    pad(dt.getDate()) +
    "T" +
    pad(dt.getHours()) +
    pad(dt.getMinutes()) +
    pad(dt.getSeconds())
  );
}
function escapeIcs(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}
function buildIcs(events) {
  dbg("buildIcs", { events: events.length });
  const now = new Date();
  const dtstamp = fmtIcsLocal(now);

  const vevents = events.map((e, idx) => {
    const uid = `${dtstamp}-${idx}@dienstplan.local`;
    return [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${fmtIcsLocal(e.start)}`,
      `DTEND:${fmtIcsLocal(e.end)}`,
      `SUMMARY:${escapeIcs(e.title)}`,
      `DESCRIPTION:${escapeIcs(e.description || "")}`,
      "END:VEVENT",
    ].join("\r\n");
  }).join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dienstplan OCR//DE",
    "CALSCALE:GREGORIAN",
    vevents,
    "END:VCALENDAR",
    ""
  ].join("\r\n");

  dbg("buildIcs done", { len: ics.length });
  return ics;
}
