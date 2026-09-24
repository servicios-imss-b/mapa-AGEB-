import type { CellValue, CluesGeoItem, DataRow, TablasFormulario } from './types';

async function fetchJson<T>(filename: string): Promise<T | null> {
  const ts = Date.now();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}${filename}?_cb=${ts}`);
    if (!response.ok) return null;
    return await response.json() as T;
  } catch {
    return null;
  }
}

function getGeometryCenter(geometry: { type?: string; coordinates?: unknown[] }): [number, number] | null {
  const positions: [number, number][] = [];

  function collect(value: unknown): void {
    if (!Array.isArray(value)) return;
    if (typeof value[0] === 'number' && typeof value[1] === 'number') {
      positions.push([value[0], value[1]]);
      return;
    }
    value.forEach(collect);
  }

  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') return null;
  collect(geometry.coordinates);
  if (positions.length === 0) return null;

  const [lngTotal, latTotal] = positions.reduce(
    ([lng, lat], [positionLng, positionLat]) => [lng + positionLng, lat + positionLat],
    [0, 0],
  );
  return [lngTotal / positions.length, latTotal / positions.length];
}

async function fetchCluesGeo(): Promise<CluesGeoItem[]> {
  const payload = await fetchJson<{
    features?: Array<{
      geometry?: { type?: string; coordinates?: unknown[] };
      properties?: Record<string, unknown>;
    }>;
  }>('mapa_base.geojson');

  if (!Array.isArray(payload?.features)) return [];

  return payload.features.flatMap((feature) => {
    const properties = feature.properties;
    const center = feature.geometry ? getGeometryCenter(feature.geometry) : null;
    const cveLoc = String(properties?.cve_loc ?? '').trim();
    const nomLoc = String(properties?.nom_loc ?? '').trim();
    const rawConsultoriosFaltantes = properties?.consultorios_faltantes;
    const consultoriosFaltantes = rawConsultoriosFaltantes === null
      || rawConsultoriosFaltantes === undefined
      || String(rawConsultoriosFaltantes).trim() === ''
      ? null
      : Number(rawConsultoriosFaltantes);

    if (
      !center
      || !cveLoc
      || !nomLoc
      || !feature.geometry
    ) return [];

    return [{
      clues: cveLoc,
      clave_de_la_institucion: 'CSA',
      aceptado: null,
      nombre_de_la_unidad: nomLoc,
      entidad: '',
      municipio: '',
      localidad: nomLoc,
      total_consultorios: null,
      poblacion_por_consultorio: null,
      consulta_general: null,
      consultorios_faltantes: consultoriosFaltantes !== null
        && Number.isFinite(consultoriosFaltantes)
        && consultoriosFaltantes > 0
        ? consultoriosFaltantes
        : null,
      geometry: feature.geometry as CluesGeoItem['geometry'],
      lng: center[0],
      lat: center[1],
    }];
  });
}

async function fetchBaseMeta(): Promise<{ cluesTotal: number; entidadesEsperadas: number; scriptLastRunAt?: string }> {
  const payload = await fetchJson<Record<string, unknown>>('base_meta.json');
  if (!payload) return { cluesTotal: 0, entidadesEsperadas: 0 };
  const cluesTotal = Number(payload?.clues_unicas ?? payload?.clues_total ?? 0);
  const entidadesEsperadas = Number(payload?.entidades_esperadas ?? 0);
  return {
    cluesTotal: Number.isFinite(cluesTotal) ? cluesTotal : 0,
    entidadesEsperadas: Number.isFinite(entidadesEsperadas) ? entidadesEsperadas : 0,
    scriptLastRunAt: typeof payload?.script_last_run_at === 'string' ? payload.script_last_run_at : undefined,
  };
}

function toCellValue(value: unknown): CellValue {
  if (value === null || value === undefined || value === '') return null;
  const text = String(value).trim();
  const low = text.toLowerCase();
  if (low === 'true') return true;
  if (low === 'false') return false;
  const asNumber = Number(text);
  if (!Number.isNaN(asNumber) && text !== '') return asNumber;
  return text;
}

async function fetchDataRows(filename: string): Promise<DataRow[]> {
  const payload = await fetchJson<Record<string, unknown>[]>(filename);
  if (!Array.isArray(payload)) return [];
  return payload.map((row) => {
    const normalized: DataRow = {};
    Object.entries(row).forEach(([key, value]) => {
      normalized[key] = toCellValue(value);
    });
    return normalized;
  });
}

export async function cargarTablasFormulario(): Promise<{ tablas: TablasFormulario; fetchedAt: Date }> {
  const [cluesGeo] = await Promise.all([fetchCluesGeo()]);

  const tablas: TablasFormulario = {
    baseClues: cluesGeo.map((unit) => unit.clues),
    baseMeta: { cluesTotal: cluesGeo.length, entidadesEsperadas: 0 },
    baseAn: [],
    resultado: [],
    resumen: [],
    resumenEntidad: [],
    cluesGeo,
    faltantes: [],
  };

  return { tablas, fetchedAt: new Date() };
}
