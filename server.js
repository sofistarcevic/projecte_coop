const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 5000;
const DB_PATH = path.join(__dirname, 'hospital.db');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Connexió a la Base de Dades
const db = new sqlite3.Database(DB_PATH, (err) => {
    if (err) return console.error("Error connectant a SQLite:", err.message);
    console.log("Connectat correctament a la base de dades SQLite (hospital.db).");
});

// Creació de les taules
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS doctors (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        specialty TEXT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        gender TEXT,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        createdAt TEXT,
        createdBy TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT,
        birthDate TEXT,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT '',
        createdAt TEXT,
        createdBy TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY,
        clinicName  TEXT DEFAULT '',
        clinicPhone TEXT DEFAULT '',
        clinicAddr  TEXT DEFAULT '',
        clinicEmail TEXT DEFAULT ''
    )`);

    db.get("SELECT COUNT(*) as count FROM config", [], (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(`INSERT INTO config (id, clinicName) VALUES ('GLOBAL', 'Hospital Central de Proves')`);
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS specialties (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )`);

    db.get("SELECT COUNT(*) as count FROM specialties", [], (err, row) => {
        if (!err && row && row.count === 0) {
            const defaults = ['Medicina General', 'Pediatria', 'Cardiologia', 'Traumatologia', 'Dermatologia'];
            defaults.forEach(nom => db.run(`INSERT OR IGNORE INTO specialties (name) VALUES (?)`, [nom]));
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT DEFAULT '',
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // MODIFICACIÓ: Afegim doctorId per fer l'agenda privada
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        patientName TEXT NOT NULL,
        date TEXT NOT NULL,
        reason TEXT,
        doctorId TEXT,
        createdAt TEXT
    )`);

    // MODIFICACIÓ: Afegim doctorName per desar qui signa la nota de l'evolució
    db.run(`CREATE TABLE IF NOT EXISTS timeline (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL,
        doctorName TEXT,
        createdAt TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS doctor_patients (
        doctorId TEXT,
        patientId TEXT,
        PRIMARY KEY (doctorId, patientId)
    )`);

    // Migració silenciosa per a bases de dades creades abans d'afegir el seguiment d'activitat.
    // S'executa AL FINAL, quan totes les taules ja existeixen segur. Els errors (columna ja existent) s'ignoren.
    const migracions = [
        `ALTER TABLE doctors ADD COLUMN createdAt TEXT`,
        `ALTER TABLE doctors ADD COLUMN createdBy TEXT`,
        `ALTER TABLE patients ADD COLUMN createdAt TEXT`,
        `ALTER TABLE patients ADD COLUMN createdBy TEXT`,
        `ALTER TABLE timeline ADD COLUMN createdAt TEXT`,
        `ALTER TABLE appointments ADD COLUMN createdAt TEXT`
    ];
    migracions.forEach(sql => db.run(sql, [], () => {}));
});

// ============================================================
// CONFIG
// ============================================================
app.get('/api/config', (req, res) => {
    db.get("SELECT * FROM config WHERE id = 'GLOBAL'", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { clinicName: 'Hospital Central' });
    });
});

app.put('/api/config', (req, res) => {
    const { clinicName, clinicPhone, clinicAddr, clinicEmail } = req.body;
    db.run(
        `UPDATE config SET clinicName=?, clinicPhone=?, clinicAddr=?, clinicEmail=? WHERE id='GLOBAL'`,
        [clinicName || '', clinicPhone || '', clinicAddr || '', clinicEmail || ''],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

// ============================================================
// ESPECIALITATS
// ============================================================
app.get('/api/specialties', (req, res) => {
    db.all("SELECT * FROM specialties ORDER BY name", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/specialties', (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "El nom és obligatori." });
    db.run(`INSERT INTO specialties (name) VALUES (?)`, [name.trim()], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE")) return res.status(400).json({ error: "Aquesta especialitat ja existeix." });
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ success: true, id: this.lastID });
    });
});

app.delete('/api/specialties/:id', (req, res) => {
    db.run(`DELETE FROM specialties WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============================================================
// ADMINS
// ============================================================
app.get('/api/admins', (req, res) => {
    db.all("SELECT id, name, username, password FROM admins", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/admins', (req, res) => {
    const { name, username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Usuari i contrasenya són obligatoris." });
    db.run(`INSERT INTO admins (name, username, password) VALUES (?, ?, ?)`,
        [name || '', username, password], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE")) return res.status(400).json({ error: "Aquest nom d'usuari ja existeix." });
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ success: true, id: this.lastID });
    });
});

app.put('/api/admins/:id', (req, res) => {
    const { name, username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Usuari i contrasenya són obligatoris." });
    db.run(`UPDATE admins SET name=?, username=?, password=? WHERE id=?`,
        [name || '', username, password, req.params.id], function(err) {
        if (err) {
            if (err.message.includes("UNIQUE")) return res.status(400).json({ error: "Aquest nom d'usuari ja existeix." });
            return res.status(500).json({ error: err.message });
        }
        if (this.changes === 0) return res.status(404).json({ error: "Administrador no trobat." });
        res.json({ success: true });
    });
});

app.delete('/api/admins/:id', (req, res) => {
    db.run(`DELETE FROM admins WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.post('/api/admins/login', (req, res) => {
    const { username, password } = req.body;
    db.get("SELECT * FROM admins WHERE username=? AND password=?", [username, password], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.json({ success: true, role: 'admin', name: row.name, id: row.id });
        res.status(401).json({ error: "Credencials incorrectes." });
    });
});

// ============================================================
// DOCTORS
// ============================================================
app.get('/api/doctors', (req, res) => {
    db.all("SELECT id, name, username, password, specialty, gender, phone, email, createdAt, createdBy FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/doctors', (req, res) => {
    const { name, specialty, username, password, gender, createdBy } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: "Falten camps obligatoris." });

    const anyActual = new Date().getFullYear().toString().slice(-2);
    const prefixAny = `MED-${anyActual}-`;

    db.get(`SELECT id FROM doctors WHERE id LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefixAny}%`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let nouContador = 1;
        if (row && row.id) {
            const parts = row.id.split('-');
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) nouContador = num + 1;
        }

        const nouId = `${prefixAny}${nouContador.toString().padStart(4, '0')}`;
        const ara = new Date().toISOString();
        db.run(`INSERT INTO doctors (id, name, specialty, username, password, gender, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [nouId, name, specialty || '', username, password, gender || '', ara, createdBy || 'Admin'], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE")) return res.status(400).json({ error: "L'usuari ja existeix." });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ success: true, id: nouId });
        });
    });
});

