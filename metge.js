let idPacientSeleccionat = null;    // Variable global per al control de pacients
let filtreActual = 'mine';         // Estat global de filtratge: 'mine' o 'all'
let elsMeusPacients = [];
let totsElsPacientsGlobals = [];

// --- DETECTOR DE PÀGINA ACTIVA ---
document.addEventListener("DOMContentLoaded", function() {
    const paginaActual = window.location.pathname;

    if (paginaActual.includes("metge_pacients.html")) {
        renderPatientsList();
        
        // Escoltador del cercador dinàmic
        const txtSearch = document.getElementById('search-patient');
        if(txtSearch) txtSearch.addEventListener('input', renderPatientsList);

        const formCrear = document.getElementById('create-patient-form');
        if(formCrear) formCrear.addEventListener('submit', executarCreacioPacient);
        const formEditar = document.getElementById('edit-contact-form');
        if(formEditar) formEditar.addEventListener('submit', executarEdicioFitxa);
        const formConsulta = document.getElementById('add-entry-form');
        if(formConsulta) formConsulta.addEventListener('submit', executarAfegirConsulta);

    } else if (paginaActual.includes("metge_cites.html")) {
        actualitzarDesplegablePacientsCites();
        renderAppointmentsTable();
        const formCites = document.getElementById('schedule-appointment-form');
        if(formCites) formCites.addEventListener('submit', executarProgramarCita);
    }
});

// ==========================================
// SECCIÓ A: LÒGICA DE LA PESTANYA PACIENTS
// ==========================================

function toggleFormulariPacient() {
    const formulariDiv = document.getElementById('dropdown-patient-form');
    const boto = document.getElementById('toggle-patient-btn');
    if (formulariDiv.classList.contains('hidden')) {
        formulariDiv.classList.remove('hidden');
        boto.textContent = "Tancar";
    } else {
        formulariDiv.classList.add('hidden');
        boto.textContent = "+ Pacient";
    }
}

// LLEGIR PACIENTS FILTRATS SEGONS MODE 'MINE' / 'ALL'
async function renderPatientsList() {
    const llistaUl = document.getElementById('patients-list');
    if (!llistaUl) return;

    const user = getCurrentUser();
    if (!user || !user.id) return;

    try {
        // 1. Obtenir llistat personalitzat d'aquest doctor
        const resMine = await fetch(`/api/doctors/${user.id}/patients`);
        elsMeusPacients = resMine.ok ? await resMine.json() : [];

        // 2. Obtenir llistat global del centre
        const resAll = await fetch('/api/patients');
        totsElsPacientsGlobals = resAll.ok ? await resAll.json() : [];

        llistaUl.innerHTML = '';
        const textCerca = document.getElementById('search-patient')?.value.toLowerCase().trim() || "";
        
        // Determinar quina llista utilitzar
        let llistaAFiltrar = (filtreActual === 'mine') ? elsMeusPacients : totsElsPacientsGlobals;

        // Aplicar filtre de cerca si s'ha escrit alguna cosa
        if (textCerca !== "") {
            llistaAFiltrar = llistaAFiltrar.filter(p => 
                p.name.toLowerCase().includes(textCerca) || p.id.toLowerCase().includes(textCerca)
            );
        }

        if (llistaAFiltrar.length === 0) {
            llistaUl.innerHTML = '<li style="text-align:center; color:#a0aec0; font-style:italic; padding:10px;">Cap pacient trobat</li>';
            return;
        }

        llistaAFiltrar.forEach(p => {
            const li = document.createElement('li');
            li.style.display = "flex";
            li.style.justifyContent = "space-between";
            li.style.alignItems = "center";
            li.style.padding = "10px";
            
            const jaEsMeu = elsMeusPacients.some(m => m.id === p.id);

            let htmlContent = `<div><strong>${p.name}</strong><br><small style="color:var(--text-muted); font-size:11px;">${p.id}</small></div>`;
            
            // Botó ràpid d'assignació en la llista global
            if (filtreActual === 'all' && !jaEsMeu) {
                htmlContent += `<button class="btn-success" onclick="assignarPacientExistent(event, '${p.id}')" style="padding:2px 6px; font-size:10px; white-space:nowrap;">+ Assignar</button>`;
            } else if (jaEsMeu && filtreActual === 'all') {
                htmlContent += `<span style="font-size:11px; color:#319795; font-weight:bold;">✓ El meu</span>`;
            }

            li.innerHTML = htmlContent;
            
            // Estil seleccionat
            if (idPacientSeleccionat === p.id) {
                li.style.background = "#edf2f7";
                li.style.fontWeight = "bold";
                li.style.borderLeft = "4px solid var(--primary-color)";
            }

            li.addEventListener('click', (e) => {
                if (e.target.tagName !== 'BUTTON') {
                    seleccionarPacient(p.id);
                }
            });

            llistaUl.appendChild(li);
        });
    } catch (err) {
        console.error("Error carregant pacients:", err);
    }
}

