document.addEventListener("DOMContentLoaded", async function() {
    const titolClinic = document.getElementById('title-clinic');
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('login-error');

    // PAS 1: Connexió immediata per rebre el nom del centre des de SQLite
    try {
        const response = await fetch('/api/config');
        if (response.ok) {
            const config = await response.json();
            if (config && config.clinicName) {
                titolClinic.textContent = config.clinicName;
                document.title = `${config.clinicName} - Login`;
            }
        }
    } catch (err) {
        console.warn("No s'ha pogut connectar amb l'API inicial. S'usa nom genèric.", err);
        titolClinic.textContent = "Hospital Global";
    }

    // PAS 2: Gestió de la validació d'usuaris
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        errorMsg.style.display = 'none';

        const usernameInput = document.getElementById('username').value.trim();
        const passwordInput = document.getElementById('password').value;

        // Regla d'Or: Administrador Mestre definit en codi dur per seguretat d'accés
        if (usernameInput === 'admin' && passwordInput === 'admin') {
            const adminUser = { username: 'admin', role: 'admin', name: 'Administrador Mestre' };
            localStorage.setItem('currentUser', JSON.stringify(adminUser));
            window.location.href = 'admin.html';
            return;
        }

        // Si no és l'administrador, connectem amb la base de dades SQLite per comprovar metges
        try {
            const response = await fetch('/api/doctors');
            if (!response.ok) throw new Error("Error en llegir metges");
            
            const doctors = await response.json();
            const metgeTrobat = doctors.find(doc => doc.username === usernameInput && doc.password === passwordInput);

            if (metgeTrobat) {
                const doctorUser = { 
                    id: metgeTrobat.id,
                    username: metgeTrobat.username, 
                    role: 'doctor', 
                    name: metgeTrobat.name,
                    specialty: metgeTrobat.specialty
                };
                localStorage.setItem('currentUser', JSON.stringify(doctorUser));
                window.location.href = 'metge_pacients.html';
            } else {
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            console.error("Error durant la petició d'autenticació:", err);
            alert("Error crític de comunicació amb el servidor de dades.");
        }
    });
});