app.put('/api/doctors/:id', (req, res) => {
    const { name, specialty, gender, phone, email, username, password } = req.body;
    db.run(
        `UPDATE doctors SET name=?, specialty=?, gender=?, phone=?, email=?, username=?, password=? WHERE id=?`,
        [name, specialty, gender, phone || '', email || '', username, password, req.params.id],
        function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        }
    );
});

app.delete('/api/doctors/:id', (req, res) => {
    db.run(`DELETE FROM doctors WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Metge no trobat." });
        res.json({ success: true });
    });
});

// ============================================================
// PATIENTS
// ============================================================
app.get('/api/patients', (req, res) => {
    db.all("SELECT id, name, gender, birthDate, phone, email, createdAt, createdBy FROM patients", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/patients', (req, res) => {
    const { name, gender, birthDate, doctorId, createdBy } = req.body;
    if (!name) return res.status(400).json({ error: "El nom és obligatori." });

    const anyActual = new Date().getFullYear().toString().slice(-2);
    const prefixAny = `PAC-${anyActual}-`;

    db.get(`SELECT id FROM patients WHERE id LIKE ? ORDER BY id DESC LIMIT 1`, [`${prefixAny}%`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let nouContador = 1;
        if (row && row.id) {
            const parts = row.id.split('-');
            const num = parseInt(parts[2], 10);
            if (!isNaN(num)) nouContador = num + 1;
        }

        const nouId = `${prefixAny}${nouContador.toString().padStart(4, '0')}`;
        const ara = new Date().toISOString();

        db.serialize(() => {
            db.run(`INSERT INTO patients (id, name, gender, birthDate, createdAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)`,
                [nouId, name, gender || '', birthDate || '', ara, createdBy || 'Admin'], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                if (doctorId) {
                    db.run(`INSERT OR IGNORE INTO doctor_patients (doctorId, patientId) VALUES (?, ?)`, 
                        [doctorId, nouId], function(vincErr) {
                        if (vincErr) return res.status(500).json({ error: vincErr.message });
                        res.status(201).json({ success: true, id: nouId });
                    });
                } else {
                    res.status(201).json({ success: true, id: nouId });
                }
            });
        });
    });
});

app.put('/api/patients/:id', (req, res) => {
    const { name, gender, birthDate, phone, email } = req.body;
    db.run(`UPDATE patients SET name=?, gender=?, birthDate=?, phone=?, email=? WHERE id=?`,
        [name, gender, birthDate, phone || '', email || '', req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/patients/:id', (req, res) => {
    db.run(`DELETE FROM patients WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Pacient no trobat." });
        res.json({ success: true });
    });
});

