#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../abfrageoptionen/data');
const audioDir = path.join(dataDir, 'audio');

// Verschiedene Format-Typen definieren
const formats = {
    akkorde: {
        // Unterstützt altes Format `Akkord-Name-Umkehrung.m4a` und neues `A-Name-Umkehrung.m4a`
        pattern: /^(?:Akkord|A)-(.+)-(.+)\.m4a$/,
        jsonFile: 'hoerbeispiele-akkorde.json',
        parse: (filename) => {
            const match = filename.match(/^(?:Akkord|A)-(.+)-(.+)\.m4a$/);
            if (!match) return null;
            const name = match[1];
            let umkehrung = match[2];

            // Falls Umkehrung als Buchstabe übergeben wird, mappe auf Text
            if (umkehrung === 'G') umkehrung = 'Grundstellung';
            else if (umkehrung === 'S') umkehrung = 'Sextakkord';
            else if (umkehrung === 'Q') umkehrung = 'Quartsextakkord';

            // Typ bestimmen: Schaue nach "Dur", "Moll", "vermindert", "übermäßig" oder nach Groß-/Kleinschreibung
            let typ = 'Dur';
            if (/[a-z]/.test(name) && !/[A-Z]/.test(name)) typ = 'Moll';
            if (name.includes('Moll')) typ = 'Moll';
            else if (name.includes('vermindert')) typ = 'vermindert';
            else if (name.includes('übermäßig')) typ = 'übermäßig';

            return { name, umkehrung, typ };
        },
    },
    septakkorde: {
        // Unterstützt `Septakkord-Name-Umkehrung-intervall.m4a` und `S-Name-Umkehrung-intervall.m4a` (intervall: k/g)
        pattern: /^(?:Septakkord|S)-(.+)-(.+)-(k|g|klein|groß)\.m4a$/,
        jsonFile: 'hoerbeispiele-septakkorde.json',
        parse: (filename) => {
            const match = filename.match(/^(?:Septakkord|S)-(.+)-(.+)-(k|g|klein|groß)\.m4a$/);
            if (!match) return null;
            const name = match[1];
            let umkehrung = match[2];
            const intervToken = match[3];

            // Map Umkehrung-Buchstaben falls verwendet
            if (umkehrung === 'G') umkehrung = 'Grundstellung';
            else if (umkehrung === 'Q') umkehrung = 'Quintsextakkord';
            else if (umkehrung === 'T') umkehrung = 'Terzquartakkord';
            else if (umkehrung === 'S') umkehrung = 'Sekundakkord';

            // Typ bestimmen
            let typ = 'Dur';
            if (/[a-z]/.test(name) && !/[A-Z]/.test(name)) typ = 'Moll';
            if (name.includes('Moll')) typ = 'Moll';
            else if (name.includes('vermindert')) typ = 'vermindert';
            else if (name.includes('übermäßig')) typ = 'übermäßig';

            const intervall = (intervToken === 'k' || intervToken === 'klein') ? 'kleine Septime' : 'große Septime';
            return { name, umkehrung, typ, intervall };
        },
    },
    genaueAkkordbestimmung: {
        // Format: `ABMG-Akkordname-Intervall-Ton-Umkehrung.m4a`
        // Beispiel: ABMG-C-k-E-G.m4a
        pattern: /^ABMG-(.+)-(k|g|x)-(.+)-(G|1|2|3)\.m4a$/,
        jsonFile: 'hoerbeispiele-genaueAkkordbestimmung.json',
        parse: (filename) => {
            const match = filename.match(/^ABMG-(.+)-(k|g|x)-(.+)-(G|1|2|3)\.m4a$/);
            if (!match) return null;
            const name = match[1];
            const intervToken = match[2];
            const ton = match[3];
            const umkehrToken = match[4];

            const intervall = intervToken === 'k' ? 'kleine Septime' : (intervToken === 'g' ? 'große Septime' : 'keine Septime');

            let umkehrung = 'Grundstellung';
            if (umkehrToken === '1') umkehrung = '1. Umkehrung';
            else if (umkehrToken === '2') umkehrung = '2. Umkehrung';
            else if (umkehrToken === '3') umkehrung = '3. Umkehrung';

            let typ = 'Dur';
            if (/^[a-z]/.test(name) || name.toLowerCase().includes('moll')) typ = 'Moll';

            return {
                name,
                typ,
                ton,
                umkehrung,
                intervall,
            };
        },
    },
};

