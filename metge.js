let idPacientSeleccionat = null;    // Variable global per al control de pacients
let filtreActual = 'mine';         // Estat global de filtratge: 'mine' o 'all'
let elsMeusPacients = [];
let totsElsPacientsGlobals = [];

// --- DETECTOR DE PÀGINA ACTIVA ---
document.addEventListener("DOMContentLoaded", function() {
    const paginaActual = window.location.pathname;

    if (paginaActual.includes("metge_pacients.html")) {
        renderPatientsList();
        
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

async function renderPatientsList() {
    const llistaUl = document.getElementById('patients-list');
    if (!llistaUl) return;

    const user = getCurrentUser();
    if (!user || !user.id) return;

    try {
        const resMine = await fetch(`/api/doctors/${user.id}/patients`);
        elsMeusPacients = resMine.ok ? await resMine.json() : [];

        const resAll = await fetch('/api/patients');
        totsElsPacientsGlobals = resAll.ok ? await resAll.json() : [];

        llistaUl.innerHTML = '';
        const textCerca = document.getElementById('search-patient')?.value.toLowerCase().trim() || "";
        
        let llistaAFiltrar = [];
        if (filtreActual === 'mine') {
            llistaAFiltrar = elsMeusPacients;
        } else {
            llistaAFiltrar = totsElsPacientsGlobals.filter(p => !elsMeusPacients.some(m => m.id === p.id));
        }

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
            
            let htmlContent = `<div><strong>${p.name}</strong><br><small style="color:var(--text-muted); font-size:11px;">${p.id}</small></div>`;
            
            if (filtreActual === 'all') {
                htmlContent += `<button class="btn-success" onclick="assignarPacientExistent(event, '${p.id}')" style="padding:2px 6px; font-size:10px; white-space:nowrap;">+ Assignar</button>`;
            }

            li.innerHTML = htmlContent;
            
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
            alert("Pacient assignat correctament.");
            await renderPatientsList();
            if (idPacientSeleccionat === patientId) {
                await seleccionarPacient(patientId);
            }
        }
    } catch (e) { console.error(e); }
}

async function desassignarPacientActual() {
    if (!idPacientSeleccionat) return;
    if (!confirm("Segur que vols desassignar-te aquest pacient?")) return;
    
    const user = getCurrentUser();
    try {
        const res = await fetch('/api/doctor-patients', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ doctorId: user.id, patientId: idPacientSeleccionat })
        });
        if (res.ok) {
            alert("Pacient desassignat de la teva llista.");
            await renderPatientsList();
            await seleccionarPacient(idPacientSeleccionat);
        }
    } catch (e) { console.error(e); }
}

async function seleccionarPacient(idPacient) {
    idPacientSeleccionat = idPacient;
    
    const elements = document.getElementById('patients-list').children;
    for(let li of elements) { li.style.background = ""; li.style.fontWeight = "normal"; li.style.borderLeft = ""; }

    try {
        const resPacients = await fetch('/api/patients');
        const pacients = await resPacients.json();
        const pacient = pacients.find(p => p.id === idPacient);

        if (!pacient) return;

        document.getElementById('no-patient-selected').classList.add('hidden');
        document.getElementById('history-container').classList.remove('hidden');

        document.getElementById('pat-name').textContent = pacient.name;
        document.getElementById('pat-id').textContent = pacient.id;
        document.getElementById('pat-age').textContent = pacient.birthDate ? calcularEdat(pacient.birthDate) + " anys" : "No especificada";
        document.getElementById('pat-gender').textContent = pacient.gender;

        document.getElementById('edit-pat-name').value = pacient.name;
        document.getElementById('edit-pat-id-display').value = pacient.id;
        document.getElementById('edit-pat-birth').value = pacient.birthDate || '';
        document.getElementById('edit-pat-gender').value = pacient.gender;
        document.getElementById('edit-pat-phone').value = pacient.phone || '';
        document.getElementById('edit-pat-email').value = pacient.email || '';

        const botoContenidor = document.getElementById('action-patient-button-container');
        if (botoContenidor) {
            const esMeu = elsMeusPacients.some(m => m.id === idPacient);
            if (esMeu) {
                botoContenidor.innerHTML = `<button type="button" class="btn-danger" onclick="desassignarPacientActual()" style="padding: 6px 12px; font-size: 13px; background:#e53e3e;">🚫 Desassignar Pacient</button>`;
            } else {
                botoContenidor.innerHTML = `<button type="button" class="btn-success" onclick="assignarPacientExistent(null, '${pacient.id}')" style="padding: 6px 12px; font-size: 13px; background:var(--success-color);">➕ Assignar a la meva llista</button>`;
            }
        }

        const resTimeline = await fetch(`/api/timeline/${idPacient}`);
        const timeline = await resTimeline.json();
        renderTimeline(timeline);

    } catch (err) {
        console.error(err);
    }
}

