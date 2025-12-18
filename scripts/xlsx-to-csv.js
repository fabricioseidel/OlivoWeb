#!/usr/bin/env node

/*
Usage:
  node scripts/xlsx-to-csv.js input.xlsx output.csv
  node scripts/xlsx-to-csv.js input.xlsx output.csv --sheet "Template"

Notes:
- If --sheet is omitted, it uses the first sheet.
- If the sheet name doesn't exist, it prints available sheet names.
*/

const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 2; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--sheet") {
      args.sheet = argv[i + 1];
      i++;
    } else {
      args._.push(token);
    }
  }
  return args;
}

function normalizeNewlines(text) {
  return String(text || "").replace(/\r\n/g, "\n");
}

function main() {
  const args = parseArgs(process.argv);
  const input = args._[0];
  const output = args._[1];
  const sheetName = args.sheet;

  if (!input || !output) {
    console.error("Usage: node scripts/xlsx-to-csv.js <input.xlsx> <output.csv> [--sheet <SheetName>]");
    process.exit(1);
  }

  if (!fs.existsSync(input)) {
    console.error(`Input file not found: ${input}`);
    process.exit(1);
  }

  const workbook = xlsx.readFile(input, { cellDates: true });
  const sheetNames = workbook.SheetNames || [];

  if (sheetNames.length === 0) {
    console.error("No sheets found in workbook.");
    process.exit(1);
  }

  const selectedSheetName = sheetName || sheetNames[0];
  const worksheet = workbook.Sheets[selectedSheetName];

  if (!worksheet) {
    console.error(`Sheet not found: ${selectedSheetName}`);
    console.error("Available sheets:");
    for (const s of sheetNames) console.error(`- ${s}`);
    process.exit(1);
  }

  const csv = xlsx.utils.sheet_to_csv(worksheet, {
    FS: ",",
    RS: "\n",
    strip: true,
  });

  const outDir = path.dirname(output);
  if (outDir && outDir !== ".") {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(output, normalizeNewlines(csv), "utf8");

  console.log(`✅ Converted: ${input}`);
  console.log(`   Sheet: ${selectedSheetName}`);
  console.log(`   Output: ${output}`);
}

main();
