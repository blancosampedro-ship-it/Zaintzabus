/**
 * Script para analizar Excel con más detalle (incluyendo celdas combinadas)
 */

import XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

const EXCEL_DIR = './Archivos_Excel';

function analyzeExcelDeep(filePath: string) {
  console.log('\n' + '='.repeat(100));
  console.log(`📊 ARCHIVO: ${path.basename(filePath)}`);
  console.log('='.repeat(100));

  try {
    const workbook = XLSX.readFile(filePath, { cellStyles: true });
    
    workbook.SheetNames.forEach((sheetName, index) => {
      console.log(`\n${'─'.repeat(80)}`);
      console.log(`📄 HOJA: "${sheetName}"`);
      console.log('─'.repeat(80));
      
      const sheet = workbook.Sheets[sheetName];
      
      // Obtener rango de la hoja
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
      console.log(`   Rango: ${sheet['!ref']}`);
      console.log(`   Filas: ${range.e.r - range.s.r + 1}, Columnas: ${range.e.c - range.s.c + 1}`);
      
      // Mostrar todas las celdas con contenido
      console.log(`\n   📋 CONTENIDO (primeras 30 filas):\n`);
      
      for (let row = range.s.r; row <= Math.min(range.e.r, 29); row++) {
        let rowContent: string[] = [];
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          if (cell && cell.v !== undefined && cell.v !== null && cell.v !== '') {
            rowContent.push(`[${XLSX.utils.encode_col(col)}${row+1}]: ${String(cell.v).substring(0, 40)}`);
          }
        }
        if (rowContent.length > 0) {
          console.log(`   Fila ${row + 1}: ${rowContent.join(' | ')}`);
        }
      }

      // Si hay más filas, indicarlo
      if (range.e.r > 29) {
        console.log(`\n   ... y ${range.e.r - 29} filas más`);
      }
    });

  } catch (error) {
    console.log(`   ❌ Error: ${error}`);
  }
}

const excelFiles = fs.readdirSync(EXCEL_DIR)
  .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
  .map(f => path.join(EXCEL_DIR, f));

console.log('🔍 ANÁLISIS DETALLADO DE ARCHIVOS EXCEL\n');

excelFiles.forEach(file => analyzeExcelDeep(file));

console.log('\n\n✅ ANÁLISIS COMPLETADO');
