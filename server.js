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
        email TEXT DEFAULT ''
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT,
        birthDate TEXT,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT ''
    )`);

    // Configuració ampliada amb nous camps
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

    // Taula d'especialitats
    db.run(`CREATE TABLE IF NOT EXISTS specialties (
        id   INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL
    )`);

    // Especialitats per defecte (si la taula és buida)
    db.get("SELECT COUNT(*) as count FROM specialties", [], (err, row) => {
        if (!err && row && row.count === 0) {
            const defaults = ['Medicina General', 'Pediatria', 'Cardiologia', 'Traumatologia', 'Dermatologia'];
            defaults.forEach(nom => db.run(`INSERT OR IGNORE INTO specialties (name) VALUES (?)`, [nom]));
        }
    });

    // Taula d'administradors (a part de l'admin mestre hard-coded)
    db.run(`CREATE TABLE IF NOT EXISTS admins (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT DEFAULT '',
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL
    )`);

    // Taula d'agenda de cites operatives
    db.run(`CREATE TABLE IF NOT EXISTS appointments (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        patientName TEXT NOT NULL,
        date TEXT NOT NULL,
        reason TEXT
    )`);

    // Taula per a l'historial de consultes i anul·lacions (Timeline)
    db.run(`CREATE TABLE IF NOT EXISTS timeline (
        id TEXT PRIMARY KEY,
        patientId TEXT NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        text TEXT NOT NULL
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS doctor_patients (
    doctorId TEXT,
    patientId TEXT,
    PRIMARY KEY (doctorId, patientId)
)`);
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
    db.all("SELECT id, name, username FROM admins", [], (err, rows) => {
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

app.delete('/api/admins/:id', (req, res) => {
    db.run(`DELETE FROM admins WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Login d'admins secundaris (comprova la taula admins + l'admin mestre)
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
    db.all("SELECT id, name, username, password, specialty, gender, phone, email FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/doctors', (req, res) => {
    const { name, specialty, username, password, gender } = req.body;
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
        db.run(`INSERT INTO doctors (id, name, specialty, username, password, gender) VALUES (?, ?, ?, ?, ?, ?)`,
            [nouId, name, specialty || '', username, password, gender || ''], function(err) {
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

// Eliminar metge definitivament
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
    db.all("SELECT id, name, gender, birthDate, phone, email FROM patients", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/patients', (req, res) => {
    // Reben també de manera opcional doctorId (quan el crea un metge)
    const { name, gender, birthDate, doctorId } = req.body;
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

        // Fem un serialize per assegurar que si hi ha un doctorId, s'insereix tot en ordre
        db.serialize(() => {
            // 1. Inserim el pacient a la taula global
            db.run(`INSERT INTO patients (id, name, gender, birthDate) VALUES (?, ?, ?, ?)`,
                [nouId, name, gender || '', birthDate || ''], function(err) {
                if (err) return res.status(500).json({ error: err.message });
                
                // 2. Si l'ha creat un metge (hi ha doctorId), el vinculem directament
                if (doctorId) {
                    db.run(`INSERT OR IGNORE INTO doctor_patients (doctorId, patientId) VALUES (?, ?)`, 
                        [doctorId, nouId], function(vincErr) {
                        if (vincErr) return res.status(500).json({ error: vincErr.message });
                        
                        // Responem un cop s'ha creat la relació
                        res.status(201).json({ success: true, id: nouId });
                    });
                } else {
                    // Si l'ha creat l'admin (sense doctorId), responem directament
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

// Eliminar pacient definitivament
app.delete('/api/patients/:id', (req, res) => {
    db.run(`DELETE FROM patients WHERE id=?`, [req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Pacient no trobat." });
        res.json({ success: true });
    });
});

// ============================================================
// BACKUP — Descarregar el fitxer hospital.db
// ============================================================
app.get('/api/backup', (req, res) => {
    db.run("PRAGMA wal_checkpoint(FULL)", [], () => {
        res.download(DB_PATH, 'hospital_backup.db', (err) => {
            if (err) res.status(500).send("Error en generar el backup.");
        });
    });
});

// ============================================================
// RESET TOTAL — Eliminar totes les dades (buida taules)
// ============================================================
app.delete('/api/reset', (req, res) => {
    db.serialize(() => {
        db.run(`DELETE FROM doctors`);
        db.run(`DELETE FROM patients`);
        db.run(`DELETE FROM specialties`);
        db.run(`DELETE FROM admins`);
        db.run(`DELETE FROM doctor_patients`);
        db.run(`UPDATE config SET clinicName='Hospital Central de Proves', clinicPhone='', clinicAddr='', clinicEmail='' WHERE id='GLOBAL'`, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// ============================================================
// APPOINTMENTS (CITES)
// ============================================================
app.get('/api/appointments', (req, res) => {
    db.all("SELECT * FROM appointments ORDER BY date ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/appointments', (req, res) => {
    const { id, patientId, patientName, date, reason } = req.body;
    db.run(`INSERT INTO appointments (id, patientId, patientName, date, reason) VALUES (?, ?, ?, ?, ?)`,
        [id, patientId, patientName, date, reason], function(err) {
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
// TIMELINE (HISTORIAL CLÍNIC)
// ============================================================
app.get('/api/timeline/:patientId', (req, res) => {
    db.all("SELECT * FROM timeline WHERE patientId = ? ORDER BY id DESC", [req.params.patientId], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/timeline', (req, res) => {
    const { id, patientId, date, type, text } = req.body;
    db.run(`INSERT INTO timeline (id, patientId, date, type, text) VALUES (?, ?, ?, ?, ?)`,
        [id, patientId, date, type, text], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ success: true });
    });
});

// Actualització del RESET TOTAL per incloure les noves taules
app.delete('/api/reset', (req, res) => {
    db.serialize(() => {
        db.run(`DELETE FROM doctors`);
        db.run(`DELETE FROM patients`);
        db.run(`DELETE FROM specialties`);
        db.run(`DELETE FROM admins`);
        db.run(`DELETE FROM appointments`);
        db.run(`DELETE FROM timeline`);
        db.run(`UPDATE config SET clinicName='Hospital Central de Proves', clinicPhone='', clinicAddr='', clinicEmail='' WHERE id='GLOBAL'`, function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.json({ success: true });
        });
    });
});

// Obtenir tots els pacients del sistema (perquè el metge pugui cercar i assignar-se'ls)
app.get('/api/patients/all', (req, res) => {
    db.all("SELECT * FROM patients ORDER BY name ASC", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Obtenir només els pacients assignats a un metge concret
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

// Assignar un pacient existent a un metge
app.post('/api/doctor-patients', (req, res) => {
    const { doctorId, patientId } = req.body;
    db.run(`INSERT OR IGNORE INTO doctor_patients (doctorId, patientId) VALUES (?, ?)`, [doctorId, patientId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Desassignar un pacient d'un metge
app.delete('/api/doctor-patients', (req, res) => {
    const { doctorId, patientId } = req.body;
    db.run(`DELETE FROM doctor_patients WHERE doctorId = ? AND patientId = ?`, [doctorId, patientId], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Obtenir els metges assignats a un pacient (per a l'Admin)
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
app.listen(PORT, () => {
    console.log(`Servidor corrent a: http://localhost:${PORT}`);
});