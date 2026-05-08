<template>
  <section class="relative flex min-h-[calc(100svh-64px)] items-center px-4 sm:px-6 py-16 sm:py-[4.5rem] lg:py-20 bg-white border-t border-slate-100 overflow-hidden">
    <!-- Glow de fondo -->
    <div class="absolute top-0 right-0 w-[600px] h-[500px] -z-10 pointer-events-none"
      style="background: radial-gradient(ellipse at top right, #ecfeff 0%, #cffafe 40%, transparent 70%); opacity: 0.8"></div>

    <div class="w-full max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto + features -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-100 text-cyan-700 text-xs font-bold uppercase tracking-wider mb-4"><BarChart3 class="w-4 h-4" />Datos oficiales</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Ranking nacional<br>con datos del Mineduc</h2>
            <p class="text-slate-500 mt-4 text-base leading-relaxed">Compara empleabilidad, sueldos y matrículas de todas las carreras del sistema chileno. Información oficial SIES 2025 para tomar la mejor decisión.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-cyan-100 text-cyan-700 flex items-center justify-center shrink-0 group-hover:bg-cyan-200 transition-colors"><TrendingUp class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Empleabilidad por carrera y región</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Compara la tasa de empleo al año de egreso de cada carrera, desglosada por institución y región del país.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-sky-200 hover:bg-sky-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center shrink-0 group-hover:bg-sky-200 transition-colors"><Banknote class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Ranking de salarios reales</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Ordena las carreras por sueldo promedio al primer, tercer y quinto año de egresado según datos oficiales.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors"><School class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Matrícula e instituciones</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Filtra por área, institución o región. Ve dónde se imparte cada carrera y cuántos alumnos estudian ahí.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/ranking" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-cyan-200">
            Ver ranking nacional <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

          <!-- Mockup -->
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl blur-xl -z-10" style="background: radial-gradient(ellipse, #bae6fd 0%, #a5f3fc 60%, transparent 80%); opacity: 0.4"></div>
          <div class="absolute top-4 right-6 hidden sm:flex items-center gap-2 rounded-full border border-cyan-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-cyan-700 shadow-md shadow-cyan-100">
            <span class="h-2 w-2 rounded-full bg-cyan-500"></span>
            Actualizado con SIES 2025
          </div>
          <div class="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_20px_54px_-32px_rgba(6,182,212,0.3)]">
            <!-- Barra de ventana -->
            <div class="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <span class="text-xs font-semibold text-slate-500">Ranking instituciones · KoraChile</span>
              </div>
              <span class="rounded-full border border-cyan-200 bg-cyan-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-700">Mineduc</span>
            </div>

            <div class="bg-gradient-to-b from-white via-cyan-50/20 to-white p-4 sm:p-5 space-y-3">
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
                    <div class="text-xl font-extrabold" :class="inst.score >= 80 ? 'text-emerald-600' : inst.score >= 60 ? 'text-cyan-600' : 'text-amber-500'">{{ inst.score }}</div>
                    <div class="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">Score</div>
                  </div>
                </div>
              </div>

              <!-- Stats row -->
              <div class="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100">
                <div class="rounded-xl border border-slate-200 bg-slate-50 py-2 text-center">
                  <div class="text-base font-extrabold text-slate-900">$1.2M</div>
                  <div class="text-[10px] text-slate-500 mt-0.5">Sueldo prom.</div>
                </div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 py-2 text-center">
                  <div class="text-base font-extrabold text-slate-900">+200</div>
                  <div class="text-[10px] text-slate-500 mt-0.5">Instituciones</div>
                </div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 py-2 text-center">
                  <div class="text-base font-extrabold text-slate-900">+1.200</div>
                  <div class="text-[10px] text-slate-500 mt-0.5">Carreras</div>
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
    const { data } = await supabase
      .from('institutions')
      .select('institution_code, logo_url, nombre_institucion')
      .or(keywords.map(k => `nombre_institucion.ilike.%${k}%`).join(','))
      .limit(20)
    if (!data) return

    // Mapeo por palabra clave para tolerar variaciones de nombre en la BD
    const find = (kw: string) =>
      data.find(d => d.nombre_institucion?.toLowerCase().includes(kw.toLowerCase()))

    const matches = [
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
