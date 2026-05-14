<template>
  <section class="relative flex min-h-[calc(100svh-64px)] items-center px-4 sm:px-6 py-16 sm:py-[4.5rem] lg:py-20 overflow-hidden" style="background:transparent;">

    <div class="w-full max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto + features -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider" style="background:#f0f6ff; border:1px solid #cce0ff; color:#0071e3; border-radius:999px;"><BarChart3 class="w-4 h-4" />Datos oficiales</span>
            <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style="color:#1d1d1f; letter-spacing:-0.02em;">Instituciones nacional<br>con datos del Mineduc</h2>
            <p style="color:#474747;" class="mt-4 text-base leading-relaxed">Compara empleabilidad, sueldos y matrículas de todas las carreras del sistema chileno. Información oficial SIES 2025 para tomar la mejor decisión.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:#ffffff; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><TrendingUp class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Empleabilidad por carrera y región</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Compara la tasa de empleo al año de egreso de cada carrera, desglosada por institución y región del país.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:#ffffff; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><Banknote class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Ranking de salarios reales</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Ordena las carreras por sueldo promedio al primer, tercer y quinto año de egresado según datos oficiales.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:#ffffff; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><School class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Matrícula e instituciones</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Filtra por área, institución o región. Ve dónde se imparte cada carrera y cuántos alumnos estudian ahí.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/Instituciones" class="inline-flex items-center gap-2 font-semibold text-sm transition-opacity hover:opacity-80" style="background:#0071e3; color:#ffffff; border-radius:999px; padding:0.75rem 1.75rem;">
            Ver Instituciones nacional <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

          <!-- Mockup -->
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl blur-xl -z-10" style="background: radial-gradient(ellipse, rgba(0,113,227,0.1) 0%, rgba(201,89,221,0.06) 60%, transparent 80%);"></div>
          <div class="absolute top-4 right-6 hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm" style="border:1px solid #cce0ff; background:#ffffff; color:#0071e3;">
            <span class="h-2 w-2 rounded-full bg-cyan-500"></span>
            Actualizado con SIES 2025
          </div>
          <div class="relative overflow-hidden bg-white/95" style="border-radius:28px; border:1px solid #e8e8ed;">
            <div class="flex items-center justify-between px-5 py-4" style="border-bottom:1px solid #e8e8ed; background:#f5f5f7;">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full" style="background:#ff5f57;"></span>
                  <span class="h-2.5 w-2.5 rounded-full" style="background:#febc2e;"></span>
                  <span class="h-2.5 w-2.5 rounded-full" style="background:#28c840;"></span>
                </div>
                <span class="text-xs font-semibold" style="color:#474747;">Instituciones instituciones · KoraChile</span>
              </div>
              <span class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style="border:1px solid #cce0ff; background:#f0f6ff; color:#0071e3;">Mineduc</span>
            </div>

              <div class="bg-white p-4 sm:p-5 space-y-3">
              <!-- Barra de búsqueda simulada -->
              <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <svg class="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                <span class="text-xs text-slate-400">Busca por nombre (ej: Católica, USACH…)</span>
              </div>

              <!-- Cards de instituciones -->
              <div class="space-y-2">
                <div v-for="(inst, i) in rankingPreview" :key="inst.name"
                  class="flex items-center gap-3 rounded-2xl border bg-white p-3 shadow-sm transition-colors"
                  :class="i === 0 ? 'border-amber-200' : i === 1 ? 'border-slate-200' : i === 2 ? 'border-amber-700/20' : 'border-slate-100'">
                  <!-- Logo real + badge posición -->
                  <div class="relative shrink-0">
                    <div class="w-10 h-10 rounded-xl flex items-center justify-center border-2 overflow-hidden"
                      :class="i === 0 ? 'border-amber-400 bg-amber-50'
                            : i === 1 ? 'border-slate-300 bg-slate-50'
                            : i === 2 ? 'border-amber-600 bg-amber-50'
                            : 'border-slate-200 bg-white'">
                      <InstitutionLogo
                        :logo-url="inst.logo_url"
                        :institution-name="inst.name"
                        :fallback-class="i === 0 ? 'text-amber-600' : i === 1 ? 'text-slate-500' : i === 2 ? 'text-amber-700' : 'text-slate-400'" />
                    </div>
                    <span class="absolute -bottom-1 -right-1 text-[9px] font-black px-1 rounded-md shadow-sm leading-tight"
                      :class="i === 0 ? 'bg-amber-400 text-white'
                            : i === 1 ? 'bg-slate-400 text-white'
                            : i === 2 ? 'bg-amber-700 text-white'
                            : 'bg-slate-200 text-slate-600'">{{ i + 1 }}</span>
                  </div>
                  <!-- Info -->
                  <div class="flex-1 min-w-0">
                    <div class="text-xs font-bold text-slate-900 truncate">{{ inst.name }}</div>
                    <div class="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-50 border border-slate-200 font-semibold text-slate-500">{{ inst.tipo }}</span>
                      <span class="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 font-semibold text-emerald-700">{{ inst.acred }} años</span>
                    </div>
                  </div>
                  <!-- Score -->
                  <div class="shrink-0 text-right">
                    <div class="text-xl font-extrabold" :class="inst.score >= 80 ? 'text-emerald-600' : inst.score >= 60 ? 'text-[#0071e3]' : 'text-amber-500'">{{ inst.score }}</div>
                    <div class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Score</div>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2 pt-1" style="border-top:1px solid #e8e8ed;">
                <div class="rounded-xl py-2 text-center" style="border:1px solid #e8e8ed; background:#f5f5f7;">
                  <div class="text-base font-extrabold" style="color:#1d1d1f;">$1.2M</div>
                  <div class="text-[10px] mt-0.5" style="color:#474747;">Sueldo prom.</div>
                </div>
                <div class="rounded-xl py-2 text-center" style="border:1px solid #e8e8ed; background:#f5f5f7;">
                  <div class="text-base font-extrabold" style="color:#1d1d1f;">+200</div>
                  <div class="text-[10px] mt-0.5" style="color:#474747;">Instituciones</div>
                </div>
                <div class="rounded-xl py-2 text-center" style="border:1px solid #e8e8ed; background:#f5f5f7;">
                  <div class="text-base font-extrabold" style="color:#1d1d1f;">+3.000</div>
                  <div class="text-[10px] mt-0.5" style="color:#474747;">Carreras</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ArrowRight, Banknote, BarChart3, School, TrendingUp } from 'lucide-vue-next'

