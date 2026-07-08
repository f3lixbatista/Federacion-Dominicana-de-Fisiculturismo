// ============================================================
// MODO KIOSKO — Lógica del cliente (MPA)
//
// NOTA TÉCNICA: FDFF es una app Express/EJS multi-página (MPA).
// Cada navegación recarga la página completa. Los navegadores
// siempre salen de fullscreen en recargas (norma de seguridad).
// Solución: guardar estado en localStorage y mostrar overlay
// táctil que restaura fullscreen con un gesto del usuario.
// El PIN solo se pide al presionar "SALIR KIOSKO".
// ============================================================

function activarInterfazKiosko() {
    document.body.classList.add('kiosko-active');

    // Bloquear teclas de depuración
    window.onkeydown = (e) => {
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.shiftKey && e.key === 'J') ||
            (e.ctrlKey && e.key === 'u')
        ) {
            e.preventDefault();
            return false;
        }
    };

    actualizarBotonKiosko(true);

    // Tras cada navegación el navegador sale de fullscreen automáticamente.
    // Mostramos overlay táctil para restaurarlo con gesto del usuario.
    if (!document.fullscreenElement) {
        mostrarOverlayFullscreen();
    }
}

function actualizarBotonKiosko(activo) {
    const btn = document.getElementById('btnKiosko');
    if (!btn) return;
    if (activo) {
        btn.className = 'btn btn-danger btn-sm fw-bold d-flex align-items-center gap-1';
        btn.innerHTML = '<i class="fas fa-sign-out-alt"></i><span class="d-none d-md-inline">SALIR KIOSKO</span>';
    } else {
        btn.className = 'btn btn-outline-warning btn-sm fw-bold d-flex align-items-center gap-1';
        btn.innerHTML = '<i class="fas fa-desktop"></i><span class="d-none d-md-inline">Kiosko</span>';
    }
}

function mostrarOverlayFullscreen() {
    if (document.getElementById('kiosko-fs-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'kiosko-fs-overlay';
    overlay.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
        'background:linear-gradient(135deg,#000d1a 0%,#001a33 100%)',
        'z-index:99999',
        'display:flex', 'flex-direction:column',
        'align-items:center', 'justify-content:center',
        'cursor:pointer', 'color:white', 'text-align:center',
        'font-family:sans-serif', 'user-select:none',
        'padding:2rem'
    ].join(';');

    overlay.innerHTML = `
        <div style="border:2px solid rgba(255,255,255,0.15);border-radius:20px;padding:3rem 4rem;max-width:500px;backdrop-filter:blur(10px);background:rgba(255,255,255,0.04)">
            <!-- Ícono de pantalla completa -->
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,200,0,0.85)" stroke-width="1.5" style="margin-bottom:1.5rem">
                <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>

            <!-- Badge de estado -->
            <div style="background:rgba(255,200,0,0.15);border:1px solid rgba(255,200,0,0.4);border-radius:50px;padding:0.3rem 1.2rem;margin-bottom:1.2rem;display:inline-block">
                <span style="color:rgb(255,200,0);font-size:0.7rem;letter-spacing:3px;font-weight:700">● MODO KIOSKO ACTIVO</span>
            </div>

            <h2 style="font-size:1.5rem;font-weight:700;margin:0 0 0.5rem;letter-spacing:1px">Pantalla Completa</h2>
            <p style="color:rgba(255,255,255,0.5);font-size:0.9rem;margin:0 0 2rem;line-height:1.5">
                El navegador salió de pantalla completa al cambiar de página.<br>
                Toca para restaurarla y continuar.
            </p>

            <!-- Botón visual -->
            <div style="background:rgba(255,200,0,0.9);color:#000;border-radius:50px;padding:0.8rem 2.5rem;font-weight:700;font-size:1rem;letter-spacing:2px;display:inline-block">
                TOCA PARA CONTINUAR
            </div>
        </div>

        <p style="position:absolute;bottom:1.5rem;color:rgba(255,255,255,0.2);font-size:0.7rem;letter-spacing:2px">
            FEDERACIÓN DOMINICANA DE FISICULTURISMO
        </p>
    `;

    overlay.addEventListener('click', () => {
        document.documentElement.requestFullscreen()
            .then(() => overlay.remove())
            .catch(() => overlay.remove());
    });

    document.body.appendChild(overlay);
}

// ── Auto-ejecución al cargar cada página ────────────────────
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('modoKiosko') === 'true') {
        activarInterfazKiosko();
    } else {
        actualizarBotonKiosko(false);
    }
});
