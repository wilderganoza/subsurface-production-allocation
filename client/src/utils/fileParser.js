import * as XLSX from 'xlsx';

/**
 * Parse an Excel or CSV file into an array of objects.
 * Returns { headers: string[], rows: object[] }
 */
export function parseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

        if (json.length === 0) {
          reject(new Error('File is empty or has no data rows.'));
          return;
        }

        const headers = Object.keys(json[0]);
        resolve({ headers, rows: json });
      } catch (err) {
        reject(new Error('Failed to parse file: ' + err.message));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse production data from parsed file rows.
 * Expects columns with date and production values.
 * Returns { data: ProductionRecord[], dateCol, prodCol }
 */
export function extractProductionData(rows, dateCol, prodCol) {
  return rows.map(row => ({
    date: normalizeDate(row[dateCol]),
    totalProduction: parseFloat(row[prodCol]) || 0,
  })).filter(r => r.date);
}

/**
 * Parse sand properties from parsed file rows.
 * Returns SandProperty[]
 */
export function extractSandProperties(rows, nameCol, khCol) {
  return rows.map(row => ({
    sandName: String(row[nameCol]).trim(),
    kh: parseFloat(row[khCol]) || 0,
  })).filter(r => r.sandName && r.kh > 0);
}

/**
 * Parse intervention matrix from parsed file rows.
 * First column = sand names, remaining columns = dates with X marks.
 */
export function extractInterventionMatrix(headers, rows) {
  const sandCol = headers[0];
  const interventionDates = headers.slice(1).map(h => normalizeDate(h));
  const sandNames = rows.map(r => String(r[sandCol]).trim());
  const matrix = rows.map(r =>
    headers.slice(1).map(h => {
      const val = String(r[h] || '').trim().toUpperCase();
      return val === 'X' || val === '1' || val === 'TRUE';
    })
  );

  return { sandNames, interventionDates: interventionDates.filter(Boolean), matrix };
}

function normalizeDate(val) {
  if (!val) return '';
  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  // Try parsing as date
  const d = new Date(val);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
}