function syncAudioFiles() {
    if (!fs.existsSync(audioDir)) {
        console.log('Audio-Verzeichnis nicht gefunden:', audioDir);
        return;
    }

    const audioFiles = fs.readdirSync(audioDir).filter(file => file.endsWith('.m4a'));

    if (audioFiles.length === 0) {
        console.log('Keine Audio-Dateien gefunden');
        return;
    }

    // Gruppiere Dateien nach Format (unterstütze sowohl alte als neue Präfixe)
    const filesByFormat = {
        akkorde: [],
        septakkorde: [],
        genaueAkkordbestimmung: [],
    };

    audioFiles.forEach(filename => {
        if (filename.startsWith('Akkord-') || filename.startsWith('A-')) {
            filesByFormat.akkorde.push(filename);
        } else if (filename.startsWith('Septakkord-') || filename.startsWith('S-')) {
            filesByFormat.septakkorde.push(filename);
        } else if (filename.startsWith('GenaueSeptakkordbestimmung-') || filename.startsWith('ABMG-')) {
            filesByFormat.genaueAkkordbestimmung.push(filename);
        }
    });

    // Verarbeite jeden Format-Typ
    Object.keys(formats).forEach(formatType => {
        const files = filesByFormat[formatType];
        if (files.length === 0) return;

        const format = formats[formatType];
        const jsonPath = path.join(dataDir, format.jsonFile);

        // Lade oder erstelle JSON
        let jsonData = [];
        if (fs.existsSync(jsonPath)) {
            try {
                const content = fs.readFileSync(jsonPath, 'utf8');
                jsonData = JSON.parse(content);
                if (!Array.isArray(jsonData)) jsonData = [];
            } catch (error) {
                console.error(`Fehler beim Lesen von ${format.jsonFile}:`, error.message);
                jsonData = [];
            }
        }

        // Verarbeite jede Audio-Datei
        files.forEach(filename => {
            const audioPath = path.join('audio', filename);
            const parsed = format.parse(filename);

            if (!parsed) {
                console.warn(`Konnte Datei nicht parsen: ${filename}`);
                return;
            }

            // Prüfe, ob Eintrag bereits existiert
            const existingIndex = jsonData.findIndex(item => {
                const matches = item.name === parsed.name && item.umkehrung === parsed.umkehrung;
                if (formatType === 'septakkorde') {
                    return matches && item.intervall === parsed.intervall;
                } else if (formatType === 'genaueAkkordbestimmung') {
                    return matches && item.ton === parsed.ton && item.intervall === parsed.intervall;
                }
                return matches;
            });

            const entry = {
                id: existingIndex >= 0 ? jsonData[existingIndex].id : jsonData.length + 1,
                ...parsed,
                audio: audioPath,
            };

            if (existingIndex >= 0) {
                jsonData[existingIndex] = entry;
                console.log(`✓ Aktualisiert: ${filename} → ${format.jsonFile}`);
            } else {
                jsonData.push(entry);
                console.log(`✓ Hinzugefügt: ${filename} → ${format.jsonFile}`);
            }
        });

        // Speichere JSON mit Formatierung
        try {
            fs.writeFileSync(jsonPath, JSON.stringify(jsonData, null, 4) + '\n', 'utf8');
            console.log(`✓ ${format.jsonFile} gespeichert (${jsonData.length} Einträge)`);
        } catch (error) {
            console.error(`Fehler beim Speichern von ${format.jsonFile}:`, error.message);
        }
    });

    console.log('\n✓ Audio-Synchronisierung abgeschlossen!');
}

// Führe Synchronisierung aus
syncAudioFiles();
