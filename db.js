let getCurrentUser = () => JSON.parse(localStorage.getItem('currentUser'));

function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = "index.html";
}

function checkAuth(roleRequired) {
    const user = getCurrentUser();
    if (user && user.username === 'admin' && roleRequired === 'admin') {
        return;
    }
    if (!user || user.role !== roleRequired) {
        window.location.href = 'index.html';
    }
}

// Protecció de pàgines de metges i inicialització de la capçalera del Dr.
document.addEventListener("DOMContentLoaded", function() {
    const path = window.location.pathname;
    
    // Si estem a la zona de metges, validem el rol
    if (path.includes("metge_pacients.html") || path.includes("metge_cites.html")) {
        checkAuth('doctor');
        
        // Inicialització automàtica del nom i especialitat a la capçalera
        const user = getCurrentUser();
        if (user) {
            const welcomeH1 = document.getElementById('doctor-welcome');
            const specialtyP = document.getElementById('doctor-specialty-title');
            
            if (welcomeH1) welcomeH1.textContent = `Dr. ${user.name}`;
            if (specialtyP) specialtyP.textContent = user.specialty || 'Medicina General';
        }
    }
});