/**
 * Table utilities for parsing Excel/Sheets clipboard data, creating rich tables,
 * and manipulating table rows, columns, headers, alignments, and SUM calculations.
 */

export function isTsvData(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Has at least one tab and some text
  if (!text.includes('\t')) return false;

  const lines = text.trim().split(/\r?\n/).filter((l) => l.length > 0);
  if (lines.length === 0) return false;

  // If there's multiple lines and at least one has tabs, or single line with tabs
  return lines.some((line) => line.includes('\t'));
}

/**
 * Parses TSV string (copied from Excel / Google Sheets) into clean HTML table.
 */
export function tsvToHtmlTable(tsvText: string, defaultHasHeader: boolean = true): string {
  if (!tsvText) return '';

  const rawLines = tsvText.split(/\r?\n/);
  // Remove empty trailing line if present
  if (rawLines.length > 0 && rawLines[rawLines.length - 1].trim() === '') {
    rawLines.pop();
  }
  if (rawLines.length === 0) return '';

  // Parse TSV rows respecting quoted cells with potential embedded tabs/newlines
  const parsedRows: string[][] = [];
  for (const line of rawLines) {
    if (!line.trim() && parsedRows.length === 0) continue;
    const cells = line.split('\t').map((c) => {
      let val = c.trim();
      // Remove enclosing quotes if Excel added them
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1).replace(/""/g, '"');
      }
      return val || '&nbsp;';
    });
    parsedRows.push(cells);
  }

  if (parsedRows.length === 0) return '';

  // Normalize column count across all rows
  const maxCols = Math.max(...parsedRows.map((r) => r.length), 1);
  const normalizedRows = parsedRows.map((row) => {
    while (row.length < maxCols) {
      row.push('&nbsp;');
    }
    return row;
  });

  const hasHeader = defaultHasHeader && normalizedRows.length > 1;

  let tableHtml = '<div class="table-wrapper my-3 overflow-x-auto"><table class="rich-table border-collapse w-full text-left my-2">';

  if (hasHeader) {
    tableHtml += '<thead><tr>';
    for (const cell of normalizedRows[0]) {
      tableHtml += `<th class="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-900 dark:text-slate-100">${cell}</th>`;
    }
    tableHtml += '</tr></thead><tbody>';

    for (let r = 1; r < normalizedRows.length; r++) {
      tableHtml += '<tr>';
      for (const cell of normalizedRows[r]) {
        tableHtml += `<td class="border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200">${cell}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody>';
  } else {
    tableHtml += '<tbody>';
    for (const row of normalizedRows) {
      tableHtml += '<tr>';
      for (const cell of row) {
        tableHtml += `<td class="border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200">${cell}</td>`;
      }
      tableHtml += '</tr>';
    }
    tableHtml += '</tbody>';
  }

  tableHtml += '</table></div>';
  return tableHtml;
}

/**
 * Cleans and standardizes pasted HTML table (from MS Excel, Sheets, or websites)
 */
export function cleanHtmlTable(html: string): string {
  if (!html || !/<table[\s>]/i.test(html)) return '';

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return '';

    // Remove internal MS Office XML comments / meta
    table.querySelectorAll('script, style, meta, link').forEach((el) => el.remove());

    // Clean attributes and apply uniform styling classes
    table.className = 'rich-table border-collapse w-full text-left my-2';
    table.removeAttribute('style');
    table.removeAttribute('width');
    table.removeAttribute('border');
    table.removeAttribute('cellspacing');
    table.removeAttribute('cellpadding');

    const headers = table.querySelectorAll('th');
    headers.forEach((th) => {
      th.className = 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-900 dark:text-slate-100';
      if (!th.innerHTML.trim()) th.innerHTML = '&nbsp;';
    });

    const cells = table.querySelectorAll('td');
    cells.forEach((td) => {
      td.className = 'border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200';
      if (!td.innerHTML.trim()) td.innerHTML = '&nbsp;';
    });

    const wrapper = doc.createElement('div');
    wrapper.className = 'table-wrapper my-3 overflow-x-auto';
    wrapper.appendChild(table.cloneNode(true));

    return wrapper.outerHTML;
  } catch {
    return '';
  }
}

/**
 * Creates an empty HTML table grid with the specified number of rows and columns.
 */
export function createEmptyTableHtml(rows: number = 3, cols: number = 3, hasHeader: boolean = true): string {
  const safeRows = Math.max(1, Math.min(20, rows));
  const safeCols = Math.max(1, Math.min(12, cols));

  let html = '<div class="table-wrapper my-3 overflow-x-auto"><table class="rich-table border-collapse w-full text-left my-2">';

  if (hasHeader) {
    html += '<thead><tr>';
    for (let c = 0; c < safeCols; c++) {
      html += `<th class="border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-900 dark:text-slate-100">Header ${c + 1}</th>`;
    }
    html += '</tr></thead><tbody>';

    for (let r = 0; r < safeRows; r++) {
      html += '<tr>';
      for (let c = 0; c < safeCols; c++) {
        html += `<td class="border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200"><br></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
  } else {
    html += '<tbody>';
    for (let r = 0; r < safeRows; r++) {
      html += '<tr>';
      for (let c = 0; c < safeCols; c++) {
        html += `<td class="border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200"><br></td>`;
      }
      html += '</tr>';
    }
    html += '</tbody>';
  }

  html += '</table></div>';
  return html;
}

/**
 * Adds a new row to the table.
 */
export function addTableRow(table: HTMLTableElement, targetCell?: HTMLElement | null, insertBelow = true) {
  let targetRow: HTMLTableRowElement | null = null;
  if (targetCell) {
    targetRow = targetCell.closest('tr');
  }

  const colsCount = getTableColumnCount(table);
  const newRow = document.createElement('tr');

  for (let i = 0; i < colsCount; i++) {
    const td = document.createElement('td');
    td.className = 'border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200';
    td.innerHTML = '<br>';
    newRow.appendChild(td);
  }

  if (targetRow && targetRow.parentElement) {
    if (insertBelow) {
      if (targetRow.nextSibling) {
        targetRow.parentElement.insertBefore(newRow, targetRow.nextSibling);
      } else {
        targetRow.parentElement.appendChild(newRow);
      }
    } else {
      targetRow.parentElement.insertBefore(newRow, targetRow);
    }
  } else {
    let tbody = table.querySelector('tbody');
    if (!tbody) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
    tbody.appendChild(newRow);
  }
}

/**
 * Deletes a row from the table.
 */
export function deleteTableRow(table: HTMLTableElement, targetCell?: HTMLElement | null): boolean {
  let targetRow: HTMLTableRowElement | null = null;
  if (targetCell) {
    targetRow = targetCell.closest('tr');
  }

  const allRows = table.querySelectorAll('tr');
  if (allRows.length <= 1) {
    // Remove the whole table wrapper or table if only 1 row left
    const wrapper = table.closest('.table-wrapper');
    if (wrapper) wrapper.remove();
    else table.remove();
    return true;
  }

  if (targetRow) {
    targetRow.remove();
  } else {
    // remove last row
    allRows[allRows.length - 1].remove();
  }
  return false;
}

/**
 * Adds a column to the table.
 */
export function addTableColumn(table: HTMLTableElement, targetCell?: HTMLElement | null, insertRight = true) {
  let colIndex = -1;
  if (targetCell) {
    colIndex = getCellColumnIndex(targetCell);
  }

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const isHead = row.parentElement?.tagName.toLowerCase() === 'thead' || row.querySelector('th') !== null;
    const newCell = document.createElement(isHead ? 'th' : 'td');
    newCell.className = isHead
      ? 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-900 dark:text-slate-100'
      : 'border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200';
    newCell.innerHTML = isHead ? 'New Header' : '<br>';

    const cells = Array.from(row.children);
    if (colIndex >= 0 && colIndex < cells.length) {
      if (insertRight) {
        if (cells[colIndex].nextSibling) {
          row.insertBefore(newCell, cells[colIndex].nextSibling);
        } else {
          row.appendChild(newCell);
        }
      } else {
        row.insertBefore(newCell, cells[colIndex]);
      }
    } else {
      row.appendChild(newCell);
    }
  });
}

