/**
 * Script para analizar los archivos Excel y mostrar su estructura
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_DIR = './Archivos_Excel';

function analyzeExcel(filePath: string) {
  console.log('\n' + '='.repeat(80));
  console.log(`📊 ARCHIVO: ${path.basename(filePath)}`);
  console.log('='.repeat(80));

  try {
    const workbook = XLSX.readFile(filePath);
    
    console.log(`\n📑 Hojas encontradas: ${workbook.SheetNames.length}`);
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`📄 HOJA ${index + 1}: "${sheetName}"`);
      console.log('─'.repeat(60));
      
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      
      if (data.length === 0) {
        console.log('   ⚠️ Hoja vacía');
        return;
      }

      // Mostrar cabeceras (primera fila)
      const headers = data[0];
      console.log(`\n   📋 Columnas (${headers?.length || 0}):`);
      if (headers) {
        headers.forEach((h, i) => {
          if (h !== undefined && h !== null && h !== '') {
            console.log(`      ${i + 1}. ${h}`);
          }
        });
      }

      // Contar filas con datos
      const rowsWithData = data.filter((row, i) => i > 0 && row.some(cell => cell !== undefined && cell !== null && cell !== '')).length;
      console.log(`\n   📊 Filas de datos: ${rowsWithData}`);

      // Mostrar primeras 3 filas de ejemplo
      if (rowsWithData > 0) {
        console.log(`\n   📝 Ejemplos (primeras 3 filas):`);
        for (let i = 1; i <= Math.min(3, data.length - 1); i++) {
          const row = data[i];
          if (row && row.some(cell => cell !== undefined && cell !== null)) {
            console.log(`\n      Fila ${i}:`);
            headers?.forEach((h, j) => {
              if (h && row[j] !== undefined && row[j] !== null && row[j] !== '') {
                const value = String(row[j]).substring(0, 50);
                console.log(`         ${h}: ${value}${String(row[j]).length > 50 ? '...' : ''}`);
              }
            });
          }
        }
      }
    });

  } catch (error) {
    console.log(`   ❌ Error al leer: ${error}`);
  }
}

// Obtener todos los archivos Excel
const excelFiles = fs.readdirSync(EXCEL_DIR)
  .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
  .map(f => path.join(EXCEL_DIR, f));

console.log('🔍 ANÁLISIS DE ARCHIVOS EXCEL');
console.log(`📁 Directorio: ${EXCEL_DIR}`);
console.log(`📄 Archivos encontrados: ${excelFiles.length}`);

excelFiles.forEach(file => analyzeExcel(file));

console.log('\n\n' + '='.repeat(80));
console.log('✅ ANÁLISIS COMPLETADO');
console.log('='.repeat(80));
