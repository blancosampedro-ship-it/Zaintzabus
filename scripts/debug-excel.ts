// Script de debug para ver los headers del Excel
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import * as path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const filePath = path.join(__dirname, '..', 'Archivos_Excel', 'Flota Ekialdebus.xlsx');
console.log('Leyendo:', filePath);

const wb = XLSX.readFile(filePath);
console.log('Hojas:', wb.SheetNames);

const ws = wb.Sheets[wb.SheetNames[0]];
const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
console.log('Rango:', ws['!ref']);

// Ahora verificar el archivo de fotos
const fotosPath = path.join(__dirname, '..', 'Archivos_Excel', 'Link de Drive-Fotos Ekialdebus.xlsx');
console.log('\n\n=== ARCHIVO DE FOTOS ===');
console.log('Leyendo:', fotosPath);

const wbFotos = XLSX.readFile(fotosPath);
console.log('Hojas:', wbFotos.SheetNames);

const wsFotos = wbFotos.Sheets[wbFotos.SheetNames[0]];
const rangeFotos = XLSX.utils.decode_range(wsFotos['!ref'] || 'A1');
console.log('Rango:', wsFotos['!ref']);

console.log('\n=== VERIFICANDO CADA FILA ===');
for (let r = 0; r <= 5; r++) {
  const rowContent: string[] = [];
  for (let c = 0; c <= rangeFotos.e.c; c++) {
    const cellAddr = XLSX.utils.encode_cell({ r: r, c: c });
    const cell = wsFotos[cellAddr];
    if (cell) rowContent.push(`${c}:"${cell.v}"`);
  }
  console.log(`Fila ${r} (Excel ${r+1}):`, rowContent.join(' | ') || '(vacía)');
}
