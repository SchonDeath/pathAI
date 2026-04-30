<template>
  <section class="relative px-4 sm:px-6 py-20 sm:py-28 bg-white border-t border-slate-100 overflow-hidden">
    <!-- Glow de fondo -->
    <div class="absolute top-0 right-0 w-[600px] h-[500px] -z-10 pointer-events-none"
      style="background: radial-gradient(ellipse at top right, #f0fdf4 0%, #dcfce7 40%, transparent 70%); opacity: 0.8"></div>

    <div class="max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto + features -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-4">📊 Datos oficiales</span>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">Ranking nacional<br>con datos del Mineduc</h2>
            <p class="text-slate-500 mt-4 text-base leading-relaxed">Compara empleabilidad, sueldos y matrículas de todas las carreras del sistema chileno. Información oficial SIES 2025 para tomar la mejor decisión.</p>
          </div>

          <div class="space-y-3">
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-emerald-200 transition-colors">📈</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Empleabilidad por carrera y región</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Compara la tasa de empleo al año de egreso de cada carrera, desglosada por institución y región del país.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-emerald-200 transition-colors">💵</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Ranking de salarios reales</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Ordena las carreras por sueldo promedio al primer, tercer y quinto año de egresado según datos oficiales.</div>
              </div>
            </div>
            <div class="flex items-start gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-colors group">
              <div class="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-lg group-hover:bg-emerald-200 transition-colors">🏫</div>
              <div>
                <div class="font-semibold text-slate-900 text-sm">Matrícula e instituciones</div>
                <div class="text-slate-500 text-xs mt-1 leading-relaxed">Filtra por área, institución o región. Ve dónde se imparte cada carrera y cuántos alumnos estudian ahí.</div>
              </div>
            </div>
          </div>

          <NuxtLink to="/ranking" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-all hover:-translate-y-0.5 shadow-lg shadow-emerald-200">
            Ver ranking nacional →
          </NuxtLink>
        </div>

        <!-- Mockup -->
        <div class="relative">
          <div class="absolute -inset-4 rounded-3xl blur-3xl -z-10" style="background: radial-gradient(ellipse, #bbf7d0 0%, #a7f3d0 60%, transparent 80%); opacity: 0.5"></div>
          <div class="relative rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 space-y-4 shadow-xl shadow-slate-100">
            <!-- Header -->
            <div class="flex items-center justify-between pb-3 border-b border-slate-100">
              <span class="text-sm font-bold text-slate-900 uppercase tracking-wider">Empleabilidad 2025</span>
              <span class="text-[10px] px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-100">SIES · Mineduc</span>
            </div>
            <!-- Ranking list -->
            <div class="space-y-2.5">
              <div v-for="(item, i) in rankingPreviewFull" :key="item.name"
                class="flex items-center gap-3 p-2.5 rounded-xl transition-colors"
                :class="i === 0 ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-slate-50'">
                <span class="text-sm font-bold w-5 text-right shrink-0" :class="i === 0 ? 'text-emerald-600' : 'text-slate-300'">{{ i + 1 }}</span>
                <div class="flex-1 space-y-1 min-w-0">
                  <div class="flex justify-between items-center gap-2">
                    <span class="text-xs font-semibold truncate" :class="i === 0 ? 'text-emerald-800' : 'text-slate-700'">{{ item.name }}</span>
                    <span class="text-xs font-bold shrink-0" :class="i === 0 ? 'text-emerald-600' : 'text-slate-500'">{{ item.pct }}%</span>
                  </div>
                  <div class="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full rounded-full transition-all" :class="i === 0 ? 'bg-emerald-500' : 'bg-emerald-300'" :style="`width:${item.pct}%`"></div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Stats -->
            <div class="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100">
              <div class="text-center">
                <div class="text-lg font-extrabold text-slate-900">$1.2M</div>
                <div class="text-[10px] text-slate-500 mt-0.5">Sueldo prom.</div>
              </div>
              <div class="text-center border-x border-slate-100">
                <div class="text-lg font-extrabold text-slate-900">+200</div>
                <div class="text-[10px] text-slate-500 mt-0.5">Instituciones</div>
              </div>
              <div class="text-center">
                <div class="text-lg font-extrabold text-slate-900">+1.200</div>
                <div class="text-[10px] text-slate-500 mt-0.5">Carreras</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const rankingPreviewFull = [
  { name: 'Ing. en Computación', pct: 94 },
  { name: 'Medicina', pct: 91 },
  { name: 'Enfermería', pct: 88 },
  { name: 'Ing. Civil Industrial', pct: 85 },
  { name: 'Psicología', pct: 80 },
]
</script>
