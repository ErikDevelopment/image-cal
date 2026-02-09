# Dienstplan Screenshot → Apple Kalender

Kleine Web-App zum Konvertieren eines Dienstplan-Screenshots in Kalendertermine (`.ics`).

✅ Läuft komplett im Browser – **kein Server**, **kein Upload**, **keine Datenübertragung**.

---

## Funktionen

- Screenshot hochladen
- OCR mit **Tesseract.js** (Deutsch)
- Schichten automatisch erkennen (**Datum + Zeit + Titel**)
- Export als **`.ics`**
- Import in **Apple / Google / Outlook** Kalender

---

## Tech Stack

- HTML / CSS / Vanilla JS
- Tesseract.js (OCR)
- iCalendar (`.ics`)
- GitHub Pages Hosting
- **Kein Backend**

---

## Nutzung

1. Seite öffnen
2. Screenshot hochladen
3. **„OCR starten“**
4. **„ICS herunterladen“**
5. Datei öffnen → Kalender importiert automatisch

---

## Deployment (GitHub Pages)

1. Repository öffnen → **Settings** → **Pages**
2. **Source:** `Deploy from branch`
3. **Branch:** `main` / `root`

Danach erreichbar unter:

`https://<username>.github.io/<repo>/`

---

## Projektstruktur

```text
index.html   UI
app.js       OCR + Parser + ICS Export
style.css    Design
README.md

## Parser

Der Parser erkennt automatisch Schichten aus dem OCR-Text und wandelt sie in Kalendertermine um.

### Erkanntes Format

Der Parser ist auf Zeilenpaare ausgelegt:

```text
15 13:45 - 22:15
So. Kasse - Total

```

- **Zeile 1:** Tag + Start-/Endzeit  
- **Zeile 2:** Titel / Beschreibung der Schicht  

### Logik

- **Datum & Zeiten extrahieren:** Tag sowie Start-/Endzeit werden aus der ersten Zeile gelesen.
- **Titel übernehmen:** Die direkt folgende Zeile wird als Titel verwendet.
- **Monatswechsel erkennen:** Sprünge wie `25 → 01` werden als Monatswechsel interpretiert.
- **Wochentag ignorieren:** Der Wochentag wird nicht benötigt und kann OCR-Fehler enthalten, ohne dass der Parser ausfällt.

---

## Hinweise

- Beste Ergebnisse bei **hohem Kontrast** (z. B. dunkle Schrift auf hellem Hintergrund)
- Screenshot möglichst **zuschneiden** (nur der relevante Bereich)
- Nach Updates Cache leeren: **Strg/Cmd + Shift + R**

---

## Lizenz

MIT
