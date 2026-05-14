<template>
  <section class="relative flex min-h-[calc(100svh-64px)] items-center px-4 sm:px-6 py-16 sm:py-[4.5rem] lg:py-20 overflow-hidden" style="background:transparent;">

    <div class="w-full max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto + features -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider" style="background:#f0f6ff; border:1px solid #cce0ff; color:#0071e3; border-radius:999px;"><Sparkles class="w-4 h-4" />Orientación vocacional</span>
            <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style="color:#1d1d1f; letter-spacing:-0.02em;">Descubre tu carrera<br>con ayuda de Kora</h2>
            <p style="color:#474747;" class="mt-4 text-base leading-relaxed">Cuéntanos qué te apasiona, cómo eres o responde el quiz RIASEC + MBTI. En segundos obtienes carreras personalizadas basadas en tu perfil, con todo lo que necesitas saber para conocerlas.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:white; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><Headset class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Ayuda vocacional adaptada para ti</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Escribe libremente o responde el quiz RIASEC + MBTI. La IA analiza tu perfil y recomienda las carreras más afines en segundos.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:white; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><Map class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Información de las carreras disponibles</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Obtén un plan de estudios año a año, habilidades clave que desarrollarás y qué esperar de cada etapa.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl transition-colors group" style="background:white; border:1px solid #e8e8ed;">
              <div class="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style="background:#e3f0ff; color:#0071e3;"><Wallet class="w-4 h-4" /></div>
              <div>
                <div class="font-semibold text-sm" style="color:#1d1d1f;">Sueldos reales de egresados</div>
                <div class="text-xs mt-1 leading-relaxed" style="color:#474747;">Ve cuánto gana un recién egresado y la proyección salarial a 5 años según datos SIES 2025 del Mineduc.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/discover" class="inline-flex items-center gap-2 font-semibold text-sm transition-opacity hover:opacity-80" style="background:#0071e3; color:#ffffff; border-radius:999px; padding:0.75rem 1.75rem;">
            Descubrir mi carrera <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Mockup -->
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl blur-xl -z-10" style="background: radial-gradient(ellipse, rgba(0,113,227,0.12) 0%, rgba(201,89,221,0.07) 60%, transparent 80%);"></div>
          <div class="absolute top-4 right-6 hidden sm:flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-sm" style="border:1px solid #e3f0ff; background:#ffffff; color:#0071e3;">
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
          <div class="relative overflow-hidden bg-white/95" style="border-radius:28px; border:1px solid #e8e8ed;">
            <div class="flex items-center justify-between px-5 py-4" style="border-bottom:1px solid #e8e8ed; background:#f5f5f7;">
              <div class="flex items-center gap-3">
                <div class="flex items-center gap-1.5">
                  <span class="h-2.5 w-2.5 rounded-full bg-rose-400"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
                  <span class="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
                </div>
                <span class="text-xs font-semibold text-slate-500">Vocación</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style="border:1px solid #cce0ff; background:#f0f6ff; color:#0071e3;">Charla en vivo</span>
                <span class="rounded-full px-2.5 py-1 text-[10px] font-semibold" style="border:1px solid #e8e8ed; background:#ffffff; color:#474747;">Datos SIES</span>
              </div>
            </div>

              <div class="space-y-5 p-5 sm:p-6" style="background:#ffffff;">
                <div class="rounded-2xl p-4" style="border:1px solid #e3f0ff; background:#ffffff;">
                <div class="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                  <span class="text-sm text-slate-500 italic">Me apasionan las personas y la tecnología...</span>
                  <div class="ml-auto w-0.5 h-4 bg-indigo-400 rounded-sm animate-pulse"></div>
                </div>

                <div class="mt-3 flex flex-wrap gap-2">
                    <span class="rounded-full px-3 py-1 text-[11px] font-semibold" style="background:#f0f6ff; color:#0071e3;">Perfil social</span>
                    <span class="rounded-full px-3 py-1 text-[11px] font-semibold" style="background:#f5f5f7; color:#1d1d1f;">Alta curiosidad</span>
                    <span class="rounded-full px-3 py-1 text-[11px] font-semibold" style="background:#f5f5f7; color:#474747;">Liderazgo natural</span>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-3">
                <div v-for="c in discoverPreview" :key="c.name" class="rounded-2xl p-3 text-center transition-transform hover:-translate-y-1" style="border:1px solid #e8e8ed; background:#ffffff;">
                  <div class="flex justify-center"><component :is="c.icon" class="w-7 h-7" style="color:#0071e3;" /></div>
                  <div class="mt-2 text-[11px] font-bold leading-tight" style="color:#1d1d1f;">{{ c.name }}</div>
                  <div class="mt-2 space-y-1">
                    <div class="h-1.5 rounded-full overflow-hidden" style="background:#e8e8ed;">
                      <div class="h-full rounded-full" style="background:#0071e3;" :style="`width:${c.match}%`"></div>
                    </div>
                    <span class="text-[10px] font-bold" style="color:#0071e3;">{{ c.match }}% match</span>
                  </div>
                </div>
              </div>

              <div class="grid gap-4 md:grid-cols-[1.25fr_0.75fr]">
                <div class="rounded-2xl p-4 space-y-3" style="border:1px solid #cce0ff; background:#f0f6ff;">
                  <div class="flex items-center justify-between">
                    <div class="text-[11px] font-bold uppercase tracking-wider" style="color:#0071e3;">Tu perfil vocacional</div>
                  </div>
                  <div class="flex gap-2 flex-wrap">
                    <span v-for="tag in ['Social','Investigador','Emprendedor']" :key="tag" class="text-[11px] px-3 py-1 rounded-full font-semibold" style="background:#e3f0ff; color:#0071e3; border:1px solid #cce0ff;">{{ tag }}</span>
                  </div>
                  <div class="pt-2 flex items-center justify-between" style="border-top:1px solid #cce0ff;">
                    <span class="text-[11px]" style="color:#474747;">Roadmap generado</span>
                    <span class="text-[11px] font-semibold" style="color:#0071e3;">Adm. de Empresas →</span>
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
import { ArrowRight, BarChart3, BriefcaseBusiness, HardHat, Headset, Map, Sparkles, Wallet } from 'lucide-vue-next'
const discoverPreview = [
  { icon: BriefcaseBusiness, name: 'Adm. de Empresas', match: 92 },
  { icon: HardHat, name: 'Ing. Civil', match: 85 },
  { icon: BarChart3, name: 'Data Science', match: 79 },
]
</script>
