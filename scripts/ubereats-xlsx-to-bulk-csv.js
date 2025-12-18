#!/usr/bin/env node

/*
Convert an Uber Eats Grocery Menu Template XLSX (sheet: Template) into the
bulk-edit CSV format used by the admin tool.

Usage:
  node scripts/ubereats-xlsx-to-bulk-csv.js <input.xlsx> <output.csv>

Output columns:
  barcode,name,price,description,category,is_active

Mapping (Uber Eats -> bulk):
  UPC/EAN -> barcode
  Product Name (+ brand + size / weight) -> name
  Price (incl VAT) Standard -> price
  Description -> description
  Category -> category
  Out of Stock? (0 or 1) -> is_active (1 => true, 0 => false)

Notes:
- The template sheet is named "Template".
- Rows without barcode are skipped.
*/

const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

function stringifyCsvValue(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  // escape quotes by doubling
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

function toNumberMaybe(v) {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const s = String(v).trim();
  if (!s) return undefined;
  // support comma decimal just in case
  const normalized = s.replace(',', '.');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : undefined;
}

function normalizeHeader(h) {
  return String(h || '')
    .trim()
    .replace(/\s+/g, ' ');
}

function main() {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input || !output) {
    console.error('Usage: node scripts/ubereats-xlsx-to-bulk-csv.js <input.xlsx> <output.csv>');
    process.exit(1);
  }
  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    process.exit(1);
  }

  const wb = xlsx.readFile(input, { cellDates: true });
  const sheetName = 'Template';
  const ws = wb.Sheets[sheetName];
  if (!ws) {
    console.error(`Sheet not found: ${sheetName}`);
    console.error('Available sheets:');
    for (const s of wb.SheetNames || []) console.error(`- ${s}`);
    process.exit(1);
  }

  const rows = xlsx.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
  if (!rows.length) {
    console.error('Template sheet is empty.');
    process.exit(1);
  }

  // Find header row containing UPC/EAN
  let headerRowIndex = -1;
  let header = [];
  for (let i = 0; i < Math.min(rows.length, 50); i++) {
    const r = rows[i] || [];
    const normalized = r.map(normalizeHeader);
    const idx = normalized.findIndex((c) => c.toLowerCase() === 'upc/ean');
    if (idx !== -1) {
      headerRowIndex = i;
      header = normalized;
      break;
    }
  }

  if (headerRowIndex === -1) {
    console.error('Could not find header row with "UPC/EAN" in the first 50 rows.');
    process.exit(1);
  }

  const colIndex = (name) => header.findIndex((h) => h.toLowerCase() === name.toLowerCase());

  const idxBarcode = colIndex('UPC/EAN');
  const idxName = colIndex('Product Name (+ brand + size / weight)');
  const idxCategory = colIndex('Category');
  const idxPrice = colIndex('Price (incl VAT) Standard');
  const idxDescription = colIndex('Description');
  const idxOutOfStock = colIndex('Out of Stock? (0 or 1)');

  if (idxBarcode === -1 || idxName === -1 || idxCategory === -1 || idxPrice === -1) {
    console.error('Missing required columns in Template sheet.');
    console.error('Found headers:');
    console.error(header.join(' | '));
    process.exit(1);
  }

  const outHeader = ['barcode', 'name', 'price', 'description', 'category', 'is_active'];
  const outLines = [outHeader.join(',')];

  let kept = 0;
  let skipped = 0;

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const r = rows[i] || [];
    const barcode = String(r[idxBarcode] ?? '').trim();
    if (!barcode) {
      skipped++;
      continue;
    }

    const name = String(r[idxName] ?? '').trim();
    const category = String(r[idxCategory] ?? '').trim();
    const description = idxDescription !== -1 ? String(r[idxDescription] ?? '').trim() : '';
    const priceNum = toNumberMaybe(r[idxPrice]);

    // Uber template says: 0 = no stock, 1 = in stock
    let isActive = '';
    if (idxOutOfStock !== -1) {
      const v = String(r[idxOutOfStock] ?? '').trim();
      if (v === '0') isActive = 'false';
      else if (v === '1') isActive = 'true';
    }

    const outRow = [
      stringifyCsvValue(barcode),
      stringifyCsvValue(name),
      stringifyCsvValue(priceNum ?? ''),
      stringifyCsvValue(description),
      stringifyCsvValue(category),
      stringifyCsvValue(isActive),
    ];

    outLines.push(outRow.join(','));
    kept++;
  }

  const outDir = path.dirname(output);
  if (outDir && outDir !== '.') fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(output, outLines.join('\n') + '\n', 'utf8');

  console.log(`✅ Bulk CSV generated: ${output}`);
  console.log(`   Rows kept: ${kept}`);
  console.log(`   Rows skipped (no barcode): ${skipped}`);
}

main();
