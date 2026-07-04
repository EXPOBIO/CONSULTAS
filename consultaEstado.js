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
 */

const WEB_APP_URL = 'https://script.google.com/macros/s/TU_DEPLOYMENT_ID/exec';
const SECRET_TOKEN = 'MI_TOKEN_SECRETO_AQUI'; // igual que en configurarTokenSecreto()

async function consultarEstado(dni) {
  // Validación básica en el front (no reemplaza la del back, solo evita
  // requests innecesarios)
  if (!/^\d{8}$/.test(dni)) {
    return { ok: false, mensaje: 'Ingresa un DNI válido de 8 dígitos' };
  }

  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow', // sigue el redirect interno de Apps Script explícitamente
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // evita preflight CORS
      },
      body: JSON.stringify({
        dni: dni,
        token: SECRET_TOKEN
      })
    });

    // ==================== DIAGNÓSTICO TEMPORAL ====================
    // Log completo para saber exactamente qué está devolviendo el servidor.
    // Quitar estos console.log cuando ya funcione todo.
    console.log('Status:', response.status);
    console.log('OK:', response.ok);
    console.log('Content-Type:', response.headers.get('content-type'));

    const rawText = await response.text();
    console.log('Respuesta cruda:', rawText);

    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('No se pudo parsear como JSON:', parseErr);
      return {
        ok: false,
        mensaje: 'El servidor no devolvió JSON válido (revisa la consola)',
        debug: rawText.substring(0, 300)
      };
    }
    // ==================== FIN DIAGNÓSTICO TEMPORAL ====================

    return data;

  } catch (err) {
    console.error('Error de fetch:', err);
    return { ok: false, mensaje: 'No se pudo conectar, intenta de nuevo', debug: String(err) };
  }
}

// ==================== EJEMPLO DE USO EN EL FORM ====================
// Ajusta los IDs según lo que tu amigo tenga en el HTML del front.

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('form-consulta');
  const inputDni = document.getElementById('input-dni');
  const resultadoDiv = document.getElementById('resultado');
  const botonSubmit = form ? form.querySelector('button[type="submit"]') : null;

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const dni = inputDni.value.trim();
    resultadoDiv.textContent = 'Consultando...';
    if (botonSubmit) botonSubmit.disabled = true;

    const data = await consultarEstado(dni);

    if (botonSubmit) botonSubmit.disabled = false;

    if (!data.ok) {
      resultadoDiv.textContent = data.mensaje;
      return;
    }

    if (!data.encontrado) {
      resultadoDiv.textContent = 'No encontramos una inscripción con ese DNI.';
      return;
    }

    let mensaje = `Estado: ${data.estado}`;
    if (data.estado === 'rechazado' && data.motivoRechazo) {
      mensaje += ` — Motivo: ${data.motivoRechazo}`;
    }
    resultadoDiv.textContent = mensaje;
  });
});
