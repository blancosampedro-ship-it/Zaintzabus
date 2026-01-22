'use strict';

import * as XLSX from 'xlsx';
import type {
  FilaImportacion,
  MapeoColumna,
  ConfiguracionImportacion,
  ErrorValidacion,
  EstadoValidacion,
  LogImportacion,
} from '@/types';

// ============================================
// PARSER DE EXCEL
// ============================================

/**
 * Lee un archivo Excel y retorna los datos como array de objetos
 */
export function leerExcel(file: File | ArrayBuffer): Promise<{
  hojas: string[];
  datos: Record<string, unknown>[][];
  encabezados: Record<string, string[]>;
}> {
  return new Promise((resolve, reject) => {
    try {
      const processWorkbook = (workbook: XLSX.WorkBook) => {
        const hojas = workbook.SheetNames;
        const datos: Record<string, unknown>[][] = [];
        const encabezados: Record<string, string[]> = {};

        hojas.forEach((nombreHoja) => {
          const hoja = workbook.Sheets[nombreHoja];
          const datosHoja = XLSX.utils.sheet_to_json(hoja, { header: 1 }) as unknown[][];
          
          // Extraer encabezados (primera fila)
          if (datosHoja.length > 0) {
            encabezados[nombreHoja] = (datosHoja[0] as string[]).map((h) => 
              String(h || '').trim()
            );
          }

          // Convertir filas a objetos
          const datosObjetos: Record<string, unknown>[] = [];
          const headers = encabezados[nombreHoja] || [];
          
          for (let i = 1; i < datosHoja.length; i++) {
            const fila = datosHoja[i] as unknown[];
            const objeto: Record<string, unknown> = {};
            
            headers.forEach((header, index) => {
              if (header) {
                objeto[header] = fila[index];
              }
            });
            
            // Solo añadir filas que no estén completamente vacías
            if (Object.values(objeto).some((v) => v !== undefined && v !== null && v !== '')) {
              datosObjetos.push(objeto);
            }
          }
          
          datos.push(datosObjetos);
        });

        resolve({ hojas, datos, encabezados });
      };

      if (file instanceof File) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'array', cellDates: true });
          processWorkbook(workbook);
        };
        reader.onerror = () => reject(new Error('Error leyendo el archivo'));
        reader.readAsArrayBuffer(file);
      } else {
        const workbook = XLSX.read(file, { type: 'array', cellDates: true });
        processWorkbook(workbook);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Detecta automáticamente el mapeo de columnas basado en nombres comunes
 */
export function detectarMapeoAutomatico(
  encabezados: string[],
  tipoEntidad: ConfiguracionImportacion['tipoEntidad']
): MapeoColumna[] {
  const mapeosFlota: Record<string, { campo: string; tipo: MapeoColumna['tipoDato']; requerido: boolean }> = {
    // Variaciones para código
    'codigo': { campo: 'codigo', tipo: 'texto', requerido: false },
    'código': { campo: 'codigo', tipo: 'texto', requerido: false },
    'cod': { campo: 'codigo', tipo: 'texto', requerido: false },
    'id': { campo: 'codigo', tipo: 'texto', requerido: false },
    'num': { campo: 'codigo', tipo: 'texto', requerido: false },
    'numero': { campo: 'codigo', tipo: 'texto', requerido: false },
    'número': { campo: 'codigo', tipo: 'texto', requerido: false },
    'n°': { campo: 'codigo', tipo: 'texto', requerido: false },
    'nº': { campo: 'codigo', tipo: 'texto', requerido: false },
    'n.º': { campo: 'codigo', tipo: 'texto', requerido: false },
    'autobus': { campo: 'codigo', tipo: 'texto', requerido: false },
    'autobús': { campo: 'codigo', tipo: 'texto', requerido: false },
    'bus': { campo: 'codigo', tipo: 'texto', requerido: false },
    
    // Matrícula
    'matricula': { campo: 'matricula', tipo: 'texto', requerido: true },
    'matrícula': { campo: 'matricula', tipo: 'texto', requerido: true },
    'placa': { campo: 'matricula', tipo: 'texto', requerido: true },
    
    // Marca
    'marca': { campo: 'marca', tipo: 'texto', requerido: false },
    'fabricante': { campo: 'marca', tipo: 'texto', requerido: false },
    
    // Modelo
    'modelo': { campo: 'modelo', tipo: 'texto', requerido: false },
    'type': { campo: 'modelo', tipo: 'texto', requerido: false },
    'tipo': { campo: 'modelo', tipo: 'texto', requerido: false },
    
    // Número de serie / bastidor
    'bastidor': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'vin': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'chasis': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'serie': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'num serie': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'núm serie': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'numero serie': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    'número serie': { campo: 'numeroSerie', tipo: 'texto', requerido: false },
    
    // Año
    'año': { campo: 'anioFabricacion', tipo: 'numero', requerido: false },
    'anio': { campo: 'anioFabricacion', tipo: 'numero', requerido: false },
    'year': { campo: 'anioFabricacion', tipo: 'numero', requerido: false },
    'fabricacion': { campo: 'anioFabricacion', tipo: 'numero', requerido: false },
    'fabricación': { campo: 'anioFabricacion', tipo: 'numero', requerido: false },
    
    // Fecha alta
    'fecha alta': { campo: 'fechaAlta', tipo: 'fecha', requerido: false },
    'alta': { campo: 'fechaAlta', tipo: 'fecha', requerido: false },
    'fecha': { campo: 'fechaAlta', tipo: 'fecha', requerido: false },
    
    // Kilometraje
    'km': { campo: 'kilometraje', tipo: 'numero', requerido: false },
    'kms': { campo: 'kilometraje', tipo: 'numero', requerido: false },
    'kilometros': { campo: 'kilometraje', tipo: 'numero', requerido: false },
    'kilómetros': { campo: 'kilometraje', tipo: 'numero', requerido: false },
    'kilometraje': { campo: 'kilometraje', tipo: 'numero', requerido: false },
    
    // Ubicación
    'ubicacion': { campo: 'ubicacionBase', tipo: 'texto', requerido: false },
    'ubicación': { campo: 'ubicacionBase', tipo: 'texto', requerido: false },
    'cochera': { campo: 'ubicacionBase', tipo: 'texto', requerido: false },
    'base': { campo: 'ubicacionBase', tipo: 'texto', requerido: false },
    'deposito': { campo: 'ubicacionBase', tipo: 'texto', requerido: false },
    'depósito': { campo: 'ubicacionBase', tipo: 'texto', requerido: false },
    
    // Estado
    'estado': { campo: 'estado', tipo: 'texto', requerido: false },
    'situacion': { campo: 'estado', tipo: 'texto', requerido: false },
    'situación': { campo: 'estado', tipo: 'texto', requerido: false },
    
    // Operador
    'operador': { campo: 'operador', tipo: 'texto', requerido: false },
    'empresa': { campo: 'operador', tipo: 'texto', requerido: false },
    
    // Notas
    'notas': { campo: 'notas', tipo: 'texto', requerido: false },
    'observaciones': { campo: 'notas', tipo: 'texto', requerido: false },
    'comentarios': { campo: 'notas', tipo: 'texto', requerido: false },
  };

  const mapeosTecnicos: Record<string, { campo: string; tipo: MapeoColumna['tipoDato']; requerido: boolean }> = {
    'email': { campo: 'email', tipo: 'texto', requerido: true },
    'correo': { campo: 'email', tipo: 'texto', requerido: true },
    'mail': { campo: 'email', tipo: 'texto', requerido: true },
    'nombre': { campo: 'nombre', tipo: 'texto', requerido: true },
    'apellidos': { campo: 'apellidos', tipo: 'texto', requerido: true },
    'apellido': { campo: 'apellidos', tipo: 'texto', requerido: true },
    'telefono': { campo: 'telefono', tipo: 'texto', requerido: false },
    'teléfono': { campo: 'telefono', tipo: 'texto', requerido: false },
    'movil': { campo: 'telefono', tipo: 'texto', requerido: false },
    'móvil': { campo: 'telefono', tipo: 'texto', requerido: false },
    'rol': { campo: 'rol', tipo: 'texto', requerido: false },
    'cargo': { campo: 'rol', tipo: 'texto', requerido: false },
    'puesto': { campo: 'rol', tipo: 'texto', requerido: false },
    'especialidad': { campo: 'especialidades', tipo: 'texto', requerido: false },
    'especialidades': { campo: 'especialidades', tipo: 'texto', requerido: false },
    'activo': { campo: 'activo', tipo: 'booleano', requerido: false },
  };

  const mapeosHistorico: Record<string, { campo: string; tipo: MapeoColumna['tipoDato']; requerido: boolean }> = {
    'autobus': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'autobús': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'bus': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'vehiculo': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'vehículo': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'matricula': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'matrícula': { campo: 'codigoActivo', tipo: 'texto', requerido: true },
    'fecha': { campo: 'fecha', tipo: 'fecha', requerido: true },
    'descripcion': { campo: 'descripcion', tipo: 'texto', requerido: true },
    'descripción': { campo: 'descripcion', tipo: 'texto', requerido: true },
    'averia': { campo: 'descripcion', tipo: 'texto', requerido: true },
    'avería': { campo: 'descripcion', tipo: 'texto', requerido: true },
    'problema': { campo: 'descripcion', tipo: 'texto', requerido: true },
    'tipo': { campo: 'tipo', tipo: 'texto', requerido: false },
    'estado': { campo: 'estadoFinal', tipo: 'texto', requerido: false },
    'tecnico': { campo: 'tecnico', tipo: 'texto', requerido: false },
    'técnico': { campo: 'tecnico', tipo: 'texto', requerido: false },
    'tiempo': { campo: 'tiempoResolucion', tipo: 'numero', requerido: false },
    'horas': { campo: 'tiempoResolucion', tipo: 'numero', requerido: false },
    'materiales': { campo: 'materiales', tipo: 'texto', requerido: false },
    'repuestos': { campo: 'materiales', tipo: 'texto', requerido: false },
    'coste': { campo: 'coste', tipo: 'numero', requerido: false },
    'costo': { campo: 'coste', tipo: 'numero', requerido: false },
    'importe': { campo: 'coste', tipo: 'numero', requerido: false },
  };

  const mapeoBase = tipoEntidad === 'flota' 
    ? mapeosFlota 
    : tipoEntidad === 'tecnicos' 
      ? mapeosTecnicos 
      : mapeosHistorico;

  const resultado: MapeoColumna[] = [];
  const camposMapeados = new Set<string>();

  encabezados.forEach((encabezado) => {
    const encabezadoNormalizado = encabezado.toLowerCase().trim();
    
    // Buscar coincidencia exacta o parcial
    let mapeoEncontrado: { campo: string; tipo: MapeoColumna['tipoDato']; requerido: boolean } | null = null;
    
    // Primero buscar coincidencia exacta
    if (mapeoBase[encabezadoNormalizado]) {
      mapeoEncontrado = mapeoBase[encabezadoNormalizado];
    } else {
      // Buscar coincidencia parcial
      for (const [patron, mapeo] of Object.entries(mapeoBase)) {
        if (encabezadoNormalizado.includes(patron) || patron.includes(encabezadoNormalizado)) {
          if (!camposMapeados.has(mapeo.campo)) {
            mapeoEncontrado = mapeo;
            break;
          }
        }
      }
    }

    if (mapeoEncontrado && !camposMapeados.has(mapeoEncontrado.campo)) {
      resultado.push({
        columnaExcel: encabezado,
        campoDestino: mapeoEncontrado.campo,
        tipoDato: mapeoEncontrado.tipo,
        requerido: mapeoEncontrado.requerido,
      });
      camposMapeados.add(mapeoEncontrado.campo);
    } else {
      // Columna no mapeada
      resultado.push({
        columnaExcel: encabezado,
        campoDestino: '',
        tipoDato: 'texto',
        requerido: false,
      });
    }
  });

  return resultado;
}

/**
 * Procesa las filas de datos aplicando el mapeo de columnas
 */
export function procesarFilas<T>(
  datos: Record<string, unknown>[],
  mapeo: MapeoColumna[],
  config: ConfiguracionImportacion
): FilaImportacion<T>[] {
  const log: LogImportacion[] = [];
  const filasProcesadas: FilaImportacion<T>[] = [];
  const valoresUnicos = new Map<string, number>(); // Para detectar duplicados

  datos.forEach((fila, index) => {
    const numeroFila = index + config.filaInicio + (config.tieneEncabezados ? 2 : 1);
    const errores: ErrorValidacion[] = [];
    const datosProcesados: Record<string, unknown> = {};

    // Aplicar mapeo
    mapeo.forEach((m) => {
      if (!m.campoDestino) return; // Columna ignorada

      const valorOriginal = fila[m.columnaExcel];
      let valorProcesado: unknown = valorOriginal;

      // Transformar según tipo
      try {
        valorProcesado = transformarValor(valorOriginal, m.tipoDato, m.valorDefecto);
      } catch {
        errores.push({
          columna: m.columnaExcel,
          mensaje: `No se pudo convertir a ${m.tipoDato}`,
          valor: valorOriginal,
          tipo: 'error',
        });
      }

      // Validar requerido
      if (m.requerido && (valorProcesado === null || valorProcesado === undefined || valorProcesado === '')) {
        errores.push({
          columna: m.columnaExcel,
          mensaje: 'Campo requerido vacío',
          valor: valorOriginal,
          tipo: 'error',
        });
      }

      datosProcesados[m.campoDestino] = valorProcesado;
    });

    // Detectar duplicados
    let esDuplicado = false;
    if (config.detectarDuplicados && config.campoDuplicado) {
      const valorClave = String(datosProcesados[config.campoDuplicado] || '').toLowerCase().trim();
      if (valorClave) {
        if (valoresUnicos.has(valorClave)) {
          esDuplicado = true;
          errores.push({
            columna: config.campoDuplicado,
            mensaje: `Duplicado de fila ${valoresUnicos.get(valorClave)}`,
            valor: valorClave,
            tipo: 'advertencia',
          });
        } else {
          valoresUnicos.set(valorClave, numeroFila);
        }
      }
    }

    // Determinar estado
    let estado: EstadoValidacion = 'valido';
    if (errores.some((e) => e.tipo === 'error')) {
      estado = 'error';
    } else if (esDuplicado) {
      estado = 'duplicado';
    } else if (errores.some((e) => e.tipo === 'advertencia')) {
      estado = 'advertencia';
    }

    filasProcesadas.push({
      numeroFila,
      datosOriginales: fila,
      datosProcesados: datosProcesados as Partial<T>,
      estado,
      errores,
      seleccionada: estado === 'valido' || estado === 'advertencia',
    });
  });

  return filasProcesadas;
}

/**
 * Transforma un valor al tipo especificado
 */
function transformarValor(
  valor: unknown,
  tipo: MapeoColumna['tipoDato'],
  valorDefecto?: unknown
): unknown {
  if (valor === null || valor === undefined || valor === '') {
    return valorDefecto ?? null;
  }

  switch (tipo) {
    case 'texto':
      return String(valor).trim();

    case 'numero':
      if (typeof valor === 'number') return valor;
      const num = parseFloat(String(valor).replace(',', '.').replace(/[^\d.-]/g, ''));
      if (isNaN(num)) throw new Error('No es un número válido');
      return num;

    case 'fecha':
      if (valor instanceof Date) return valor;
      // Excel puede pasar fechas como número (días desde 1900)
      if (typeof valor === 'number') {
        const fecha = new Date((valor - 25569) * 86400 * 1000);
        if (isNaN(fecha.getTime())) throw new Error('Fecha inválida');
        return fecha;
      }
      const fechaStr = new Date(String(valor));
      if (isNaN(fechaStr.getTime())) throw new Error('Fecha inválida');
      return fechaStr;

    case 'booleano':
      if (typeof valor === 'boolean') return valor;
      const strVal = String(valor).toLowerCase().trim();
      return ['si', 'sí', 'yes', 'true', '1', 'activo', 'x'].includes(strVal);

    default:
      return valor;
  }
}

/**
 * Genera códigos secuenciales para los registros
 */
export function generarCodigosSecuenciales(
  filas: FilaImportacion<Record<string, unknown>>[],
  prefijo: string,
  campoDestino: string,
  inicioSecuencia: number = 1
): FilaImportacion<Record<string, unknown>>[] {
  let secuencia = inicioSecuencia;

  return filas.map((fila) => {
    if (!fila.seleccionada) return fila;

    // Solo generar si no tiene código
    if (!fila.datosProcesados[campoDestino]) {
      fila.datosProcesados[campoDestino] = `${prefijo}-${String(secuencia).padStart(3, '0')}`;
      secuencia++;
    }

    return fila;
  });
}

/**
 * Valida que no existan duplicados con datos existentes en el sistema
 */
export async function validarDuplicadosExistentes<T>(
  filas: FilaImportacion<T>[],
  campo: keyof T,
  obtenerExistentes: () => Promise<T[]>
): Promise<FilaImportacion<T>[]> {
  const existentes = await obtenerExistentes();
  const valoresExistentes = new Set(
    existentes.map((e) => String(e[campo]).toLowerCase().trim())
  );

  return filas.map((fila) => {
    const valor = String((fila.datosProcesados as Record<string, unknown>)[campo as string] || '').toLowerCase().trim();
    
    if (valor && valoresExistentes.has(valor)) {
      return {
        ...fila,
        estado: 'duplicado' as EstadoValidacion,
        errores: [
          ...fila.errores,
          {
            columna: campo as string,
            mensaje: 'Ya existe en el sistema',
            valor,
            tipo: 'advertencia' as const,
          },
        ],
        seleccionada: false,
      };
    }

    return fila;
  });
}

/**
 * Obtiene estadísticas del proceso de importación
 */
export function obtenerEstadisticas<T>(filas: FilaImportacion<T>[]): {
  total: number;
  validos: number;
  advertencias: number;
  errores: number;
  duplicados: number;
  seleccionados: number;
} {
  return {
    total: filas.length,
    validos: filas.filter((f) => f.estado === 'valido').length,
    advertencias: filas.filter((f) => f.estado === 'advertencia').length,
    errores: filas.filter((f) => f.estado === 'error').length,
    duplicados: filas.filter((f) => f.estado === 'duplicado').length,
    seleccionados: filas.filter((f) => f.seleccionada).length,
  };
}

/**
 * Exporta una plantilla de Excel para importación
 */
export function generarPlantillaExcel(
  tipoEntidad: ConfiguracionImportacion['tipoEntidad']
): Blob {
  let encabezados: string[] = [];
  let ejemplos: (string | number)[][] = [];

  switch (tipoEntidad) {
    case 'flota':
      encabezados = ['Código', 'Matrícula', 'Marca', 'Modelo', 'Bastidor', 'Año', 'Fecha Alta', 'Km', 'Ubicación', 'Estado', 'Notas'];
      ejemplos = [
        ['EKI-001', '1234-ABC', 'Mercedes', 'Citaro', 'WDB1234567890', 2020, '01/01/2020', 50000, 'Cochera Central', 'Operativo', ''],
        ['EKI-002', '5678-DEF', 'MAN', 'Lion\'s City', 'MAN9876543210', 2019, '15/03/2019', 75000, 'Cochera Norte', 'Operativo', ''],
      ];
      break;

    case 'tecnicos':
      encabezados = ['Email', 'Nombre', 'Apellidos', 'Teléfono', 'Rol', 'Especialidades', 'Activo'];
      ejemplos = [
        ['tecnico1@empresa.com', 'Juan', 'García López', '666111222', 'tecnico', 'Mecánica, Electricidad', 'Sí'],
        ['jefe@empresa.com', 'María', 'Pérez Ruiz', '666333444', 'jefe_mantenimiento', 'Gestión, Electrónica', 'Sí'],
      ];
      break;

    case 'historico':
      encabezados = ['Matrícula/Código', 'Fecha', 'Descripción', 'Tipo', 'Técnico', 'Horas', 'Materiales', 'Coste'];
      ejemplos = [
        ['EKI-001', '15/01/2024', 'Cambio de aceite y filtros', 'Preventiva', 'Juan García', 2, 'Aceite 10L, Filtro aceite', 150],
        ['EKI-002', '20/01/2024', 'Reparación sistema frenos', 'Correctiva', 'María Pérez', 4, 'Pastillas freno x4', 320],
      ];
      break;
  }

  const wb = XLSX.utils.book_new();
  const wsData = [encabezados, ...ejemplos];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ajustar anchos de columna
  ws['!cols'] = encabezados.map(() => ({ wch: 18 }));

  XLSX.utils.book_append_sheet(wb, ws, 'Datos');

  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