// CANVI DE PESTANYA / MODE
function setFiltrePacients(mode) {
    filtreActual = mode;
    const btnMine = document.getElementById('btn-filter-mine');
    const btnAll = document.getElementById('btn-filter-all');
    if (!btnMine || !btnAll) return;
    
    if(mode === 'mine') {
        btnMine.className = "btn-primary";
        btnMine.style.background = "var(--primary-color)"; btnMine.style.color = "white";
        btnAll.className = "btn-secondary";
        btnAll.style.background = "#e2e8f0"; btnAll.style.color = "#2d3748";
    } else {
        btnAll.className = "btn-primary";
        btnAll.style.background = "var(--primary-color)"; btnAll.style.color = "white";
        btnMine.className = "btn-secondary";
        btnMine.style.background = "#e2e8f0"; btnMine.style.color = "#2d3748";
    }
    renderPatientsList();
}

// VINCULAR UN PACIENT EXISTENT DE L'HOSPITAL A LA MEVA LLISTA
async function assignarPacientExistent(event, patientId) {
    if(event) event.stopPropagation();
    const user = getCurrentUser();
    try {
        const res = await fetch('/api/doctor-patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorId: user.id, patientId: patientId })
        });
        if (res.ok) {
            alert("Pacient assignat correctament a la teva llista de seguiment.");
            await renderPatientsList();
        }
    } catch (e) { 
        console.error("Error associant pacient:", e); 
    }
}

// DESASSIGNAR PACIENT ACTUAL DE LA LLISTA D'AQUEST METGE
async function desassignarPacientActual() {
    if (!idPacientSeleccionat) return;
    if (!confirm("Segur que vols desassignar-te aquest pacient? Ja no el veuràs a la teva llista habitual (les dades clíniques i el seu historial no s'esborraran de l'hospital).")) return;
    
    const user = getCurrentUser();
    try {
        const res = await fetch('/api/doctor-patients', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorId: user.id, patientId: idPacientSeleccionat })
        });
        if (res.ok) {
            idPacientSeleccionat = null;
            document.getElementById('history-container').classList.add('hidden');
            document.getElementById('no-patient-selected').classList.remove('hidden');
            await renderPatientsList();
        }
    } catch (e) { console.error(e); }
}

// SELECCIONAR UN PACIENT I CARREGAR EL SEU HISTORIAL (TIMELINE)
async function seleccionarPacient(idPacient) {
    idPacientSeleccionat = idPacient;
    
    // Refresca l'estat visual de la llista esquerra sense perdre el focus
    const elements = document.getElementById('patients-list').children;
    for(let li of elements) { li.style.background = ""; li.style.fontWeight = "normal"; li.style.borderLeft = ""; }

    try {
        const resPacients = await fetch('/api/patients');
        const pacients = await resPacients.json();
        const pacient = pacients.find(p => p.id === idPacient);

        if (!pacient) return;

        // Mostrar el panell de la dreta i amagar el missatge buit
        document.getElementById('no-patient-selected').classList.add('hidden');
        document.getElementById('history-container').classList.remove('hidden');

        // Omplir dades de la capçalera
        document.getElementById('pat-name').textContent = pacient.name;
        document.getElementById('pat-id').textContent = pacient.id;
        document.getElementById('pat-age').textContent = pacient.birthDate ? calcularEdat(pacient.birthDate) + " anys" : "No especificada";
        document.getElementById('pat-gender').textContent = pacient.gender;

        // Omplir camps de modificació de dades
        document.getElementById('edit-pat-name').value = pacient.name;
        document.getElementById('edit-pat-id-display').value = pacient.id;
        document.getElementById('edit-pat-birth').value = pacient.birthDate || '';
        document.getElementById('edit-pat-gender').value = pacient.gender;
        document.getElementById('edit-pat-phone').value = pacient.phone || '';
        document.getElementById('edit-pat-email').value = pacient.email || '';

        // Obtenir el timeline d'aquest pacient
        const resTimeline = await fetch(`/api/timeline/${idPacient}`);
        const timeline = await resTimeline.json();
        renderTimeline(timeline);

    } catch (err) {
        console.error("Error seleccionant pacient:", err);
    }
}

