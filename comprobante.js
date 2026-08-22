/**
 * FRONTEND - Comprobante de organización (PNG generado con canvas)
 * No requiere librerías externas: dibuja la constancia y la descarga.
 * Prueba rápida desde consola:
 *   descargarComprobante({ nombres:'Pachakuteq Samuel Huamani Arovilca',
 *     comision:'Actas y Archivos', idOrganizador:'ORG-0001' })
 */
const COMPROBANTE_W = 1414;
const COMPROBANTE_H = 1000;
const VERDE = '#4E7D6A';
const AMBAR = '#8a5a00';

function cargarImagen(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar ' + src));
    img.src = src;
  });
}

/** Divide un texto en líneas que quepan en maxW según la fuente activa. */
function partirTexto(ctx, texto, maxW) {
  const lineas = [];
  let actual = '';
  texto.split(' ').forEach(palabra => {
    const prueba = actual ? actual + ' ' + palabra : palabra;
    if (ctx.measureText(prueba).width > maxW && actual) {
      lineas.push(actual);
      actual = palabra;
    } else {
      actual = prueba;
    }
  });
  if (actual) lineas.push(actual);
  return lineas;
}

function cajaCentrada(ctx, texto, cx, cy, padX, padY, radio, fondo, borde, fuente, colorTexto) {
  ctx.font = fuente;
  const w = ctx.measureText(texto).width;
  const h = 30;
  const x = cx - w / 2 - padX;
  const y = cy - h / 2 - padY;

  ctx.beginPath();
  ctx.roundRect(x, y, w + padX * 2, h + padY * 2, radio);
  ctx.fillStyle = fondo;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = borde;
  ctx.stroke();

  ctx.fillStyle = colorTexto;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(texto, cx, cy + 1);
}

async function descargarComprobante(data) {
  const d = data || window._organizadorData;
  if (!d) return;

  const btn = document.getElementById('btnComprobante');
  if (btn) { btn.disabled = true; btn.textContent = 'Generando...'; }

  try {
    // Cargar explícitamente las variantes que usará el canvas
    // (evita el fallback a Times New Roman)
    await Promise.all([
      document.fonts.load('900 54px "Noto Serif"'),
      document.fonts.load('900 62px "Noto Serif"'),
      document.fonts.load('700 26px Arial')
    ]);
    await document.fonts.ready;
    const [escudo, oso] = await Promise.all([
      cargarImagen('Logaso.png'),
      cargarImagen('oso_organizador.png')
    ]);

    const cv = document.createElement('canvas');
    cv.width = COMPROBANTE_W;
    cv.height = COMPROBANTE_H;
    const ctx = cv.getContext('2d');

    // ---- Fondo blanco + marco doble discreto ----
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, COMPROBANTE_W, COMPROBANTE_H);

    ctx.strokeStyle = VERDE;
    ctx.lineWidth = 9;
    ctx.strokeRect(28, 28, COMPROBANTE_W - 56, COMPROBANTE_H - 56);
    ctx.lineWidth = 3;
    ctx.strokeRect(58, 58, COMPROBANTE_W - 116, COMPROBANTE_H - 116);

    // ---- Escudo universitario arriba (cuadro negro redondeado para contraste) ----
    const escudoW = 340;
    const escudoH = escudoW * escudo.height / escudo.width;
    const padLogo = 24;
    const logoX = (COMPROBANTE_W - escudoW) / 2;
    const logoY = 95;
    ctx.beginPath();
    ctx.roundRect(logoX - padLogo, logoY - padLogo, escudoW + padLogo * 2, escudoH + padLogo * 2, 18);
    ctx.fillStyle = 'rgba(20, 20, 20, 0.78)';
    ctx.fill();
    ctx.drawImage(escudo, logoX, logoY, escudoW, escudoH);

    // ---- Títulos ----
    ctx.textAlign = 'center';
    ctx.fillStyle = VERDE;
    ctx.font = '900 62px "Noto Serif", Arial';
    ctx.fillText('EXPOBIO 2026', COMPROBANTE_W / 2, escudoH + 165);

    ctx.font = '700 26px Arial';
    try { ctx.letterSpacing = '6px'; } catch (e) {}
    ctx.fillText('CONSTANCIA DE ORGANIZACIÓN', COMPROBANTE_W / 2, escudoH + 215);
    try { ctx.letterSpacing = '0px'; } catch (e) {}

    // Línea divisoria corta
    ctx.strokeStyle = AMBAR;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(COMPROBANTE_W / 2 - 130, escudoH + 245);
    ctx.lineTo(COMPROBANTE_W / 2 + 130, escudoH + 245);
    ctx.stroke();

    // ---- Cuerpo ----
    let y = escudoH + 320;
    ctx.fillStyle = '#555555';
    ctx.font = '26px Arial';
    ctx.fillText('Se otorga la presente constancia a:', COMPROBANTE_W / 2, y);

    y += 80;
    ctx.fillStyle = '#222222';
    ctx.font = '900 54px "Noto Serif", Arial';
    const nombre = d.nombres || 'Organizador EXPOBIO';
    const lineasNombre = partirTexto(ctx, nombre.toUpperCase(), 950);
    lineasNombre.forEach(linea => {
      ctx.fillText(linea, COMPROBANTE_W / 2, y);
      y += 66;
    });

    y += 14;
    ctx.fillStyle = '#444444';
    ctx.font = '27px Arial';
    ctx.fillText('por integrar el equipo organizador del evento', COMPROBANTE_W / 2, y);

    y += 70;
    cajaCentrada(
      ctx,
      'Comisión: ' + (d.comision || 'Equipo organizador'),
      COMPROBANTE_W / 2, y,
      24, 12, 12,
      'rgba(255,179,0,0.15)', AMBAR,
      '700 26px Arial', AMBAR
    );

    y += 78;
    cajaCentrada(
      ctx,
      d.idOrganizador || 'ORG-XXXX',
      COMPROBANTE_W / 2, y,
      34, 16, 14,
      VERDE, VERDE,
      '700 34px monospace', '#ffffff'
    );

    y += 62;
    ctx.fillStyle = '#555555';
    ctx.font = '22px Arial';
    ctx.fillText('Presenta este comprobante para inscribirte en los concursos de EXPOBIO 2026.', COMPROBANTE_W / 2, y);

    // ---- Oso organizador decorativo (abajo derecha) ----
    const osoH = 215;
    const osoW = osoH * oso.width / oso.height;
    ctx.drawImage(oso, COMPROBANTE_W - osoW - 120, COMPROBANTE_H - osoH - 105, osoW, osoH);

    // ---- Fecha (abajo izquierda) ----
    const fecha = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
    ctx.fillStyle = '#444444';
    ctx.font = 'italic 26px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('Cusco, ' + fecha, 110, COMPROBANTE_H - 140);

    ctx.font = '18px Arial';
    ctx.fillStyle = '#888888';
    ctx.fillText('Documento generado electrónicamente por el sistema de consultas de EXPOBIO 2026.', 110, COMPROBANTE_H - 100);

    // ---- Descarga ----
    cv.toBlob(blob => {
      const enlace = document.createElement('a');
      enlace.href = URL.createObjectURL(blob);
      enlace.download = 'comprobante_' + (d.idOrganizador || 'organizador') + '.png';
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(enlace.href), 4000);
    }, 'image/png');

  } catch (err) {
    console.error('Error al generar comprobante:', err);
    alert('No se pudo generar el comprobante: ' + err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '\u{1F4E5} Descargar comprobante'; }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnComprobante');
  if (btn) btn.addEventListener('click', () => descargarComprobante());
});
