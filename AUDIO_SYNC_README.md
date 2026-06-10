# Audio-Synchronisierungs-Script

Dieses Script synchronisiert automatisch Audiodateien aus dem `data/audio/` Verzeichnis in die entsprechenden JSON-Dateien.

## Verwendung

### Automatische Synchronisierung
```bash
npm run sync-audio
```

Das Script liest alle `.m4a`-Dateien aus `abfrageoptionen/data/audio/` und aktualisiert automatisch die JSON-Dateien basierend auf der Dateibenennungskonvention.

## Dateibenennungskonvention

### 1. Akkorde
**Format:** `A-{name}-{umkehrung}.m4a` (alt: `Akkord-{name}-{umkehrung}.m4a`)

**Beispiele:**
- `A-C-Dur-G.m4a` (entspricht Grundstellung)
- `A-g-S.m4a` (g = g-Moll, S = Sextakkord)
- `A-G-Q.m4a` (Q = Quartsextakkord)

**Umkehrungen:** G = Grundstellung, S = Sextakkord, Q = Quartsextakkord

### 2. Septakkorde
**Format:** `S-{name}-{umkehrung}-{intervall}.m4a` (alt: `Septakkord-{...}`)

**Beispiele:**
- `S-C-G-k.m4a` (k = kleine Septime)
- `S-C-Q-g.m4a` (g = große Septime)
- `S-f-T-k.m4a` (kleines f = f-Moll, T = Terzquartakkord)

**Umkehrungen:** G = Grundstellung, Q = Quintsextakkord, T = Terzquartakkord, S = Sekundakkord
**Intervalle:** k = kleine Septime, g = große Septime

### 3. Genaue Akkordbestimmung
Die Aufgabe heißt jetzt "Genaue Akkordbestimmung". Es gibt drei Auswahlmöglichkeiten für die Septime: kleine Septime, große Septime und keine Septime.

**Format:** `ABMG-{Akkordname}-{Intervall}-{Ton}-{Umkehrung}.m4a`

**Parameter:**
- `Akkordname`: z.B. "C" (C-Dur) oder "g" (g-Moll) oder "C7", "g7", etc.
- `Intervall`: g = große Septime, k = kleine Septime, x = keine Septime
- `Ton`: Der gespielte Ton, z.B. C, E, G, F, CIS, GIS
- `Umkehrung`: G = Grundstellung, 1 = 1. Umkehrung, 2 = 2. Umkehrung, 3 = 3. Umkehrung

**Beispiele:**
- `ABMG-C-k-C-G.m4a` (C-Dur, keine Septime, gespielter Ton C, Grundstellung)
- `ABMG-g-g-E-1.m4a` (g-Moll, große Septime, gespielter Ton E, 1. Umkehrung)
- `ABMG-C7-x-G-2.m4a` (C7, keine Septime, gespielter Ton G, 2. Umkehrung)

## Workflow

1. **Audiodate hinzufügen:** Speichern Sie neue `.m4a`-Dateien im `abfrageoptionen/data/audio/` Verzeichnis mit der korrekten Benennungskonvention.

2. **Synchronisieren:** Führen Sie folgendes Kommando aus:
   ```bash
   npm run sync-audio
   ```

3. **Überprüfung:** Das Script gibt eine Zusammenfassung aus:
   ```
   ✓ Hinzugefügt: Akkord-D-Dur-Grundstellung.m4a → hoerbeispiele-akkorde.json
   ✓ Aktualisiert: Septakkord-E-Moll-Quintsextakkord-klein.m4a → hoerbeispiele-septakkorde.json
   ✓ hoerbeispiele-akkorde.json gespeichert (15 Einträge)
   ✓ Audio-Synchronisierung abgeschlossen!
   ```

## JSON-Struktur

### hoerbeispiele-akkorde.json
```json
{
  "id": 1,
  "name": "C-Dur",
  "umkehrung": "Grundstellung",
  "typ": "Dur",
  "audio": "audio/Akkord-C-Dur-Grundstellung.m4a"
}
```

### hoerbeispiele-septakkorde.json
```json
{
  "id": 1,
  "name": "C7",
  "umkehrung": "Grundstellung",
  "typ": "Dur",
  "intervall": "kleine Septime",
  "audio": "audio/Septakkord-C-Dur-Grundstellung-klein.m4a"
}
```

### hoerbeispiele-genaueAkkordbestimmung.json
```json
{
  "id": 1,
  "name": "C7",
  "typ": "Dur",
  "ton": "G",
  "umkehrung": "Grundstellung",
  "intervall": "kleine Septime",
  "audio": "audio/ABMG-C7-k-G-G.m4a"
}
```

## Notizen

- Das Script lädt bestehende JSON-Dateien und aktualisiert nur neue oder geänderte Einträge
- Die `id` wird automatisch zugewiesen
- Existierende Einträge werden anhand von Name, Umkehrung und (falls zutreffend) Intervall oder Ton identifiziert
- Das Script sichert nicht automatisch die alten Dateien, daher empfehlen wir Versionskontrolle