/**
 * Deletes a column from the table.
 */
export function deleteTableColumn(table: HTMLTableElement, targetCell?: HTMLElement | null): boolean {
  let colIndex = -1;
  if (targetCell) {
    colIndex = getCellColumnIndex(targetCell);
  }

  const maxCols = getTableColumnCount(table);
  if (maxCols <= 1) {
    // Remove the table if no columns left
    const wrapper = table.closest('.table-wrapper');
    if (wrapper) wrapper.remove();
    else table.remove();
    return true;
  }

  const targetIndex = colIndex >= 0 ? colIndex : maxCols - 1;

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const cells = Array.from(row.children);
    if (cells[targetIndex]) {
      cells[targetIndex].remove();
    }
  });
  return false;
}

/**
 * Toggles table header (converts first row between TH / TD)
 */
export function toggleTableHeader(table: HTMLTableElement) {
  const thead = table.querySelector('thead');
  if (thead) {
    // Convert thead to regular tbody row
    const ths = thead.querySelectorAll('th');
    const tr = document.createElement('tr');
    ths.forEach((th) => {
      const td = document.createElement('td');
      td.className = 'border border-slate-300 dark:border-slate-700 p-2.5 text-slate-800 dark:text-slate-200';
      td.innerHTML = th.innerHTML;
      tr.appendChild(td);
    });

    let tbody = table.querySelector('tbody');
    if (!tbody) {
      tbody = document.createElement('tbody');
      table.appendChild(tbody);
    }
    tbody.insertBefore(tr, tbody.firstChild);
    thead.remove();
  } else {
    // Convert first row in tbody to thead
    const firstRow = table.querySelector('tr');
    if (!firstRow) return;

    const newThead = document.createElement('thead');
    const newTr = document.createElement('tr');
    const cells = Array.from(firstRow.children);
    cells.forEach((cell) => {
      const th = document.createElement('th');
      th.className = 'border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 p-2.5 font-bold text-slate-900 dark:text-slate-100';
      th.innerHTML = cell.innerHTML;
      newTr.appendChild(th);
    });
    newThead.appendChild(newTr);
    firstRow.remove();
    table.insertBefore(newThead, table.firstChild);
  }
}

