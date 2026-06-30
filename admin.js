document.addEventListener("DOMContentLoaded", function() {
    
    // =========================================================================
    // CONTROL DE CANVI DE PESTANYES
    // =========================================================================
    const btnDashboard = document.getElementById('btn-dashboard');
    const btnMetgesPacients = document.getElementById('btn-metges-pacients');
    const btnConfig = document.getElementById('btn-configuració');

    const secDashboard = document.getElementById('seccio-dashboard');
    const secMetgesPacients = document.getElementById('seccio-metges-pacients');
    const secConfig = document.getElementById('seccio-configuració');

    function desactivarTotesLesPestanyes() {
        btnDashboard.classList.remove('active');
        btnMetgesPacients.classList.remove('active');
        btnConfig.classList.remove('active');
        secDashboard.classList.add('hidden');
        secMetgesPacients.classList.add('hidden');
        secConfig.classList.add('hidden');
    }

    btnDashboard.addEventListener('click', function() {
        desactivarTotesLesPestanyes();
        btnDashboard.classList.add('active');
        secDashboard.classList.remove('hidden');
    });

    btnMetgesPacients.addEventListener('click', function() {
        desactivarTotesLesPestanyes();
        btnMetgesPacients.classList.add('active');
        secMetgesPacients.classList.remove('hidden');
    });

    btnConfig.addEventListener('click', function() {
        desactivarTotesLesPestanyes();
        btnConfig.classList.add('active');
        secConfig.classList.remove('hidden');
    });

    // =========================================================================
    // LOGOUT
    // =========================================================================
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // =========================================================================
    // RESTRICCIÓ: només l'Administrador Mestre veu Seguretat/Administradors i Manteniment Crític
    // =========================================================================
    const usuariActual = getCurrentUser();
    const esMestre = !!(usuariActual && usuariActual.role === 'admin' && usuariActual.isMaster);
    const blocNomesMestre = document.getElementById('bloc-nomes-mestre');
    if (blocNomesMestre && !esMestre) {
        blocNomesMestre.classList.add('hidden');
    }

    // =========================================================================
    // ESTAT GLOBAL: llistes en memòria per evitar fetch repetits
    // =========================================================================
    let llistaMetgesGlobals = [];
    let llistaPacientsGlobals = [];

    // =========================================================================
    // DASHBOARD — GRÀFIC D'ACTIVITAT SETMANAL
    // =========================================================================
    async function carregarGraficActivitatSetmanal() {
        const contenidor = document.getElementById('grafic-activitat-setmanal');
        if (!contenidor) return;
        try {
            const res = await fetch('/api/activity/weekly');
            if (!res.ok) throw new Error();
            const setmanes = await res.json();

            const maxValor = Math.max(1, ...setmanes.map(s => s.total));
            const ampleSVG = 700, altSVG = 220;
            const marges = { top: 15, bottom: 35, left: 10, right: 10 };
            const altUtil = altSVG - marges.top - marges.bottom;
            const ampleBarra = (ampleSVG - marges.left - marges.right) / setmanes.length;

            let barresSVG = '';
            setmanes.forEach((s, i) => {
                const altBarra = (s.total / maxValor) * altUtil;
                const x = marges.left + i * ampleBarra + ampleBarra * 0.15;
                const wBarra = ampleBarra * 0.7;
                const y = marges.top + (altUtil - altBarra);
                const colorBarra = s.total > 0 ? 'var(--primary-color)' : '#e2e8f0';

                barresSVG += `
                    <rect x="${x}" y="${y}" width="${wBarra}" height="${Math.max(altBarra, 2)}" rx="4" fill="${colorBarra}">
                        <title>${s.label}: ${s.total} accions</title>
                    </rect>
                    ${s.total > 0 ? `<text x="${x + wBarra / 2}" y="${y - 6}" font-size="11" font-weight="700" fill="#2d3748" text-anchor="middle">${s.total}</text>` : ''}
                    <text x="${x + wBarra / 2}" y="${altSVG - 12}" font-size="10" fill="#a0aec0" text-anchor="middle">${s.label}</text>
                `;
            });

            contenidor.innerHTML = `
                <svg viewBox="0 0 ${ampleSVG} ${altSVG}" style="width:100%;height:auto;max-height:240px;">
                    <line x1="${marges.left}" y1="${marges.top + altUtil}" x2="${ampleSVG - marges.right}" y2="${marges.top + altUtil}" stroke="#e2e8f0" stroke-width="1"/>
                    ${barresSVG}
                </svg>
            `;
        } catch (err) {
            console.error(err);
            contenidor.innerHTML = '<p style="color:#e53e3e;font-size:13px;text-align:center;">Error en carregar el gràfic d\'activitat.</p>';
        }
    }
    carregarGraficActivitatSetmanal();

    // =========================================================================
    // METGES — CREACIÓ
    // =========================================================================
    const capNormalMetges    = document.getElementById('capsalera-metges-normal');
    const capCreacioMetges   = document.getElementById('capsalera-metges-creacio');
    const formDesplegableMetge = document.getElementById('form-desplegable-metge');
    const selectGender       = document.getElementById('doc-gender');
    const blocGenderAltres   = document.getElementById('bloc-doc-gender-altres');
    const inputGenderAltres  = document.getElementById('doc-gender-altres-text');
    const formCreateDoctor   = document.getElementById('create-doctor-form');
    const vistaDinamicaMetges = document.getElementById('vista-dinamica-metges');

    //Carrega i pinta la taula de metges
    async function carregarMetgesRegistrats() {
        try {
            const response = await fetch('/api/doctors');
            if (!response.ok) throw new Error("Error en llegir metges");
            llistaMetgesGlobals = await response.json();

            if (llistaMetgesGlobals.length === 0) {
                vistaDinamicaMetges.innerHTML = `<p style="color:#718096;text-align:center;padding:10px;">No hi ha cap metge registrat encara.</p>`;
                return;
            }

            let html = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Nom</th><th>Especialitat</th><th>ID</th></tr>
                        </thead>
                        <tbody>
            `;
            llistaMetgesGlobals.forEach(doc => {
                html += `
                    <tr class="clicable-row" onclick="veureFitxaMetge('${doc.id}')">
                        <td style="font-weight:600;">${doc.name}</td>
                        <td><span style="background:#e2e8f0;padding:2px 8px;border-radius:4px;font-size:12px;">${doc.specialty || 'General'}</span></td>
                        <td style="font-family:monospace;font-weight:bold;">${doc.id}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>
                <p style="font-size:12px;color:#a0aec0;margin-top:8px;text-align:right;">
                    Fes clic sobre un metge per veure'n la fitxa i editar-lo.
                </p>`;
            vistaDinamicaMetges.innerHTML = html;

        } catch (err) {
            console.error(err);
            vistaDinamicaMetges.innerHTML = `<p style="color:#e53e3e;">Error en carregar el llistat de metges.</p>`;
        }
    }

    carregarMetgesRegistrats();

    // Obrir / tancar formulari de creació
    document.getElementById('btn-obrir-metge').addEventListener('click', function() {
        capNormalMetges.classList.add('hidden');
        capCreacioMetges.classList.remove('hidden');
        formDesplegableMetge.classList.remove('hidden');
        vistaDinamicaMetges.classList.add('hidden');
    });

    document.getElementById('btn-tancar-metge').addEventListener('click', function() {
        capNormalMetges.classList.remove('hidden');
        capCreacioMetges.classList.add('hidden');
        formDesplegableMetge.classList.add('hidden');
        vistaDinamicaMetges.classList.remove('hidden');
        formCreateDoctor.reset();
        blocGenderAltres.classList.add('hidden');
    });

    selectGender.addEventListener('change', function() {
        blocGenderAltres.classList.toggle('hidden', selectGender.value !== 'Altres');
    });

    //Enviar formulari de creació de metge
    formCreateDoctor.addEventListener('submit', async function(e) {
        e.preventDefault();

        let genereFinal = selectGender.value;
        if (genereFinal === 'Altres') {
            const valorText = inputGenderAltres.value.trim();
            genereFinal = valorText !== "" ? valorText : "Altres";
        }

        const dadesMetge = {
            name:      document.getElementById('doc-name').value.trim(),
            gender:    genereFinal,
            specialty: document.getElementById('doc-specialty').value,
            username:  document.getElementById('doc-username').value.trim(),
            password:  document.getElementById('doc-password').value,
            createdBy: getCurrentUser()?.name || 'Admin'
        };

        try {
            const response = await fetch('/api/doctors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadesMetge)
            });
            const resultat = await response.json();

            if (response.ok) {
                formCreateDoctor.reset();
                blocGenderAltres.classList.add('hidden');
                document.getElementById('btn-tancar-metge').click();
                carregarMetgesRegistrats();
            } else {
                alert("Error: " + (resultat.error || "No s'ha pogut registrar el metge."));
            }
        } catch (err) {
            console.error(err);
            alert("S'ha produït un error de xarxa.");
        }
    });

    // =========================================================================
    // METGES — FITXA I EDICIÓ
    // =========================================================================
    function veureFitxaMetge(id) {
        const metge = llistaMetgesGlobals.find(m => m.id === id);
        if (!metge) return;

        const capNormal = document.getElementById('capsalera-metges-normal');
        capNormal.querySelector('h3').textContent = `Fitxa: ${metge.name}`;
        document.getElementById('btn-obrir-metge').style.display = 'none';

        let nomsEspecialitats = llistaEspecialitats.map(e => e.name);
        if (metge.specialty && !nomsEspecialitats.includes(metge.specialty)) nomsEspecialitats.push(metge.specialty);
        if (nomsEspecialitats.length === 0) nomsEspecialitats = [metge.specialty || ''];
        const optionsEspecialitat = nomsEspecialitats
            .map(e => `<option value="${e}" ${metge.specialty === e ? 'selected' : ''}>${e}</option>`).join('');

        const genereMasculiSel  = metge.gender === 'Masculí' ? 'selected' : '';
        const genereFeméSel     = metge.gender === 'Femení'  ? 'selected' : '';
        const genereAltresSel   = !['Masculí','Femení'].includes(metge.gender) ? 'selected' : '';
        const genereAltresText  = !['Masculí','Femení'].includes(metge.gender) ? metge.gender : '';

        vistaDinamicaMetges.innerHTML = `
            <div class="apartat-fitxa">
                <p style="font-size:12px;color:#a0aec0;margin-bottom:12px;">ID: <strong>${metge.id}</strong></p>

                <h4>Dades generals</h4>
                <div class="form-group" style="margin-bottom:10px;">
                    <label>Nom complet:</label>
                    <input type="text" id="edit-doc-name" value="${metge.name}">
                </div>
                <div class="form-group" style="margin-bottom:10px;">
                    <label>Especialitat:</label>
                    <select id="edit-doc-specialty">${optionsEspecialitat}</select>
                </div>
                <div style="display:flex;gap:12px;margin-bottom:10px;">
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label>Gènere:</label>
                        <select id="edit-doc-gender" onchange="toggleAltresMetge()">
                            <option value="Masculí" ${genereMasculiSel}>Masculí</option>
                            <option value="Femení"  ${genereFeméSel}>Femení</option>
                            <option value="Altres"  ${genereAltresSel}>Altres</option>
                        </select>
                    </div>
                    <div class="form-group" id="bloc-edit-doc-gender-altres" style="flex:1;margin-bottom:0;${genereAltresText ? '' : 'display:none;'}">
                        <label>Especificació:</label>
                        <input type="text" id="edit-doc-gender-altres" value="${genereAltresText}">
                    </div>
                </div>
            </div>

            <div class="apartat-fitxa">
                <h4>Dades de contacte</h4>
                <div style="display:flex;gap:12px;">
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label>Telèfon:</label>
                        <input type="text" id="edit-doc-phone" value="${metge.phone || ''}">
                    </div>
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label>Email:</label>
                        <input type="email" id="edit-doc-email" value="${metge.email || ''}">
                    </div>
                </div>
            </div>

            <div class="apartat-fitxa">
                <h4>Credencials d'accés</h4>
                <div class="form-group" style="margin-bottom:10px;">
                    <label>Nom d'usuari:</label>
                    <input type="text" id="edit-doc-username" value="${metge.username}">
                </div>
                <div class="form-group" style="margin-bottom:0;">
                    <label>Contrasenya:</label>
                    <input type="password" id="edit-doc-password" value="${metge.password}">
                </div>
            </div>

            <div class="apartat-fitxa">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h4 style="margin:0;border:none;padding:0;">Activitat i Historial</h4>
                    <button type="button" class="btn-primary" style="width:auto;padding:5px 12px;font-size:12px;" onclick="toggleActivitatMetge('${metge.id}')">📊 Veure activitat</button>
                </div>
                <p style="font-size:12px;color:#a0aec0;margin-top:6px;">Creat: ${metge.createdAt ? new Date(metge.createdAt).toLocaleString('ca-ES') : 'Desconegut'} ${metge.createdBy ? `per <strong>${metge.createdBy}</strong>` : ''}</p>
                <div id="bloc-activitat-metge" class="hidden" style="margin-top:12px;"></div>
            </div>

            <div style="margin-top:15px;display:flex;gap:10px;">
                <button class="btn-success" onclick="guardarCanvisMetge('${metge.id}')">💾 Guardar canvis</button>
                <button class="btn-danger"  onclick="tancarFitxaMetge()">✕ Tancar fitxa</button>
            </div>
        `;
    }

    // Renderitza una llista d'activitat reutilitzant l'estil .timeline-item ja definit a style.css
    function renderActivityFeed(activity) {
        if (!activity || activity.length === 0) {
            return '<p style="color:#a0aec0;font-style:italic;font-size:13px;">Encara no hi ha cap activitat registrada.</p>';
        }
        return activity.map(item => {
            let icona = '📝';
            let classeExtra = '';
            if (item.type === 'creacio') icona = '🆕';
            if (item.type === 'cita') icona = '📅';
            if (item.type === 'cita-anulada') { icona = '❌'; classeExtra = 'cita-anulada'; }
            if (item.type === 'cita' && classeExtra === '') classeExtra = 'cita';

            const dataLlegible = isNaN(new Date(item.date)) ? item.date : new Date(item.date).toLocaleString('ca-ES');
            const firma = item.doctorName ? `<span style="color: var(--primary-color); font-size:12px; font-weight:600;">${item.doctorName}</span>` : '';

            return `
                <div class="timeline-item ${classeExtra}">
                    <div class="timeline-header">
                        <strong>${icona} ${item.type.toUpperCase()}</strong>
                        ${firma}
                        <span class="timeline-date">${dataLlegible}</span>
                    </div>
                    <div class="timeline-body" style="margin-top:5px;">${(item.text || '').replace(/\n/g, '<br>')}</div>
                </div>
            `;
        }).join('');
    }

    window.toggleActivitatMetge = async function(doctorId) {
        const bloc = document.getElementById('bloc-activitat-metge');
        if (!bloc) return;
        if (!bloc.classList.contains('hidden')) {
            bloc.classList.add('hidden');
            return;
        }
        bloc.classList.remove('hidden');
        bloc.innerHTML = '<p style="color:#a0aec0;font-size:13px;">Carregant activitat...</p>';
        try {
            const res = await fetch(`/api/activity/doctor/${doctorId}`);
            if (!res.ok) throw new Error();
            const dades = await res.json();
            bloc.innerHTML = `
                <div style="display:flex;gap:10px;margin-bottom:12px;">
                    <div style="flex:1;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;">
                        <div style="font-size:18px;font-weight:700;color:var(--primary-color);">${dades.stats.patients}</div>
                        <div style="font-size:11px;color:#718096;">Pacients</div>
                    </div>
                    <div style="flex:1;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;">
                        <div style="font-size:18px;font-weight:700;color:var(--primary-color);">${dades.stats.appointments}</div>
                        <div style="font-size:11px;color:#718096;">Cites</div>
                    </div>
                    <div style="flex:1;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;">
                        <div style="font-size:18px;font-weight:700;color:var(--primary-color);">${dades.stats.notes}</div>
                        <div style="font-size:11px;color:#718096;">Notes clíniques</div>
                    </div>
                </div>
                ${renderActivityFeed(dades.activity)}
            `;
        } catch (err) {
            console.error(err);
            bloc.innerHTML = '<p style="color:#e53e3e;font-size:13px;">Error en carregar l\'activitat.</p>';
        }
    };

    function tancarFitxaMetge() {
        document.getElementById('capsalera-metges-normal').querySelector('h3').textContent = 'Metges registrats';
        document.getElementById('btn-obrir-metge').style.display = '';
        carregarMetgesRegistrats();
    }

    async function guardarCanvisMetge(id) {
        const selectGen = document.getElementById('edit-doc-gender');
        let genereFinal = selectGen.value;
        if (genereFinal === 'Altres') {
            const altresText = document.getElementById('edit-doc-gender-altres')?.value.trim();
            genereFinal = altresText || 'Altres';
        }

        const dades = {
            name:      document.getElementById('edit-doc-name').value.trim(),
            specialty: document.getElementById('edit-doc-specialty').value,
            gender:    genereFinal,
            phone:     document.getElementById('edit-doc-phone').value.trim(),
            email:     document.getElementById('edit-doc-email').value.trim(),
            username:  document.getElementById('edit-doc-username').value.trim(),
            password:  document.getElementById('edit-doc-password').value
        };

        if (!dades.name || !dades.username || !dades.password) {
            alert("Nom, usuari i contrasenya són obligatoris.");
            return;
        }

        try {
            const response = await fetch(`/api/doctors/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dades)
            });
            const resultat = await response.json();

            if (response.ok) {
                tancarFitxaMetge();
            } else {
                alert("Error en guardar: " + (resultat.error || "Error desconegut."));
            }
        } catch (err) {
            console.error(err);
            alert("Error de xarxa en guardar el metge.");
        }
    }

    window.toggleAltresMetge = function() {
        const sel = document.getElementById('edit-doc-gender');
        const bloc = document.getElementById('bloc-edit-doc-gender-altres');
        if (bloc) bloc.style.display = sel.value === 'Altres' ? '' : 'none';
    };

    // =========================================================================
    // PACIENTS — CREACIÓ
    // =========================================================================
    const capNormalPacients    = document.getElementById('capsalera-pacients-normal');
    const capCreacioPacients   = document.getElementById('capsalera-pacients-creacio');
    const formDesplegablePacient = document.getElementById('form-desplegable-pacient');
    const selectGenderPat      = document.getElementById('pat-gender');
    const blocGenderAltresPat  = document.getElementById('bloc-pat-gender-altres');
    const inputGenderAltresPat = document.getElementById('pat-gender-altres-text');
    const formCreatePatient    = document.getElementById('create-patient-form');
    const vistaDinamicaPacients = document.getElementById('vista-dinamica-pacients');

    async function carregarPacientsRegistrats() {
        if (!vistaDinamicaPacients) return;
        try {
            const response = await fetch('/api/patients');
            if (!response.ok) throw new Error("Error en llegir pacients");
            llistaPacientsGlobals = await response.json();

            if (llistaPacientsGlobals.length === 0) {
                vistaDinamicaPacients.innerHTML = `<p style="color:#718096;text-align:center;padding:10px;">No hi ha cap pacient registrat encara.</p>`;
                return;
            }

            let html = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr><th>Nom del Pacient</th><th>Data Naix.</th><th>ID</th></tr>
                        </thead>
                        <tbody>
            `;
            llistaPacientsGlobals.forEach(pat => {
                const dataFormateada = pat.birthDate
                    ? new Date(pat.birthDate + 'T00:00:00').toLocaleDateString('ca-ES')
                    : '—';
                html += `
                    <tr class="clicable-row" onclick="veureFitxaPacient('${pat.id}')">
                        <td style="font-weight:600;">${pat.name}</td>
                        <td>${dataFormateada}</td>
                        <td style="font-family:monospace;font-weight:bold;">${pat.id}</td>
                    </tr>
                `;
            });
            html += `</tbody></table></div>
                <p style="font-size:12px;color:#a0aec0;margin-top:8px;text-align:right;">
                    Fes clic sobre un pacient per veure'n la fitxa i editar-lo.
                </p>`;
            vistaDinamicaPacients.innerHTML = html;

        } catch (err) {
            console.error(err);
            vistaDinamicaPacients.innerHTML = `<p style="color:#e53e3e;">Error en carregar el llistat de pacients.</p>`;
        }
    }

    carregarPacientsRegistrats();

    if (document.getElementById('btn-obrir-pacient')) {
        document.getElementById('btn-obrir-pacient').addEventListener('click', function() {
            capNormalPacients.classList.add('hidden');
            capCreacioPacients.classList.remove('hidden');
            formDesplegablePacient.classList.remove('hidden');
            vistaDinamicaPacients.classList.add('hidden');
        });
    }

    if (document.getElementById('btn-tancar-pacient')) {
        document.getElementById('btn-tancar-pacient').addEventListener('click', function() {
            capNormalPacients.classList.remove('hidden');
            capCreacioPacients.classList.add('hidden');
            formDesplegablePacient.classList.add('hidden');
            vistaDinamicaPacients.classList.remove('hidden');
            formCreatePatient.reset();
            blocGenderAltresPat.classList.add('hidden');
        });
    }

    if (selectGenderPat) {
        selectGenderPat.addEventListener('change', function() {
            blocGenderAltresPat.classList.toggle('hidden', selectGenderPat.value !== 'Altres');
        });
    }

    if (formCreatePatient) {
        formCreatePatient.addEventListener('submit', async function(e) {
            e.preventDefault();

            let genereFinal = selectGenderPat.value;
            if (genereFinal === 'Altres') {
                const valorText = inputGenderAltresPat.value.trim();
                genereFinal = valorText !== "" ? valorText : "Altres";
            }

            const dadesPacient = {
                name:      document.getElementById('pat-name').value.trim(),
                gender:    genereFinal,
                birthDate: document.getElementById('pat-birth').value,
                createdBy: getCurrentUser()?.name || 'Admin'
            };

            try {
                const response = await fetch('/api/patients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dadesPacient)
                });
                const resultat = await response.json();

                if (response.ok) {
                    formCreatePatient.reset();
                    blocGenderAltresPat.classList.add('hidden');
                    document.getElementById('btn-tancar-pacient').click();
                    carregarPacientsRegistrats();
                } else {
                    alert("Error: " + (resultat.error || "No s'ha pogut registrar el pacient."));
                }
            } catch (err) {
                console.error(err);
                alert("S'ha produït un error de xarxa.");
            }
        });
    }

    // =========================================================================
    // PACIENTS — FITXA I EDICIÓ
    // =========================================================================
    function veureFitxaPacient(id) {
        const pacient = llistaPacientsGlobals.find(p => p.id === id);
        if (!pacient) return;

        const capNormal = document.getElementById('capsalera-pacients-normal');
        capNormal.querySelector('h3').textContent = `Fitxa: ${pacient.name}`;
        document.getElementById('btn-obrir-pacient').style.display = 'none';

        const genereMasculiSel = pacient.gender === 'Masculí' ? 'selected' : '';
        const genereFeméSel    = pacient.gender === 'Femení'  ? 'selected' : '';
        const genereAltresSel  = !['Masculí','Femení'].includes(pacient.gender) ? 'selected' : '';
        const genereAltresText = !['Masculí','Femení'].includes(pacient.gender) ? pacient.gender : '';

        vistaDinamicaPacients.innerHTML = `
            <div class="apartat-fitxa">
                <p style="font-size:12px;color:#a0aec0;margin-bottom:12px;">ID: <strong>${pacient.id}</strong></p>

                <h4>Dades generals</h4>
                <div class="form-group" style="margin-bottom:10px;">
                    <label>Nom complet:</label>
                    <input type="text" id="edit-pat-name" value="${pacient.name}">
                </div>
                <div class="form-group" style="margin-bottom:10px;">
                    <label>Data de Naixement:</label>
                    <input type="date" id="edit-pat-birth" value="${pacient.birthDate || ''}">
                </div>
                <div style="display:flex;gap:12px;margin-bottom:10px;">
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label>Gènere:</label>
                        <select id="edit-pat-gender" onchange="toggleAltresPacient()">
                            <option value="Masculí" ${genereMasculiSel}>Masculí</option>
                            <option value="Femení"  ${genereFeméSel}>Femení</option>
                            <option value="Altres"  ${genereAltresSel}>Altres</option>
                        </select>
                    </div>
                    <div class="form-group" id="bloc-edit-pat-gender-altres" style="flex:1;margin-bottom:0;${genereAltresText ? '' : 'display:none;'}">
                        <label>Especificació:</label>
                        <input type="text" id="edit-pat-gender-altres" value="${genereAltresText}">
                    </div>
                </div>
            </div>

            <div class="apartat-fitxa">
                <h4>Dades de contacte</h4>
                <div style="display:flex;gap:12px;">
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label>Telèfon:</label>
                        <input type="text" id="edit-pat-phone" value="${pacient.phone || ''}">
                    </div>
                    <div class="form-group" style="flex:1;margin-bottom:0;">
                        <label>Email:</label>
                        <input type="email" id="edit-pat-email" value="${pacient.email || ''}">
                    </div>
                </div>
            </div>

            <div class="apartat-fitxa">
                <div style="display:flex;justify-content:space-between;align-items:center;">
                    <h4 style="margin:0;border:none;padding:0;">Activitat i Historial Clínic</h4>
                    <button type="button" class="btn-primary" style="width:auto;padding:5px 12px;font-size:12px;" onclick="toggleActivitatPacient('${pacient.id}')">📊 Veure activitat</button>
                </div>
                <p style="font-size:12px;color:#a0aec0;margin-top:6px;">Creat: ${pacient.createdAt ? new Date(pacient.createdAt).toLocaleString('ca-ES') : 'Desconegut'} ${pacient.createdBy ? `per <strong>${pacient.createdBy}</strong>` : ''}</p>
                <div id="bloc-activitat-pacient" class="hidden" style="margin-top:12px;"></div>
            </div>

            <div style="margin-top:15px;display:flex;gap:10px;">
                <button class="btn-success" onclick="guardarCanvisPacient('${pacient.id}')">💾 Guardar canvis</button>
                <button class="btn-danger"  onclick="tancarFitxaPacient()">✕ Tancar fitxa</button>
            </div>
        `;
    }

    window.toggleActivitatPacient = async function(patientId) {
        const bloc = document.getElementById('bloc-activitat-pacient');
        if (!bloc) return;
        if (!bloc.classList.contains('hidden')) {
            bloc.classList.add('hidden');
            return;
        }
        bloc.classList.remove('hidden');
        bloc.innerHTML = '<p style="color:#a0aec0;font-size:13px;">Carregant activitat...</p>';
        try {
            const res = await fetch(`/api/activity/patient/${patientId}`);
            if (!res.ok) throw new Error();
            const dades = await res.json();
            bloc.innerHTML = `
                <div style="display:flex;gap:10px;margin-bottom:12px;">
                    <div style="flex:1;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;">
                        <div style="font-size:18px;font-weight:700;color:var(--primary-color);">${dades.stats.appointments}</div>
                        <div style="font-size:11px;color:#718096;">Cites</div>
                    </div>
                    <div style="flex:1;background:#f7fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;text-align:center;">
                        <div style="font-size:18px;font-weight:700;color:var(--primary-color);">${dades.stats.notes}</div>
                        <div style="font-size:11px;color:#718096;">Notes clíniques</div>
                    </div>
                </div>
                ${renderActivityFeed(dades.activity)}
            `;
        } catch (err) {
            console.error(err);
            bloc.innerHTML = '<p style="color:#e53e3e;font-size:13px;">Error en carregar l\'activitat.</p>';
        }
    };

    function tancarFitxaPacient() {
        document.getElementById('capsalera-pacients-normal').querySelector('h3').textContent = 'Pacients registrats';
        document.getElementById('btn-obrir-pacient').style.display = '';
        document.getElementById('admin-patient-doctors-panel').classList.add('hidden');
        carregarPacientsRegistrats();
    }

    async function guardarCanvisPacient(id) {
        const selectGen = document.getElementById('edit-pat-gender');
        let genereFinal = selectGen.value;
        if (genereFinal === 'Altres') {
            const altresText = document.getElementById('edit-pat-gender-altres')?.value.trim();
            genereFinal = altresText || 'Altres';
        }

        const dades = {
            name:      document.getElementById('edit-pat-name').value.trim(),
            birthDate: document.getElementById('edit-pat-birth').value,
            gender:    genereFinal,
            phone:     document.getElementById('edit-pat-phone').value.trim(),
            email:     document.getElementById('edit-pat-email').value.trim()
        };

        if (!dades.name) {
            alert("El nom és obligatori.");
            return;
        }

        try {
            const response = await fetch(`/api/patients/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dades)
            });
            const resultat = await response.json();

            if (response.ok) {
                tancarFitxaPacient();
            } else {
                alert("Error en guardar: " + (resultat.error || "Error desconegut."));
            }
        } catch (err) {
            console.error(err);
            alert("Error de xarxa en guardar el pacient.");
        }
    }

    window.toggleAltresPacient = function() {
        const sel  = document.getElementById('edit-pat-gender');
        const bloc = document.getElementById('bloc-edit-pat-gender-altres');
        if (bloc) bloc.style.display = sel.value === 'Altres' ? '' : 'none';
    };

    // =========================================================================
    // EXPOSICIÓ GLOBAL DE FUNCIONS
    // =========================================================================
    window.veureFitxaMetge     = veureFitxaMetge;
    window.guardarCanvisMetge  = guardarCanvisMetge;
    window.tancarFitxaMetge    = tancarFitxaMetge;

    window.veureFitxaPacient   = veureFitxaPacient;
    window.guardarCanvisPacient = guardarCanvisPacient;
    window.tancarFitxaPacient  = tancarFitxaPacient;

    window.obrirFormulariCrearMetge = function() {
        document.getElementById('btn-obrir-metge').click();
    };
    window.obrirFormulariCrearPacientAdmin = function() {
        document.getElementById('btn-obrir-pacient').click();
    };

    // =========================================================================
    // SECCIÓ DE CONFIGURACIÓ
    // =========================================================================

    // --- Informació de la Clínica ---
    async function carregarConfigClinica() {
        try {
            const res = await fetch('/api/config');
            if (!res.ok) return;
            const config = await res.json();
            document.getElementById('cfg-clinic-name').value  = config.clinicName  || '';
            document.getElementById('cfg-clinic-phone').value = config.clinicPhone || '';
            document.getElementById('cfg-clinic-addr').value  = config.clinicAddr  || '';
            document.getElementById('cfg-clinic-email').value = config.clinicEmail || '';
        } catch (err) { console.error("Error carregant config:", err); }
    }

    const btnDesarClinica = document.getElementById('btn-desar-clinica');
    if (btnDesarClinica) {
        btnDesarClinica.addEventListener('click', async function() {
            const dades = {
                clinicName:  document.getElementById('cfg-clinic-name').value.trim(),
                clinicPhone: document.getElementById('cfg-clinic-phone').value.trim(),
                clinicAddr:  document.getElementById('cfg-clinic-addr').value.trim(),
                clinicEmail: document.getElementById('cfg-clinic-email').value.trim()
            };
            if (!dades.clinicName) { alert("El nom de la clínica és obligatori."); return; }
            try {
                const res = await fetch('/api/config', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dades)
                });
                if (res.ok) {
                    const msg = document.getElementById('cfg-clinica-msg');
                    msg.textContent = "✓ Canvis desats correctament.";
                    msg.style.color = 'var(--success-color)';
                    setTimeout(() => msg.textContent = '', 3000);
                } else {
                    alert("Error en desar la configuració.");
                }
            } catch (err) { alert("Error de xarxa."); }
        });
        carregarConfigClinica();
    }

    // --- Especialitats Mèdiques ---
    let llistaEspecialitats = [];

    async function carregarEspecialitats() {
        try {
            const res = await fetch('/api/specialties');
            if (!res.ok) return;
            llistaEspecialitats = await res.json();
            pintarEspecialitats();
        } catch (err) { console.error("Error carregant especialitats:", err); }
    }

    function pintarEspecialitats() {
        const contenidor = document.getElementById('llista-especialitats');
        if (contenidor) {
            if (llistaEspecialitats.length === 0) {
                contenidor.innerHTML = '<p style="color:#a0aec0;font-size:13px;text-align:center;padding:10px;">Cap especialitat afegida.</p>';
            } else {
                contenidor.innerHTML = llistaEspecialitats.map(esp => `
                    <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid #e2e8f0;">
                        <span style="font-size:14px;">🩺 ${esp.name}</span>
                        <button onclick="eliminarEspecialitat(${esp.id})" style="background:none;border:none;cursor:pointer;color:#e53e3e;font-size:18px;line-height:1;" title="Eliminar">×</button>
                    </div>
                `).join('');
            }
        }

        // Sincronitzem també el desplegable d'especialitats del formulari de creació de metge
        const selectCreacio = document.getElementById('doc-specialty');
        if (selectCreacio) {
            if (llistaEspecialitats.length === 0) {
                selectCreacio.innerHTML = '<option value="" disabled selected>No hi ha especialitats creades</option>';
            } else {
                selectCreacio.innerHTML = llistaEspecialitats.map(esp => `<option value="${esp.name}">${esp.name}</option>`).join('');
            }
        }
    }

    const btnAfegirEsp = document.getElementById('btn-afegir-especialitat');
    if (btnAfegirEsp) {
        btnAfegirEsp.addEventListener('click', async function() {
            const input = document.getElementById('nova-especialitat');
            const nom = input.value.trim();
            if (!nom) return;
            try {
                const res = await fetch('/api/specialties', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nom })
                });
                if (res.ok) {
                    input.value = '';
                    carregarEspecialitats();
                } else {
                    const err = await res.json();
                    alert(err.error || "Error en afegir l'especialitat.");
                }
            } catch (e) { alert("Error de xarxa."); }
        });

        document.getElementById('nova-especialitat').addEventListener('keydown', function(e) {
            if (e.key === 'Enter') { e.preventDefault(); btnAfegirEsp.click(); }
        });
        carregarEspecialitats();
    }

    window.eliminarEspecialitat = async function(id) {
        if (!confirm("Eliminar aquesta especialitat?")) return;
        try {
            const res = await fetch(`/api/specialties/${id}`, { method: 'DELETE' });
            if (res.ok) carregarEspecialitats();
            else alert("Error en eliminar l'especialitat.");
        } catch (e) { alert("Error de xarxa."); }
    };

    // --- Seguretat i Administradors ---
    let llistaAdmins = [];
    let adminEnEdicioId = null;

    async function carregarAdmins() {
        try {
            const res = await fetch('/api/admins');
            if (!res.ok) return;
            llistaAdmins = await res.json();
            pintarAdmins();
        } catch (err) { console.error("Error carregant admins:", err); }
    }

    function pintarAdmins() {
        const contenidor = document.getElementById('llista-admins');
        if (!contenidor) return;

        let html = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;">
                <span>👑 <strong>admin</strong> <span style="color:#a0aec0;font-size:12px;">(Mestre)</span></span>
                <span style="font-size:11px;background:#e2e8f0;padding:2px 8px;border-radius:4px;font-weight:600;">SISTEMA</span>
            </div>
        `;

        llistaAdmins.forEach(adm => {
            if (adminEnEdicioId === adm.id) {
                html += `
                    <div style="background:#fffaf0;border:1px solid #fbd38d;border-radius:6px;padding:10px 12px;margin-bottom:8px;">
                        <div style="display:flex;gap:8px;margin-bottom:8px;">
                            <input type="text" id="edit-adm-name-${adm.id}" value="${adm.name || ''}" placeholder="Nom complet" style="flex:1;padding:5px 8px;font-size:13px;">
                            <input type="text" id="edit-adm-username-${adm.id}" value="${adm.username}" placeholder="Usuari" style="flex:1;padding:5px 8px;font-size:13px;">
                            <input type="text" id="edit-adm-password-${adm.id}" value="${adm.password}" placeholder="Contrasenya" style="flex:1;padding:5px 8px;font-size:13px;">
                        </div>
                        <div style="display:flex;gap:8px;">
                            <button class="btn-success" style="padding:5px 12px;font-size:12px;" onclick="guardarEdicioAdmin(${adm.id})">💾 Guardar</button>
                            <button class="btn-danger" style="padding:5px 12px;font-size:12px;" onclick="cancelarEdicioAdmin()">Cancel·lar</button>
                        </div>
                    </div>
                `;
            } else {
                html += `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;">
                        <span>🛡️ <strong>${adm.username}</strong> <span style="color:#a0aec0;font-size:12px;">${adm.name ? '— ' + adm.name : ''}</span></span>
                        <span>
                            <button onclick="editarAdmin(${adm.id})" style="background:none;border:none;cursor:pointer;color:var(--primary-color);font-size:15px;margin-right:6px;" title="Editar">✏️</button>
                            <button onclick="eliminarAdmin(${adm.id})" style="background:none;border:none;cursor:pointer;color:#e53e3e;font-size:18px;line-height:1;" title="Eliminar">×</button>
                        </span>
                    </div>
                `;
            }
        });

        contenidor.innerHTML = html;
    }

    window.editarAdmin = function(id) {
        adminEnEdicioId = id;
        pintarAdmins();
    };

    window.cancelarEdicioAdmin = function() {
        adminEnEdicioId = null;
        pintarAdmins();
    };

    window.guardarEdicioAdmin = async function(id) {
        const name     = document.getElementById(`edit-adm-name-${id}`).value.trim();
        const username = document.getElementById(`edit-adm-username-${id}`).value.trim();
        const password = document.getElementById(`edit-adm-password-${id}`).value;

        if (!username || !password) { alert("Usuari i contrasenya són obligatoris."); return; }

        try {
            const res = await fetch(`/api/admins/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, username, password })
            });
            const resultat = await res.json();
            if (res.ok) {
                adminEnEdicioId = null;
                carregarAdmins();
            } else {
                alert("Error: " + (resultat.error || "No s'ha pogut actualitzar l'administrador."));
            }
        } catch (err) { alert("Error de xarxa."); }
    };

    const formNouAdmin = document.getElementById('form-nou-admin');
    if (formNouAdmin) {
        formNouAdmin.addEventListener('submit', async function(e) {
            e.preventDefault();
            const dades = {
                name:     document.getElementById('adm-name').value.trim(),
                username: document.getElementById('adm-username').value.trim(),
                password: document.getElementById('adm-password').value
            };
            if (!dades.username || !dades.password) { alert("Usuari i contrasenya són obligatoris."); return; }
            try {
                const res = await fetch('/api/admins', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(dades)
                });
                const resultat = await res.json();
                if (res.ok) {
                    formNouAdmin.reset();
                    document.getElementById('bloc-form-nou-admin').classList.add('hidden');
                    document.getElementById('btn-mostrar-form-admin').style.display = '';
                    carregarAdmins();
                } else {
                    alert("Error: " + (resultat.error || "No s'ha pogut crear l'administrador."));
                }
            } catch (err) { alert("Error de xarxa."); }
        });
        carregarAdmins();
    }

    const btnMostrarFormAdmin = document.getElementById('btn-mostrar-form-admin');
    if (btnMostrarFormAdmin) {
        btnMostrarFormAdmin.addEventListener('click', function() {
            document.getElementById('bloc-form-nou-admin').classList.remove('hidden');
            btnMostrarFormAdmin.style.display = 'none';
        });
    }
    const btnCancelAdmin = document.getElementById('btn-cancel-admin');
    if (btnCancelAdmin) {
        btnCancelAdmin.addEventListener('click', function() {
            document.getElementById('bloc-form-nou-admin').classList.add('hidden');
            document.getElementById('btn-mostrar-form-admin').style.display = '';
            document.getElementById('form-nou-admin').reset();
        });
    }

    window.eliminarAdmin = async function(id) {
        if (!confirm("Eliminar aquest administrador?")) return;
        try {
            const res = await fetch(`/api/admins/${id}`, { method: 'DELETE' });
            if (res.ok) carregarAdmins();
            else alert("Error en eliminar l'administrador.");
        } catch (e) { alert("Error de xarxa."); }
    };

    // --- Zona de Manteniment Crític ---
    const btnEliminarMetge = document.getElementById('btn-eliminar-metge-def');
    if (btnEliminarMetge) {
        btnEliminarMetge.addEventListener('click', async function() {
            const id  = document.getElementById('crit-doc-id').value.trim();
            const nom = document.getElementById('crit-doc-nom').value.trim();
            if (!id || !nom) { alert("Has d'introduir l'ID i el nom complet del metge."); return; }
            if (!confirm(`⚠️ Estàs a punt d'eliminar DEFINITIVAMENT el metge "${nom}" (${id}).\n\nAquesta acció és IRREVERSIBLE. Continuar?`)) return;
            try {
                const res = await fetch(`/api/doctors/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    alert("Metge eliminat correctament.");
                    document.getElementById('crit-doc-id').value = '';
                    document.getElementById('crit-doc-nom').value = '';
                    carregarMetgesRegistrats();
                } else {
                    const err = await res.json();
                    alert("Error: " + (err.error || "No s'ha pogut eliminar el metge."));
                }
            } catch (e) { alert("Error de xarxa."); }
        });
    }

    const btnEliminarPacient = document.getElementById('btn-eliminar-pacient-def');
    if (btnEliminarPacient) {
        btnEliminarPacient.addEventListener('click', async function() {
            const id  = document.getElementById('crit-pat-id').value.trim();
            const nom = document.getElementById('crit-pat-nom').value.trim();
            if (!id || !nom) { alert("Has d'introduir l'ID i el nom complet del pacient."); return; }
            if (!confirm(`⚠️ Estàs a punt d'eliminar DEFINITIVAMENT el pacient "${nom}" (${id}).\n\nAquesta acció és IRREVERSIBLE. Continuar?`)) return;
            try {
                const res = await fetch(`/api/patients/${id}`, { method: 'DELETE' });
                if (res.ok) {
                    alert("Pacient eliminat correctament.");
                    document.getElementById('crit-pat-id').value = '';
                    document.getElementById('crit-pat-nom').value = '';
                    carregarPacientsRegistrats();
                } else {
                    const err = await res.json();
                    alert("Error: " + (err.error || "No s'ha pogut eliminar el pacient."));
                }
            } catch (e) { alert("Error de xarxa."); }
        });
    }

    const btnBaixarBackup = document.getElementById('btn-baixar-backup');
    if (btnBaixarBackup) {
        btnBaixarBackup.addEventListener('click', function() {
            window.location.href = '/api/backup';
        });
    }

    const btnResetTotal = document.getElementById('btn-reset-total');
    if (btnResetTotal) {
        btnResetTotal.addEventListener('click', async function() {
            const primera = confirm("⚠️ ATENCIÓ: Estàs a punt d'eliminar TOTA la base de dades (hospital.db).\n\nAixò esborrarà TOTS els metges, pacients i configuració de forma PERMANENT.\n\n¿Estàs segur?");
            if (!primera) return;
            const segona = confirm("🔴 CONFIRMACIÓ FINAL\n\nEscriu 'ELIMINAR' al botó d'acceptar per confirmar.\n\nAquesta acció NO es pot desfer. ¿Continuar igualment?");
            if (!segona) return;
            try {
                const res = await fetch('/api/reset', { method: 'DELETE' });
                if (res.ok) {
                    alert("Base de dades eliminada. El servidor s'ha de reiniciar manualment.");
                    localStorage.removeItem('currentUser');
                    window.location.href = 'index.html';
                } else {
                    alert("Error en el reset. Comprova el servidor.");
                }
            } catch (e) { alert("Error de xarxa."); }
        });
    }

});