function renderTimeline(timelineArray) {
    const box = document.getElementById('history-timeline');
    box.innerHTML = '';

    if (timelineArray.length === 0) {
        box.innerHTML = '<p style="color: #a0aec0; font-style: italic;">L\'historial clínic està buit. Afegeix la primera consulta a dalt.</p>';
        return;
    }

    timelineArray.forEach(item => {
        const entry = document.createElement('div');
        entry.className = `timeline-item ${item.type}`;
        
        let icona = "📝";
        if (item.type === 'cita') icona = "📅";
        if (item.type === 'cita-anulada') icona = "❌";

        entry.innerHTML = `
            <div class="timeline-header">
                <strong>${icona} ${item.type.toUpperCase()}</strong>
                <span class="timeline-date">${item.date}</span>
            </div>
            <div class="timeline-body">${item.text.replace(/\n/g, '<br>')}</div>
        `;
        box.appendChild(entry);
    });
}

// CREAR PACIENT I AUTO-ASSIGNAR-LO AL DR LOGUEJAT
async function executarCreacioPacient(e) {
    e.preventDefault();
    const user = getCurrentUser();
    const name = document.getElementById('new-patient-name').value.trim();
    const birthDate = document.getElementById('new-patient-birth').value;
    const gender = document.getElementById('new-patient-gender').value;

    try {
        const response = await fetch('/api/patients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, birthDate, gender, doctorId: user.id })
        });

        const data = await response.json();
        if (!response.ok) {
            alert(data.error);
            return;
        }

        document.getElementById('create-patient-form').reset();
        toggleFormulariPacient();
        await renderPatientsList();
        alert("Pacient registrat al sistema i lligat a la teva llista pròpia.");
    } catch (err) {
        alert("Error de connexió amb el servidor.");
    }
}