app.get('/api/backup', (req, res) => {
    db.run("PRAGMA wal_checkpoint(FULL)", [], () => {
        res.download(DB_PATH, 'hospital_backup.db', (err) => {
            if (err) res.status(500).send("Error en generar el backup.");
        });
    });
});

app.get('/api/patients/all', (req, res) => {
    db.all("SELECT * FROM patients ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/doctors/:doctorId/patients', (req, res) => {
    const query = `
        SELECT p.* FROM patients p
        JOIN doctor_patients dp ON p.id = dp.patientId
        WHERE dp.doctorId = ?
        ORDER BY p.name ASC
    `;
    db.all(query, [req.params.doctorId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/doctor-patients', (req, res) => {
    const { doctorId, patientId } = req.body;
    db.run(`INSERT OR IGNORE INTO doctor_patients (doctorId, patientId) VALUES (?, ?)`, [doctorId, patientId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.delete('/api/doctor-patients', (req, res) => {
    const { doctorId, patientId } = req.body;
    db.run(`DELETE FROM doctor_patients WHERE doctorId = ? AND patientId = ?`, [doctorId, patientId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.get('/api/patients/:patientId/doctors', (req, res) => {
    const query = `
        SELECT d.id, d.name, d.specialty FROM doctors d
        JOIN doctor_patients dp ON d.id = dp.doctorId
        WHERE dp.patientId = ?
    `;
    db.all(query, [req.params.patientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// ============================================================
// MODIFICACIÓ: APPOINTMENTS FILTRATS PER METGE
// ============================================================
app.get('/api/appointments/:doctorId', (req, res) => {
    db.all("SELECT * FROM appointments WHERE doctorId = ? ORDER BY date ASC", [req.params.doctorId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/appointments', (req, res) => {
    const { id, patientId, patientName, date, reason, doctorId } = req.body;
    db.run(`INSERT INTO appointments (id, patientId, patientName, date, reason, doctorId, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, patientId, patientName, date, reason, doctorId, new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ success: true });
    });
});

app.delete('/api/appointments/:id', (req, res) => {
    db.run(`DELETE FROM appointments WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// ============================================================
// TIMELINE (HISTORIAL CLÍNIC MULTI-METGE)
// ============================================================
app.get('/api/timeline/:patientId', (req, res) => {
    db.all("SELECT * FROM timeline WHERE patientId = ? ORDER BY createdAt DESC, id DESC", [req.params.patientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/timeline', (req, res) => {
    const { id, patientId, date, type, text, doctorName } = req.body;
    db.run(`INSERT INTO timeline (id, patientId, date, type, text, doctorName, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, patientId, date, type, text, doctorName || 'Desconegut', new Date().toISOString()], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ success: true });
    });
});

app.delete('/api/reset', (req, res) => {
    db.serialize(() => {
        db.run(`DELETE FROM doctors`);
        db.run(`DELETE FROM patients`);
        db.run(`DELETE FROM specialties`);
        db.run(`DELETE FROM admins`);
        db.run(`DELETE FROM appointments`);
        db.run(`DELETE FROM timeline`);
        db.run(`DELETE FROM doctor_patients`);
        db.run(`UPDATE config SET clinicName='Hospital Central de Proves', clinicPhone='', clinicAddr='', clinicEmail='' WHERE id='GLOBAL'`, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ============================================================
// ACTIVITAT (Dashboard: historial per metge, per pacient i gràfica setmanal)
// ============================================================

// Activitat completa d'un metge: fitxa + cites + notes clíniques que ha signat
app.get('/api/activity/doctor/:doctorId', (req, res) => {
    const doctorId = req.params.doctorId;

    db.get(`SELECT * FROM doctors WHERE id = ?`, [doctorId], (err, metge) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!metge) return res.status(404).json({ error: "Metge no trobat." });

        db.get(`SELECT COUNT(*) as total FROM doctor_patients WHERE doctorId = ?`, [doctorId], (err, pacRow) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(`SELECT * FROM appointments WHERE doctorId = ?`, [doctorId], (err, cites) => {
                if (err) return res.status(500).json({ error: err.message });

                // Les notes clíniques no guarden doctorId, només el nom signat (ex: "Dr. Joan García").
                // Fem JOIN amb patients per saber a qui pertany cada nota.
                db.all(
                    `SELECT timeline.*, patients.name as patientName
                     FROM timeline
                     LEFT JOIN patients ON timeline.patientId = patients.id
                     WHERE timeline.doctorName LIKE ?`,
                    [`%${metge.name}%`],
                    (err, notesRaw) => {
                    if (err) return res.status(500).json({ error: err.message });

                    // Les cites ('cita') ja es compten a partir de la taula 'appointments';
                    // si les sumem també des de 'timeline' sortirien duplicades.
                    const notes = notesRaw.filter(n => n.type !== 'cita');

                    const activitat = [];

                    if (metge.createdAt) {
                        activitat.push({
                            type: 'creacio',
                            date: metge.createdAt,
                            text: `Fitxa de metge creada per ${metge.createdBy || 'Admin'}.`
                        });
                    }
                    cites.forEach(c => activitat.push({
                        type: 'cita',
                        date: c.createdAt || c.date,
                        text: `Cita amb ${c.patientName}: ${c.reason || 'sense motiu especificat'}.`
                    }));
                    notes.forEach(n => activitat.push({
                        type: n.type || 'consulta',
                        date: n.createdAt || n.date,
                        text: `${n.patientName ? `Pacient: ${n.patientName} — ` : ''}${n.text}`
                    }));

                    activitat.sort((a, b) => new Date(b.date) - new Date(a.date));

                    res.json({
                        doctor: { id: metge.id, name: metge.name, specialty: metge.specialty, createdAt: metge.createdAt, createdBy: metge.createdBy },
                        stats: { patients: pacRow.total, appointments: cites.length, notes: notes.length },
                        activity: activitat
                    });
                });
            });
        });
    });
});

// Activitat completa d'un pacient: fitxa + cites + notes clíniques (reutilitzant el mateix format que el timeline del metge)
app.get('/api/activity/patient/:patientId', (req, res) => {
    const patientId = req.params.patientId;

    db.get(`SELECT * FROM patients WHERE id = ?`, [patientId], (err, pacient) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!pacient) return res.status(404).json({ error: "Pacient no trobat." });

        db.all(`SELECT * FROM appointments WHERE patientId = ?`, [patientId], (err, cites) => {
            if (err) return res.status(500).json({ error: err.message });

            db.all(`SELECT * FROM timeline WHERE patientId = ?`, [patientId], (err, notesRaw) => {
                if (err) return res.status(500).json({ error: err.message });

                // Les cites ('cita') ja es compten a partir de la taula 'appointments';
                // si les sumem també des de 'timeline' sortirien duplicades.
                const notes = notesRaw.filter(n => n.type !== 'cita');

                const activitat = [];

                if (pacient.createdAt) {
                    activitat.push({
                        type: 'creacio',
                        date: pacient.createdAt,
                        text: `Fitxa de pacient creada per ${pacient.createdBy || 'Admin'}.`
                    });
                }
                cites.forEach(c => activitat.push({
                    type: 'cita',
                    date: c.createdAt || c.date,
                    doctorName: null,
                    text: `Cita programada (${c.date}): ${c.reason || 'sense motiu especificat'}.`
                }));
                notes.forEach(n => activitat.push({
                    type: n.type || 'consulta',
                    date: n.createdAt || n.date,
                    doctorName: n.doctorName,
                    text: n.text
                }));

                activitat.sort((a, b) => new Date(b.date) - new Date(a.date));

                res.json({
                    patient: { id: pacient.id, name: pacient.name, createdAt: pacient.createdAt, createdBy: pacient.createdBy },
                    stats: { appointments: cites.length, notes: notes.length },
                    activity: activitat
                });
            });
        });
    });
});

// Activitat agregada per setmana (notes clíniques + cites creades), per al gràfic del dashboard
app.get('/api/activity/weekly', (req, res) => {
    const query = `
        SELECT strftime('%Y-%W', createdAt) as setmana, COUNT(*) as total FROM (
            SELECT createdAt FROM timeline WHERE createdAt IS NOT NULL
            UNION ALL
            SELECT createdAt FROM appointments WHERE createdAt IS NOT NULL
        )
        GROUP BY setmana
        ORDER BY setmana ASC
    `;
    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });

        // Generem les últimes 8 setmanes (incloent les que no tenen activitat, per a un gràfic continu)
        const setmanes = [];
        const avui = new Date();
        for (let i = 7; i >= 0; i--) {
            const d = new Date(avui);
            d.setDate(d.getDate() - (i * 7));
            const onejan = new Date(d.getFullYear(), 0, 1);
            const weekNum = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
            const clauSqlite = `${d.getFullYear()}-${String(weekNum - 1).padStart(2, '0')}`;
            setmanes.push({ key: clauSqlite, label: `Set. ${weekNum}`, total: 0 });
        }

        rows.forEach(r => {
            const trobada = setmanes.find(s => s.key === r.setmana);
            if (trobada) trobada.total = r.total;
        });

        res.json(setmanes);
    });
});

app.listen(PORT, () => {
    console.log(`Servidor corrent a: http://localhost:${PORT}`);
});