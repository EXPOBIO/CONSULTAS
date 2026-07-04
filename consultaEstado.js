/**
 * FRONTEND - Consulta de estado de inscripción por DNI
 *
 * IMPORTANTE:
 * - Reemplaza WEB_APP_URL con la URL de tu Web App de Apps Script
 *   (Deploy > New deployment > Web app > acceso: Cualquiera)
 * - SECRET_TOKEN debe ser EXACTAMENTE igual al que guardaste con
 *   configurarTokenSecreto() en Code.gs
 * - Se usa content-type "text/plain" a propósito para evitar el preflight
 *   OPTIONS que Apps Script no maneja bien con CORS.
 *
 * NOTA DE SEGURIDAD: este token viaja en el JS público del front (GitHub),
 * así que cualquier persona técnica puede verlo inspeccionando el código.
 * No es una barrera infranqueable, es una capa más que filtra bots genéricos.
 * La protección real está en el backend (rate limit, bloqueo progresivo, delay).
 * Tengo fe de que no nos encuentra un bot :v
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzS2TRJ0cRGTaEqmfz3QwredlBMWyCpbSB88MHKgdp-ubaNVFYGpouv_0Cj7gyhVYYU/exec';
const SECRET_TOKEN = 'dfkjasdlñfkjapoeurpaksdcpoauewrpqdnclklshjdfd'; // igual que en configurarTokenSecreto()

async function consultarEstado(dni) {
    // Validación básica en el front (no reemplaza la del back, solo evita
    // requests innecesarios)
    if (!/^\d{8}$/.test(dni)) {
        return { ok: false, mensaje: 'Ingresa un DNI válido de 8 dígitos' };
    }
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // evita preflight CORS
            },
            body: JSON.stringify({
                dni: dni,
                token: SECRET_TOKEN
            })
        });
        const data = await response.json();
        return data;
    } catch (err) {
        return { ok: false, mensaje: 'No se pudo conectar, intenta de nuevo' };
    }
}

// ==================== INTEGRACIÓN CON consultaEstado.html ====================

const bloquesResultado = {
    'aprobado': null,
    'rechazado': null,
    'pendiente': null,
    'no-existe': null
};

let mensajeEl = null;

function ocultarBloques() {
    Object.values(bloquesResultado).forEach(function (b) {
        if (b) b.classList.remove('visible');
    });
        if (mensajeEl) {
            mensajeEl.className = '';
            mensajeEl.textContent = '';
        }
}

function mostrarBloque(clave) {
    ocultarBloques();
    const bloque = bloquesResultado[clave];
    if (bloque) {
        bloque.classList.add('visible');
        bloque.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

function rellenarDatos(nombre, motivoRechazo) {
    document.getElementById('nombre-bien').textContent = nombre;
    document.getElementById('nombre-mal').textContent = nombre;
    document.getElementById('nombre-pendiente').textContent = nombre;
    document.getElementById('motivo-mal').textContent = 'Motivo: ' + (motivoRechazo || 'No especificado');
}

// Botones de "Vista previa" — quedan disponibles para seguir probando la UI
// sin gastar cuota del backend real.
function mostrarDemo(estado) {
    const mapaDemo = { 'bien': 'aprobado', 'mal': 'rechazado', 'pendiente': 'pendiente', 'no-existe': 'no-existe' };
    rellenarDatos('Kevin', 'El voucher subido no se alcanza a leer con claridad.');
    mostrarBloque(mapaDemo[estado]);
}

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('formConsulta');
    const inputDni = document.getElementById('dniConsulta');
    const botonSubmit = form ? form.querySelector('button[type="submit"]') : null;

    mensajeEl = document.getElementById('mensaje-form');
    bloquesResultado['aprobado'] = document.getElementById('resultado-bien');
    bloquesResultado['rechazado'] = document.getElementById('resultado-mal');
    bloquesResultado['pendiente'] = document.getElementById('resultado-pendiente');
    bloquesResultado['no-existe'] = document.getElementById('resultado-no-existe');

    if (!form) return;

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const dni = inputDni.value.trim();

        ocultarBloques();
        if (botonSubmit) {
            botonSubmit.disabled = true;
            botonSubmit.textContent = 'Consultando...';
        }

        const data = await consultarEstado(dni);

        if (botonSubmit) {
            botonSubmit.disabled = false;
            botonSubmit.textContent = 'Consultar';
        }

        if (!data.ok) {
            mensajeEl.className = 'error';
            mensajeEl.textContent = data.mensaje;
            return;
        }

        if (!data.encontrado) {
            mostrarBloque('no-existe');
            return;
        }

        rellenarDatos(data.nombre || '', data.motivoRechazo);

        const estado = (data.estado || '').toLowerCase();

        if (estado === 'aprobado' || estado === 'rechazado' || estado === 'pendiente') {
            mostrarBloque(estado);
        } else {
            mensajeEl.className = 'error';
            mensajeEl.textContent = 'Estado desconocido recibido del servidor: ' + data.estado;
        }
    });
});