/**
 * Sets text alignment for a cell or an entire column.
 */
export function setCellAlignment(
  table: HTMLTableElement,
  targetCell: HTMLElement,
  alignment: 'left' | 'center' | 'right',
  applyToColumn: boolean = false
) {
  if (!targetCell) return;

  if (!applyToColumn) {
    targetCell.style.textAlign = alignment;
    return;
  }

  const colIndex = getCellColumnIndex(targetCell);
  if (colIndex < 0) return;

  const rows = table.querySelectorAll('tr');
  rows.forEach((row) => {
    const cells = Array.from(row.children) as HTMLElement[];
    if (cells[colIndex]) {
      cells[colIndex].style.textAlign = alignment;
    }
  });
}

/**
 * Calculates sum for numeric columns and inserts or updates a <tfoot> with calculated totals.
 */
export function calculateAndToggleSumRow(table: HTMLTableElement): { hasSum: boolean; totals: (number | null)[] } {
  const existingTfoot = table.querySelector('tfoot');
  if (existingTfoot) {
    existingTfoot.remove();
    return { hasSum: false, totals: [] };
  }

  const maxCols = getTableColumnCount(table);
  const totals: (number | null)[] = Array(maxCols).fill(null);
  const numericCount: number[] = Array(maxCols).fill(0);

  // Scan all body rows
  const bodyRows = table.querySelectorAll('tbody tr');
  const rowsToScan = bodyRows.length > 0 ? bodyRows : table.querySelectorAll('tr');

  rowsToScan.forEach((row, rIdx) => {
    // Skip if it's the header row
    if (row.parentElement?.tagName.toLowerCase() === 'thead' || row.querySelector('th')) return;

    const cells = Array.from(row.children);
    cells.forEach((cell, cIdx) => {
      if (cIdx >= maxCols) return;
      const text = cell.textContent?.trim() || '';
      // Clean numbers (remove commas, currency symbols like Rs, $, etc.)
      const cleaned = text.replace(/[^0-9.-]/g, '');
      if (cleaned && !isNaN(Number(cleaned))) {
        const num = parseFloat(cleaned);
        totals[cIdx] = (totals[cIdx] || 0) + num;
        numericCount[cIdx] += 1;
      }
    });
  });

  // Create tfoot
  const tfoot = document.createElement('tfoot');
  const tr = document.createElement('tr');
  tr.className = 'bg-slate-200/80 dark:bg-slate-800/90 font-bold border-t-2 border-slate-400 dark:border-slate-600';

  let hasAnySum = false;
  for (let c = 0; c < maxCols; c++) {
    const td = document.createElement('td');
    td.className = 'border border-slate-300 dark:border-slate-700 p-2.5 font-bold text-slate-900 dark:text-slate-100';

    if (c === 0 && (totals[c] === null || numericCount[c] === 0)) {
      td.innerHTML = '<strong>Total (SUM)</strong>';
    } else if (totals[c] !== null && numericCount[c] > 0) {
      hasAnySum = true;
      const formattedNum = Number.isInteger(totals[c]!)
        ? totals[c]!.toLocaleString()
        : totals[c]!.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      td.innerHTML = `<strong>${formattedNum}</strong>`;
      td.style.textAlign = 'right';
    } else {
      td.innerHTML = '-';
    }
    tr.appendChild(td);
  }

  tfoot.appendChild(tr);
  table.appendChild(tfoot);

  return { hasSum: true, totals };
}

// Internal helpers
function getCellColumnIndex(cell: HTMLElement): number {
  const row = cell.closest('tr');
  if (!row) return -1;
  return Array.from(row.children).indexOf(cell);
}

function getTableColumnCount(table: HTMLTableElement): number {
  const firstRow = table.querySelector('tr');
  if (!firstRow) return 1;
  return firstRow.children.length || 1;
}
