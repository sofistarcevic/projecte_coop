# Sistema de Gestió Hospitalària Local

Aquest repositori conté el codi font d'una aplicació web *full-stack* a mida desenvolupada per a l'entorn local d'**AUCOOP-Mint**. 

L'objectiu principal d'aquest programari és permetre la gestió de metges, pacients, l'agenda de cites i els historials clínics en zones en vies de desenvolupament, funcionant de manera **completament offline** i sense dependre de cap connexió externa a Internet.

## Característiques principals

- **Arquitectura lleugera:** Desenvolupat amb Node.js, Express i una base de dades local SQLite (`sqlite3`).
- **Funcionament Offline:** Ideal per a servidors locals connectats a xarxes Wi-Fi/LAN sense sortida a Internet.
- **Mòdul d'Administració:** Gestió del nom de la clínica, alta/baixa d'especialitats i metges, reinici de fàbrica i descàrrega automatitzada de còpies de seguretat (`.db`).
- **Mòdul Clínic:** Panell reactiu per a metges, assignació de pacients, gestió de consultes mèdiques (evolució cronològica / *timeline*) i control d'agenda de cites.
- **Disseny Responsive:** Interfície web neta, ràpida i adaptada a monitors antics o dispositius mòbils de l'hospital.

## Estructura del Projecte

- `server.js`: Nucli del back-end, rutes REST API i connexió amb SQLite.
- `db.js`: Control d'autenticació, sessions d'usuari i protecció de rutes del client.
- `index.html` / `index.js`: Interfície i lògica d'inici de sessió.
- `admin.html` / `admin.js`: Panell de control exclusiu per a l'administrador del centre.
- `metge_pacients.html`, `metge_cites.html` / `metge.js`: Interfícies de treball per al personal mèdic.
- `style.css`: Estils globals i variables de disseny.

## Guia d'Instal·lació i Replicació

Per desplegar aquest servei en qualsevol ordinador que actuï com a servidor de xarxa local, segueix aquests passos:

### 1. Requisits previs
Assegura't de tenir instal·lat [Node.js](https://nodejs.org/) a la màquina.

### 2. Instal·lació de dependències
Clona aquest repositori, accedeix a la carpeta i instal·la els mòduls necessaris:
```bash
git clone [https://github.com/sofistarcevic/projecte_coop.git](https://github.com/sofistarcevic/projecte_coop.git)
cd projecte_coop
npm install express sqlite3

### 3. Executar el servidor
Inicia el servei web:
```bash
node server.js

El servidor s'aixecarà automàticament al port 5000 i crearà de forma autònoma el fitxer de la base de dades hospital.db amb totes les taules i dades inicials de fàbrica.

### Copyright i Llicència
Copyright (c) 2026 Sofija Starcevic, Àlex López, Víctor Lorenzo, Nil Farrús.

Aquest projecte està llicenciat sota la Llicència MIT. Això significa que ets lliure de utilitzar, modificar i distribuir aquest codi per a altres projectes acadèmics, socials o de cooperació internacional, sempre que s'inclogui el reconeixement dels autors originals.

Desenvolupat com a part del Projecte de Cooperació amb Tecnologies Wi-Fi (QP 2025-2026).
