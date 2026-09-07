import * as XLSX from 'xlsx';

export function exportAllocationsToExcel(allocations, wellName) {
  // Pivot: rows = dates, columns = sands
  const dateMap = {};
  const sands = new Set();

  for (const a of allocations) {
    sands.add(a.sandName);
    if (!dateMap[a.date]) dateMap[a.date] = { Date: a.date };
    dateMap[a.date][a.sandName] = Math.round(a.allocatedProduction * 100) / 100;
  }

  // Add total column
  const rows = Object.values(dateMap).sort((a, b) => a.Date.localeCompare(b.Date));
  const sandList = [...sands].sort();

  for (const row of rows) {
    let total = 0;
    for (const s of sandList) {
      total += row[s] || 0;
    }
    row['Total'] = Math.round(total * 100) / 100;
  }

  const ws = XLSX.utils.json_to_sheet(rows, { header: ['Date', ...sandList, 'Total'] });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Allocation');

  XLSX.writeFile(wb, `${wellName || 'allocation'}_results.xlsx`);
}