// EDITAR LES DADES DES DEL PANELL DEL METGE
async function executarEdicioFitxa(e) {
    e.preventDefault();
    if (!idPacientSeleccionat) return;

    const name = document.getElementById('edit-pat-name').value.trim();
    const birthDate = document.getElementById('edit-pat-birth').value;
    const gender = document.getElementById('edit-pat-gender').value;
    const phone = document.getElementById('edit-pat-phone').value.trim();
    const email = document.getElementById('edit-pat-email').value.trim();

    try {
        const response = await fetch(`/api/patients/${idPacientSeleccionat}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, gender, birthDate, phone, email })
        });

        if (response.ok) {
            alert("Fitxa de dades actualitzada a SQLite.");
            seleccionarPacient(idPacientSeleccionat);
        }
    } catch (err) {
        console.error(err);
    }
}

// AFEGIR CONSULTA
async function executarAfegirConsulta(e) {
    e.preventDefault();
    if (!idPacientSeleccionat) return;

    const textInput = document.getElementById('history-text').value.trim();
    const ara = new Date();
    const dataString = `${String(ara.getDate()).padStart(2,'0')}/${String(ara.getMonth()+1).padStart(2,'0')}/${ara.getFullYear()} ${String(ara.getHours()).padStart(2,'0')}:${String(ara.getMinutes()).padStart(2,'0')}`;

    try {
        const response = await fetch('/api/timeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: "cons-" + Date.now(),
                patientId: idPacientSeleccionat,
                date: dataString,
                type: 'consulta',
                text: textInput
            })
        });

        if (response.ok) {
            document.getElementById('history-text').value = '';
            seleccionarPacient(idPacientSeleccionat);
        }
    } catch (err) {
        console.error(err);
    }
}


// ==========================================
// SECCIÓ B: LÒGICA DE LA PESTANYA CITES
// ==========================================

async function actualitzarDesplegablePacientsCites() {
    const select = document.getElementById('appointment-patient-select');
    if (!select) return;
    select.innerHTML = '<option value="" disabled selected>-- Tria un pacient --</option>';

    const user = getCurrentUser();
    try {
        // Mostrem al llistat de cites només els pacients que aquest doctor té assignats!
        const response = await fetch(`/api/doctors/${user.id}/patients`);
        const patients = await response.json();

        patients.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.dataset.name = p.name; 
            opt.textContent = `${p.name} (${p.id})`;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
    }
}

async function renderAppointmentsTable() {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    try {
        const response = await fetch('/api/appointments');
        const appointments = await response.json();

        if (appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#a0aec0;">No hi ha cap cita agendada a SQLite.</td></tr>';
            return;
        }

        appointments.forEach(app => {
            const tr = document.createElement('tr');
            const dataFmt = app.date.replace('T', ' ');

            tr.innerHTML = `
                <td><strong>${app.patientName}</strong><br><small style="color:#718096">${app.patientId}</small></td>
                <td>📅 ${dataFmt}</td>
                <td><span style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:12px;">${app.reason}</span></td>
                <td style="text-align: right;">
                    <button class="btn-danger" style="padding:4px 8px; font-size:11px;" onclick="esborrarCita('${app.id}', '${app.patientId}')">Anul·lar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error(err);
    }
}

async function executarProgramarCita(e) {
    e.preventDefault();
    const select = document.getElementById('appointment-patient-select');
    const patientId = select.value;
    const patientName = select.options[select.selectedIndex].dataset.name;
    const rawDate = document.getElementById('appointment-date').value;
    const reason = document.getElementById('appointment-reason').value.trim();

    const idCita = "cita-" + Date.now();
    const dataFormatada = rawDate.replace('T', ' ');

    try {
        await fetch('/api/appointments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: idCita, patientId, patientName, date: rawDate, reason })
        });

        const ara = new Date();
        const avuiString = `${String(ara.getDate()).padStart(2,'0')}/${String(ara.getMonth()+1).padStart(2,'0')}/${ara.getFullYear()} ${String(ara.getHours()).padStart(2,'0')}:${String(ara.getMinutes()).padStart(2,'0')}`;
        
        await fetch('/api/timeline', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: "time-c-" + Date.now(),
                patientId: patientId,
                date: avuiString,
                type: 'cita',
                text: `Cita reservada per al dia i hora: ${dataFormatada}.\nMotiu: ${reason}`
            })
        });

        document.getElementById('schedule-appointment-form').reset();
        await renderAppointmentsTable();
        alert("Cita agendada i registrada a l'historial amb èxit!");
    } catch (err) {
        console.error(err);
    }
}

window.esborrarCita = async function(idCita, idPacient) {
    if (confirm("Segur que vols anul·lar aquesta cita de l'agenda?")) {
        try {
            const resApp = await fetch('/api/appointments');
            const appointments = await resApp.json();
            const dadaCita = appointments.find(app => app.id === idCita);

            const motiuOriginal = dadaCita ? dadaCita.reason : "No especificat";
            const dataCitaOriginal = dadaCita ? dadaCita.date.replace('T', ' ') : "No especificada";

            await fetch(`/api/appointments/${idCita}`, { method: 'DELETE' });

            const ara = new Date();
            const dataAnulacioString = `${String(ara.getDate()).padStart(2,'0')}/${String(ara.getMonth()+1).padStart(2,'0')}/${ara.getFullYear()} ${String(ara.getHours()).padStart(2,'0')}:${String(ara.getMinutes()).padStart(2,'0')}`;

            await fetch('/api/timeline', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: "anul-" + Date.now(),
                    patientId: idPacient,
                    date: dataAnulacioString,
                    type: "cita-anulada",
                    text: `Cita que estava programada per al ${dataCitaOriginal} ha estat ANUL·LADA.\nMotiu original: ${motiuOriginal}`
                })
            });

            await renderAppointmentsTable();
            alert("Cita anul·lada correctament.");
        } catch (err) {
            console.error("Error al cancel·lar la cita:", err);
        }
    }
};

// --- UTILITATS ---
function calcularEdat(dataNaixement) {
    const avui = new Date();
    const naixement = new Date(dataNaixement);
    let edat = avui.getFullYear() - naixement.getFullYear();
    const mes = avui.getMonth() - naixement.getMonth();
    if (mes < 0 || (mes === 0 && avui.getDate() < naixement.getDate())) {
        edat--;
    }
    return edat;
}
window.setFiltrePacients = setFiltrePacients;
window.assignarPacientExistent = assignarPacientExistent;
window.desassignarPacientActual = desassignarPacientActual;