
const SHEET = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmDE1iUNPeU1WVOd57G7n73f5ZKZ0N8uMLGTo_PM23ZSrxU37cTaXhrG0op27n4Q/pub?output=csv";

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        field += '"';
        i++;
      } else {
        quoted = !quoted;
      }
    } else if (c === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function monto(valor) {
  let s = String(valor ?? "").trim();
  if (!s || !/^[\d\s$.,+-]+$/.test(s)) return null;

  s = s.replace(/[$\s]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = /,\d{1,2}$/.test(s)
      ? s.replace(",", ".")
      : s.replace(/,/g, "");
  } else if (s.includes(".")) {
    if (!/\.\d{1,2}$/.test(s)) s = s.replace(/\./g, "");
  }

  const numero = Number(s);
  return Number.isFinite(numero) && numero >= 0
    ? numero
    : null;
}

function esCurso(valor) {
  const s = String(valor ?? "").trim();
  if (!s || s.length > 80) return false;
  if (/total|funcionar|colegio|recaud|telet[oó]n/i.test(s)) {
    return false;
  }
  return /(?:^|\s)(?:[1-4]|7|8)\s*[°ºªo]?\s*(?:(?:b[aá]sico|medio)\s*)?(?:[-–]?\s*[A-H]\b|(?:b[aá]sico|medio)\b)/i.test(s);
}

exports.handler = async function () {
  try {
    const res = await fetch(SHEET + "&t=" + Date.now(), {
      headers: { Accept: "text/csv" },
      signal: AbortSignal.timeout(12000)
    });

    if (!res.ok) {
      throw new Error("Google Sheets: " + res.status);
    }

    const csv = await res.text();
    if (/^\s*</.test(csv)) {
      throw new Error("La planilla no entregó datos CSV");
    }

    const filas = parseCSV(csv);
    const cursos = [];
    const incidencias = [];

    // CURSOS: filas 2 a 38, montos de columna H
    for (let fila = 2; fila <= 38; fila++) {
      const celdas = filas[fila - 1] || [];

      const nombre = celdas
        .slice(0, 7)
        .find(esCurso);

      const valor = monto(celdas[7]);

      if (!nombre) {
        incidencias.push("Falta nombre de curso en fila " + fila);
        continue;
      }

      if (valor === null) {
        incidencias.push("Monto no válido en H" + fila);
      }

      cursos.push({
        nombre: String(nombre).trim(),
        monto: valor
      });
    }

    // TOTALES GENERALES
    const funcionarios = monto(filas[8]?.[11]); 
    const totalColegio = monto(filas[11]?.[11]);

    const datos = {
      cursos,
      funcionarios,
      totalColegio,
      actualizado: new Date().toISOString(),
      incidencias
    };

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(datos)
    };

  } catch (error) {
    return {
      statusCode: 502,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        error: "No se pudo consultar Google Sheets",
        detalle: error.message
      })
    };
  }
};
