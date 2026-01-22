'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { TendenciaTemporal, MetricasPorTipo } from '@/lib/firebase/metricas';

// Colores del tema
const COLORES = {
  primario: '#3b82f6',
  secundario: '#8b5cf6',
  exito: '#22c55e',
  advertencia: '#f59e0b',
  error: '#ef4444',
  neutro: '#64748b',
};

const PALETA_GRAFICO = [
  '#3b82f6',
  '#22c55e',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#06b6d4',
  '#ec4899',
  '#84cc16',
];

// ================================
// Gráfico de línea/área temporal
// ================================

interface GraficoTendenciaProps {
  datos: TendenciaTemporal[];
  titulo?: string;
  tipo?: 'linea' | 'area';
  color?: string;
  unidad?: string;
  altura?: number;
  mostrarGrid?: boolean;
  className?: string;
}

export function GraficoTendencia({
  datos,
  titulo,
  tipo = 'area',
  color = COLORES.primario,
  unidad = '',
  altura = 200,
  mostrarGrid = true,
  className,
}: GraficoTendenciaProps) {
  const datosFormateados = useMemo(() => {
    return datos.map((d) => ({
      ...d,
      fechaCorta: d.fecha.slice(5), // MM-DD
    }));
  }, [datos]);

  const Chart = tipo === 'area' ? AreaChart : LineChart;
  const DataComponent = tipo === 'area' ? Area : Line;

  return (
    <Card className={cn('bg-white', className)}>
      {titulo && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            {titulo}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={!titulo ? 'pt-4' : ''}>
        <ResponsiveContainer width="100%" height={altura}>
          <Chart data={datosFormateados}>
            {mostrarGrid && (
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            )}
            <XAxis
              dataKey="fechaCorta"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}${unidad}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number) => [`${value}${unidad}`, 'Valor']}
            />
            {tipo === 'area' ? (
              <Area
                type="monotone"
                dataKey="valor"
                stroke={color}
                fill={color}
                fillOpacity={0.2}
                strokeWidth={2}
              />
            ) : (
              <Line
                type="monotone"
                dataKey="valor"
                stroke={color}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            )}
          </Chart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ================================
// Gráfico de barras
// ================================

interface DatosBarra {
  nombre: string;
  valor: number;
  color?: string;
}

interface GraficoBarrasProps {
  datos: DatosBarra[];
  titulo?: string;
  orientacion?: 'horizontal' | 'vertical';
  colorBarras?: string;
  altura?: number;
  mostrarValores?: boolean;
  className?: string;
}

export function GraficoBarras({
  datos,
  titulo,
  orientacion = 'vertical',
  colorBarras = COLORES.primario,
  altura = 200,
  mostrarValores = true,
  className,
}: GraficoBarrasProps) {
  const isHorizontal = orientacion === 'horizontal';

  return (
    <Card className={cn('bg-white', className)}>
      {titulo && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            {titulo}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={!titulo ? 'pt-4' : ''}>
        <ResponsiveContainer width="100%" height={altura}>
          <BarChart
            data={datos}
            layout={isHorizontal ? 'vertical' : 'horizontal'}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            {isHorizontal ? (
              <>
                <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  width={80}
                />
              </>
            ) : (
              <>
                <XAxis
                  dataKey="nombre"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
              </>
            )}
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Bar
              dataKey="valor"
              fill={colorBarras}
              radius={[4, 4, 0, 0]}
              label={
                mostrarValores
                  ? { position: 'top', fontSize: 10, fill: '#64748b' }
                  : false
              }
            >
              {datos.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || PALETA_GRAFICO[index % PALETA_GRAFICO.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ================================
// Gráfico de tarta/donut
// ================================

interface GraficoCircularProps {
  datos: MetricasPorTipo[];
  titulo?: string;
  tipo?: 'tarta' | 'donut';
  altura?: number;
  mostrarLeyenda?: boolean;
  mostrarPorcentaje?: boolean;
  className?: string;
}

export function GraficoCircular({
  datos,
  titulo,
  tipo = 'donut',
  altura = 200,
  mostrarLeyenda = true,
  mostrarPorcentaje = true,
  className,
}: GraficoCircularProps) {
  const innerRadius = tipo === 'donut' ? 50 : 0;
  const total = datos.reduce((sum, d) => sum + d.cantidad, 0);

  return (
    <Card className={cn('bg-white', className)}>
      {titulo && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            {titulo}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={!titulo ? 'pt-4' : ''}>
        <ResponsiveContainer width="100%" height={altura}>
          <PieChart>
            <Pie
              data={datos}
              dataKey="cantidad"
              nameKey="tipo"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={70}
              paddingAngle={2}
              label={
                mostrarPorcentaje
                  ? ({ tipo, porcentaje }) => `${tipo}: ${porcentaje}%`
                  : false
              }
              labelLine={mostrarPorcentaje}
            >
              {datos.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PALETA_GRAFICO[index % PALETA_GRAFICO.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
              formatter={(value: number, name: string) => [
                `${value} (${Math.round((value / total) * 100)}%)`,
                name,
              ]}
            />
            {mostrarLeyenda && (
              <Legend
                verticalAlign="bottom"
                height={36}
                iconType="circle"
                formatter={(value) => (
                  <span className="text-xs text-slate-600">{value}</span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ================================
// Gráfico de comparativa múltiple
// ================================

interface DatosComparativa {
  nombre: string;
  [key: string]: string | number;
}

interface GraficoComparativaProps {
  datos: DatosComparativa[];
  titulo?: string;
  series: { key: string; nombre: string; color?: string }[];
  altura?: number;
  tipo?: 'linea' | 'barra';
  className?: string;
}

export function GraficoComparativa({
  datos,
  titulo,
  series,
  altura = 250,
  tipo = 'linea',
  className,
}: GraficoComparativaProps) {
  const Chart = tipo === 'linea' ? LineChart : BarChart;

  return (
    <Card className={cn('bg-white', className)}>
      {titulo && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-slate-600">
            {titulo}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={!titulo ? 'pt-4' : ''}>
        <ResponsiveContainer width="100%" height={altura}>
          <Chart data={datos}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="nombre"
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
            />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '12px',
              }}
            />
            <Legend
              verticalAlign="top"
              height={36}
              iconType="plainline"
              formatter={(value) => (
                <span className="text-xs text-slate-600">{value}</span>
              )}
            />
            {series.map((s, index) =>
              tipo === 'linea' ? (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.nombre}
                  stroke={s.color || PALETA_GRAFICO[index]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ) : (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={s.nombre}
                  fill={s.color || PALETA_GRAFICO[index]}
                  radius={[4, 4, 0, 0]}
                />
              )
            )}
          </Chart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ================================
// Sparkline mini
// ================================

interface SparklineProps {
  datos: number[];
  color?: string;
  altura?: number;
  ancho?: number;
  tipo?: 'linea' | 'area';
}

export function Sparkline({
  datos,
  color = COLORES.primario,
  altura = 30,
  ancho = 80,
  tipo = 'area',
}: SparklineProps) {
  const datosFormateados = datos.map((valor, index) => ({ index, valor }));

  return (
    <ResponsiveContainer width={ancho} height={altura}>
      {tipo === 'area' ? (
        <AreaChart data={datosFormateados}>
          <Area
            type="monotone"
            dataKey="valor"
            stroke={color}
            fill={color}
            fillOpacity={0.2}
            strokeWidth={1.5}
          />
        </AreaChart>
      ) : (
        <LineChart data={datosFormateados}>
          <Line
            type="monotone"
            dataKey="valor"
            stroke={color}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      )}
    </ResponsiveContainer>
  );
}