// MODIFICACIÓ: Pinta el metge responsable al timeline
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
                <span style="color: var(--primary-color); font-size:12px; font-weight:600;">Signat: ${item.doctorName || 'Desconegut'}</span>
                <span class="timeline-date">${item.date}</span>
            </div>
            <div class="timeline-body" style="margin-top:5px;">${item.text.replace(/\n/g, '<br>')}</div>
        `;
        box.appendChild(entry);
    });
}

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

        if (!response.ok) throw new Error();

        document.getElementById('create-patient-form').reset();
        toggleFormulariPacient();
        await renderPatientsList();
        alert("Pacient registrat i lligat a la teva llista.");
    } catch (err) {
        alert("Error en el registre.");
    }
}

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
            alert("Fitxa actualitzada.");
            seleccionarPacient(idPacientSeleccionat);
        }
    } catch (err) { console.error(err); }
}

// MODIFICACIÓ: Adjunta l'autor de la consulta mèdica
async function executarAfegirConsulta(e) {
    e.preventDefault();
    if (!idPacientSeleccionat) return;

    const user = getCurrentUser();
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
                text: textInput,
                doctorName: `Dr. ${user.name}`
            })
        });

        if (response.ok) {
            document.getElementById('history-text').value = '';
            seleccionarPacient(idPacientSeleccionat);
        }
    } catch (err) { console.error(err); }
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
        const response = await fetch(`/api/doctors/${user.id}/patients`);
        const patients = await response.json();

        patients.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.dataset.name = p.name; 
            opt.textContent = `${p.name} (${p.id})`;
            select.appendChild(opt);
        });
    } catch (err) { console.error(err); }
}

// MODIFICACIÓ: Carrega només l'agenda del metge loguejat
async function renderAppointmentsTable() {
    const tbody = document.getElementById('appointments-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    const user = getCurrentUser();
    try {
        const response = await fetch(`/api/appointments/${user.id}`);
        const appointments = await response.json();

        if (appointments.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#a0aec0;">No tens cap cita agendada.</td></tr>';
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
    } catch (err) { console.error(err); }
}

// MODIFICACIÓ: Programa la cita afegint doctorId i doctorName
async function executarProgramarCita(e) {
    e.preventDefault();
    const user = getCurrentUser();
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
            body: JSON.stringify({ id: idCita, patientId, patientName, date: rawDate, reason, doctorId: user.id })
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
                text: `Cita reservada per al dia i hora: ${dataFormatada}.\nMotiu: ${reason}`,
                doctorName: `Dr. ${user.name}`
            })
        });

        document.getElementById('schedule-appointment-form').reset();
        await renderAppointmentsTable();
        alert("Cita agendada amb èxit!");
    } catch (err) { console.error(err); }
}

// MODIFICACIÓ: Anul·la afegint la signatura del metge al timeline
window.esborrarCita = async function(idCita, idPacient) {
    if (confirm("Segur que vols anul·lar aquesta cita de l'agenda?")) {
        const user = getCurrentUser();
        try {
            const resApp = await fetch(`/api/appointments/${user.id}`);
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
                    text: `Cita programada per al ${dataCitaOriginal} ha estat ANUL·LADA.\nMotiu original: ${motiuOriginal}`,
                    doctorName: `Dr. ${user.name}`
                })
            });

            await renderAppointmentsTable();
            alert("Cita anul·lada correctament.");
        } catch (err) { console.error(err); }
    }
};

function calcularEdat(dataNaixement) {
    const avui = new Date();
    const naixement = new Date(dataNaixement);
    let edat = avui.getFullYear() - naixement.getFullYear();
    const mes = avui.getMonth() - naixement.getMonth();
    if (mes < 0 || (mes === 0 && avui.getDate() < naixement.getDate())) { edat--; }
    return edat;
}
window.setFiltrePacients = setFiltrePacients;
window.assignarPacientExistent = assignarPacientExistent;
window.desassignarPacientActual = desassignarPacientActual;