/**
 * Script de importación de datos Excel a Firestore
 * 
 * Importa:
 * 1. Buses desde "Flota Ekialdebus.xlsx" → colección "activos"
 * 2. Equipos instalados → colección "inventario"
 * 3. Fotos de equipos desde "Link de Drive-Fotos Ekialdebus.xlsx"
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { createRequire } from 'module';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

// Inicializar Firebase Admin
const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccountPath),
  });
}

const db = getFirestore();
const TENANT_ID = 'lurraldebus-gipuzkoa';

// ============================================
// TIPOS
// ============================================

interface BusData {
  operador: string;
  codigoBus: string;
  matricula: string;
  bastidor: string;
  modelo: string;
  carroceria: string;
  fechaInstalacion: Date | null;
  instalador: string;
  comentarios: string;
  equipos: EquipoData[];
}

interface EquipoData {
  tipo: string;
  categoria: string;
  modelo: string;
  numeroSerie: string;
  posicion?: string;
  fotoUrl?: string;
}

interface FotoData {
  operador: string;
  numeroBus: string;
  matricula: string;
  modelo: string;
  codigo: string;
  descripcion: string;
  urlDrive: string;
}

// ============================================
// UTILIDADES
// ============================================

function excelDateToJS(excelDate: number): Date | null {
  if (!excelDate || typeof excelDate !== 'number') return null;
  // Excel fecha base: 1/1/1900, pero hay un bug del año bisiesto 1900
  const date = new Date((excelDate - 25569) * 86400 * 1000);
  return isNaN(date.getTime()) ? null : date;
}

function cleanString(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function normalizeEquipoTipo(tipo: string): { tipo: string; categoria: string } {
  const tipoLower = tipo.toLowerCase();
  
  if (tipoLower.includes('camara') || tipoLower.includes('cámara')) {
    return { tipo: 'componente', categoria: 'Cámaras' };
  }
  if (tipoLower.includes('router')) {
    return { tipo: 'componente', categoria: 'Comunicaciones' };
  }
  if (tipoLower.includes('switch')) {
    return { tipo: 'componente', categoria: 'Comunicaciones' };
  }
  if (tipoLower.includes('cpu') || tipoLower.includes('pc')) {
    return { tipo: 'componente', categoria: 'Computación' };
  }
  if (tipoLower.includes('amplificador')) {
    return { tipo: 'componente', categoria: 'Audio' };
  }
  if (tipoLower.includes('validadora')) {
    return { tipo: 'componente', categoria: 'Validación' };
  }
  if (tipoLower.includes('pupitre')) {
    return { tipo: 'componente', categoria: 'Control' };
  }
  if (tipoLower.includes('antena') || tipoLower.includes('wifi')) {
    return { tipo: 'componente', categoria: 'Comunicaciones' };
  }
  if (tipoLower.includes('sim') || tipoLower.includes('ip')) {
    return { tipo: 'componente', categoria: 'Comunicaciones' };
  }
  
  return { tipo: 'componente', categoria: 'Otros' };
}

// ============================================
// PARSEO DE EXCEL
// ============================================

function parseFlotaExcel(filePath: string): BusData[] {
  console.log('\n📂 Leyendo archivo de flota:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Obtener rango de datos
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // IMPORTANTE: Los headers están en la fila 8 (índice 7), no en la fila 1
  const HEADER_ROW = 7;
  const DATA_START_ROW = 8;
  
  // Leer headers (fila 8 = índice 7)
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: HEADER_ROW, c: col });
    const cell = worksheet[cellAddress];
    headers.push(cell ? cleanString(cell.v) : '');
  }
  
  console.log('📋 Headers encontrados:', headers.filter(h => h).slice(0, 10).join(', ') + '...');
  
  // Mapeo de columnas basado en los headers EXACTOS del Excel
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    const headerUpper = h.toUpperCase().trim();
    // Datos básicos del bus
    if (headerUpper === 'COD_BUS') colIndex['codigoBus'] = i;
    if (headerUpper === 'MATRICULA') colIndex['matricula'] = i;
    if (headerUpper.includes('OBRA') || headerUpper.includes('CHASIS')) colIndex['bastidor'] = i;
    if (headerUpper.includes('MODELO') && headerUpper.includes('AUTOB')) colIndex['modelo'] = i;
    if (headerUpper.includes('CARROCERIA')) colIndex['carroceria'] = i;
    // Equipos
    if (headerUpper.includes('AMPLIFICADOR')) colIndex['amplificador'] = i;
    if (headerUpper.includes('CPU')) colIndex['cpu'] = i;
    if (headerUpper === 'LICENCIA') colIndex['licencia'] = i;
    if (headerUpper === 'SWITCH') colIndex['switch'] = i;
    if (headerUpper === 'ROUTER') colIndex['router'] = i;
    if (headerUpper === 'IP SIM') colIndex['ipSim'] = i;
    if (headerUpper === 'SIM M2M') colIndex['simM2m'] = i;
    if (headerUpper === 'SIM WIFI 3G') colIndex['simWifi'] = i;
    if (headerUpper === 'WIFI') colIndex['wifi'] = i;
    if (headerUpper === 'COMMS 1') colIndex['comms1'] = i;
    if (headerUpper === 'COMMS 2') colIndex['comms2'] = i;
    if (headerUpper === 'CAMARA 1') colIndex['camara1'] = i;
    if (headerUpper === 'CAMARA 2') colIndex['camara2'] = i;
    if (headerUpper === 'CAMARA 3') colIndex['camara3'] = i;
    if (headerUpper === 'CAMARA 4') colIndex['camara4'] = i;
    if (headerUpper.includes('PUPITE')) colIndex['pupitre'] = i;
    if (headerUpper === 'VALIDADORA 1') colIndex['validadora1'] = i;
    if (headerUpper === 'VALIDADORA 2') colIndex['validadora2'] = i;
    if (headerUpper === 'VALIDADORA 3') colIndex['validadora3'] = i;
    // Metadatos
    if (headerUpper.includes('FECHA') && headerUpper.includes('INSTALACI')) colIndex['fechaInstalacion'] = i;
    if (headerUpper.includes('INSTALADOR')) colIndex['instalador'] = i;
    if (headerUpper === 'COMENTARIOS') colIndex['comentarios'] = i;
  });
  
  console.log('🔍 Columnas mapeadas:', Object.keys(colIndex).join(', '));
  
  // Parsear filas de datos (empezando en fila 9 = índice 8)
  const buses: BusData[] = [];
  
  for (let row = DATA_START_ROW; row <= range.e.r; row++) {
    const getCellValue = (colName: string): any => {
      const col = colIndex[colName];
      if (col === undefined) return '';
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      return cell ? cell.v : '';
    };
    
    const matricula = cleanString(getCellValue('matricula'));
    const codigoBus = cleanString(getCellValue('codigoBus'));
    
    // Saltar filas vacías
    if (!matricula && !codigoBus) continue;
    
    // Recopilar equipos del bus
    const equipos: EquipoData[] = [];
    
    // Amplificador
    const amplificador = cleanString(getCellValue('amplificador'));
    if (amplificador) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Audio',
        modelo: 'Amplificador',
        numeroSerie: amplificador,
      });
    }
    
    // CPU
    const cpu = cleanString(getCellValue('cpu'));
    if (cpu) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Computación',
        modelo: 'CPU',
        numeroSerie: cpu,
      });
    }
    
    // Switch
    const switchVal = cleanString(getCellValue('switch'));
    if (switchVal) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'Switch',
        numeroSerie: switchVal,
      });
    }
    
    // Router
    const router = cleanString(getCellValue('router'));
    if (router) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'Router',
        numeroSerie: router,
      });
    }
    
    // SIM M2M
    const simM2m = cleanString(getCellValue('simM2m'));
    if (simM2m) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'SIM M2M',
        numeroSerie: simM2m,
      });
    }
    
    // SIM WiFi 3G
    const simWifi = cleanString(getCellValue('simWifi'));
    if (simWifi) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'SIM WiFi 3G',
        numeroSerie: simWifi,
      });
    }
    
    // WiFi/Antena
    const wifi = cleanString(getCellValue('wifi'));
    if (wifi) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'Antena WiFi',
        numeroSerie: wifi,
      });
    }
    
    // COMMS 1 y 2
    const comms1 = cleanString(getCellValue('comms1'));
    if (comms1) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'COMMS 1',
        numeroSerie: comms1,
      });
    }
    const comms2 = cleanString(getCellValue('comms2'));
    if (comms2) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Comunicaciones',
        modelo: 'COMMS 2',
        numeroSerie: comms2,
      });
    }
    
    // Cámaras
    for (let i = 1; i <= 4; i++) {
      const camara = cleanString(getCellValue(`camara${i}`));
      if (camara) {
        equipos.push({
          tipo: 'componente',
          categoria: 'Cámaras',
          modelo: `Cámara ${i}`,
          numeroSerie: camara,
          posicion: `Posición ${i}`,
        });
      }
    }
    
    // Pupitre
    const pupitre = cleanString(getCellValue('pupitre'));
    if (pupitre) {
      equipos.push({
        tipo: 'componente',
        categoria: 'Control',
        modelo: 'Pupitre',
        numeroSerie: pupitre,
      });
    }
    
    // Validadoras
    for (let i = 1; i <= 3; i++) {
      const validadora = cleanString(getCellValue(`validadora${i}`));
      if (validadora) {
        equipos.push({
          tipo: 'componente',
          categoria: 'Validación',
          modelo: `Validadora ${i}`,
          numeroSerie: validadora,
          posicion: `Puerta ${i}`,
        });
      }
    }
    
    const fechaRaw = getCellValue('fechaInstalacion');
    const fechaInstalacion = typeof fechaRaw === 'number' ? excelDateToJS(fechaRaw) : null;
    
    buses.push({
      operador: cleanString(getCellValue('operador')) || 'EKIALDEBUS',
      codigoBus: codigoBus,
      matricula: matricula,
      bastidor: cleanString(getCellValue('bastidor')),
      modelo: cleanString(getCellValue('modelo')),
      carroceria: cleanString(getCellValue('carroceria')),
      fechaInstalacion,
      instalador: cleanString(getCellValue('instalador')),
      comentarios: cleanString(getCellValue('comentarios')),
      equipos,
    });
  }
  
  console.log(`✅ ${buses.length} buses parseados`);
  return buses;
}

function parseFotosExcel(filePath: string): FotoData[] {
  console.log('\n📂 Leyendo archivo de fotos:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  
  // Headers están en fila 5 (índice 4), datos empiezan en fila 6 (índice 5)
  const HEADER_ROW = 4;
  const DATA_START_ROW = 5;
  
  // Leer headers
  const headers: string[] = [];
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: HEADER_ROW, c: col });
    const cell = worksheet[cellAddress];
    headers.push(cell ? cleanString(cell.v).toLowerCase() : '');
  }
  
  console.log('   Headers:', headers.filter(h => h).join(', '));
  
  const colIndex: Record<string, number> = {};
  headers.forEach((h, i) => {
    if (h.includes('operador')) colIndex['operador'] = i;
    if (h.includes('bus')) colIndex['numeroBus'] = i;
    if (h.includes('matricula') || h.includes('matrícula')) colIndex['matricula'] = i;
    if (h.includes('modelo')) colIndex['modelo'] = i;
    if (h === 'codigo' || h === 'código') colIndex['codigo'] = i;
    if (h.includes('descripcion') || h.includes('descripción')) colIndex['descripcion'] = i;
    if (h.includes('drive') || h.includes('localizacion')) colIndex['urlDrive'] = i;
  });
  
  const fotos: FotoData[] = [];
  let currentBusData = { operador: '', numeroBus: '', matricula: '', modelo: '' };
  
  for (let row = DATA_START_ROW; row <= range.e.r; row++) {
    const getCellValue = (colName: string): string => {
      const col = colIndex[colName];
      if (col === undefined) return '';
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[cellAddress];
      return cell ? cleanString(cell.v) : '';
    };
    
    const urlDrive = getCellValue('urlDrive');
    if (!urlDrive || !urlDrive.startsWith('http')) continue;
    
    // Actualizar datos del bus si están presentes (a veces están vacíos en filas posteriores)
    const operador = getCellValue('operador');
    const numeroBus = getCellValue('numeroBus');
    const matricula = getCellValue('matricula');
    const modelo = getCellValue('modelo');
    
    if (operador) currentBusData.operador = operador;
    if (numeroBus) currentBusData.numeroBus = numeroBus;
    if (matricula) currentBusData.matricula = matricula;
    if (modelo) currentBusData.modelo = modelo;
    
    fotos.push({
      operador: currentBusData.operador,
      numeroBus: currentBusData.numeroBus,
      matricula: currentBusData.matricula,
      modelo: currentBusData.modelo,
      codigo: getCellValue('codigo'),
      descripcion: getCellValue('descripcion'),
      urlDrive,
    });
  }
  
  console.log(`✅ ${fotos.length} fotos parseadas`);
  return fotos;
}

// ============================================
// IMPORTACIÓN A FIRESTORE
// ============================================

async function importarOperador(): Promise<string> {
  console.log('\n🏢 Importando operador EKIALDEBUS...');
  
  const operadorRef = db.collection(`tenants/${TENANT_ID}/operadores`);
  const snapshot = await operadorRef.where('codigo', '==', '26').get();
  
  if (!snapshot.empty) {
    console.log('   ➡️ Operador ya existe:', snapshot.docs[0].id);
    return snapshot.docs[0].id;
  }
  
  const docRef = await operadorRef.add({
    codigo: '26',
    nombre: 'EKIALDEBUS',
    nombreCompleto: 'Ekialdebus S.L.',
    activo: true,
    tenantId: TENANT_ID,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  
  console.log('   ✅ Operador creado:', docRef.id);
  return docRef.id;
}

async function importarBuses(buses: BusData[], operadorId: string): Promise<Map<string, string>> {
  console.log('\n🚌 Importando buses a Firestore...');
  
  const activosRef = db.collection(`tenants/${TENANT_ID}/activos`);
  const busIdMap = new Map<string, string>(); // matricula -> docId
  
  let creados = 0;
  let existentes = 0;
  
  for (const bus of buses) {
    // Verificar si ya existe por matrícula
    const existente = await activosRef.where('matricula', '==', bus.matricula).get();
    
    if (!existente.empty) {
      busIdMap.set(bus.matricula, existente.docs[0].id);
      existentes++;
      continue;
    }
    
    const activoData = {
      tipo: 'autobus',
      subtipo: bus.carroceria || 'Urbano',
      codigo: bus.codigoBus || `BUS-${bus.matricula}`,
      marca: bus.modelo.split(' ')[0] || 'Mercedes',
      modelo: bus.modelo,
      matricula: bus.matricula,
      numeroSerie: bus.bastidor,
      bastidor: bus.bastidor,
      carroceria: bus.carroceria,
      fechaAlta: bus.fechaInstalacion 
        ? Timestamp.fromDate(bus.fechaInstalacion)
        : FieldValue.serverTimestamp(),
      estado: 'operativo',
      operadorId: operadorId,
      operadorNombre: bus.operador,
      instalador: bus.instalador,
      comentarios: bus.comentarios,
      equipos: [], // Se llenarán después
      horasOperacion: 0,
      kmTotales: 0,
      tenantId: TENANT_ID,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    const docRef = await activosRef.add(activoData);
    busIdMap.set(bus.matricula, docRef.id);
    creados++;
  }
  
  console.log(`   ✅ ${creados} buses creados, ${existentes} ya existían`);
  return busIdMap;
}

async function importarEquipos(
  buses: BusData[], 
  busIdMap: Map<string, string>,
  fotos: FotoData[]
): Promise<void> {
  console.log('\n🔧 Importando equipos a inventario...');
  
  const inventarioRef = db.collection(`tenants/${TENANT_ID}/inventario`);
  const activosRef = db.collection(`tenants/${TENANT_ID}/activos`);
  
  let equiposCreados = 0;
  let equiposActualizados = 0;
  let fotosAsociadas = 0;
  
  // Crear mapa de fotos por matrícula + tipo de equipo
  // Ej: "1025-HZH|validadora 1" -> URL
  const fotosMap = new Map<string, string>();
  fotos.forEach(foto => {
    if (foto.urlDrive && foto.matricula && foto.descripcion) {
      const key = `${foto.matricula.toLowerCase()}|${foto.descripcion.toLowerCase()}`;
      fotosMap.set(key, foto.urlDrive);
    }
  });
  
  console.log(`   📸 ${fotosMap.size} fotos indexadas`);
  
  for (const bus of buses) {
    const busDocId = busIdMap.get(bus.matricula);
    if (!busDocId) continue;
    
    const equiposInstalados: any[] = [];
    
    for (const equipo of bus.equipos) {
      if (!equipo.numeroSerie) continue;
      
      // Buscar foto asociada por matrícula + tipo de equipo
      const fotoKey = `${bus.matricula.toLowerCase()}|${equipo.modelo.toLowerCase()}`;
      let fotoUrl = fotosMap.get(fotoKey);
      
      // Si no encuentra por modelo exacto, intentar por categoría
      if (!fotoUrl) {
        fotosMap.forEach((url, key) => {
          if (key.startsWith(bus.matricula.toLowerCase() + '|') && !fotoUrl) {
            const desc = key.split('|')[1];
            if (equipo.modelo.toLowerCase().includes(desc.split(' ')[0]) ||
                desc.includes(equipo.modelo.toLowerCase().split(' ')[0])) {
              fotoUrl = url;
            }
          }
        });
      }
      
      if (fotoUrl) fotosAsociadas++;
      
      // Generar SKU único
      const sku = `${equipo.categoria.substring(0, 3).toUpperCase()}-${equipo.numeroSerie.substring(0, 8)}`;
      
      // Verificar si ya existe
      const existente = await inventarioRef.where('numeroSerie', '==', equipo.numeroSerie).get();
      
      let inventarioId: string;
      
      if (!existente.empty) {
        inventarioId = existente.docs[0].id;
      } else {
        const inventarioData: Record<string, any> = {
          sku: sku,
          descripcion: `${equipo.modelo} - Bus ${bus.codigoBus}`,
          tipo: equipo.tipo,
          categoria: equipo.categoria,
          fabricante: 'Varios',
          modelo: equipo.modelo,
          numeroSerie: equipo.numeroSerie,
          estado: 'instalado',
          ubicacion: {
            tipo: 'activo',
            referenciaId: busDocId,
            descripcion: `Bus ${bus.codigoBus} - ${bus.matricula}`,
          },
          compatibleCon: ['autobus'],
          ultimoMovimiento: FieldValue.serverTimestamp(),
          historialMovimientos: [],
          cantidadDisponible: 1,
          cantidadMinima: 0,
          tenantId: TENANT_ID,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        
        // Solo agregar campos opcionales si tienen valor
        if (equipo.posicion) inventarioData.posicion = equipo.posicion;
        if (fotoUrl) inventarioData.fotoUrl = fotoUrl;
        
        const docRef = await inventarioRef.add(inventarioData);
        inventarioId = docRef.id;
        equiposCreados++;
      }
      
      // Agregar a lista de equipos del bus
      const equipoInstalado: Record<string, any> = {
        inventarioId,
        tipo: equipo.modelo,
        categoria: equipo.categoria,
        numeroSerie: equipo.numeroSerie,
        fechaInstalacion: bus.fechaInstalacion 
          ? Timestamp.fromDate(bus.fechaInstalacion)
          : Timestamp.now(),
      };
      if (equipo.posicion) equipoInstalado.posicion = equipo.posicion;
      equiposInstalados.push(equipoInstalado);
    }
    
    // Actualizar el bus con sus equipos
    if (equiposInstalados.length > 0) {
      await activosRef.doc(busDocId).update({
        equipos: equiposInstalados,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }
  
  console.log(`   ✅ ${equiposCreados} equipos creados en inventario`);
  console.log(`   📸 ${fotosAsociadas} fotos asociadas a equipos`);
}

async function crearTecnicosDemo(): Promise<void> {
  console.log('\n👷 Creando técnicos de demostración...');
  
  const tecnicosRef = db.collection(`tenants/${TENANT_ID}/tecnicos`);
  const snapshot = await tecnicosRef.limit(1).get();
  
  if (!snapshot.empty) {
    console.log('   ➡️ Ya existen técnicos');
    return;
  }
  
  const tecnicos = [
    { nombre: 'Carlos', apellidos: 'García López', email: 'carlos.garcia@zaintzabus.com', especialidad: 'Sistemas ITS' },
    { nombre: 'Ana', apellidos: 'Martínez Ruiz', email: 'ana.martinez@zaintzabus.com', especialidad: 'Validadoras' },
    { nombre: 'Miguel', apellidos: 'Fernández Soto', email: 'miguel.fernandez@zaintzabus.com', especialidad: 'Comunicaciones' },
  ];
  
  for (const tecnico of tecnicos) {
    await tecnicosRef.add({
      ...tecnico,
      activo: true,
      tenantId: TENANT_ID,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }
  
  console.log(`   ✅ ${tecnicos.length} técnicos creados`);
}

async function crearCategoriasInventario(): Promise<void> {
  console.log('\n📦 Creando categorías de inventario...');
  
  const categoriasRef = db.collection(`tenants/${TENANT_ID}/categorias`);
  const snapshot = await categoriasRef.limit(1).get();
  
  if (!snapshot.empty) {
    console.log('   ➡️ Ya existen categorías');
    return;
  }
  
  const categorias = [
    { nombre: 'Cámaras', descripcion: 'Cámaras de videovigilancia', icono: 'camera' },
    { nombre: 'Comunicaciones', descripcion: 'Routers, switches, antenas', icono: 'wifi' },
    { nombre: 'Computación', descripcion: 'CPUs, PCs embarcados', icono: 'cpu' },
    { nombre: 'Validación', descripcion: 'Validadoras de billetes', icono: 'credit-card' },
    { nombre: 'Control', descripcion: 'Pupitres y paneles de control', icono: 'sliders' },
    { nombre: 'Audio', descripcion: 'Amplificadores y megafonía', icono: 'volume-2' },
    { nombre: 'Otros', descripcion: 'Otros equipos', icono: 'package' },
  ];
  
  for (const cat of categorias) {
    await categoriasRef.add({
      ...cat,
      activo: true,
      tenantId: TENANT_ID,
      createdAt: FieldValue.serverTimestamp(),
    });
  }
  
  console.log(`   ✅ ${categorias.length} categorías creadas`);
}

// ============================================
// FUNCIÓN PRINCIPAL
// ============================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('     IMPORTACIÓN DE DATOS EXCEL A FIRESTORE');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`\n📍 Tenant: ${TENANT_ID}`);
  
  const excelFolder = path.join(__dirname, '..', 'Archivos_Excel');
  
  // Verificar archivos
  const flotaPath = path.join(excelFolder, 'Flota Ekialdebus.xlsx');
  const fotosPath = path.join(excelFolder, 'Link de Drive-Fotos Ekialdebus.xlsx');
  
  if (!fs.existsSync(flotaPath)) {
    console.error('❌ No se encontró el archivo de flota:', flotaPath);
    process.exit(1);
  }
  
  try {
    // 1. Parsear archivos Excel
    const buses = parseFlotaExcel(flotaPath);
    const fotos = fs.existsSync(fotosPath) ? parseFotosExcel(fotosPath) : [];
    
    // 2. Importar operador
    const operadorId = await importarOperador();
    
    // 3. Importar buses
    const busIdMap = await importarBuses(buses, operadorId);
    
    // 4. Importar equipos con fotos
    await importarEquipos(buses, busIdMap, fotos);
    
    // 5. Crear datos auxiliares
    await crearTecnicosDemo();
    await crearCategoriasInventario();
    
    // 6. Resumen final
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('     IMPORTACIÓN COMPLETADA');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n📊 Resumen:');
    console.log(`   • Buses importados: ${busIdMap.size}`);
    console.log(`   • Total equipos procesados: ${buses.reduce((sum, b) => sum + b.equipos.length, 0)}`);
    console.log(`   • Fotos disponibles: ${fotos.length}`);
    console.log('\n✅ Los datos están listos para usar en la aplicación');
    
  } catch (error) {
    console.error('\n❌ Error durante la importación:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();
