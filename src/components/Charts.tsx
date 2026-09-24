import { useState, useRef, useEffect, useMemo, type ReactNode } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  ComposedChart,
  Line,
} from 'recharts';
import { Layers3, Building2, X, MapPin, Search } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import type { DashboardStats, CluesGeoItem, EntidadChart, InternetPieItem, TopFaltanteChart } from '../types';

interface ChartsProps {
  stats: DashboardStats;
  internetPie: InternetPieItem[];
  porEntidad: EntidadChart[];
  topFaltantes: TopFaltanteChart[];
  cluesGeo?: CluesGeoItem[];
  resultado?: DataRow[];
}

const PIE_COLORS = ['#1A6B5E', '#A57F2C'];

const tooltipStyle = {
  borderRadius: '10px',
  border: '1px solid #E5E7EB',
  background: '#FFFFFF',
  fontSize: '13px',
  color: '#111827',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

function formatTooltipNumber(value: unknown): string {
  const num = typeof value === 'number' ? value : Number(value ?? 0);
  if (Number.isNaN(num)) return '0';
  return num.toLocaleString('es-MX');
}

type StatKey =
  | 'total';

interface StatCardDef {
  icon: typeof Layers3;
  label: string;
  key: StatKey;
  bg: string;
  iconBg: string;
  iconColor: string;
  valueColor: string;
  border: string;
}

const STAT_CARDS: StatCardDef[] = [
  {
    icon: Layers3,
    label: 'TOTAL AGEB',
    key: 'total',
    bg: 'bg-emerald-50',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    valueColor: 'text-emerald-700',
    border: 'border-emerald-200',
  },
];

function StatCard({
  def,
  value,
  helper,
}: {
  def: StatCardDef;
  value: number;
  helper?: string;
}) {
  const { icon: Icon, label, bg, iconBg, iconColor, valueColor, border } = def;
  return (
    <div className={`group relative overflow-hidden rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.03] hover:shadow-lg ${border} ${bg}`}>
      <div className="absolute -right-4 -top-4 opacity-10 transition-transform duration-500 group-hover:scale-125 group-hover:opacity-20">
        <Icon className="h-20 w-20" />
      </div>
      <div className="relative mb-3 flex items-start justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:rotate-3 group-hover:scale-110 ${iconBg} ${iconColor}`}>
          <Icon className="h-5 w-5" strokeWidth={2.2} />
        </div>
      </div>
      <p className="relative mb-1 text-[10px] font-bold uppercase tracking-widest opacity-70">
        <span className={valueColor === 'text-white' ? 'text-white/70' : 'text-gray-500'}>{label}</span>
      </p>
      <p className={`relative text-3xl font-black tabular-nums ${valueColor}`}>{value.toLocaleString('es-MX')}</p>
      {helper ? <p className="mt-1 text-xs text-gray-500">{helper}</p> : null}
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  children,
  className = '',
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card p-6 ${className}`}>
      <div className="mb-5">
        <h3 className="text-sm font-bold text-gray-800">{title}</h3>
        <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

/* ─── Gráficas por card ─── */

function CluesChart({ porEntidad }: { porEntidad: EntidadChart[] }) {
  const sorted = [...porEntidad].sort((a, b) => b.unidades - a.unidades);
  const totalUnidades = sorted.reduce((s, e) => s + e.unidades, 0);
  const avgUnidades = sorted.length ? Math.round(totalUnidades / sorted.length) : 0;

  const CLUES_COLORS = ['#064E3B', '#065F46', '#047857', '#059669', '#10B981', '#34D399', '#6EE7B7'];
  const getBarColor = (rank: number, total: number) => {
    const t = total > 1 ? rank / (total - 1) : 0;
    return CLUES_COLORS[Math.min(Math.floor(t * (CLUES_COLORS.length - 1)), CLUES_COLORS.length - 1)];
  };

  const data = sorted.map((e, i) => ({
    entidad: e.entidad.length > 12 ? e.entidad.slice(0, 12) + '.' : e.entidad,
    entidadFull: e.entidad,
    unidades: e.unidades,
    pct: e.pctLlenado,
    rank: i,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-8 border-b border-gray-100 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Total unidades</p>
          <p className="text-2xl font-black text-emerald-700">{totalUnidades.toLocaleString('es-MX')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Promedio por estado</p>
          <p className="text-2xl font-black text-amber-600">{avgUnidades.toLocaleString('es-MX')}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Estados</p>
          <p className="text-2xl font-black text-gray-700">{sorted.length}</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={data} margin={{ top: 4, right: 40, left: 0, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="entidad" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#9CA3AF' }} height={65} />
          <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label, payload) =>
              (payload?.[0] as { payload?: { entidadFull?: string } } | undefined)?.payload?.entidadFull ?? _label
            }
            formatter={(v: unknown, name: string) => [
              name === 'pct' ? `${v}%` : formatTooltipNumber(v),
              name === 'pct' ? '% llenado' : 'Unidades capturadas',
            ]}
            cursor={{ fill: '#F0FDF4' }}
          />
          <Legend
            verticalAlign="top"
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingBottom: '8px', color: '#6B7280' }}
            formatter={(value) => value === 'pct' ? '% llenado del formulario' : 'Unidades capturadas'}
          />
          <Bar yAxisId="left" dataKey="unidades" name="unidades" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={getBarColor(i, data.length)} />
            ))}
          </Bar>
          <Line yAxisId="right" type="monotone" dataKey="pct" name="pct"
            stroke="#A57F2C" strokeWidth={2.5}
            dot={{ fill: '#A57F2C', r: 3.5 }} activeDot={{ r: 6 }} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function EstadosMenosInsumos({ porEntidad }: { porEntidad: EntidadChart[] }) {
  const sorted = [...porEntidad].sort((a, b) => a.pctLlenado - b.pctLlenado);
  const bottom = sorted.slice(0, 10);

  // Colores de rojo → ámbar → verde según posición
  const COLORS = ['#dc2626', '#ef4444', '#f97316', '#fb923c', '#f59e0b',
                  '#eab308', '#84cc16', '#22c55e', '#16a34a', '#15803d'];

  const data = bottom.map((e, i) => ({
    entidad: e.entidad.length > 18 ? e.entidad.slice(0, 18) + '.' : e.entidad,
    entidadFull: e.entidad,
    pct: e.pctLlenado,
    fill: COLORS[Math.min(i, COLORS.length - 1)],
  }));

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-400">Estados con menor porcentaje de insumos reportados (peor a mejor)</p>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 48, left: 4, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
          <XAxis type="number" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
          <YAxis type="category" dataKey="entidad" tick={{ fontSize: 10, fill: '#6B7280' }} width={120} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label, payload) =>
              (payload?.[0] as { payload?: { entidadFull?: string } } | undefined)?.payload?.entidadFull ?? _label
            }
            formatter={(v: unknown) => [`${v}%`, '% insumos llenados']}
            cursor={{ fill: '#FEF2F2' }}
          />
          <Bar dataKey="pct" radius={[0, 4, 4, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function InternetChart({ internetPie }: { internetPie: InternetPieItem[] }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie data={internetPie} cx="50%" cy="45%" outerRadius={110} innerRadius={60} dataKey="value" paddingAngle={2} stroke="none">
          {internetPie.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatTooltipNumber(v), 'Unidades']} />
        <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#6B7280' }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

function ConsultoriosChart({ porEntidad }: { porEntidad: EntidadChart[] }) {
  const data = porEntidad.map((e) => ({
    entidad: e.entidad.length > 10 ? e.entidad.slice(0, 10) + '.' : e.entidad,
    habilitados: e.consultoriosHabilitados,
    levantados: e.consultoriosLevantados,
    pct: e.consultoriosHabilitados > 0
      ? +((e.consultoriosLevantados / e.consultoriosHabilitados) * 100).toFixed(1)
      : 0,
  }));
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 50 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
        <XAxis dataKey="entidad" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#9CA3AF' }} height={60} />
        <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number, name: string) => [
          name === 'pct' ? `${v}%` : formatTooltipNumber(v),
          name === 'pct' ? '% levantado' : name === 'habilitados' ? 'Habilitados' : 'Levantados',
        ]} cursor={{ fill: '#F0FDFA' }} />
        <Bar yAxisId="left" dataKey="habilitados" name="habilitados" fill="#99F6E4" radius={[4, 4, 0, 0]} />
        <Bar yAxisId="left" dataKey="levantados" name="levantados" fill="#0D9488" radius={[4, 4, 0, 0]} />
        <Line yAxisId="right" type="monotone" dataKey="pct" name="pct" stroke="#A57F2C" strokeWidth={2} dot={{ fill: '#A57F2C', r: 3 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

function PctLlenadoChart({ porEntidad, globalPct }: { porEntidad: EntidadChart[]; globalPct: number }) {
  const sorted = [...porEntidad].sort((a, b) => b.pctLlenado - a.pctLlenado);
  const avg = sorted.length ? +(sorted.reduce((s, e) => s + e.pctLlenado, 0) / sorted.length).toFixed(1) : 0;

  const PCT_COLORS = ['#064E3B', '#065F46', '#047857', '#059669', '#10B981', '#34D399', '#6EE7B7'];
  const getColor = (rank: number, total: number) => {
    const t = total > 1 ? rank / (total - 1) : 0;
    return PCT_COLORS[Math.min(Math.floor(t * (PCT_COLORS.length - 1)), PCT_COLORS.length - 1)];
  };

  const data = sorted.map((e, i) => ({
    entidad: e.entidad.length > 12 ? e.entidad.slice(0, 12) + '.' : e.entidad,
    entidadFull: e.entidad,
    pct: e.pctLlenado,
    rank: i,
  }));

  return (
    <div className="space-y-4">
      <div className="flex gap-8 border-b border-gray-100 pb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Global</p>
          <p className="text-2xl font-black text-teal-700">{globalPct.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Promedio por estado</p>
          <p className="text-2xl font-black text-amber-600">{avg}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Mayor llenado</p>
          <p className="text-2xl font-black text-emerald-700">{sorted[0]?.pctLlenado.toFixed(1) ?? '—'}%</p>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Menor llenado</p>
          <p className="text-2xl font-black text-rose-600">{sorted[sorted.length - 1]?.pctLlenado.toFixed(1) ?? '—'}%</p>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={290}>
        <BarChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 55 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="entidad" angle={-35} textAnchor="end" tick={{ fontSize: 10, fill: '#9CA3AF' }} height={65} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#9CA3AF' }} domain={[0, 100]} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelFormatter={(_label, payload) =>
              (payload?.[0] as { payload?: { entidadFull?: string } } | undefined)?.payload?.entidadFull ?? _label
            }
            formatter={(v: unknown) => [`${v}%`, '% llenado']}
            cursor={{ fill: '#F0FDFA' }}
          />
          <Bar dataKey="pct" name="% llenado" radius={[4, 4, 0, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={getColor(i, data.length)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ─── Modal ─── */

function CardModal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800">{title}</h3>
            <p className="mt-0.5 text-xs text-gray-400">{subtitle}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ─── Mapa Modal ─── */

function buildPopupHTML(
  clues: string,
  institucion: string,
  aceptado: CluesGeoItem['aceptado'],
  nombre: string,
  entidad: string,
  municipio: string,
  localidad: string,
  consultoriosFaltantes: number | null,
  poblacionTotal: number | null,
) {
  const color = aceptado === 'Aceptada' ? '#A57F2C' : '#6B7280';
  const faltantes = consultoriosFaltantes === null
    ? 'Sin dato'
    : String(getSemaforoValue(consultoriosFaltantes));
  const poblacion = poblacionTotal === null
    ? 'Sin dato'
    : poblacionTotal.toLocaleString('es-MX', { maximumFractionDigits: 0 });
  const detalle = aceptado
    ? `<div style="margin-top:9px;padding-top:8px;border-top:1px solid #e5e7eb"><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Clasificación</div><div style="font-size:13px;font-weight:700;color:${color}">${aceptado}</div></div>`
    : `<div style="display:grid;grid-template-columns:1fr;gap:8px;margin-top:9px;padding-top:8px;border-top:1px solid #e5e7eb">
      <div style="grid-column:1/-1"><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Consultorios faltantes</div><div style="font-size:13px;font-weight:700;color:#374151">${faltantes}</div></div>
      <div style="grid-column:1/-1"><div style="font-size:9px;color:#9ca3af;text-transform:uppercase">Población total 2026</div><div style="font-size:13px;font-weight:700;color:#374151">${poblacion}</div></div>
    </div>`;
  return `<div style="font-family:system-ui;padding:4px 0;min-width:200px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:5px">
      <div style="font-size:11px;font-weight:700;color:#065f46">${clues}</div>
      <div style="font-size:10px;font-weight:800;color:${color}">${institucion === 'CSA' ? 'AGEB' : institucion}</div>
    </div>
    <div style="font-size:12px;font-weight:600;color:#111827;margin-bottom:2px;line-height:1.3">${nombre}</div>
    <div style="font-size:11px;color:#6b7280">${entidad}</div>
    <div style="font-size:10px;color:#9ca3af;margin-top:2px">${municipio}${localidad ? ` · ${localidad}` : ''}</div>
    ${detalle}
  </div>`;
}

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

type InstitutionFilter = 'CSA';
type MapCategory = 'CSA_ACEPTADA' | 'CSA_NO_ACEPTADA';

function getMapCategory(unit: CluesGeoItem): MapCategory {
  return unit.aceptado === 'Aceptada' ? 'CSA_ACEPTADA' : 'CSA_NO_ACEPTADA';
}

function buildCluesFeatureCollection(unidades: CluesGeoItem[]) {
  return {
    type: 'FeatureCollection' as const,
    features: unidades.map((unit) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [unit.lng, unit.lat] as [number, number] },
      properties: {
        clues: unit.clues,
        institucion: unit.clave_de_la_institucion,
        aceptado: unit.aceptado,
        categoria: getMapCategory(unit),
        nombre: unit.nombre_de_la_unidad,
        entidad: unit.entidad,
        municipio: unit.municipio,
        localidad: unit.localidad,
        consultoriosFaltantes: unit.consultorios_faltantes,
        poblacionTotal: unit.poblacion_total_2026,
        semaforo: getSemaforoKey(unit.consultorios_faltantes),
      },
    })),
  };
}

function getSemaforoValue(consultoriosFaltantes: number | null): number | null {
  if (consultoriosFaltantes === null || !Number.isFinite(consultoriosFaltantes)) return null;
  const rounded = Math.floor(consultoriosFaltantes + 0.5);
  return Math.max(1, Math.min(5, rounded));
}

type SemaforoKey = '1' | '2-3' | '4-5' | 'NA';

function getSemaforoKey(consultoriosFaltantes: number | null): SemaforoKey {
  const value = getSemaforoValue(consultoriosFaltantes);
  if (value === null) return 'NA';
  if (value === 1) return '1';
  if (value <= 3) return '2-3';
  return '4-5';
}

function buildAgebFeatureCollection(unidades: CluesGeoItem[]) {
  return {
    type: 'FeatureCollection' as const,
    features: unidades.map((unit) => ({
      type: 'Feature' as const,
      geometry: unit.geometry,
      properties: {
        clues: unit.clues,
        nombre: unit.nombre_de_la_unidad,
        categoria: getMapCategory(unit),
        semaforo: getSemaforoKey(unit.consultorios_faltantes),
      },
    })),
  };
}

function matchesInstitutionFilter(unit: CluesGeoItem, filter: InstitutionFilter): boolean {
  return unit.clave_de_la_institucion === filter;
}

function MapSection({ cluesGeo = [] }: {
  cluesGeo?: CluesGeoItem[];
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const institucion: InstitutionFilter = 'CSA';
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<CluesGeoItem | null>(null);
  const [activeSemaforos, setActiveSemaforos] = useState<Record<SemaforoKey, boolean>>({
    '1': true,
    '2-3': true,
    '4-5': true,
    NA: true,
  });
  const unidades = useMemo(
    () => cluesGeo.filter((unit) => matchesInstitutionFilter(unit, institucion) && activeSemaforos[getSemaforoKey(unit.consultorios_faltantes)]),
    [activeSemaforos, cluesGeo, institucion],
  );
  const searchResults = useMemo(() => {
    const normalizedQuery = normalizeSearch(query);
    if (normalizedQuery.length < 2) return [];

    return cluesGeo
      .filter((unit) =>
        matchesInstitutionFilter(unit, institucion)
        && activeSemaforos[getSemaforoKey(unit.consultorios_faltantes)]
        && (
          normalizeSearch(unit.clues).includes(normalizedQuery)
          || normalizeSearch(unit.nombre_de_la_unidad).includes(normalizedQuery)
        )
      )
      .slice(0, 8);
  }, [activeSemaforos, cluesGeo, institucion, query]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://tiles.openfreemap.org/styles/positron',
      center: [-102, 23.5],
      zoom: 4.8,
      attributionControl: false,
    });
    mapRef.current = map;
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');

    if (unidades.length > 0) {
      const data = unidades;
      const addLayers = () => {
        if (map.getSource('clues')) return;
        map.addSource('ageb-polygons', {
          type: 'geojson',
          data: buildAgebFeatureCollection(data),
        });
        map.addLayer({ id: 'ageb-polygons-fill', type: 'fill', source: 'ageb-polygons', paint: {
          'fill-color': ['match', ['get', 'semaforo'], '1', '#0D5D2A', '2-3', '#F1D54A', '4-5', '#FFA000', 'NA', '#A57F2C', '#A57F2C'],
          'fill-opacity': 0.42,
          'fill-antialias': true,
        }});
        map.addLayer({ id: 'ageb-polygons-outline', type: 'line', source: 'ageb-polygons', paint: {
          'line-color': ['match', ['get', 'semaforo'], '1', '#0D5D2A', '2-3', '#F1D54A', '4-5', '#FFA000', 'NA', '#A57F2C', '#A57F2C'],
          'line-width': 1.5,
          'line-opacity': 0.9,
        }});
        map.addSource('clues', {
          type: 'geojson',
          data: buildCluesFeatureCollection(data),
        });

        map.addLayer({ id: 'clues-halo', type: 'circle', source: 'clues', paint: {
          'circle-radius': 9,
          'circle-color': ['match', ['get', 'semaforo'], '1', '#0D5D2A', '2-3', '#F1D54A', '4-5', '#FFA000', 'NA', '#A57F2C', '#A57F2C'],
          'circle-opacity': 0.18, 'circle-stroke-width': 0,
        }});
        map.addLayer({ id: 'clues-circles', type: 'circle', source: 'clues', paint: {
          'circle-radius': 5,
          'circle-color': ['match', ['get', 'semaforo'], '1', '#0D5D2A', '2-3', '#F1D54A', '4-5', '#FFA000', 'NA', '#A57F2C', '#A57F2C'],
          'circle-stroke-width': 1.5, 'circle-stroke-color': '#ffffff', 'circle-opacity': 0.95,
        }});

        const popup = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: '280px' });

        map.on('mouseenter', 'clues-circles', (event) => {
          map.getCanvas().style.cursor = 'pointer';
          const feature = event.features?.[0];
          if (!feature) return;
          const properties = feature.properties as Record<string, unknown>;
          popup.setLngLat(event.lngLat)
            .setHTML(buildPopupHTML(
              String(properties['clues']), String(properties['institucion']),
              null,
              String(properties['nombre']),
              String(properties['entidad']), String(properties['municipio']), String(properties['localidad']),
              Number(properties['consultoriosFaltantes']) || null,
              Number(properties['poblacionTotal']) || null,
            ))
            .addTo(map);
        });
        map.on('mouseleave', 'clues-circles', () => {
          map.getCanvas().style.cursor = '';
          popup.remove();
        });
        map.on('click', 'clues-circles', (event) => {
          const cveLoc = String(event.features?.[0]?.properties?.['clues'] ?? '');
          const unit = data.find((item) => item.clues === cveLoc);
          if (!unit) return;

          setSelectedUnit(unit);
        });
        map.on('click', 'ageb-polygons-fill', (event) => {
          const cveLoc = String(event.features?.[0]?.properties?.['clues'] ?? '');
          const unit = data.find((item) => item.clues === cveLoc);
          if (!unit) return;
          setSelectedUnit(unit);
        });
        map.on('mouseenter', 'ageb-polygons-fill', () => { map.getCanvas().style.cursor = 'pointer'; });
        map.on('mouseleave', 'ageb-polygons-fill', () => { map.getCanvas().style.cursor = ''; });
      };

      if (map.isStyleLoaded()) addLayers();
      else map.on('load', addLayers);
    }

    // Quitar etiquetas de ciudades/pueblos del estilo base
    const removeCityLabels = () => {
      const style = map.getStyle();
      if (!style?.layers) return;
      style.layers
        .filter((l) => /city|town|village|suburb|place|hamlet/i.test(l.id))
        .forEach((l) => { try { map.removeLayer(l.id); } catch { /* ya no existe */ } });
    };
    if (map.isStyleLoaded()) removeCityLabels();
    else map.on('load', removeCityLabels);

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [cluesGeo, institucion]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateFilteredSources = () => {
      const pointSource = map.getSource('clues') as maplibregl.GeoJSONSource | undefined;
      const polygonSource = map.getSource('ageb-polygons') as maplibregl.GeoJSONSource | undefined;
      pointSource?.setData(buildCluesFeatureCollection(unidades));
      polygonSource?.setData(buildAgebFeatureCollection(unidades));
    };

    if (map.isStyleLoaded()) updateFilteredSources();
    else map.once('load', updateFilteredSources);

    return () => {
      map.off('load', updateFilteredSources);
    };
  }, [unidades]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedUnit || !matchesInstitutionFilter(selectedUnit, institucion)) return;

    const coordinates: [number, number] = [selectedUnit.lng, selectedUnit.lat];
    const popup = new maplibregl.Popup({ closeButton: false, offset: 10, maxWidth: '280px' });
    const showSelectedUnit = () => {
      map.flyTo({ center: coordinates, zoom: 13, speed: 1.4 });
      popup
        .setLngLat(coordinates)
        .setHTML(buildPopupHTML(
          selectedUnit.clues,
          selectedUnit.clave_de_la_institucion,
          selectedUnit.aceptado,
          selectedUnit.nombre_de_la_unidad,
          selectedUnit.entidad,
          selectedUnit.municipio,
          selectedUnit.localidad,
          selectedUnit.consultorios_faltantes,
          selectedUnit.poblacion_total_2026,
        ))
        .addTo(map);
    };

    if (map.isStyleLoaded()) showSelectedUnit();
    else map.once('load', showSelectedUnit);

    return () => {
      map.off('load', showSelectedUnit);
      popup.remove();
    };
  }, [institucion, selectedUnit]);

  const total = unidades.length;
    const toggleSemaforo = (key: SemaforoKey) => {
      setActiveSemaforos((current) => {
        if (current[key] && Object.values(current).filter(Boolean).length === 1) return current;
        return { ...current, [key]: !current[key] };
      });
      setSelectedUnit(null);
    };

  const handleSelectUnit = (unit: CluesGeoItem) => {
    setQuery(`${unit.clues} - ${unit.nombre_de_la_unidad}`);
    setSearchOpen(false);
    setSelectedUnit(null);

    window.setTimeout(() => setSelectedUnit(unit), 0);

    const map = mapRef.current;
    if (map) {
      map.flyTo({
        center: [unit.lng, unit.lat],
        zoom: 11,
        speed: 1.2,
        essential: true,
      });
    }
  };

  return (
    <>
      <div className="relative z-20 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5 shrink-0 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Buscar por identificador o nombre en AGEB"
            aria-label="Buscar por CLUES o nombre"
            className="w-full border-0 bg-transparent text-sm text-gray-800 outline-none placeholder:text-gray-400"
          />
        </div>

        {searchOpen && query.trim().length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl">
            {searchResults.length > 0 ? searchResults.map((unit) => (
              <button
                key={unit.clues}
                type="button"
                onClick={() => handleSelectUnit(unit)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-gray-50"
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${getMapCategory(unit) === 'CSA_ACEPTADA' ? 'bg-[#A57F2C]' : 'bg-gray-500'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-gray-800">{unit.nombre_de_la_unidad}</span>
                  <span className="block truncate text-xs text-gray-500">{unit.clues} · {unit.entidad}</span>
                </span>
                <span className="text-[10px] font-bold text-gray-400">AGEB</span>
              </button>
            )) : (
              <p className="px-3 py-4 text-center text-sm text-gray-500">No se encontraron unidades</p>
            )}
          </div>
        )}
      </div>

      <section className="card flex w-full flex-col overflow-hidden" style={{ height: '72vh', minHeight: '560px', maxHeight: '760px' }}>

        {/* Header */}
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
              <MapPin className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-800">Cobertura CLUES — Mapa Nacional</h3>
              <p className="mt-0.5 text-xs text-gray-400">Unidades de primer nivel distribuidas por institución</p>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:mr-3 sm:w-auto sm:gap-3">
            <div className="rounded-xl bg-[#FBF7ED] px-3 py-2 text-xs font-bold text-[#A57F2C]">AGEB</div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2 text-right">
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500">Total unidades</p>
              <p className="text-lg font-black text-emerald-700">{total.toLocaleString('es-MX')}</p>
            </div>
          </div>
        </div>

        {/* Mapa */}
        <div className="relative flex-1 overflow-hidden">
          <div ref={mapContainerRef} className="absolute inset-0" />
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-xs text-gray-500 sm:px-6">
          <span className="font-semibold text-gray-600">Consultorios faltantes:</span>
          {([
            ['1', '1', '#0D5D2A'],
            ['2-3', '2–3', '#F1D54A'],
            ['4-5', '4–5', '#FFA000'],
            ['NA', 'Zonas con alta presión demográfica', '#A57F2C'],
          ] as const).map(([key, label, color]) => (
            <button
              key={key}
              type="button"
              onClick={() => toggleSemaforo(key)}
              aria-pressed={activeSemaforos[key]}
              className={`flex items-center gap-1.5 font-semibold transition-opacity ${activeSemaforos[key] ? 'text-gray-700' : 'text-gray-400 opacity-50'}`}
            >
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              {label}
            </button>
          ))}
          <span className="ml-auto text-gray-400">Pasa el cursor sobre un punto para ver detalles</span>
        </div>
      </section>
    </>
  );
}
export function StatCards({
  cluesGeo = [],
}: ChartsProps) {
  const values: Record<StatKey, { value: number; helper: string }> = {
    total: { value: cluesGeo.length, helper: 'Registros geográficos' },
  };

  return (
    <>
      {/* Cards de métricas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map((def) => (
          <StatCard
            key={def.key}
            def={def}
            value={values[def.key].value}
            helper={values[def.key].helper}
          />
        ))}
      </div>

      <MapSection cluesGeo={cluesGeo} />
    </>
  );
}

export function Charts({
  internetPie,
  porEntidad,
  topFaltantes,
}: ChartsProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Top 10 cosas mas frecuentes que no tienen" subtitle="Frecuencia de faltantes por pregunta en consultorios levantados">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topFaltantes} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#9CA3AF' }} />
              <YAxis type="category" dataKey="item" tick={{ fontSize: 10, fill: '#6B7280' }} width={180} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(v, name, item) => {
                  if (name === 'pct') return [`${formatTooltipNumber(v)}%`, '%'];
                  return [formatTooltipNumber(v), 'Faltantes'];
                }}
                cursor={{ fill: '#F9FAFB' }}
              />
              <Bar dataKey="faltantes" fill="#A57F2C" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Unidades con y sin internet" subtitle="Distribucion desde columna internet en resumen">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={internetPie} cx="50%" cy="45%" outerRadius={100} innerRadius={55} dataKey="value" paddingAngle={2} stroke="none">
                {internetPie.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatTooltipNumber(v), 'Unidades']} />
              <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#6B7280' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard title="Resumen por entidad" subtitle="Unidades, consultorios habilitados y consultorios levantados">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={porEntidad} margin={{ top: 0, right: 10, left: 0, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
            <XAxis dataKey="entidad" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 10, fill: '#9CA3AF' }} height={70} />
            <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatTooltipNumber(v)} cursor={{ fill: '#F9FAFB' }} />
            <Legend verticalAlign="top" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingBottom: '8px', color: '#6B7280' }} />
            <Bar dataKey="unidades" name="Unidades" fill="#002F2A" />
            <Bar dataKey="consultoriosHabilitados" name="Consultorios Habilitados" fill="#A57F2C" />
            <Bar dataKey="consultoriosLevantados" name="Consultorios Levantados" fill="#1A6B5E" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
