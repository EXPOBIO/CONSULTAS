/**
 * BACKEND - Consulta de estado de inscripción por DNI
 * Google Apps Script INDEPENDIENTE (no container-bound)
 * Deploy: Web app > Ejecutar como: Yo > Acceso: Cualquiera
 *
 * v2 - Agrega búsqueda en hoja "Organizadores":
 *   1) Busca el DNI en "Inscripciones" -> tipo:'inscrito' (igual que antes)
 *   2) Si no está, busca en "Organizadores" -> tipo:'organizador'
 *      y le genera un ID (ORG-0001, ORG-0002, ...) la primera vez,
 *      escribiéndolo en su fila para futuras constancias.
 */

// ==================== CONFIGURACIÓN ====================
const SPREADSHEET_ID = '17kQ143-u103Z6TMrDHNLIjhHMuLvKG2lBJJmO-UbgcM'; // de la URL: /d/ESTE_ID/edit
const SHEET_NAME = 'Inscripciones';
const ORG_SHEET_NAME = 'Organizadores';

const PREFIJO_ID_ORG = 'ORG-';
const PAD_ID_ORG = 4; // ORG-0001

// Poner en false cuando pase a producción (el campo debug expone internals)
const DEBUG = true;

// ==================== ENTRY POINT ====================
function doPost(e) {
  try {
    const body = parseBody(e);

    // Validar formato de DNI (8 dígitos)
    const dni = String(body.dni || '').trim();
    if (!/^\d{8}$/.test(dni)) {
      return respond({ ok: false, mensaje: 'DNI inválido' });
    }

    // 1) ¿Es organizador? (prioridad sobre inscripción normal)
    const org = buscarOrganizadorPorDNI(dni);
    if (org) {
      const idOrganizador = asegurarIdOrganizador(org.fila);
      return respond({
        ok: true,
        encontrado: true,
        tipo: 'organizador',
        estado: null,
        motivoRechazo: null,
        nombres: org.nombres || null,
        codigo: org.codigo || null,
        comision: org.comision || null,
        idOrganizador: idOrganizador
      });
    }

    // 2) ¿Está inscrito como participante?
    const inscrito = buscarUltimaPorDNI(dni);
    if (inscrito) {
      return respond({
        ok: true,
        encontrado: true,
        tipo: 'inscrito',
        estado: inscrito.estado || 'pendiente',
        motivoRechazo: inscrito.motivoRechazo || null,
        nombres: inscrito.nombres || null
      });
    }

    // 3) No está en ninguna
    return respond({
      ok: true,
      encontrado: false,
      estado: null,
      motivoRechazo: null,
      nombres: null
    });

  } catch (err) {
    const resp = { ok: false, mensaje: 'Error interno' };
    if (DEBUG) resp.debug = String(err);
    return respond(resp);
  }
}

// GET no permitido (evita armar la consulta pegando la URL en el navegador)
function doGet(e) {
  return respond({ ok: false, mensaje: 'Método no permitido (GET)' });
}

// ==================== HELPERS ====================

function parseBody(e) {
  try {
    return JSON.parse(e.postData.contents);
  } catch (err) {
    return {};
  }
}

function respond(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** Devuelve el índice (0-based) de la columna o lanza error claro si falta. */
function requerirColumna(headers, nombre) {
  const idx = headers.indexOf(nombre);
  if (idx === -1) {
    throw new Error('Falta la columna "' + nombre + '"');
  }
  return idx;
}

/**
 * INSCRITOS: busca la ÚLTIMA fila (de abajo hacia arriba) que coincida con el DNI.
 * Columnas del sheet:
 * ID, ID de grupo, Fecha, Tipo, Nombres, Apellido paterno, Apellido materno,
 * Código, Universidad, Facultad / Institución, DNI, Celular, Voucher, Estado,
 * MontoVerificado, TipoPago, NumeroTransaccion, MotivoRechazo
 */
function buscarUltimaPorDNI(dni) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error('No existe la hoja "' + SHEET_NAME + '"');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const dniCol = requerirColumna(headers, 'DNI');
  const estadoCol = requerirColumna(headers, 'Estado');
  const motivoCol = requerirColumna(headers, 'MotivoRechazo');
  const nombresCol = requerirColumna(headers, 'Nombres');
  const apPaternoCol = requerirColumna(headers, 'Apellido paterno');
  const apMaternoCol = requerirColumna(headers, 'Apellido materno');

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][dniCol]).trim() === dni) {
      const nombreCompleto = [
        data[i][nombresCol],
        data[i][apPaternoCol],
        data[i][apMaternoCol]
      ].filter(Boolean).join(' ');

      return {
        estado: data[i][estadoCol],
        motivoRechazo: data[i][motivoCol],
        nombres: nombreCompleto
      };
    }
  }
  return null;
}

/**
 * ORGANIZADORES: busca la última fila con ese DNI en la hoja "Organizadores".
 * Columnas: ID, Marca temporal, Dirección de correo electrónico, Nombres,
 * Apellido Paterno, Apellido Materno, Código, DNI, Celular, Organizador
 */
function buscarOrganizadorPorDNI(dni) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ORG_SHEET_NAME);
  if (!sheet) throw new Error('No existe la hoja "' + ORG_SHEET_NAME + '"');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const colDni = requerirColumna(headers, 'DNI');
  const colNombres = requerirColumna(headers, 'Nombres');
  const colApPat = requerirColumna(headers, 'Apellido Paterno');
  const colApMat = requerirColumna(headers, 'Apellido Materno');
  // "Código" admite variante sin tilde por si el formulario cambia
  const colCodigo = Math.max(headers.indexOf('Código'), headers.indexOf('Codigo'));
  const colComision = requerirColumna(headers, 'Organizador');

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][colDni]).trim() === dni) {
      return {
        fila: i + 1,
        nombres: [
          data[i][colNombres],
          data[i][colApPat],
          data[i][colApMat]
        ].filter(Boolean).join(' '),
        codigo: String(data[i][colCodigo] || '').trim() || null,
        comision: String(data[i][colComision] || '').trim() || null
      };
    }
  }
  return null;
}

/**
 * Devuelve el ID del organizador; si su celda ID está vacía genera el
 * siguiente secuencial (ORG-0001...) y lo ESCRIBE en su fila.
 * El lock evita que dos consultas simultáneas reciban el mismo ID.
 */
function asegurarIdOrganizador(fila) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ORG_SHEET_NAME);
    const lastCol = sheet.getLastColumn();
    const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    const colIdx = requerirColumna(headers, 'ID');

    // Releer dentro del lock: otro proceso pudo asignarlo ya
    const actual = String(sheet.getRange(fila, colIdx + 1).getValue()).trim();
    if (actual) return actual;

    const nuevoId = siguienteIdOrganizador(sheet, colIdx);
    sheet.getRange(fila, colIdx + 1).setValue(nuevoId);
    return nuevoId;
  } finally {
    lock.releaseLock();
  }
}

/** Calcula el máximo ID existente y devuelve el siguiente. */
function siguienteIdOrganizador(sheet, colIdx) {
  const lastRow = sheet.getLastRow();
  let max = 0;

  if (lastRow > 1) {
    const valores = sheet.getRange(2, colIdx + 1, lastRow - 1, 1).getValues();
    const re = new RegExp('^ORG-(\\d+)$');
    valores.forEach(function(f) {
      const m = String(f[0]).trim().match(re);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  }

  return PREFIJO_ID_ORG + String(max + 1).padStart(PAD_ID_ORG, '0');
}
