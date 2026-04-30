<template>
  <section class="relative px-4 sm:px-6 py-20 sm:py-28 bg-white border-t border-slate-100 overflow-hidden">
    <!-- Glow de fondo -->
    <div class="absolute top-0 right-0 w-[600px] h-[500px] -z-10 pointer-events-none"
      style="background: radial-gradient(ellipse at top right, #eef2ff 0%, #e0f2fe 40%, transparent 70%); opacity: 0.7"></div>

    <div class="max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto + features -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-bold uppercase tracking-wider mb-4">✨ Orientación vocacional</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Descubre tu carrera<br>con inteligencia artificial</h2>
            <p class="text-slate-500 mt-4 text-base leading-relaxed">Cuéntanos qué te apasiona o responde el quiz RIASEC + MBTI. En segundos obtienes carreras personalizadas basadas en tu perfil, con todo lo que necesitas saber.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-indigo-200 transition-colors">✨</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">IA vocacional personalizada</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Escribe libremente o responde el quiz RIASEC + MBTI. La IA analiza tu perfil y recomienda las carreras más afines en segundos.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-indigo-200 transition-colors">🗺️</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Roadmap de carrera detallado</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Obtén un plan de estudios año a año, habilidades clave que desarrollarás y qué esperar de cada etapa.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-indigo-200 transition-colors">💰</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Sueldos reales de egresados</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Ve cuánto gana un recién egresado y la proyección salarial a 5 años según datos SIES 2025 del Mineduc.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/discover" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-indigo-200">
            Descubrir mi carrera →
          </NuxtLink>
        </div>

        <!-- Mockup -->
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl blur-3xl -z-10" style="background: radial-gradient(ellipse, #c7d2fe 0%, #bae6fd 60%, transparent 80%); opacity: 0.5"></div>
          <div class="relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xl shadow-slate-100">
            <!-- Search bar simulada -->
            <div class="flex items-center gap-2 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
              <svg class="w-4 h-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <span class="text-sm text-slate-500 italic">Me apasionan las personas y la tecnología...</span>
              <div class="ml-auto w-0.5 h-4 bg-indigo-400 rounded-sm animate-pulse"></div>
            </div>
            <!-- Cards resultado -->
            <div class="grid grid-cols-3 gap-3">
              <div v-for="c in discoverPreview" :key="c.name" class="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-2.5 text-center">
                <div class="text-3xl">{{ c.emoji }}</div>
                <div class="text-[11px] font-bold text-slate-800 leading-tight">{{ c.name }}</div>
                <div class="space-y-1">
                  <div class="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div class="h-full rounded-full bg-indigo-500" :style="`width:${c.match}%`"></div>
                  </div>
                  <span class="text-[10px] font-bold text-indigo-600">{{ c.match }}% match</span>
                </div>
              </div>
            </div>
            <!-- Perfil vocacional -->
            <div class="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
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
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const discoverPreview = [
  { emoji: '💼', name: 'Adm. de Empresas', match: 92 },
  { emoji: '🏗️', name: 'Ing. Civil', match: 85 },
  { emoji: '📊', name: 'Data Science', match: 79 },
]
</script>
