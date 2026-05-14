// Datos de mercado laboral en Chile (CLP - Pesos Chilenos)
export const marketData = {
  'diseñador-ux': {
    salary: { min: 1800000, max: 3500000, avg: 2500000 },
    demand: 'muy-alta',
    growth: 16, // % anual
    jobsAvailable: 850,
    companies: ['Globant', 'Accenture', 'Falabella Interactive', 'Rappi Chile', 'Condor Labs'],
    description: 'Demanda creciente en startups y retail digital chileno',
  },
  'frontend-developer': {
    salary: { min: 2500000, max: 4500000, avg: 3500000 },
    demand: 'muy-alta',
    growth: 19,
    jobsAvailable: 1200,
    companies: ['Stefanini', 'Accenture', 'Globant', 'Despegar.com', 'Platanus'],
    description: 'Una de las carreras más demandadas en Chile',
  },
  'data-scientist': {
    salary: { min: 3000000, max: 5200000, avg: 4000000 },
    demand: 'muy-alta',
    growth: 23,
    jobsAvailable: 650,
    companies: ['Banco de Chile', 'Telefónica', 'Grupo Económico', 'Fintech Chileno', 'DataPath'],
    description: 'Altamente especializado, excelentes salarios en bancos y retail',
  },
  'product-manager': {
    salary: { min: 3500000, max: 5500000, avg: 4500000 },
    demand: 'alta',
    growth: 13,
    jobsAvailable: 420,
    companies: ['Cornershop', 'Despegar.com', 'Blom', 'Notchip', 'Lana Labs'],
    description: 'Rol estratégico con alta demanda en fintech y e-commerce',
  },
  'marketing-digital': {
    salary: { min: 1500000, max: 2800000, avg: 2100000 },
    demand: 'alta',
    growth: 15,
    jobsAvailable: 980,
    companies: ['Agencias Digitales', 'Falabella', 'Jumbo', 'Google Chile', 'Meta Ads Partners'],
    description: 'Crecimiento sostenido en todos los sectores e-commerce',
  },
  'content-creator': {
    salary: { min: 800000, max: 2500000, avg: 1500000 },
    demand: 'alta',
    growth: 29,
    jobsAvailable: 1500,
    companies: ['Productoras Digitales', 'Agencias Creativas', 'Plataformas Locales', 'YouTube Partners', 'TikTok Chile'],
    description: 'Sector emergente con gran potencial en redes sociales chilenas',
  },
}

export type CareerMarketData = typeof marketData[keyof typeof marketData]

/**
 * Obtiene datos de mercado para una carrera
 */
export function getMarketData(careerId: string): CareerMarketData {
  return marketData[careerId as keyof typeof marketData] || {
    salary: { min: 1500000, max: 3500000, avg: 2500000 },
    demand: 'media',
    growth: 10,
    jobsAvailable: 500,
    companies: ['Varias empresas chilenas'],
    description: 'Información no disponible',
  }
}

/**
 * Formatea el salario (CLP)
 */
export function formatSalary(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Obtiene color de demanda laboral
 */
export function getDemandColor(demand: string): string {
  const colors: Record<string, string> = {
    'muy-alta': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'alta': 'bg-blue-100 text-blue-700 border-blue-200',
    'media': 'bg-amber-100 text-amber-700 border-amber-200',
    'baja': 'bg-red-100 text-red-700 border-red-200',
  }
  return colors[demand] || colors['media']
}

/**
 * Obtiene label de demanda
 */
export function getDemandLabel(demand: string): string {
  const labels: Record<string, string> = {
    'muy-alta': 'Muy Alta',
    'alta': 'Alta',
    'media': 'Media',
    'baja': 'Baja',
  }
  return labels[demand] || 'Sin datos'
}
