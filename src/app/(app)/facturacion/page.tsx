'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Input,
  Select,
  Modal,
  ConfirmDialog,
  LoadingSpinner,
  EmptyState,
  DataTable,
  Tabs,
} from '@/components/ui';
import {
  getFacturas,
  getOTsFacturables,
  generarBorradorFactura,
  crearFactura,
  actualizarEstadoFactura,
  anularFactura,
  exportarFacturaCSV,
  exportarFacturaJSON,
  getResumenFacturacion,
} from '@/lib/firebase/facturacion';
import { getOperadoresActivos } from '@/lib/firebase/contratos';
import { useAuth } from '@/contexts/AuthContext';
import type { Factura, OrdenTrabajo, Operador, EstadoFactura } from '@/types';
import {
  FileText,
  Plus,
  Search,
  Building2,
  Calendar,
  DollarSign,
  CheckCircle2,
  Clock,
  Send,
  Download,
  Eye,
  RefreshCw,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileJson,
  Ban,
  CreditCard,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';

type TabId = 'pendientes' | 'facturas' | 'historial';

const ESTADOS_BADGE: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof CheckCircle2 }> = {
  borrador: { variant: 'outline', icon: FileText },
  pendiente: { variant: 'secondary', icon: Clock },
  enviada: { variant: 'default', icon: Send },
  pagada: { variant: 'default', icon: CheckCircle2 },
  anulada: { variant: 'destructive', icon: XCircle },
};

