const GRATUIDAD_INSTITUTION_CODES = new Set<number>([
  // Universidades estatales y CRUCH / adscritas conocidas en el dataset.
  3, 4, 13, 20, 23, 34, 39, 45, 50, 54,
  69, 70, 71, 72, 73, 74, 76, 78, 82, 84, 85, 86, 87, 88, 89, 90, 91, 93, 94,
  // IP/CFT adscritos comunes presentes en la base.
  100, 111, 116, 143, 260, 430,
])

function normalizeInstitutionName(name?: string | null) {
  return String(name ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ')
    .trim()
}

const GRATUIDAD_NAME_HINTS = [
  'PONTIFICIA UNIVERSIDAD CATOLICA DE CHILE',
  'PONTIFICIA UNIVERSIDAD CATOLICA DE VALPARAISO',
  'UNIVERSIDAD DE CHILE',
  'UNIVERSIDAD DE SANTIAGO DE CHILE',
  'UNIVERSIDAD DE CONCEPCION',
  'UNIVERSIDAD TECNICA FEDERICO SANTA MARIA',
  'UNIVERSIDAD AUSTRAL DE CHILE',
  'UNIVERSIDAD CATOLICA DEL NORTE',
  'INSTITUTO PROFESIONAL DUOC UC',
  'INSTITUTO PROFESIONAL AIEP',
  'INSTITUTO PROFESIONAL INACAP',
  'CENTRO DE FORMACION TECNICA INACAP',
]

export function resolveGratuidad(institutionCode?: number | null, institutionName?: string | null) {
  const code = typeof institutionCode === 'number' && Number.isFinite(institutionCode)
    ? institutionCode
    : null
  const normalizedName = normalizeInstitutionName(institutionName)
  const byCode = code !== null && GRATUIDAD_INSTITUTION_CODES.has(code)
  const byName = normalizedName
    ? GRATUIDAD_NAME_HINTS.some(name => normalizedName === normalizeInstitutionName(name))
    : false

  const adscrita = byCode || byName
  return {
    adscrita,
    label: adscrita ? 'Tiene gratuidad' : 'No registra gratuidad',
    source: 'lista_local_instituciones_adscritas',
  }
}