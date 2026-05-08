<template>
  <section class="relative flex min-h-[calc(100svh-64px)] items-center px-4 sm:px-6 py-16 sm:py-[4.5rem] lg:py-20 bg-white border-t border-slate-100 overflow-hidden">
    <!-- Glow de fondo -->
    <div class="absolute top-0 right-0 w-[600px] h-[500px] -z-10 pointer-events-none"
      style="background: radial-gradient(ellipse at top right, #eef2ff 0%, #e0f2fe 40%, transparent 70%); opacity: 0.7"></div>

    <div class="w-full max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto + features -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4"><Sparkles class="w-4 h-4" />Orientación vocacional</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Descubre tu carrera<br>con ayuda de Kora</h2>
            <p class="text-slate-500 mt-4 text-base leading-relaxed">Cuéntanos qué te apasiona, cómo eres o responde el quiz RIASEC + MBTI. En segundos obtienes carreras personalizadas basadas en tu perfil, con todo lo que necesitas saber para conocerlas.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors"><Sparkles class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Ayuda vocacional adaptada para ti</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Escribe libremente o responde el quiz RIASEC + MBTI. La IA analiza tu perfil y recomienda las carreras más afines en segundos.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors"><Map class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Información de las carreras disponibles</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Obtén un plan de estudios año a año, habilidades clave que desarrollarás y qué esperar de cada etapa.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 group-hover:bg-indigo-200 transition-colors"><Wallet class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Sueldos reales de egresados</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Ve cuánto gana un recién egresado y la proyección salarial a 5 años según datos SIES 2025 del Mineduc.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/discover" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-200">
            Descubrir mi carrera <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Mockup -->
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl blur-xl -z-10" style="background: radial-gradient(ellipse, #c7d2fe 0%, #bae6fd 60%, transparent 80%); opacity: 0.42"></div>
          <div class="absolute top-4 right-6 hidden sm:flex items-center gap-2 rounded-full border border-indigo-200 bg-white/95 px-3 py-1.5 text-[11px] font-semibold text-indigo-700 shadow-md shadow-indigo-100">
            <span class="h-2 w-2 rounded-full bg-indigo-500"></span>
            Quiz RIASEC + MBTI
          </div>
          <div class="absolute bottom-4 left-6 hidden lg:flex items-center gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-lg shadow-slate-200/60">
            <div class="text-left">
              <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Compatibilidad</div>
              <div class="text-lg font-extrabold text-slate-900">92%</div>
            </div>
            <div class="h-10 w-px bg-slate-200"></div>
            <div class="text-left">
              <div class="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Roadmap</div>
              <div class="text-sm font-semibold text-indigo-600">Listo para exportar</div>
            </div>
          </div>
          <div class="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_20px_54px_-32px_rgba(99,102,241,0.35)]">
            <div class="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/90 px-5 py-4">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <span class="text-xs font-semibold text-slate-500">Vocación</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700">Charla en vivo</span>
                <span class="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-500">Datos SIES</span>
              </div>
            </div>

            <div class="space-y-5 bg-gradient-to-b from-white via-indigo-50/40 to-white p-5 sm:p-6">
              <div class="rounded-2xl border border-indigo-100 bg-white/90 p-4 shadow-sm shadow-indigo-100/60">
                <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <span class="text-sm text-slate-500 italic">Me apasionan las personas y la tecnología...</span>
                  <div class="ml-auto w-0.5 h-4 bg-indigo-400 rounded-sm animate-pulse"></div>
                </div>

                <div class="mt-3 flex flex-wrap gap-2">
                  <span class="rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-semibold text-indigo-700">Perfil social</span>
                  <span class="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold text-sky-700">Alta curiosidad</span>
                  <span class="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">Liderazgo natural</span>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div v-for="c in discoverPreview" :key="c.name" class="rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm shadow-slate-100 transition-transform hover:-translate-y-1">
                  <div class="flex justify-center"><component :is="c.icon" class="w-7 h-7 text-indigo-600" /></div>
                  <div class="mt-2 text-[11px] font-bold text-slate-800 leading-tight">{{ c.name }}</div>
                  <div class="mt-2 space-y-1">
                    <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div class="h-full rounded-full bg-indigo-500" :style="`width:${c.match}%`"></div>
                    </div>
                    <span class="text-[10px] font-bold text-indigo-600">{{ c.match }}% match</span>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                <div class="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
                  <div class="flex items-center justify-between">
                    <div class="text-[11px] font-bold text-indigo-700 uppercase tracking-wider">Tu perfil vocacional</div>
                    <div class="text-[10px] text-slate-500">IA generado</div>
                  </div>
                  <div class="flex gap-2 flex-wrap">
                    <span v-for="tag in ['Social','Investigador','Emprendedor']" :key="tag" class="text-[11px] px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold border border-indigo-200">{{ tag }}</span>
                  </div>
                  <div class="pt-2 border-t border-indigo-100 flex items-center justify-between">
                    <span class="text-[11px] text-slate-500">Roadmap generado</span>
                    <span class="text-[11px] text-indigo-600 font-semibold">Adm. de Empresas →</span>
                  </div>
                </div>

                <div class="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-inner">
                  <div class="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Resultado sugerido</div>
                  <div class="mt-3 text-lg font-bold">Administración de Empresas</div>
                  <div class="mt-2 text-xs leading-relaxed text-slate-300">Encaja por tu mezcla de habilidades sociales, visión de negocio y afinidad por entornos tecnológicos.</div>
                  <div class="mt-4 grid grid-cols-2 gap-2 text-center">
                    <div class="rounded-xl bg-white/10 px-2 py-3">
                      <div class="text-sm font-extrabold">5 años</div>
                      <div class="text-[10px] text-slate-400">duración</div>
                    </div>
                    <div class="rounded-xl bg-white/10 px-2 py-3">
                      <div class="text-sm font-extrabold">$1.1M</div>
                      <div class="text-[10px] text-slate-400">promedio</div>
                    </div>
                  </div>
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
import { ArrowRight, BarChart3, BriefcaseBusiness, HardHat, Map, Sparkles, Wallet } from 'lucide-vue-next'
const discoverPreview = [
  { icon: BriefcaseBusiness, name: 'Adm. de Empresas', match: 92 },
  { icon: HardHat, name: 'Ing. Civil', match: 85 },
  { icon: BarChart3, name: 'Data Science', match: 79 },
]
</script>
