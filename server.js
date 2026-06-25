const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// Connexió inicial a la Base de Dades neta
const db = new sqlite3.Database(path.join(__dirname, 'hospital.db'), (err) => {
    if (err) return console.error("Error connectant a SQLite:", err.message);
    console.log("Connectat correctament a la base de dades SQLite (hospital.db).");
});

// Creació de les taules en SQL
db.serialize(() => {
    // Taula de metges buida
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

    // Taula de pacients buida
    db.run(`CREATE TABLE IF NOT EXISTS patients (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        gender TEXT,
        birthDate TEXT,
        phone TEXT DEFAULT '',
        email TEXT DEFAULT ''
    )`);

    // Taula de configuració del centre amb un valor inicial
    db.run(`CREATE TABLE IF NOT EXISTS config (
        id TEXT PRIMARY KEY,
        clinicName TEXT
    )`);

    db.get("SELECT COUNT(*) as count FROM config", [], (err, row) => {
        if (!err && row && row.count === 0) {
            db.run(`INSERT INTO config (id, clinicName) VALUES ('GLOBAL', 'Hospital Central de Proves')`);
        }
    });
});

// --------------------------------------------------- //
// --- RUTES APIS BÀSIQUES PER A L'INICI DE SESSIÓ --- //
// --------------------------------------------------- //

// Obtenir configuració del centre
app.get('/api/config', (req, res) => {
    db.get("SELECT * FROM config WHERE id = 'GLOBAL'", [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row || { clinicName: 'Hospital Central' });
    });
});

// Obtenir llista de metges per comprovar credencials al login
app.get('/api/doctors', (req, res) => {
    db.all("SELECT id, name, username, password, specialty, gender, phone, email FROM doctors", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Crear un nou metge a la base de dades
app.post('/api/doctors', (req, res) => {
    const { name, specialty, username, password, gender } = req.body;
    if (!name || !username || !password) {
        return res.status(400).json({ error: "Falten camps obligatoris." });
    }

    const anyActual = new Date().getFullYear().toString().slice(-2);
    const prefixAny = `MED-${anyActual}-`;

    const sqlBuscarUltimId = `SELECT id FROM doctors WHERE id LIKE ? ORDER BY id DESC LIMIT 1`;

    db.get(sqlBuscarUltimId, [`${prefixAny}%`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let nouContador = 1;
        if (row && row.id) {
            const parts = row.id.split('-');
            const ultimNumeroAssegurat = parseInt(parts[2], 10);
            if (!isNaN(ultimNumeroAssegurat)) nouContador = ultimNumeroAssegurat + 1;
        }

        const numeroFormatat = nouContador.toString().padStart(4, '0');
        const nouId = `${prefixAny}${numeroFormatat}`;
        
        const queryInsert = `INSERT INTO doctors (id, name, specialty, username, password, gender) VALUES (?, ?, ?, ?, ?, ?)`;
        
        db.run(queryInsert, [nouId, name, specialty || '', username, password, gender || ''], function(err) {
            if (err) {
                if (err.message.includes("UNIQUE")) return res.status(400).json({ error: "L'usuari ja existeix." });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ success: true, id: nouId });
        });
    });
});

// Actualitzar metge (PUT)
app.put('/api/doctors/:id', (req, res) => {
    const { name, specialty, gender, phone, email, username, password } = req.body;
    const { id } = req.params;
    
    const queryUpdate = `
        UPDATE doctors 
        SET name=?, specialty=?, gender=?, phone=?, email=?, username=?, password=? 
        WHERE id=?
    `;
    
    db.run(queryUpdate, [name, specialty, gender, phone || '', email || '', username, password, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Crear un nou pacient
app.post('/api/patients', (req, res) => {
    const { name, gender, birthDate } = req.body;
    if (!name) return res.status(400).json({ error: "El nom és obligatori." });

    const anyActual = new Date().getFullYear().toString().slice(-2);
    const prefixAny = `PAC-${anyActual}-`;

    const sqlBuscarUltimId = `SELECT id FROM patients WHERE id LIKE ? ORDER BY id DESC LIMIT 1`;

    db.get(sqlBuscarUltimId, [`${prefixAny}%`], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });

        let nouContador = 1;
        if (row && row.id) {
            const parts = row.id.split('-');
            const ultimNumeroAssegurat = parseInt(parts[2], 10);
            if (!isNaN(ultimNumeroAssegurat)) nouContador = ultimNumeroAssegurat + 1;
        }

        const numeroFormatat = nouContador.toString().padStart(4, '0');
        const nouId = `${prefixAny}${numeroFormatat}`;

        const queryInsert = `INSERT INTO patients (id, name, gender, birthDate) VALUES (?, ?, ?, ?)`;
        
        db.run(queryInsert, [nouId, name, gender || '', birthDate || ''], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ success: true, id: nouId });
        });
    });
});

// Obtenir llista de pacients
app.get('/api/patients', (req, res) => {
    db.all("SELECT id, name, gender, birthDate, phone, email FROM patients", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Actualitzar pacient (PUT)
app.put('/api/patients/:id', (req, res) => {
    const { name, gender, birthDate, phone, email } = req.body;
    const queryUpdate = `UPDATE patients SET name=?, gender=?, birthDate=?, phone=?, email=? WHERE id=?`;
    
    db.run(queryUpdate, [name, gender, birthDate, phone || '', email || '', req.params.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

// Escolta del servidor
app.listen(PORT, () => {
    console.log(`Servidor corrent a: http://localhost:${PORT}`);
});