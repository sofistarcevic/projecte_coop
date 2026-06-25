document.addEventListener("DOMContentLoaded", function() {
    
    // 1. CONTROL DE CANVI DE PESTANYES
    const btnDashboard = document.getElementById('btn-dashboard');
    const btnMetgesPacients = document.getElementById('btn-metges-pacients');
    const btnConfig = document.getElementById('btn-configuració');

    const secDashboard = document.getElementById('seccio-dashboard');
    const secMetgesPacients = document.getElementById('seccio-metges-pacients');
    const secConfig = document.getElementById('seccio-configuració');

    function desactivarTotesLesPestanyes() {
        // Traiem la classe 'active' de tots els botons
        btnDashboard.classList.remove('active');
        btnMetgesPacients.classList.remove('active');
        btnConfig.classList.remove('active');

        // Amaguem totes les seccions afegint la classe 'hidden'
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

    // 2. CONTROL DE TANCAMENT DE SESSIÓ (LOGOUT)
    document.getElementById('logout-btn').addEventListener('click', function() {
        localStorage.removeItem('currentUser');
        window.location.href = 'index.html';
    });

    // =========================================================================
    // ACCIONS I REFRESH PER A LA CREACIÓ DE METGES
    // =========================================================================
    const capNormalMetges = document.getElementById('capsalera-metges-normal');
    const capCreacioMetges = document.getElementById('capsalera-metges-creacio');
    const formDesplegableMetge = document.getElementById('form-desplegable-metge');
    const selectGender = document.getElementById('doc-gender');
    const blocGenderAltres = document.getElementById('bloc-doc-gender-altres');
    const inputGenderAltres = document.getElementById('doc-gender-altres-text');
    const formCreateDoctor = document.getElementById('create-doctor-form');
    const vistaDinamicaMetges = document.getElementById('vista-dinamica-metges');

    // Funció per carregar i pintar els metges de la Base de Dades
    async function carregarMetgesRegistrats() {
        try {
            const response = await fetch('/api/doctors');
            if (!response.ok) throw new Error("No s'han pogut rebre els metges.");
            const doctors = await response.json();

            if (doctors.length === 0) {
                vistaDinamicaMetges.innerHTML = `<p style="color: #718096; text-align: center; padding: 10px;">No hi ha cap metge registrat encara.</p>`;
                return;
            }

            // Canviat: Ara la tercera columna mostra "ID" en comptes de "Usuari"
            let htmlTaula = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nom</th>
                                <th>Especialitat</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            doctors.forEach(doc => {
                htmlTaula += `
                    <tr>
                        <td style="font-weight: 600;">${doc.name}</td>
                        <td><span style="background: #e2e8f0; padding: 2px 8px; border-radius: 4px; font-size: 12px;">${doc.specialty || 'General'}</span></td>
                        <td style="font-family: monospace; font-weight: bold;">${doc.id}</td>
                    </tr>
                `;
            });

            htmlTaula += `</tbody></table></div>`;
            vistaDinamicaMetges.innerHTML = htmlTaula;

        } catch (err) {
            console.error(err);
            vistaDinamicaMetges.innerHTML = `<p style="color: #e53e3e;">Error en carregar el llistat de metges.</p>`;
        }
    }

    // Carreguem els metges inicialment
    carregarMetgesRegistrats();

    // Acció Obrir Formulari
    document.getElementById('btn-obrir-metge').addEventListener('click', function() {
        capNormalMetges.classList.add('hidden');
        capCreacioMetges.classList.remove('hidden');
        formDesplegableMetge.classList.remove('hidden');
        vistaDinamicaMetges.classList.add('hidden'); // <-- Amaguem la taula
    });

    // Acció Tancar Formulari
    document.getElementById('btn-tancar-metge').addEventListener('click', function() {
        capNormalMetges.classList.remove('hidden');
        capCreacioMetges.classList.add('hidden');
        formDesplegableMetge.classList.add('hidden');
        vistaDinamicaMetges.classList.remove('hidden'); // <-- Mostrem la taula de nou
        formCreateDoctor.reset();
        blocGenderAltres.classList.add('hidden');
    });

    // Control dinàmic del desplegable de Gènere
    selectGender.addEventListener('change', function() {
        if (selectGender.value === 'Altres') {
            blocGenderAltres.classList.remove('hidden');
        } else {
            blocGenderAltres.classList.add('hidden');
        }
    });

    // Enviar el formulari de creació al servidor
    formCreateDoctor.addEventListener('submit', async function(e) {
        e.preventDefault();

        // Determinem el valor final del gènere (si està buit l'input alternatiu, usem "Altres")
        let gènereFinal = selectGender.value;
        if (gènereFinal === 'Altres') {
            const valorText = inputGenderAltres.value.trim();
            gènereFinal = valorText !== "" ? valorText : "Altres";
        }

        const dadesMetge = {
            name: document.getElementById('doc-name').value.trim(),
            gender: gènereFinal,
            specialty: document.getElementById('doc-specialty').value,
            username: document.getElementById('doc-username').value.trim(),
            password: document.getElementById('doc-password').value
        };

        try {
            const response = await fetch('/api/doctors', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dadesMetge)
            });

            const resultat = await response.json();

            if (response.ok) {
                //alert("Metge creat amb èxit!");
                formCreateDoctor.reset();
                blocGenderAltres.classList.add('hidden');
                
                // Cerquem el mode edició / tancat i reactivem la taula
                document.getElementById('btn-tancar-metge').click();
                
                // Actualitzem les dades actuals de la taula
                carregarMetgesRegistrats();
            } else {
                alert("Error: " + (resultat.error || "No s'ha pogut registrar el metge."));
            }

        } catch (err) {
            console.error("Error enviant el metge:", err);
            alert("S'ha produït un error de xarxa en connectar amb el servidor.");
        }
    });


    // =========================================================================
    // ACCIONS I REFRESH PER A LA CREACIÓ DE PACIENTS
    // =========================================================================
    const capNormalPacients = document.getElementById('capsalera-pacients-normal');
    const capCreacioPacients = document.getElementById('capsalera-pacients-creacio');
    const formDesplegablePacient = document.getElementById('form-desplegable-pacient');
    const selectGenderPat = document.getElementById('pat-gender');
    const blocGenderAltresPat = document.getElementById('bloc-pat-gender-altres');
    const inputGenderAltresPat = document.getElementById('pat-gender-altres-text');
    const formCreatePatient = document.getElementById('create-patient-form');
    const vistaDinamicaPacients = document.getElementById('vista-dinamica-pacients');

    // Funció per carregar i pintar la taula de pacients interns
    async function carregarPacientsRegistrats() {
        if (!vistaDinamicaPacients) return; // Protecció per si l'element encara no existeix
        
        try {
            const response = await fetch('/api/patients');
            if (!response.ok) throw new Error("No s'han pogut rebre els pacients.");
            const patients = await response.json();

            if (patients.length === 0) {
                vistaDinamicaPacients.innerHTML = `<p style="color: #718096; text-align: center; padding: 10px;">No hi ha cap pacient registrat encara.</p>`;
                return;
            }

            let htmlTaula = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Nom del Pacient</th>
                                <th>ID</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            patients.forEach(pat => {
                htmlTaula += `
                    <tr>
                        <td style="font-weight: 600;">${pat.name}</td>
                        <td style="font-family: monospace; font-weight: bold;">${pat.id}</td>
                    </tr>
                `;
            });

            htmlTaula += `</tbody></table></div>`;
            vistaDinamicaPacients.innerHTML = htmlTaula;

        } catch (err) {
            console.error(err);
            vistaDinamicaPacients.innerHTML = `<p style="color: #e53e3e;">Error en carregar el llistat de pacients.</p>`;
        }

        
    }

    // Executem la càrrega inicial de pacients
    carregarPacientsRegistrats();

    // Acció Obrir Formulari Pacient (Amaga la taula actual)
    if (document.getElementById('btn-obrir-pacient')) {
        document.getElementById('btn-obrir-pacient').addEventListener('click', function() {
            capNormalPacients.classList.add('hidden');
            capCreacioPacients.classList.remove('hidden');
            formDesplegablePacient.classList.remove('hidden');
            vistaDinamicaPacients.classList.add('hidden');
        });
    }

    // Acció Tancar Formulari Pacient (Torna a mostrar la taula)
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

    // Control dinàmic de "Altres" en el desplegable de gènere
    if (selectGenderPat) {
        selectGenderPat.addEventListener('change', function() {
            if (selectGenderPat.value === 'Altres') {
                blocGenderAltresPat.classList.remove('hidden');
            } else {
                blocGenderAltresPat.classList.add('hidden');
            }
        });
    }

    // Enviar el formulari de pacient al servidor (Ruta simplificada interna)
    if (formCreatePatient) {
        formCreatePatient.addEventListener('submit', async function(e) {
            e.preventDefault();

            let gènereFinal = selectGenderPat.value;
            if (gènereFinal === 'Altres') {
                const valorText = inputGenderAltresPat.value.trim();
                gènereFinal = valorText !== "" ? valorText : "Altres";
            }

            const dadesPacient = {
                name: document.getElementById('pat-name').value.trim(),
                gender: gènereFinal,
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
                    
                    // Tanquem el mode creació i tornem a activar la taula netament
                    document.getElementById('btn-tancar-pacient').click();
                    
                    // Refresquem les dades de la taula de pacients
                    carregarPacientsRegistrats();
                } else {
                    alert("Error: " + (resultat.error || "No s'ha pogut registrar el pacient."));
                }

            } catch (err) {
                console.error("Error enviant el pacient:", err);
                alert("S'ha produït un error de xarxa en connectar amb el servidor.");
            }
        });
    }

    function mostrarFitxaMetge(id) {
        // 1. Buscar l'objecte metge a la teva llista/estat global (ex: array 'metges')
        const metge = llistaMetgesGlobals.find(m => m.id === id); 
        
        // 2. Amagar botó de crear i canviar el títol de la capçalera
        document.getElementById('btn-obrir-metge').style.display = 'none';
        let prefix = metge.gender === 'Masculí' ? 'Dr.' : (metge.gender === 'Femení' ? 'Dra.' : 'Drx.');
        document.getElementById('titol-seccio-metges').innerText = `Fitxa de: ${prefix} ${metge.name}`;

        // 3. Injectar els 3 apartats editables (menys l'ID que queda fix al costat)
        const contenidor = document.getElementById('vista-dinamica-metges');
        contenidor.innerHTML = `
            <div class="fitxa-detall">
                <p><strong>ID Metge:</strong> ${metge.id}</p>
                
                <h4>1. Dades generals</h4>
                <label>Nom complet:</label> <input type="text" id="edit-doc-name" value="${metge.name}">
                <label>Especialitat:</label> <input type="text" id="edit-doc-specialty" value="${metge.specialty || ''}">
                <label>Gènere:</label>
                <select id="edit-doc-gender">
                    <option value="Masculí" ${metge.gender === 'Masculí' ? 'selected' : ''}>Masculí</option>
                    <option value="Femení" ${metge.gender === 'Femení' ? 'selected' : ''}>Femení</option>
                    <option value="Altres" ${!['Masculí','Femení'].includes(metge.gender) ? 'selected' : ''}>Altres</option>
                </select>

                <h4>2. Dades de contacte</h4>
                <label>Telèfon:</label> <input type="text" id="edit-doc-phone" value="${metge.phone || ''}">
                <label>Email:</label> <input type="email" id="edit-doc-email" value="${metge.email || ''}">

                <h4>3. Credencials d'accés</h4>
                <label>Usuari:</label> <input type="text" id="edit-doc-username" value="${metge.username}">
                <label>Contrasenya:</label> <input type="password" id="edit-doc-password" value="${metge.password}">

                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="btn-success" onclick="guardarCanvisMetge('${metge.id}')">Guardar</button>
                    <button class="btn-danger" onclick="tancarFitxaMetge()">Tancar</button>
                </div>
            </div>
        `;
    }

    function tancarFitxaMetge() {
        document.getElementById('titol-seccio-metges').innerText = "Metges registrats";
        document.getElementById('btn-obrir-metge').style.display = 'block';
        carregarMetgesRegistrats(); // Crida la teva funció actual de llistat
    }

    function mostrarFitxaPacient(id) {
        const pacient = llistaPacientsGlobals.find(p => p.id === id);
        
        document.getElementById('btn-obrir-pacient').style.display = 'none';
        let prefix = pacient.gender === 'Masculí' ? 'Dr.' : (pacient.gender === 'Femení' ? 'Dra.' : 'Drx.');
        document.getElementById('titol-seccio-pacients').innerText = `Fitxa de: ${prefix} ${pacient.name}`;

        const contenidor = document.getElementById('vista-dinamica-pacients');
        contenidor.innerHTML = `
            <div class="fitxa-detall">
                <p><strong>ID Pacient:</strong> ${pacient.id}</p>
                
                <h4>1. Dades generals</h4>
                <label>Nom complet:</label> <input type="text" id="edit-pat-name" value="${pacient.name}">
                <label>Data Naixement:</label> <input type="date" id="edit-pat-birth" value="${pacient.birthDate}">
                <label>Gènere:</label>
                <select id="edit-pat-gender">
                    <option value="Masculí" ${pacient.gender === 'Masculí' ? 'selected' : ''}>Masculí</option>
                    <option value="Femení" ${pacient.gender === 'Femení' ? 'selected' : ''}>Femení</option>
                    <option value="Altres" ${!['Masculí','Femení'].includes(pacient.gender) ? 'selected' : ''}>Altres</option>
                </select>

                <h4>2. Dades de contacte</h4>
                <label>Telèfon:</label> <input type="text" id="edit-pat-phone" value="${pacient.phone || ''}">
                <label>Email:</label> <input type="email" id="edit-pat-email" value="${pacient.email || ''}">

                <div style="margin-top:15px; display:flex; gap:10px;">
                    <button class="btn-success" onclick="guardarCanvisPacient('${pacient.id}')">Guardar</button>
                    <button class="btn-danger" onclick="tancarFitxaPacient()">Tancar</button>
                </div>
            </div>
        `;
    }

    function tancarFitxaPacient() {
        document.getElementById('titol-seccio-pacients').innerText = "Pacients registrats";
        document.getElementById('btn-obrir-pacient').style.display = 'block';
        carregarPacientsRegistrats(); // Crida la teva funció actual de llistat
    }

    // =========================================================================
    // EXPOSICIÓ GLOBAL DE FUNCIONS (Perquè funcionin els 'onclick' de l'HTML)
    // =========================================================================
    
    // Funcions de Pacients
    window.veureFitxaPacient = veureFitxaPacient;
    window.guardarCanvisPacient = guardarCanvisPacient;
    window.tancarFitxaPacient = tancarFitxaPacient;

    // Funcions de Metges
    window.veureFitxaMetge = veureFitxaMetge;
    window.guardarCanvisMetge = guardarCanvisMetge;
    window.tancarFitxaMetge = tancarFitxaMetge;

});