interface PreviewInst {
  name: string
  tipo: string
  acred: number
  score: number
  logo_url: string | null
  code: number
}

interface InstitutionLookupRow {
  institution_code: number
  logo_url: string | null
  nombre_institucion: string | null
}

// Datos base — los logos se enriquecen desde Supabase al montar
const rankingPreview = ref<PreviewInst[]>([
  { name: 'P. U. Católica',    tipo: 'Universidad', acred: 7, score: 91, logo_url: null, code: 0 },
  { name: 'U. de Chile',       tipo: 'Universidad', acred: 7, score: 88, logo_url: null, code: 0 },
  { name: 'USACH',             tipo: 'Universidad', acred: 5, score: 79, logo_url: null, code: 0 },
  { name: 'U. Andrés Bello',   tipo: 'Universidad', acred: 4, score: 72, logo_url: null, code: 0 },
])

onMounted(async () => {
  try {
    const supabase = useSupabaseClient()
    const keywords = ['Católica de Chile', 'de Chile', 'Santiago de Chile', 'Andrés Bello']
    const response = await (supabase as any)
      .from('institutions')
      .select('institution_code, logo_url, nombre_institucion')
      .or(keywords.map(k => `nombre_institucion.ilike.%${k}%`).join(','))
      .limit(20)
    const data: InstitutionLookupRow[] = Array.isArray(response.data) ? response.data : []
    if (!data.length) return

    // Mapeo por palabra clave para tolerar variaciones de nombre en la BD
    const find = (kw: string) =>
      data.find(d => d.nombre_institucion?.toLowerCase().includes(kw.toLowerCase()))

    const matches: Array<InstitutionLookupRow | undefined> = [
      find('católica de chile') ?? find('pontificia'),
      find('universidad de chile'),
      find('santiago de chile') ?? find('usach'),
      find('andrés bello'),
    ]

    rankingPreview.value = rankingPreview.value.map((inst, i) => {
      const found = matches[i]
      return found
        ? { ...inst, logo_url: found.logo_url ?? null, code: found.institution_code }
        : inst
    })
  } catch {
    // silencioso — si falla sigue mostrando el fallback SVG
  }
})
</script>
