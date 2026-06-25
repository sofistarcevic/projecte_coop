document.addEventListener("DOMContentLoaded", function() {
    
    // =========================================================================
    // 1. CONTROL DE CANVI DE PESTANYES
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
    // 2. LOGOUT
    // =========================================================================
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // =========================================================================
    // ESTAT GLOBAL: llistes en memòria per evitar fetch repetits
    // =========================================================================
    let llistaMetgesGlobals = [];
    let llistaPacientsGlobals = [];

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

    // Carrega i pinta la taula de metges
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

    // Enviar formulari de creació de metge
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
            password:  document.getElementById('doc-password').value
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

        // Canviem la capçalera: amaguem el botó "Crear" i posem el títol de fitxa
        const capNormal = document.getElementById('capsalera-metges-normal');
        capNormal.querySelector('h3').textContent = `Fitxa: ${metge.name}`;
        document.getElementById('btn-obrir-metge').style.display = 'none';

        const optionsEspecialitat = [
            'Medicina General','Pediatria','Cardiologia','Traumatologia','Dermatologia'
        ].map(e => `<option value="${e}" ${metge.specialty === e ? 'selected' : ''}>${e}</option>`).join('');

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

            <div style="margin-top:15px;display:flex;gap:10px;">
                <button class="btn-success" onclick="guardarCanvisMetge('${metge.id}')">💾 Guardar canvis</button>
                <button class="btn-danger"  onclick="tancarFitxaMetge()">✕ Tancar fitxa</button>
            </div>
        `;
    }

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

    // Funció global per al select de gènere dins la fitxa
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
                birthDate: document.getElementById('pat-birth').value
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

            <div style="margin-top:15px;display:flex;gap:10px;">
                <button class="btn-success" onclick="guardarCanvisPacient('${pacient.id}')">💾 Guardar canvis</button>
                <button class="btn-danger"  onclick="tancarFitxaPacient()">✕ Tancar fitxa</button>
            </div>
        `;
    }

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

    // Funció global per al select de gènere dins la fitxa de pacient
    window.toggleAltresPacient = function() {
        const sel  = document.getElementById('edit-pat-gender');
        const bloc = document.getElementById('bloc-edit-pat-gender-altres');
        if (bloc) bloc.style.display = sel.value === 'Altres' ? '' : 'none';
    };

    // =========================================================================
    // EXPOSICIÓ GLOBAL DE FUNCIONS (necessari perquè funcionin els onclick inline)
    // =========================================================================
    window.veureFitxaMetge     = veureFitxaMetge;
    window.guardarCanvisMetge  = guardarCanvisMetge;
    window.tancarFitxaMetge    = tancarFitxaMetge;

    window.veureFitxaPacient   = veureFitxaPacient;
    window.guardarCanvisPacient = guardarCanvisPacient;
    window.tancarFitxaPacient  = tancarFitxaPacient;

    // Funció d'obertura de formulari exposada per l'HTML (onclick inline a admin.html)
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
        if (!contenidor) return;
        if (llistaEspecialitats.length === 0) {
            contenidor.innerHTML = '<p style="color:#a0aec0;font-size:13px;text-align:center;padding:10px;">Cap especialitat afegida.</p>';
            return;
        }
        contenidor.innerHTML = llistaEspecialitats.map(esp => `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 10px;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:14px;">🩺 ${esp.name}</span>
                <button onclick="eliminarEspecialitat(${esp.id})" style="background:none;border:none;cursor:pointer;color:#e53e3e;font-size:18px;line-height:1;" title="Eliminar">×</button>
            </div>
        `).join('');
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
        // Permet prémer Enter per afegir
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

        // Sempre mostrem el compte mestre fix
        let html = `
            <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;">
                <span>👑 <strong>admin</strong> <span style="color:#a0aec0;font-size:12px;">(Mestre)</span></span>
                <span style="font-size:11px;background:#e2e8f0;padding:2px 8px;border-radius:4px;font-weight:600;">SISTEMA</span>
            </div>
        `;

        llistaAdmins.forEach(adm => {
            html += `
                <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;margin-bottom:8px;">
                    <span>🛡️ <strong>${adm.username}</strong> <span style="color:#a0aec0;font-size:12px;">${adm.name ? '— ' + adm.name : ''}</span></span>
                    <button onclick="eliminarAdmin(${adm.id})" style="background:none;border:none;cursor:pointer;color:#e53e3e;font-size:18px;line-height:1;" title="Eliminar">×</button>
                </div>
            `;
        });

        contenidor.innerHTML = html;
    }

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