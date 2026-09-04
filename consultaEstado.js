/**
 * FRONTEND - Consulta de estado de inscripción por DNI
 * Versión simplificada: sin token.
 */
const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzS2TRJ0cRGTaEqmfz3QwredlBMWyCpbSB88MHKgdp-ubaNVFYGpouv_0Cj7gyhVYYU/exec';

async function consultarEstado(dni) {
  if (!/^\d{8}$/.test(dni)) {
    return { ok: false, mensaje: 'Ingresa un DNI válido de 8 dígitos' };
  }
  try {
    const response = await fetch(WEB_APP_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ dni })
    });
    const rawText = await response.text();
    let data;
    try {
      data = JSON.parse(rawText);
    } catch (parseErr) {
      console.error('No se pudo parsear como JSON:', parseErr, rawText);
      return { ok: false, mensaje: 'El servidor no devolvió JSON válido', tipoError: 'JSON_INVALIDO', detalle: rawText.slice(0, 500) };
    }

    // Si el backend devolvió debug, lo exponemos para diagnóstico
    if (data && !data.ok && data.debug) {
      console.error('Error de backend:', data.debug);
      return {
        ok: false,
        mensaje: data.mensaje || 'Error interno',
        tipoError: 'BACKEND',
        detalle: data.debug
      };
    }
    return data;
  } catch (err) {
    console.error('Error de fetch:', err);
    const tipo = err instanceof TypeError ? 'RED' : 'DESCONOCIDO';
    return { ok: false, mensaje: 'No se pudo conectar, intenta de nuevo', tipoError: tipo, detalle: String(err) };
  }
}

function ocultarTodosLosResultados() {
  ['resultado-bien', 'resultado-mal', 'resultado-pendiente', 'resultado-organizador', 'resultado-no-existe']
    .forEach(id => document.getElementById(id).classList.remove('visible'));
}

function mostrarResultado(data) {
  ocultarTodosLosResultados();
  const mensajeForm = document.getElementById('mensaje-form');
  mensajeForm.className = '';
  mensajeForm.style.display = 'none';

  if (!data.encontrado) {
    document.getElementById('resultado-no-existe').classList.add('visible');
    return;
  }

  if (data.tipo === 'organizador') {
    window._organizadorData = data;
    document.getElementById('nombre-org').textContent = data.nombres || '';
    document.getElementById('comision-org').textContent = data.comision || 'Equipo organizador';
    document.getElementById('idorg-org').textContent = data.idOrganizador || '';
    document.getElementById('resultado-organizador').classList.add('visible');
    return;
  }

  const estado = String(data.estado || '').toLowerCase();

  if (estado === 'aprobado') {
    document.getElementById('nombre-bien').textContent = data.nombres || '';
    document.getElementById('resultado-bien').classList.add('visible');
  } else if (estado === 'rechazado') {
    document.getElementById('nombre-mal').textContent = data.nombres || '';
    document.getElementById('motivo-mal').textContent =
      'Motivo: ' + (data.motivoRechazo || 'No especificado');
    document.getElementById('resultado-mal').classList.add('visible');
  } else {
    document.getElementById('nombre-pendiente').textContent = data.nombres || '';
    document.getElementById('resultado-pendiente').classList.add('visible');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formConsulta');
  const inputDni = document.getElementById('dniConsulta');
  const mensajeForm = document.getElementById('mensaje-form');
  const botonSubmit = form ? form.querySelector('.btn-consultar') : null;

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    ocultarTodosLosResultados();
    mensajeForm.className = '';
    mensajeForm.textContent = 'Consultando...';
    mensajeForm.style.display = 'block';
    if (botonSubmit) botonSubmit.disabled = true;

    const dni = inputDni.value.trim();
    const data = await consultarEstado(dni);

    if (botonSubmit) botonSubmit.disabled = false;

    if (!data.ok) {
      mensajeForm.className = 'error';
      mensajeForm.textContent = data.mensaje || 'Error de consulta';
      if (data.detalle) {
        const detalle = document.createElement('div');
        detalle.className = 'detalle-error';
        detalle.textContent = '[' + (data.tipoError || '?') + '] ' + data.detalle;
        mensajeForm.appendChild(detalle);
      }
      return;
    }

    mensajeForm.style.display = 'none';
    mostrarResultado(data);
  });
});