export default function FacturacionPage() {
  const router = useRouter();
  const { user, claims } = useAuth();
  const tenantId = claims?.tenantId as string | undefined;

  // Estados
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('pendientes');
  const [otsFacturables, setOtsFacturables] = useState<OrdenTrabajo[]>([]);
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [resumen, setResumen] = useState<{
    totalFacturado: number;
    totalPendiente: number;
    totalCobrado: number;
    numeroFacturas: number;
  } | null>(null);

  // Filtros OTs
  const [filtroOperadorOT, setFiltroOperadorOT] = useState('todos');
  const [otsSeleccionadas, setOtsSeleccionadas] = useState<Set<string>>(new Set());

  // Filtros Facturas
  const [filtroEstadoFactura, setFiltroEstadoFactura] = useState('todos');
  const [filtroOperadorFactura, setFiltroOperadorFactura] = useState('todos');

  // Modal generar factura
  const [showGenerarModal, setShowGenerarModal] = useState(false);
  const [generando, setGenerando] = useState(false);
  const [facturaPreview, setFacturaPreview] = useState<Factura | null>(null);

  // Modal detalle factura
  const [facturaDetalle, setFacturaDetalle] = useState<Factura | null>(null);

  // Modal anular
  const [facturaAnular, setFacturaAnular] = useState<Factura | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    if (tenantId) {
      cargarDatos();
    }
  }, [tenantId]);

  const cargarDatos = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const [otsData, facturasData, operadoresData, resumenData] = await Promise.all([
        getOTsFacturables(tenantId),
        getFacturas(tenantId),
        getOperadoresActivos(),
        getResumenFacturacion(tenantId),
      ]);
      setOtsFacturables(otsData);
      setFacturas(facturasData);
      setOperadores(operadoresData);
      setResumen(resumenData);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar OTs
  const otsFiltradas = useMemo(() => {
    return otsFacturables.filter((ot) => {
      if (filtroOperadorOT !== 'todos' && ot.operadorId !== filtroOperadorOT) {
        return false;
      }
      return true;
    });
  }, [otsFacturables, filtroOperadorOT]);

  // Agrupar OTs por operador
  const otsPorOperador = useMemo(() => {
    const grouped = new Map<string, OrdenTrabajo[]>();
    for (const ot of otsFiltradas) {
      const operadorId = ot.operadorId || 'sin_operador';
      if (!grouped.has(operadorId)) {
        grouped.set(operadorId, []);
      }
      grouped.get(operadorId)!.push(ot);
    }
    return grouped;
  }, [otsFiltradas]);

  // Filtrar facturas
  const facturasFiltradas = useMemo(() => {
    return facturas.filter((f) => {
      if (filtroEstadoFactura !== 'todos' && f.estado !== filtroEstadoFactura) {
        return false;
      }
      if (filtroOperadorFactura !== 'todos' && f.operadorId !== filtroOperadorFactura) {
        return false;
      }
      return true;
    });
  }, [facturas, filtroEstadoFactura, filtroOperadorFactura]);

  // Selección de OTs
  const toggleOTSeleccion = (otId: string) => {
    setOtsSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(otId)) {
        next.delete(otId);
      } else {
        next.add(otId);
      }
      return next;
    });
  };

  const seleccionarTodasOperador = (operadorId: string) => {
    const otsOperador = otsPorOperador.get(operadorId) || [];
    setOtsSeleccionadas((prev) => {
      const next = new Set(prev);
      const todasSeleccionadas = otsOperador.every((ot) => prev.has(ot.id));
      if (todasSeleccionadas) {
        otsOperador.forEach((ot) => next.delete(ot.id));
      } else {
        otsOperador.forEach((ot) => next.add(ot.id));
      }
      return next;
    });
  };

  // Generar factura
  const handleGenerarPreview = async () => {
    if (!tenantId || !user || otsSeleccionadas.size === 0) return;

    // Obtener OTs seleccionadas
    const otsParaFacturar = otsFacturables.filter((ot) => otsSeleccionadas.has(ot.id));
    if (otsParaFacturar.length === 0) return;

    // Verificar que todas son del mismo operador
    const operadorIds = new Set(otsParaFacturar.map((ot) => ot.operadorId));
    if (operadorIds.size > 1) {
      alert('Las OTs seleccionadas deben ser del mismo operador');
      return;
    }

    const operadorId = otsParaFacturar[0].operadorId;
    const operador = operadores.find((o) => o.id === operadorId);
    if (!operador) return;

    setGenerando(true);
    try {
      const preview = await generarBorradorFactura(
        tenantId,
        operadorId!,
        operador.nombre,
        otsParaFacturar,
        user.uid
      );
      setFacturaPreview(preview);
      setShowGenerarModal(true);
    } catch (error) {
      console.error('Error generando preview:', error);
      alert('Error al generar la factura: ' + (error as Error).message);
    } finally {
      setGenerando(false);
    }
  };

  const handleConfirmarFactura = async () => {
    if (!tenantId || !user || !facturaPreview) return;

    setGenerando(true);
    try {
      await crearFactura(tenantId, facturaPreview, user.uid);
      setShowGenerarModal(false);
      setFacturaPreview(null);
      setOtsSeleccionadas(new Set());
      cargarDatos();
    } catch (error) {
      console.error('Error creando factura:', error);
    } finally {
      setGenerando(false);
    }
  };

  // Cambiar estado factura
  const handleCambiarEstado = async (factura: Factura, nuevoEstado: EstadoFactura) => {
    if (!tenantId || !user) return;

    try {
      const datosAdicionales: Record<string, Timestamp> = {};
      if (nuevoEstado === 'enviada') {
        datosAdicionales.fechaEmision = Timestamp.now();
        // Vencimiento a 30 días
        const vencimiento = new Date();
        vencimiento.setDate(vencimiento.getDate() + 30);
        datosAdicionales.fechaVencimiento = Timestamp.fromDate(vencimiento);
      } else if (nuevoEstado === 'pagada') {
        datosAdicionales.fechaPago = Timestamp.now();
      }

      await actualizarEstadoFactura(tenantId, factura.id, nuevoEstado, user.uid, datosAdicionales);
      cargarDatos();
    } catch (error) {
      console.error('Error actualizando estado:', error);
    }
  };

  // Anular factura
  const handleAnular = async () => {
    if (!tenantId || !user || !facturaAnular) return;

    setAnulando(true);
    try {
      await anularFactura(tenantId, facturaAnular.id, user.uid, motivoAnulacion);
      setFacturaAnular(null);
      setMotivoAnulacion('');
      cargarDatos();
    } catch (error) {
      console.error('Error anulando factura:', error);
    } finally {
      setAnulando(false);
    }
  };

  // Exportar
  const handleExportarCSV = (factura: Factura) => {
    const csv = exportarFacturaCSV(factura);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `factura_${factura.numero}.csv`;
    link.click();
  };

  const handleExportarJSON = (factura: Factura) => {
    const json = exportarFacturaJSON(factura);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `factura_${factura.numero}.json`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const tabs = [
    { id: 'pendientes' as const, label: 'OTs Facturables', count: otsFacturables.length, content: null },
    { id: 'facturas' as const, label: 'Facturas', count: facturas.filter((f) => f.estado !== 'anulada').length, content: null },
    { id: 'historial' as const, label: 'Historial', content: null },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Facturación</h1>
          <p className="text-slate-400 mt-1">
            Gestiona la facturación de órdenes de trabajo
          </p>
        </div>
        <Button variant="outline" onClick={cargarDatos}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Resumen */}
      {resumen && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-400">Total Facturado</p>
                  <p className="text-2xl font-bold text-slate-100">
                    {resumen.totalFacturado.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-slate-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-yellow-900/20 border-yellow-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-yellow-400">Pendiente Cobro</p>
                  <p className="text-2xl font-bold text-yellow-300">
                    {resumen.totalPendiente.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-900/20 border-green-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-400">Cobrado</p>
                  <p className="text-2xl font-bold text-green-300">
                    {resumen.totalCobrado.toLocaleString('es-ES', {
                      style: 'currency',
                      currency: 'EUR',
                    })}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-cyan-900/20 border-cyan-800">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-cyan-400">Facturas Emitidas</p>
                  <p className="text-2xl font-bold text-cyan-300">
                    {resumen.numeroFacturas}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-cyan-500" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={tabs}
        defaultIndex={tabs.findIndex(t => t.id === activeTab)}
        onChange={(index) => setActiveTab(tabs[index].id)}
      />

      {/* Contenido según tab */}
      {activeTab === 'pendientes' && (
        <div className="space-y-4">
          {/* Filtros y acciones */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <Select
                  value={filtroOperadorOT}
                  onChange={setFiltroOperadorOT}
                  options={[
                    { value: 'todos', label: 'Todos los operadores' },
                    ...operadores.map((o) => ({ value: o.id, label: o.nombre })),
                  ]}
                  className="w-full md:w-[250px]"
                />

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">
                    {otsSeleccionadas.size} OTs seleccionadas
                  </span>
                  <Button
                    onClick={handleGenerarPreview}
                    disabled={otsSeleccionadas.size === 0 || generando}
                  >
                    {generando ? (
                      <LoadingSpinner size="sm" className="mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Generar Factura
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lista de OTs agrupadas por operador */}
          {otsPorOperador.size === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-12 w-12" />}
              title="No hay OTs pendientes"
              description="Todas las órdenes de trabajo facturables han sido procesadas"
            />
          ) : (
            Array.from(otsPorOperador.entries()).map(([operadorId, ots]) => {
              const operador = operadores.find((o) => o.id === operadorId);
              const todasSeleccionadas = ots.every((ot) =>
                otsSeleccionadas.has(ot.id)
              );
              const totalImporte = ots.reduce(
                (sum, ot) =>
                  sum +
                  (ot.tiempoReal?.minutosReales || ot.tiempoEstimado?.minutosEstimados || 60) *
                    0.75, // Estimación simplificada
                0
              );

              return (
                <Card key={operadorId}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-700/50">
                          <Building2 className="h-5 w-5 text-cyan-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">
                            {operador?.nombre || 'Operador desconocido'}
                          </CardTitle>
                          <p className="text-sm text-slate-400">
                            {ots.length} OTs • Est. ~
                            {totalImporte.toLocaleString('es-ES', {
                              style: 'currency',
                              currency: 'EUR',
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => seleccionarTodasOperador(operadorId)}
                      >
                        {todasSeleccionadas ? 'Deseleccionar todas' : 'Seleccionar todas'}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {ots.map((ot) => (
                        <div
                          key={ot.id}
                          onClick={() => toggleOTSeleccion(ot.id)}
                          className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                            otsSeleccionadas.has(ot.id)
                              ? 'bg-cyan-900/30 border border-cyan-700'
                              : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={otsSeleccionadas.has(ot.id)}
                              onChange={() => {}}
                              className="rounded border-slate-500"
                            />
                            <div>
                              <p className="font-medium text-slate-200">{ot.codigo}</p>
                              <p className="text-sm text-slate-400 truncate max-w-md">
                                {ot.descripcion}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-slate-400">
                              {ot.fechaCompletada
                                ? format(ot.fechaCompletada.toDate(), 'dd/MM/yyyy', {
                                    locale: es,
                                  })
                                : '-'}
                            </span>
                            <Badge variant={ot.tipo === 'preventivo' ? 'secondary' : 'default'}>
                              {ot.tipo}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'facturas' && (
        <div className="space-y-4">
          {/* Filtros */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <Select
                  value={filtroEstadoFactura}
                  onChange={setFiltroEstadoFactura}
                  options={[
                    { value: 'todos', label: 'Todos los estados' },
                    { value: 'borrador', label: 'Borrador' },
                    { value: 'pendiente', label: 'Pendiente' },
                    { value: 'enviada', label: 'Enviada' },
                    { value: 'pagada', label: 'Pagada' },
                  ]}
                  className="w-full md:w-[180px]"
                />
                <Select
                  value={filtroOperadorFactura}
                  onChange={setFiltroOperadorFactura}
                  options={[
                    { value: 'todos', label: 'Todos los operadores' },
                    ...operadores.map((o) => ({ value: o.id, label: o.nombre })),
                  ]}
                  className="w-full md:w-[250px]"
                />
              </div>
            </CardContent>
          </Card>

          {/* Lista de facturas */}
          {facturasFiltradas.filter((f) => f.estado !== 'anulada').length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No hay facturas"
              description="Genera facturas desde la pestaña de OTs facturables"
            />
          ) : (
            <div className="space-y-4">
              {facturasFiltradas
                .filter((f) => f.estado !== 'anulada')
                .map((factura) => {
                  const estadoConfig = ESTADOS_BADGE[factura.estado];
                  const EstadoIcon = estadoConfig.icon;

                  return (
                    <Card key={factura.id}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 rounded-lg bg-slate-700/50">
                              <FileText className="h-6 w-6 text-cyan-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-slate-100">
                                  {factura.numero}
                                </h3>
                                <Badge variant={estadoConfig.variant}>
                                  <EstadoIcon className="h-3 w-3 mr-1" />
                                  {factura.estado.charAt(0).toUpperCase() +
                                    factura.estado.slice(1)}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mt-1 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                  <Building2 className="h-4 w-4" />
                                  {factura.operadorNombre}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(
                                    factura.periodo.desde.toDate(),
                                    'dd/MM/yyyy',
                                    { locale: es }
                                  )}{' '}
                                  -{' '}
                                  {format(
                                    factura.periodo.hasta.toDate(),
                                    'dd/MM/yyyy',
                                    { locale: es }
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <p className="text-sm text-slate-400">
                                {factura.lineas.length} líneas
                              </p>
                              <p className="text-xl font-bold text-slate-100">
                                {factura.total.toLocaleString('es-ES', {
                                  style: 'currency',
                                  currency: 'EUR',
                                })}
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setFacturaDetalle(factura)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>

                              {factura.estado === 'borrador' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCambiarEstado(factura, 'pendiente')
                                  }
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Confirmar
                                </Button>
                              )}

                              {factura.estado === 'pendiente' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    handleCambiarEstado(factura, 'enviada')
                                  }
                                >
                                  <Send className="h-4 w-4 mr-1" />
                                  Enviar
                                </Button>
                              )}

                              {factura.estado === 'enviada' && (
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleCambiarEstado(factura, 'pagada')
                                  }
                                >
                                  <CreditCard className="h-4 w-4 mr-1" />
                                  Marcar Pagada
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportarCSV(factura)}
                              >
                                <FileSpreadsheet className="h-4 w-4" />
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleExportarJSON(factura)}
                              >
                                <FileJson className="h-4 w-4" />
                              </Button>

                              {factura.estado !== 'pagada' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setFacturaAnular(factura)}
                                >
                                  <Ban className="h-4 w-4 text-red-400" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'historial' && (
        <div className="space-y-4">
          {facturas.filter((f) => f.estado === 'anulada').length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title="No hay facturas anuladas"
              description="Las facturas anuladas aparecerán aquí"
            />
          ) : (
            facturas
              .filter((f) => f.estado === 'anulada')
              .map((factura) => (
                <Card key={factura.id} className="opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-slate-300 line-through">
                            {factura.numero}
                          </h3>
                          <Badge variant="destructive">Anulada</Badge>
                        </div>
                        <p className="text-sm text-slate-500 mt-1">
                          {factura.operadorNombre} • {factura.observaciones}
                        </p>
                      </div>
                      <p className="text-lg text-slate-400 line-through">
                        {factura.total.toLocaleString('es-ES', {
                          style: 'currency',
                          currency: 'EUR',
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))
          )}
        </div>
      )}

      {/* Modal generar factura */}
      <Modal
        isOpen={showGenerarModal}
        onClose={() => {
          setShowGenerarModal(false);
          setFacturaPreview(null);
        }}
        title="Vista Previa de Factura"
        size="xl"
      >
        {facturaPreview && (
          <div className="space-y-6">
            {/* Cabecera */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-slate-400">Número</p>
                <p className="text-xl font-bold text-slate-100">
                  {facturaPreview.numero}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Operador</p>
                <p className="font-medium text-slate-200">
                  {facturaPreview.operadorNombre}
                </p>
              </div>
            </div>

            {/* Líneas */}
            <div className="border border-slate-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-800">
                  <tr>
                    <th className="text-left p-3 text-slate-400">OT</th>
                    <th className="text-left p-3 text-slate-400">Descripción</th>
                    <th className="text-right p-3 text-slate-400">Horas</th>
                    <th className="text-right p-3 text-slate-400">M. Obra</th>
                    <th className="text-right p-3 text-slate-400">Material</th>
                    <th className="text-right p-3 text-slate-400">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {facturaPreview.lineas.map((linea, idx) => (
                    <tr key={idx} className="border-t border-slate-700">
                      <td className="p-3 text-slate-300">{linea.codigoOT}</td>
                      <td className="p-3 text-slate-300 max-w-xs truncate">
                        {linea.descripcion}
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {linea.horasManoObra.toFixed(2)}h
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {linea.subtotalManoObra.toFixed(2)}€
                      </td>
                      <td className="p-3 text-right text-slate-300">
                        {linea.subtotalMateriales.toFixed(2)}€
                      </td>
                      <td className="p-3 text-right font-medium text-slate-200">
                        {linea.totalLinea.toFixed(2)}€
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span>{facturaPreview.subtotal.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>IVA ({facturaPreview.porcentajeIVA}%):</span>
                  <span>{facturaPreview.importeIVA.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-100 border-t border-slate-600 pt-2">
                  <span>Total:</span>
                  <span>{facturaPreview.total.toFixed(2)}€</span>
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
              <Button
                variant="outline"
                onClick={() => {
                  setShowGenerarModal(false);
                  setFacturaPreview(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={handleConfirmarFactura} disabled={generando}>
                {generando ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Crear Factura
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal detalle factura */}
      <Modal
        isOpen={!!facturaDetalle}
        onClose={() => setFacturaDetalle(null)}
        title={`Factura ${facturaDetalle?.numero}`}
        size="xl"
      >
        {facturaDetalle && (
          <div className="space-y-4">
            {/* Similar al modal de preview pero con más detalles */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-slate-400">Operador</p>
                <p className="font-medium text-slate-200">
                  {facturaDetalle.operadorNombre}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Período</p>
                <p className="font-medium text-slate-200">
                  {format(facturaDetalle.periodo.desde.toDate(), 'dd/MM/yyyy', {
                    locale: es,
                  })}{' '}
                  -{' '}
                  {format(facturaDetalle.periodo.hasta.toDate(), 'dd/MM/yyyy', {
                    locale: es,
                  })}
                </p>
              </div>
              {facturaDetalle.fechaEmision && (
                <div>
                  <p className="text-sm text-slate-400">Fecha Emisión</p>
                  <p className="font-medium text-slate-200">
                    {format(facturaDetalle.fechaEmision.toDate(), 'dd/MM/yyyy', {
                      locale: es,
                    })}
                  </p>
                </div>
              )}
              {facturaDetalle.fechaVencimiento && (
                <div>
                  <p className="text-sm text-slate-400">Fecha Vencimiento</p>
                  <p className="font-medium text-slate-200">
                    {format(
                      facturaDetalle.fechaVencimiento.toDate(),
                      'dd/MM/yyyy',
                      { locale: es }
                    )}
                  </p>
                </div>
              )}
            </div>

            <div className="text-right">
              <p className="text-3xl font-bold text-slate-100">
                {facturaDetalle.total.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal anular */}
      <Modal
        isOpen={!!facturaAnular}
        onClose={() => {
          setFacturaAnular(null);
          setMotivoAnulacion('');
        }}
        title="Anular Factura"
      >
        <div className="space-y-4">
          <p className="text-slate-300">
            ¿Estás seguro de que deseas anular la factura{' '}
            <strong>{facturaAnular?.numero}</strong>?
          </p>
          <p className="text-sm text-slate-400">
            Esta acción liberará las OTs asociadas para poder facturarlas de nuevo.
          </p>
          <div>
            <label className="text-sm font-medium text-slate-300">
              Motivo de anulación
            </label>
            <Input
              value={motivoAnulacion}
              onChange={(e) => setMotivoAnulacion(e.target.value)}
              placeholder="Indicar el motivo..."
              className="mt-1"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFacturaAnular(null);
                setMotivoAnulacion('');
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleAnular}
              disabled={!motivoAnulacion || anulando}
            >
              {anulando ? (
                <LoadingSpinner size="sm" className="mr-2" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Anular Factura
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
