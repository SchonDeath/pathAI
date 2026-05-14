<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-7xl mx-auto space-y-8">

        <!-- Header -->
        <div class="space-y-2">
          <h1 class="text-4xl font-bold text-slate-900">Comparar Carreras</h1>
          <p class="text-slate-500">Compara por separado las carreras sugeridas por Kora y los programas guardados desde tu puntaje PAES.</p>
        </div>

        <!-- Comparador desde chat de Kora -->
        <div class="space-y-3">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Programas para comparar desde Kora</h2>
            <p class="text-sm text-slate-500 mt-0.5">Carreras sugeridas por Kora desde el chat <span class="font-medium">({{ filteredPrograms.length }}/{{ selectedPrograms.length }})</span></p>
          </div>
          <div class="flex items-center gap-2 flex-wrap shrink-0">
            <NuxtLink to="/chat" class="px-3 py-1.5 rounded-lg border border-primary-200 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition bg-white">
              + Agregar desde chat
            </NuxtLink>
            <button
              @click="clearProgramQueue"
              :disabled="selectedPrograms.length === 0"
              class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-40 bg-white">
              Limpiar
            </button>
            <button
              @click="toggleSection('koraPrograms')"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-600 bg-primary-600 text-xs font-semibold text-white hover:bg-primary-700 hover:border-primary-700 transition shadow-sm shadow-primary-200"
              :aria-expanded="!collapsedSections.koraPrograms">
              {{ collapsedSections.koraPrograms ? 'Expandir' : 'Contraer' }}
              <ChevronDown class="w-3.5 h-3.5 transition-transform duration-300 ease-out" :class="collapsedSections.koraPrograms ? '-rotate-90' : 'rotate-0'" />
            </button>
          </div>
        </div>
        <div
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-[max-height,opacity,transform,padding,border-color] duration-300 ease-out will-change-[max-height,opacity,transform]"
          :class="collapsedSections.koraPrograms ? 'max-h-0 opacity-0 -translate-y-1 pointer-events-none p-0 border-transparent' : 'max-h-[7200px] opacity-100 translate-y-0 p-6'"
          :aria-hidden="collapsedSections.koraPrograms"
          :inert="collapsedSections.koraPrograms">
          <div class="space-y-4">

          <!-- Filtros -->
          <div v-if="selectedPrograms.length > 1" class="flex flex-wrap gap-2 items-center text-xs">
            <span class="text-slate-500 font-medium">Filtrar:</span>
            <select v-model="filterTipo" class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Todos los tipos</option>
              <option v-for="t in availableTipos" :key="t" :value="t">{{ t }}</option>
            </select>
            <select v-model="filterRegion" class="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-500">
              <option value="">Todas las regiones</option>
              <option v-for="r in availableRegiones" :key="r" :value="r">{{ r }}</option>
            </select>
            <button v-if="filterTipo || filterRegion" @click="filterTipo = ''; filterRegion = ''" class="text-primary-600 hover:underline">Limpiar filtros</button>
          </div>

          <div v-if="selectedPrograms.length === 0" class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            Aún no agregas programas desde el chat de Kora. <NuxtLink to="/chat" class="text-primary-600 font-semibold hover:underline">Ir al chat</NuxtLink> y usa "+ Comparar" en las cards.
          </div>

          <!-- Single program detail card -->
          <div
            v-if="!serviceHydrating && filteredPrograms.length === 1"
            class="border border-slate-200 rounded-xl p-5 bg-gradient-to-br from-primary-50/40 to-white transition-all duration-250 ease-out"
            :class="compareAnimating ? 'opacity-90 scale-[0.992]' : 'opacity-100 scale-100'">
            <div class="flex items-start justify-between gap-3 flex-wrap">
              <div class="flex items-start gap-3 min-w-0 flex-1">
                <div class="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                  <InstitutionLogo
                    :logo-url="getLogoUrlForInstitution(filteredPrograms[0].institution_code)"
                    :institution-name="filteredPrograms[0].nombre_institucion"
                    fallback-class="text-slate-500" />
                </div>
                <div class="space-y-1 min-w-0">
                  <h3 class="text-lg font-bold text-slate-900 leading-tight">{{ filteredPrograms[0].nombre_carrera }}</h3>
                  <p class="text-sm text-slate-600">{{ filteredPrograms[0].nombre_institucion }} — {{ filteredPrograms[0].nombre_sede || filteredPrograms[0].region }}</p>
                  <div class="flex flex-wrap gap-2 pt-1">
                    <span v-if="filteredPrograms[0].tipo_institucion" class="text-[11px] px-2 py-0.5 rounded-full bg-primary-50 text-primary-700 border border-primary-100 font-semibold">{{ institutionTypeBadge(filteredPrograms[0].tipo_institucion) }}</span>
                    <span v-if="filteredPrograms[0].nivel_carrera" class="text-[11px] px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100 font-semibold">{{ filteredPrograms[0].nivel_carrera }}</span>
                  <span v-if="gratuidadLabel(filteredPrograms[0])" class="text-[11px] px-2 py-0.5 rounded-full font-semibold" :class="gratuidadBadgeClass(filteredPrograms[0])">{{ gratuidadPrefix(filteredPrograms[0]) }} {{ gratuidadLabel(filteredPrograms[0]) }}</span>
                  </div>
                </div>
              </div>
              <div class="flex gap-2">
                <button @click="toggleSaveFavorite(filteredPrograms[0])" class="px-3 py-1.5 rounded-lg border text-xs font-semibold transition" :class="isFavorite(filteredPrograms[0].program_unique_code) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-700 hover:bg-slate-50'">
                  <span v-if="isFavorite(filteredPrograms[0].program_unique_code)" class="inline-flex items-center gap-1"><Star class="w-3.5 h-3.5 fill-current" />Guardada</span>
                  <span v-else class="inline-flex items-center gap-1"><Star class="w-3.5 h-3.5" />Guardar</span>
                </button>
                <NuxtLink to="/chat" class="px-3 py-1.5 rounded-lg border border-primary-200 bg-primary-50 text-primary-700 text-xs font-semibold hover:bg-primary-100 transition">+ Comparar con otra</NuxtLink>
                <button @click="removeProgram(filteredPrograms[0].program_unique_code)" class="px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 text-xs font-semibold transition">&times; Quitar</button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
              <div class="text-xs"><div class="text-slate-500">Arancel anual</div><div class="font-semibold text-slate-800">{{ formatMoney(filteredPrograms[0].arancel_anual) }}</div></div>
              <div class="text-xs"><div class="text-slate-500">Duración</div><div class="font-semibold text-slate-800">{{ filteredPrograms[0].duracion_formal_semestres ? filteredPrograms[0].duracion_formal_semestres + ' sem' : '—' }}</div></div>
              <div class="text-xs"><div class="text-slate-500">Jornada</div><div class="font-semibold text-slate-800">{{ filteredPrograms[0].jornada || '—' }}</div></div>
              <div class="text-xs"><div class="text-slate-500">Puntaje ingreso</div><div class="font-semibold text-slate-800">{{ scoreLabel(filteredPrograms[0]) }}</div></div>
            </div>
          </div>

          <div v-if="serviceHydrating && selectedPrograms.length > 0" class="rounded-xl border border-slate-200 bg-slate-50">
            <LoadingSpinner label="Cargando datos oficiales de los programas..." />
          </div>

          <div
            v-if="!serviceHydrating && filteredPrograms.length >= 2"
            class="overflow-x-auto transition-all duration-250 ease-out"
            :class="compareAnimating ? 'opacity-90 scale-[0.992]' : 'opacity-100 scale-100'">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="text-left py-3 pr-4 font-semibold text-slate-500 w-44">Criterio</th>
                  <th v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 text-left font-bold text-slate-900 min-w-[250px]">
                    <div class="flex items-start gap-3 mb-1">
                      <div class="w-12 h-12 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        <InstitutionLogo
                          :logo-url="getLogoUrlForInstitution(p.institution_code)"
                          :institution-name="p.nombre_institucion"
                          fallback-class="text-slate-500" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="line-clamp-2 leading-tight">{{ p.nombre_carrera }}</div>
                        <div class="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{{ p.nombre_institucion }}</div>
                        <div class="flex flex-wrap gap-1 mt-1.5">
                          <span v-if="p.tipo_institucion" class="text-[10px] px-1.5 py-0.5 rounded-md bg-primary-50 text-primary-700 border border-primary-100 font-bold">{{ institutionTypeBadge(p.tipo_institucion) }}</span>
                          <span v-if="p.nivel_carrera" class="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-100 font-bold">{{ p.nivel_carrera }}</span>
                        </div>
                      </div>
                      <button @click="removeProgram(p.program_unique_code)" title="Quitar programa" class="text-slate-300 hover:text-red-500 font-bold text-lg leading-none shrink-0 ml-1">&times;</button>
                    </div>
                    <div class="flex flex-wrap gap-1 mt-2">
                      <span v-if="gratuidadLabel(p)" class="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" :class="gratuidadBadgeClass(p)">{{ gratuidadPrefix(p) }} {{ gratuidadLabel(p) }}</span>
                    </div>
                    <button @click="toggleSaveFavorite(p)" class="mt-2 w-full px-2 py-1 rounded-md border text-[11px] font-semibold transition" :class="isFavorite(p.program_unique_code) ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'">
                      <span v-if="isFavorite(p.program_unique_code)" class="inline-flex items-center gap-1"><Star class="w-3 h-3 fill-current" />Guardada</span>
                      <span v-else class="inline-flex items-center gap-1"><Star class="w-3 h-3" />Guardar favorita</span>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Arancel sin beca</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 font-semibold text-slate-800">{{ formatMoney(p.arancel_anual) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Arancel con beca (referencia)</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 font-semibold text-slate-800">{{ formatMoney(p.arancel_referencia_becas) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Copago sin cubrir (beca)</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="p.brecha_arancel_becas > 0" class="text-orange-600 font-semibold">{{ formatMoney(p.brecha_arancel_becas) }}</span>
                    <span v-else-if="p.brecha_arancel_becas === 0" class="text-emerald-600 font-semibold">$0</span>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Arancel con crédito (referencia)</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 font-semibold text-slate-800">{{ formatMoney(p.arancel_referencia_creditos) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Copago sin cubrir (crédito)</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="p.brecha_arancel_creditos > 0" class="text-orange-600 font-semibold">{{ formatMoney(p.brecha_arancel_creditos) }}</span>
                    <span v-else-if="p.brecha_arancel_creditos === 0" class="text-emerald-600 font-semibold">$0</span>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Matrícula anual</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ formatMoney(p.matricula_anual) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Duración formal</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.duracion_formal_semestres ? `${p.duracion_formal_semestres} semestres` : '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Jornada / Modalidad</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.jornada || '—' }} <span v-if="p.modalidad" class="text-slate-500">· {{ p.modalidad }}</span></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Región / Sede</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.nombre_sede || '—' }}<div class="text-xs text-slate-500">{{ p.region || '' }}</div></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Tipo de institución</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.tipo_institucion || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Gratuidad</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="gratuidadLabel(p)" class="text-xs font-semibold" :class="p?.gratuidad?.adscrita ? 'text-emerald-700' : 'text-slate-500'">{{ gratuidadPrefix(p) }} {{ gratuidadLabel(p) }}</span>
                    <span v-else class="text-xs text-slate-400">Sin información</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Puntaje ingreso</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <div class="font-semibold text-slate-800">{{ scoreLabel(p) }}</div>
                    <div v-if="scoreDetail(p)" class="text-xs text-slate-500 mt-0.5">{{ scoreDetail(p) }}</div>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Puntaje corte primero</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.puntaje_corte_primero ?? '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Ponderaciones PAES</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <div class="flex flex-wrap gap-1">
                      <span v-if="p.pond_nem" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">NEM {{ p.pond_nem }}%</span>
                      <span v-if="p.pond_ranking" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Rk {{ p.pond_ranking }}%</span>
                      <span v-if="p.pond_lenguaje" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Leng {{ p.pond_lenguaje }}%</span>
                      <span v-if="p.pond_matematicas" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">M1 {{ p.pond_matematicas }}%</span>
                      <span v-if="p.pond_matematicas_2" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">M2 {{ p.pond_matematicas_2 }}%</span>
                      <span v-if="p.pond_historia" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Hist {{ p.pond_historia }}%</span>
                      <span v-if="p.pond_ciencias" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Cs {{ p.pond_ciencias }}%</span>
                    </div>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Vacantes</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ (p.vacantes_semestre_1 || 0) + (p.vacantes_semestre_2 || 0) || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Matrícula total 2025</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.matricula_total_2025 ?? '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Matrícula 1er año 2025</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.matricula_primer_ano_2025 ?? '—' }}<span v-if="p.porcentaje_matricula_primer_ano_2025" class="text-xs text-slate-500 ml-1">({{ p.porcentaje_matricula_primer_ano_2025 }}%)</span></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">NEM promedio ingreso</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.promedio_nem ? Number(p.promedio_nem).toFixed(2) : '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Empleabilidad 1er/2do año</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="employabilityMap[p.program_unique_code]">
                      {{ employabilityMap[p.program_unique_code]?.e1 ?? '—' }}% / {{ employabilityMap[p.program_unique_code]?.e2 ?? '—' }}%
                    </span>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Ingreso 1er / 4° año</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="employabilityMap[p.program_unique_code]">
                      {{ formatMoney(employabilityMap[p.program_unique_code]?.i1 ?? null) }} / {{ fourthYearIncomeLabel(employabilityMap[p.program_unique_code]) }}
                      <div class="text-xs text-slate-500 mt-0.5">{{ incomeSourceLabel(employabilityMap[p.program_unique_code]) }}</div>
                    </span>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                </tr>
                <!-- Sección Institución -->
                <tr class="bg-blue-50/60">
                  <td class="py-2 pr-4 text-[11px] font-bold uppercase tracking-wider text-blue-700" :colspan="filteredPrograms.length + 1">Institución</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Acreditación</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span v-if="institutionMap[p.program_unique_code]?.acreditacion_anos" class="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      {{ institutionMap[p.program_unique_code].acreditacion_anos }} años
                      <span v-if="institutionMap[p.program_unique_code]?.acreditacion_estado" class="text-xs font-normal text-emerald-600">· {{ institutionMap[p.program_unique_code].acreditacion_estado }}</span>
                    </span>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Retención inst. 1er año</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    {{ institutionMap[p.program_unique_code]?.retencion_1er_ano_pct ? `${institutionMap[p.program_unique_code].retencion_1er_ano_pct.toFixed(1)}%` : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Matrícula pregrado inst.</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    {{ institutionMap[p.program_unique_code]?.matricula_pregrado_actual ? formatNum(institutionMap[p.program_unique_code].matricula_pregrado_actual) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">PAES promedio inst.</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    {{ institutionMap[p.program_unique_code]?.promedio_paes ? Math.round(institutionMap[p.program_unique_code].promedio_paes) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Infraestructura</td>
                  <td v-for="p in filteredPrograms" :key="p.program_unique_code" class="py-3 px-4 text-xs text-slate-600 space-y-0.5">
                    <div v-if="institutionMap[p.program_unique_code]?.m2_construidos">M²: {{ formatNum(institutionMap[p.program_unique_code].m2_construidos) }}</div>
                    <div v-if="institutionMap[p.program_unique_code]?.volumenes_biblioteca">Biblioteca: {{ formatNum(institutionMap[p.program_unique_code].volumenes_biblioteca) }} vol.</div>
                    <div v-if="institutionMap[p.program_unique_code]?.computadores">PCs: {{ formatNum(institutionMap[p.program_unique_code].computadores) }}</div>
                    <span v-if="!institutionMap[p.program_unique_code]" class="text-slate-400">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>
        </div>
        </div>

        <!-- ── Comparador de puntaje PAES ── -->
        <div class="space-y-3">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-2xl font-bold text-slate-900">Programas para comparar puntaje PAES</h2>
            <p class="text-sm text-slate-500 mt-0.5">Programas guardados desde el simulador PAES <span class="font-medium">({{ selectedPaesPrograms.length }}/4)</span></p>
          </div>
          <div class="flex items-center gap-2 flex-wrap shrink-0">
            <NuxtLink to="/paes-simulator" class="px-3 py-1.5 rounded-lg border border-primary-200 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition bg-white">
              + Agregar desde simulador PAES
            </NuxtLink>
            <button
              @click="clearPaesProgramQueue"
              :disabled="selectedPaesPrograms.length === 0"
              class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-40 bg-white">
              Limpiar
            </button>
            <button
              @click="toggleSection('paesPrograms')"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-600 bg-primary-600 text-xs font-semibold text-white hover:bg-primary-700 hover:border-primary-700 transition shadow-sm shadow-primary-200"
              :aria-expanded="!collapsedSections.paesPrograms">
              {{ collapsedSections.paesPrograms ? 'Expandir' : 'Contraer' }}
              <ChevronDown class="w-3.5 h-3.5 transition-transform duration-300 ease-out" :class="collapsedSections.paesPrograms ? '-rotate-90' : 'rotate-0'" />
            </button>
          </div>
        </div>
        <div
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-[max-height,opacity,transform,padding,border-color] duration-300 ease-out will-change-[max-height,opacity,transform]"
          :class="collapsedSections.paesPrograms ? 'max-h-0 opacity-0 -translate-y-1 pointer-events-none p-0 border-transparent' : 'max-h-[5200px] opacity-100 translate-y-0 p-6'"
          :aria-hidden="collapsedSections.paesPrograms"
          :inert="collapsedSections.paesPrograms">
          <div class="space-y-4">

          <div v-if="selectedPaesPrograms.length === 0" class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            Aún no agregas programas desde puntaje PAES. <NuxtLink to="/paes-simulator" class="text-primary-600 font-semibold hover:underline">Ir al simulador PAES</NuxtLink> y usa "Guardar en comparar PAES".
          </div>

          <div
            v-if="selectedPaesPrograms.length >= 2"
            class="overflow-x-auto transition-all duration-250 ease-out"
            :class="compareAnimating ? 'opacity-90 scale-[0.992]' : 'opacity-100 scale-100'">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="text-left py-3 pr-4 font-semibold text-slate-500 w-44">Criterio</th>
                  <th v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4 text-left font-bold text-slate-900 min-w-[220px]">
                    <div class="flex items-start gap-3">
                      <div class="w-10 h-10 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0 overflow-hidden">
                        <InstitutionLogo
                          :logo-url="getLogoUrlForInstitution(p.institution_code)"
                          :institution-name="p.nombre_institucion"
                          fallback-class="text-slate-500" />
                      </div>
                      <div class="min-w-0 flex-1">
                        <div class="line-clamp-2 leading-tight">{{ p.nombre_carrera }}</div>
                        <div class="text-xs font-medium text-slate-500 mt-1 line-clamp-1">{{ p.nombre_institucion }}</div>
                      </div>
                      <button @click="removePaesProgram(p.program_unique_code)" title="Quitar programa" class="text-slate-300 hover:text-red-500 font-bold text-lg leading-none shrink-0 ml-1">&times;</button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Tu puntaje calculado</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4 font-semibold text-slate-800">{{ formatScore(p.puntaje_calculado) || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Puntaje de referencia</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4 font-semibold text-slate-800">{{ formatScore(p.puntaje_referencia) || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Holgura</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <span class="font-semibold" :class="Number(p.diferencia) >= 20 ? 'text-emerald-700' : 'text-amber-700'">+{{ formatScore(p.diferencia) || '—' }}</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Arancel anual</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ formatMoney(p.arancel_anual) }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Duración formal</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.duracion_formal_semestres ? `${p.duracion_formal_semestres} semestres` : '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Jornada</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.jornada || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Región / Sede</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ p.nombre_sede || '—' }}<div class="text-xs text-slate-500">{{ p.region || '' }}</div></td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Vacantes</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">{{ (p.vacantes_semestre_1 || 0) + (p.vacantes_semestre_2 || 0) || '—' }}</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 pr-4 text-slate-500 font-medium">Ponderaciones PAES</td>
                  <td v-for="p in selectedPaesPrograms" :key="p.program_unique_code" class="py-3 px-4">
                    <div class="flex flex-wrap gap-1">
                      <span v-if="p.pond_nem" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">NEM {{ p.pond_nem }}%</span>
                      <span v-if="p.pond_ranking" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Rk {{ p.pond_ranking }}%</span>
                      <span v-if="p.pond_lenguaje" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Leng {{ p.pond_lenguaje }}%</span>
                      <span v-if="p.pond_matematicas" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">M1 {{ p.pond_matematicas }}%</span>
                      <span v-if="p.pond_matematicas_2" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">M2 {{ p.pond_matematicas_2 }}%</span>
                      <span v-if="p.pond_historia" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Hist {{ p.pond_historia }}%</span>
                      <span v-if="p.pond_ciencias" class="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">Cs {{ p.pond_ciencias }}%</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>
        </div>
        </div>

        <!-- ── Comparador de instituciones (desde Ranking) ── -->
        <div class="space-y-3">
        <div class="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 class="text-2xl font-bold text-slate-900 inline-flex items-center gap-2"><Trophy class="w-6 h-6 text-amber-500" />Instituciones agregadas</h2>
            <p class="text-sm text-slate-500 mt-0.5">Instituciones comparadas desde el ranking <span class="font-medium">({{ selectedInstitutions.length }}/4)</span></p>
          </div>
          <div class="flex items-center gap-2 flex-wrap shrink-0">
            <NuxtLink to="/ranking" class="px-3 py-1.5 rounded-lg border border-primary-200 text-xs font-semibold text-primary-700 hover:bg-primary-50 transition bg-white">
              + Agregar desde Instituciones
            </NuxtLink>
            <button
              @click="clearInstitutionQueue"
              :disabled="selectedInstitutions.length === 0"
              class="px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 transition disabled:opacity-40 bg-white">
              Limpiar
            </button>
            <button
              @click="toggleSection('institutions')"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-600 bg-primary-600 text-xs font-semibold text-white hover:bg-primary-700 hover:border-primary-700 transition shadow-sm shadow-primary-200"
              :aria-expanded="!collapsedSections.institutions">
              {{ collapsedSections.institutions ? 'Expandir' : 'Contraer' }}
              <ChevronDown class="w-3.5 h-3.5 transition-transform duration-300 ease-out" :class="collapsedSections.institutions ? '-rotate-90' : 'rotate-0'" />
            </button>
          </div>
        </div>
        <div
          class="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-[max-height,opacity,transform,padding,border-color] duration-300 ease-out will-change-[max-height,opacity,transform]"
          :class="collapsedSections.institutions ? 'max-h-0 opacity-0 -translate-y-1 pointer-events-none p-0 border-transparent' : 'max-h-[6200px] opacity-100 translate-y-0 p-6'"
          :aria-hidden="collapsedSections.institutions"
          :inert="collapsedSections.institutions">
          <div class="space-y-4">

          <div v-if="selectedInstitutions.length === 0" class="text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
            Aún no agregas instituciones.
            <NuxtLink to="/ranking" class="text-accent-600 font-semibold hover:underline">Ir a Instituciones de Chile</NuxtLink>
            y usa "Agregar a comparador".
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-slate-200">
                  <th class="py-3 text-left font-semibold text-slate-600 w-44">Indicador</th>
                  <th
                    v-for="inst in selectedInstitutions"
                    :key="inst.institution_code"
                    class="py-3 px-4 text-left font-semibold text-slate-700 min-w-[220px]">
                    <div class="flex items-start gap-3">
                      <!-- Logo -->
                      <div class="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 overflow-hidden border border-slate-200 bg-white">
                        <InstitutionLogo
                          :logo-url="inst.logo_url"
                          :institution-name="inst.nombre_institucion"
                          fallback-class="text-slate-500" />
                      </div>
                      <div class="flex-1 min-w-0">
                        <div class="font-bold text-slate-900 text-sm leading-tight">{{ inst.nombre_institucion }}</div>
                        <div class="text-[11px] text-slate-500 mt-0.5">{{ inst.tipo_institucion || '' }}</div>
                      </div>
                      <button @click="removeInstitution(inst.institution_code)" class="text-slate-400 hover:text-red-600 font-bold shrink-0 text-lg leading-none">&times;</button>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <!-- Información General -->
                <tr class="bg-slate-50/80">
                  <td class="py-2 pr-4 text-[11px] font-bold uppercase tracking-wider text-slate-500" :colspan="selectedInstitutions.length + 1">Información General</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Acreditación</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4">
                    <div v-if="inst.acreditacion_anos" class="space-y-1">
                      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold"><Award class="w-3 h-3" />{{ inst.acreditacion_anos }} años</span>
                      <div v-if="inst.acreditacion_estado" class="text-xs text-slate-600 font-medium">{{ inst.acreditacion_estado }}</div>
                     </div>
                    <div v-else-if="inst.acreditacion_estado" class="text-xs font-semibold text-red-600">{{ inst.acreditacion_estado }}</div>
                    <span v-else class="text-slate-400">—</span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Autonomía</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700 text-xs">
                    {{ inst.autonomia || '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Retención 1er año</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.retencion_1er_ano_pct ? inst.retencion_1er_ano_pct.toFixed(1) + '%' : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Promedio PAES</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.promedio_paes ? Math.round(inst.promedio_paes) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Promedio NEM</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.promedio_nem ? inst.promedio_nem.toFixed(1) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Matrícula pregrado</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.matricula_pregrado_actual ? new Intl.NumberFormat('es-CL').format(inst.matricula_pregrado_actual) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Matrícula posgrado</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.matricula_posgrado_actual ? new Intl.NumberFormat('es-CL').format(inst.matricula_posgrado_actual) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Titulados pregrado/año</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.titulados_pregrado_actual ? new Intl.NumberFormat('es-CL').format(inst.titulados_pregrado_actual) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Titulados posgrado/año</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.titulados_posgrado_actual ? new Intl.NumberFormat('es-CL').format(inst.titulados_posgrado_actual) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Duración real titulación</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.duracion_real_semestres ? Math.floor(inst.duracion_real_semestres) + ' sem' : '—' }}
                  </td>
                </tr>
                <!-- Infraestructura -->
                <tr class="bg-blue-50/60">
                  <td class="py-2 pr-4 text-[11px] font-bold uppercase tracking-wider text-blue-700" :colspan="selectedInstitutions.length + 1">Infraestructura</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">M² construidos</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.m2_construidos ? new Intl.NumberFormat('es-CL').format(inst.m2_construidos) + ' m²' : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Volúmenes biblioteca</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.volumenes_biblioteca ? new Intl.NumberFormat('es-CL').format(inst.volumenes_biblioteca) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Laboratorios / Talleres</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.laboratorios_talleres ? new Intl.NumberFormat('es-CL').format(inst.laboratorios_talleres) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Computadores</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.computadores ? new Intl.NumberFormat('es-CL').format(inst.computadores) : '—' }}
                  </td>
                </tr>
                <!-- Financiero -->
                <tr class="bg-emerald-50/60">
                  <td class="py-2 pr-4 text-[11px] font-bold uppercase tracking-wider text-emerald-700" :colspan="selectedInstitutions.length + 1">Financiero</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Ingresos de operación</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.ingresos_operacion_clp ? formatMoney(inst.ingresos_operacion_clp) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Resultado del ejercicio</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4">
                    <span :class="inst.resultado_ejercicio_clp !== null ? (inst.resultado_ejercicio_clp >= 0 ? 'text-emerald-700' : 'text-red-600') : 'text-slate-400'">
                      {{ inst.resultado_ejercicio_clp !== null ? formatMoney(inst.resultado_ejercicio_clp) : '—' }}
                    </span>
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Total activos</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.total_activos_clp ? formatMoney(inst.total_activos_clp) : '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Patrimonio total</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-700">
                    {{ inst.patrimonio_total_clp ? formatMoney(inst.patrimonio_total_clp) : '—' }}
                  </td>
                </tr>
                <!-- Contacto -->
                <tr class="bg-slate-50/80">
                  <td class="py-2 pr-4 text-[11px] font-bold uppercase tracking-wider text-slate-500" :colspan="selectedInstitutions.length + 1">Contacto</td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Dirección sede central</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4 text-slate-600 text-xs">
                    {{ inst.direccion_sede_central || '—' }}
                  </td>
                </tr>
                <tr class="hover:bg-slate-50">
                  <td class="py-3 text-slate-500 font-medium">Sitio web</td>
                  <td v-for="inst in selectedInstitutions" :key="inst.institution_code" class="py-3 px-4">
                    <a v-if="inst.pagina_web" :href="inst.pagina_web.startsWith('http') ? inst.pagina_web : 'https://' + inst.pagina_web" target="_blank" rel="noopener noreferrer" class="text-primary-600 hover:underline text-xs">
                      {{ inst.pagina_web }}
                    </a>
                    <span v-else class="text-slate-500">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          </div>
        </div>
        </div>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
useHead({ title: 'Comparar Carreras — KoraChile' })

import { Award, ChevronDown, Star, Trophy } from 'lucide-vue-next'
import { PROGRAM_FAVORITES_STORAGE_KEY, useProgramFavorites } from '~/composables/useProgramFavorites'
import { useIntentTracker } from '~/composables/useIntentTracker'
import { useAuthStore } from '~/stores/auth'
import { useProgramDetailStore } from '~/stores/programDetail'
import { useInstitutionLogos } from '~/composables/useInstitutionLogos'

const route = useRoute()
const authStore = useAuthStore()
const programDetailStore = useProgramDetailStore()
const supabase = useSupabaseClient()
const { getLogoUrl, prefetch: prefetchLogos } = useInstitutionLogos()
const { track } = useIntentTracker()
const programFavorites = useProgramFavorites()
const COMPARE_PROGRAMS_KEY = 'KoraChile:compare:programs'
const COMPARE_PAES_PROGRAMS_KEY = 'KoraChile:compare:carrera-paes'
const COMPARE_INSTITUTIONS_KEY = 'KoraChile:compare:institutions'
const collapsedSections = reactive({
  koraPrograms: false,
  paesPrograms: false,
  institutions: false,
})
const compareAnimating = ref(false)
let compareAnimTimer: ReturnType<typeof setTimeout> | undefined

function triggerCompareAnimation(duration = 220) {
  compareAnimating.value = true
  if (compareAnimTimer) clearTimeout(compareAnimTimer)
  compareAnimTimer = setTimeout(() => {
    compareAnimating.value = false
  }, duration)
}

function toggleSection(section: keyof typeof collapsedSections) {
  collapsedSections[section] = !collapsedSections[section]
}

interface CompareInstitution {
  institution_code: number
  nombre_institucion: string
  tipo_institucion: string | null
  autonomia: string | null
  acreditacion_estado: string | null
  acreditacion_anos: number | null
  acreditacion_vigencia_hasta: string | null
  acreditacion_areas: string[] | null
  retencion_1er_ano_pct: number | null
  promedio_paes: number | null
  promedio_nem: number | null
  matricula_pregrado_actual: number | null
  matricula_posgrado_actual: number | null
  titulados_pregrado_actual: number | null
  titulados_posgrado_actual: number | null
  duracion_real_semestres: number | null
  m2_construidos: number | null
  volumenes_biblioteca: number | null
  laboratorios_talleres: number | null
  computadores: number | null
  ingresos_operacion_clp: number | null
  resultado_ejercicio_clp: number | null
  total_activos_clp: number | null
  patrimonio_total_clp: number | null
  pagina_web: string | null
  direccion_sede_central: string | null
  logo_url: string | null
  score: number
}

// Carga inmediata desde localStorage (sync, solo cliente) para evitar flash al montar
const selectedInstitutions = ref<CompareInstitution[]>(
  process.client
    ? (() => {
        try {
          const raw = localStorage.getItem(COMPARE_INSTITUTIONS_KEY)
          const arr = raw ? JSON.parse(raw) : []
          return Array.isArray(arr) ? arr.slice(0, 4) : []
        } catch { return [] }
      })()
    : []
)

function loadInstitutionQueue() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_INSTITUTIONS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    selectedInstitutions.value = Array.isArray(arr) ? arr.slice(0, 4) : []
  } catch {
    selectedInstitutions.value = []
  }
}

function persistInstitutionQueue() {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPARE_INSTITUTIONS_KEY, JSON.stringify(selectedInstitutions.value.slice(0, 4)))
}

function removeInstitution(code: number) {
  selectedInstitutions.value = selectedInstitutions.value.filter(i => i.institution_code !== code)
  persistInstitutionQueue()
}

function clearInstitutionQueue() {
  selectedInstitutions.value = []
  if (typeof window !== 'undefined') localStorage.removeItem(COMPARE_INSTITUTIONS_KEY)
}

function instScoreColor(s: number): string {
  if (s >= 80) return 'text-emerald-700'
  if (s >= 65) return 'text-primary-700'
  if (s >= 50) return 'text-amber-700'
  return 'text-slate-600'
}

const selectedPrograms = ref<any[]>(
  process.client
    ? (() => {
        try {
          const raw = localStorage.getItem(COMPARE_PROGRAMS_KEY)
          const arr = raw ? JSON.parse(raw) : []
          return Array.isArray(arr) ? arr.slice(0, 4) : []
        } catch { return [] }
      })()
    : []
)
const selectedPaesPrograms = ref<any[]>(
  process.client
    ? (() => {
        try {
          const raw = localStorage.getItem(COMPARE_PAES_PROGRAMS_KEY)
          const arr = raw ? JSON.parse(raw) : []
          return Array.isArray(arr) ? arr.slice(0, 4) : []
        } catch { return [] }
      })()
    : []
)
const programDetails = ref<any[]>([])
const loadingPrograms = ref(false)
const serviceHydrating = ref(false)
const filterTipo = ref('')
const filterRegion = ref('')
const employabilityMap = ref<Record<string, {
  e1: number | null
  e2: number | null
  i1: number | null
  i4: number | null
  i4Label?: string | null
  source?: 'institucion' | 'generica'
}>>({}) 
const institutionMap = ref<Record<string, any>>({})
const FAVORITES_KEY = PROGRAM_FAVORITES_STORAGE_KEY

// Map de promesas en vuelo para career-stats: evita disparar el mismo fetch
// múltiples veces en paralelo cuando 2+ programas comparten carrera genérica.
const statsInFlight = new Map<string, Promise<any>>()

type EmployabilityMetrics = {
  e1: number | null
  e2: number | null
  i1: number | null
  i4: number | null
  i4Label: string | null
  source: 'institucion' | 'generica'
}

function emptyEmployabilityMetrics(source: 'institucion' | 'generica' = 'generica'): EmployabilityMetrics {
  return { e1: null, e2: null, i1: null, i4: null, i4Label: null, source }
}

function hasEmployabilityValues(metrics: EmployabilityMetrics | null) {
  return !!metrics && [metrics.e1, metrics.e2, metrics.i1, metrics.i4].some(value => value !== null && value !== undefined)
}

function metricsFromStats(stats: any): EmployabilityMetrics | null {
  if (!stats) return null
  const metrics = emptyEmployabilityMetrics('generica')
  metrics.e1 = stats.empleabilidad_1er_ano_pct ?? stats.empleabilidad_pct?.primer_ano ?? null
  metrics.e2 = stats.empleabilidad_2do_ano_pct ?? stats.empleabilidad_2_ano_pct ?? stats.empleabilidad_pct?.segundo_ano ?? null
  metrics.i1 = stats.ingreso_1er_ano_clp ?? stats.ingresos_clp?.primer_ano ?? null
  metrics.i4 = stats.ingreso_4to_ano_clp ?? stats.ingresos_clp?.cuarto_ano ?? null
  return hasEmployabilityValues(metrics) ? metrics : null
}

function metricsFromInstitutionEmployability(row: any, fallback: EmployabilityMetrics | null = null): EmployabilityMetrics | null {
  if (!row) return fallback
  const metrics = fallback ? { ...fallback } : emptyEmployabilityMetrics('institucion')
  metrics.e1 = row.empleabilidad_1_ano_pct ?? metrics.e1
  metrics.e2 = row.empleabilidad_2_ano_pct ?? metrics.e2
  metrics.i4 = row.ingreso_promedio_4to_ano_clp ?? metrics.i4
  metrics.i4Label = row.ingreso_label ?? metrics.i4Label
  metrics.source = 'institucion'
  return hasEmployabilityValues(metrics) ? metrics : fallback
}

function metricsFromProgram(program: any): EmployabilityMetrics | null {
  const genericMetrics = metricsFromStats(program?.career_stats ?? program?.stats)
  return metricsFromInstitutionEmployability(
    program?.institution_employability ?? program?.employability_by_institution ?? null,
    genericMetrics,
  )
}

const filteredPrograms = computed(() => {
  return programDetails.value.filter(p => {
    if (filterTipo.value && p.tipo_institucion !== filterTipo.value) return false
    if (filterRegion.value && p.region !== filterRegion.value) return false
    return true
  })
})

const availableTipos = computed(() => [...new Set(programDetails.value.map((p: any) => p.tipo_institucion).filter(Boolean))])
const availableRegiones = computed(() => [...new Set(programDetails.value.map((p: any) => p.region).filter(Boolean))])

function gratuidadLabel(p: any) {
  if (p?.gratuidad?.adscrita === true) return 'Tiene gratuidad'
  if (p?.gratuidad?.adscrita === false) return 'No registra gratuidad'
  return 'Sin información'
}

function gratuidadPrefix(p: any) {
  return p?.gratuidad?.adscrita ? 'Sí' : '—'
}

function gratuidadBadgeClass(p: any) {
  return p?.gratuidad?.adscrita
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-slate-100 text-slate-500'
}

function institutionTypeBadge(t?: string | null) {
  const s = String(t || '').toLowerCase()
  if (s.includes('centros') || s.includes('cft')) return 'CFT'
  if (s.includes('institutos') || s.includes('ip')) return 'IP'
  if (s.includes('univers')) return 'Universidad'
  return t || 'Institución'
}

function normalizeInstitutionCode(code: unknown): number | null {
  const n = Number(code)
  return Number.isFinite(n) && n > 0 ? n : null
}

function getLogoUrlForInstitution(code: unknown): string | null {
  const normalized = normalizeInstitutionCode(code)
  return normalized ? getLogoUrl(normalized) : null
}

function hydrateProgramDetailCache(programs: any[]) {
  for (const program of programs) {
    const code = String(program?.program_unique_code || program?.code || '')
    if (!code) continue
    programDetailStore.set(code, { ...program, program_unique_code: code })
    const institution = program?.institution_data ?? program?.institution ?? null
    if (institution) programDetailStore.setInstitution(code, institution)
    const metrics = metricsFromProgram(program)
    if (metrics) programDetailStore.setEmployability(code, metrics)
  }
}

function loadFavorites() {
  programFavorites.loadLocal()
}

function isFavorite(code: string) {
  return programFavorites.isFavorite(code)
}

async function toggleSaveFavorite(p: any) {
  await programFavorites.toggle({
    program_unique_code: p.program_unique_code,
    institution_code: p.institution_code,
    career_generic_id: p.career_generic_id,
    nombre_carrera: p.nombre_carrera,
    nombre_institucion: p.nombre_institucion,
    nombre_sede: p.nombre_sede,
    region: p.region,
    comuna: p.comuna,
    tipo_institucion: p.tipo_institucion,
    arancel_anual: p.arancel_anual,
    source: 'compare',
  })
}

let debounce: ReturnType<typeof setTimeout>

function formatSalary(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-CL').format(n)
}

function formatNum(n: number): string {
  return new Intl.NumberFormat('es-CL').format(n)
}
function demandClass(d: string) {
  const m: Record<string, string> = { 'Muy Alta': 'bg-emerald-100 text-emerald-700', 'Alta': 'bg-blue-100 text-blue-700', 'Media': 'bg-amber-100 text-amber-700', 'Baja': 'bg-red-100 text-red-700' }
  return m[d] ?? 'bg-slate-100 text-slate-600'
}

function loadProgramQueue() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PROGRAMS_KEY)
    if (!raw) {
      selectedPrograms.value = []
      return
    }
    const arr = JSON.parse(raw)
    selectedPrograms.value = Array.isArray(arr) ? arr.slice(0, 4) : []
    hydrateProgramDetailCache(selectedPrograms.value)
  } catch {
    selectedPrograms.value = []
  }
}

function loadPaesProgramQueue() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PAES_PROGRAMS_KEY)
    if (!raw) {
      selectedPaesPrograms.value = []
      return
    }
    const arr = JSON.parse(raw)
    selectedPaesPrograms.value = Array.isArray(arr) ? arr.slice(0, 4) : []
    hydrateProgramDetailCache(selectedPaesPrograms.value)
  } catch {
    selectedPaesPrograms.value = []
  }
}

function persistProgramQueue() {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPARE_PROGRAMS_KEY, JSON.stringify(selectedPrograms.value.slice(0, 4)))
}

function persistPaesProgramQueue() {
  if (typeof window === 'undefined') return
  localStorage.setItem(COMPARE_PAES_PROGRAMS_KEY, JSON.stringify(selectedPaesPrograms.value.slice(0, 4)))
}

function removeProgram(code: string) {
  const removed = selectedPrograms.value.find(p => p.program_unique_code === code)
  if (removed) {
    void track({
      event_name: 'compare_removed',
      source: 'compare',
      program_unique_code: removed.program_unique_code,
      institution_code: removed.institution_code ?? null,
      career_generic_id: removed.career_generic_id ?? null,
      metadata: {
        nombre_carrera: removed.nombre_carrera,
        nombre_institucion: removed.nombre_institucion,
      },
    })
  }
  selectedPrograms.value = selectedPrograms.value.filter(p => p.program_unique_code !== code)
  programDetails.value = programDetails.value.filter(p => p.program_unique_code !== code)
  triggerCompareAnimation()
  persistProgramQueue()
}

function clearProgramQueue() {
  selectedPrograms.value = []
  programDetails.value = []
  employabilityMap.value = {}
  institutionMap.value = {}
  triggerCompareAnimation()
  if (typeof window !== 'undefined') localStorage.removeItem(COMPARE_PROGRAMS_KEY)
}

function removePaesProgram(code: string) {
  selectedPaesPrograms.value = selectedPaesPrograms.value.filter((p: any) => p.program_unique_code !== code)
  triggerCompareAnimation()
  persistPaesProgramQueue()
}

function clearPaesProgramQueue() {
  selectedPaesPrograms.value = []
  triggerCompareAnimation()
  if (typeof window !== 'undefined') localStorage.removeItem(COMPARE_PAES_PROGRAMS_KEY)
}

async function reloadProgramDetails() {
  if (!selectedPrograms.value.length) {
    programDetails.value = []
    serviceHydrating.value = false
    return
  }

  const shouldFetchFromService = selectedPrograms.value.some((p: any) => {
    const code = p.program_unique_code
    const cachedProgram = programDetailStore.get(code)
    const hasCachedMetrics = hasEmployabilityValues(programDetailStore.getEmployability(code))
      || hasEmployabilityValues(metricsFromProgram(cachedProgram))
    return !cachedProgram || !hasCachedMetrics
  })

  serviceHydrating.value = shouldFetchFromService
  loadingPrograms.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    const authHeader: Record<string, string> = session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}
    const detailsWithInstitution = await Promise.all(selectedPrograms.value.map(async (p) => {
      // Si ya fue pre-fetcheado desde el chat, usar cache directo (sin llamada API)
      const cached = programDetailStore.get(p.program_unique_code)
      if (cached) {
        return {
          program: cached,
          institution: programDetailStore.getInstitution(p.program_unique_code) ?? cached.institution_data ?? cached.institution ?? null,
        }
      }

      try {
        const res = await $fetch('/api/tools/get-program-detail', {
          method: 'GET',
          query: { program_unique_code: p.program_unique_code },
          headers: authHeader as Record<string, string>,
        }) as any
        if (res?.match === 'exact' && res.program) {
          const fullProgram = {
            ...res.program,
            career_stats: res.career_stats ?? null,
            institution_data: res.institution ?? null,
            institution_employability: res.institution_employability ?? null,
          }
          // Guardar en store para no volver a fetchear en esta sesión
          programDetailStore.set(p.program_unique_code, fullProgram)
          if (res.institution) {
            programDetailStore.setInstitution(p.program_unique_code, res.institution)
          }
          return {
            program: fullProgram,
            institution: res.institution ?? null,
          }
        }
        // Fallback: mostrar lo que tenemos del queue si el detalle falla
        return {
          program: {
            program_unique_code: p.program_unique_code,
            institution_code: p.institution_code,
            nombre_carrera: p.nombre_carrera,
            nombre_institucion: p.nombre_institucion,
            tipo_institucion: p.tipo_institucion,
            nivel_carrera: p.nivel_carrera,
            region: p.region,
            arancel_anual: p.arancel_anual,
            duracion_formal_semestres: p.duracion_formal_semestres,
          },
          institution: programDetailStore.getInstitution(p.program_unique_code),
        }
      } catch {
        return {
          program: {
            program_unique_code: p.program_unique_code,
            institution_code: p.institution_code,
            nombre_carrera: p.nombre_carrera,
            nombre_institucion: p.nombre_institucion,
            tipo_institucion: p.tipo_institucion,
            nivel_carrera: p.nivel_carrera,
            region: p.region,
            arancel_anual: p.arancel_anual,
            duracion_formal_semestres: p.duracion_formal_semestres,
          },
          institution: programDetailStore.getInstitution(p.program_unique_code),
        }
      }
    }))

    const nextProgramDetails = detailsWithInstitution
      .map((entry: any) => entry.program)
      .filter(Boolean)
    const nextInstitutionMap: Record<string, any> = {}

    detailsWithInstitution.forEach((entry: any) => {
      const code = entry?.program?.program_unique_code
      if (!code) return
      const cachedInstitution = entry.institution ?? programDetailStore.getInstitution(code) ?? null
      if (cachedInstitution) {
        nextInstitutionMap[code] = cachedInstitution
        programDetailStore.setInstitution(code, cachedInstitution)
      }
    })

    const nextEmployabilityMap: Record<string, {
      e1: number | null
      e2: number | null
      i1: number | null
      i4: number | null
      i4Label: string | null
      source: 'institucion' | 'generica'
    }> = {}

    // Empleabilidad e ingresos: primero por institución; fallback genérico por tipo.
    await Promise.all(nextProgramDetails.map(async (p: any) => {
      const code = p.program_unique_code
      const metricsCached = programDetailStore.getEmployability(code)
      if (hasEmployabilityValues(metricsCached)) {
        nextEmployabilityMap[code] = metricsCached
        return
      }

      const embeddedMetrics = metricsFromProgram(p)
      if (embeddedMetrics?.source === 'institucion') {
        programDetailStore.setEmployability(code, embeddedMetrics)
        nextEmployabilityMap[code] = embeddedMetrics
        return
      }

      const metrics = embeddedMetrics ? { ...embeddedMetrics } : emptyEmployabilityMetrics('generica')

      try {
        if (!embeddedMetrics && p?.area_carrera_generica && p?.tipo_institucion) {
          const statsKey = `${p.area_carrera_generica}|${p.tipo_institucion}`
          // Reutiliza promesa en vuelo o caché Pinia para no duplicar fetches
          let statsPromise = statsInFlight.get(statsKey)
          if (!statsPromise) {
            statsPromise = $fetch('/api/tools/career-stats-detailed', {
              method: 'GET',
              query: {
                nombre_carrera_generica: p.area_carrera_generica,
                tipo_institucion: p.tipo_institucion,
              },
              headers: authHeader as Record<string, string>,
            }).finally(() => statsInFlight.delete(statsKey))
            statsInFlight.set(statsKey, statsPromise)
          }
          const stats = await statsPromise as any
          const rows = Array.isArray(stats?.stats)
            ? stats.stats
            : Array.isArray(stats?.results)
              ? stats.results
              : []
          const s = rows[0] ?? null
          if (s) {
            metrics.e1 = s.empleabilidad_pct?.primer_ano ?? null
            metrics.e2 = s.empleabilidad_pct?.segundo_ano ?? null
            metrics.i1 = s.ingresos_clp?.primer_ano ?? null
            metrics.i4 = s.ingresos_clp?.cuarto_ano ?? null
          }
        }

        if (p?.institution_code && (p?.career_generic_id || p?.nombre_carrera)) {
          const byInstitution = await $fetch('/api/tools/career-employability-by-institution', {
            method: 'GET',
            query: {
              institution_code: p.institution_code,
              career_generic_id: p.career_generic_id,
              nombre_carrera: p.nombre_carrera,
              limit: 1,
            },
            headers: authHeader as Record<string, string>,
          }) as any
          const row = Array.isArray(byInstitution?.results) ? byInstitution.results[0] : null
          if (row) {
            const institutionMetrics = metricsFromInstitutionEmployability(row, metrics)
            if (institutionMetrics) Object.assign(metrics, institutionMetrics)
          }
        }
      } catch {
        // silencio
      }

      programDetailStore.setEmployability(code, metrics)
      nextEmployabilityMap[code] = metrics
    }))

    programDetails.value = nextProgramDetails
    employabilityMap.value = nextEmployabilityMap
    institutionMap.value = nextInstitutionMap
  } finally {
    loadingPrograms.value = false
    serviceHydrating.value = false
    // Logos ya fueron prefetcheados en onMounted de forma agrupada;
    // aquí solo refrescamos si hubiera programas nuevos no cubiertos antes.
    const knownCodes = new Set(
      [...selectedPaesPrograms.value, ...selectedInstitutions.value]
        .map((p: any) => normalizeInstitutionCode(p.institution_code))
        .filter((v): v is number => v !== null)
    )
    const newCodes = programDetails.value
      .map((p: any) => normalizeInstitutionCode(p.institution_code))
      .filter((v): v is number => v !== null && !knownCodes.has(v))
    if (newCodes.length) prefetchLogos(newCodes)
  }
}

function formatMoney(v?: number | null) {
  if (!v) return '—'
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(v)
}

function fourthYearIncomeLabel(entry?: { i4: number | null; i4Label?: string | null }) {
  if (!entry) return '—'
  return entry.i4Label || formatMoney(entry.i4)
}

function incomeSourceLabel(entry?: { source?: 'institucion' | 'generica' }) {
  return entry?.source === 'institucion'
    ? '4° año por institución; 1er año genérico SIES'
    : 'Datos genéricos por carrera SIES'
}

function formatScore(v?: number | null) {
  if (v === null || v === undefined || Number.isNaN(Number(v))) return null
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(Number(v))
}

function scoreLabel(p: any) {
  const corte = formatScore(p?.puntaje_corte_ultimo)
  if (corte) return corte
  const promedio = formatScore(p?.puntaje_promedio_matriculados)
  return promedio ? `Promedio ${promedio}` : '—'
}

function scoreDetail(p: any) {
  if (p?.puntaje_corte_ultimo !== null && p?.puntaje_corte_ultimo !== undefined) {
    return p?.anio_puntajes ? `Corte último ${p.anio_puntajes}` : 'Corte último'
  }
  if (p?.puntaje_promedio_matriculados !== null && p?.puntaje_promedio_matriculados !== undefined) {
    return p?.anio_puntajes ? `PAES promedio matriculados ${p.anio_puntajes}` : 'PAES promedio matriculados'
  }
  return null
}

onMounted(async () => {
  // auth.client.ts ya llamó ensureHydrated() al montar la app —
  // solo esperamos que esté listo sin hacer una segunda petición.
  if (!authStore.hydrated) await authStore.ensureHydrated()

  loadProgramQueue()
  loadPaesProgramQueue()
  loadInstitutionQueue()

  // Prefetch logos de todas las secciones en un solo batch
  const allLogosCodes = [
    ...selectedPrograms.value,
    ...selectedPaesPrograms.value,
    ...selectedInstitutions.value,
  ]
    .map((p: any) => normalizeInstitutionCode(p.institution_code ?? p.institution_code))
    .filter((v): v is number => v !== null)
  if (allLogosCodes.length) prefetchLogos([...new Set(allLogosCodes)])

  // Hidratar favoritos en paralelo con el detalle de programas
  const tasks: Promise<unknown>[] = [programFavorites.hydrate()]
  if (selectedPrograms.value.length) tasks.push(reloadProgramDetails())
  await Promise.all(tasks)

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onVisibility)
  }
})

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('storage', onStorage)
    document.removeEventListener('visibilitychange', onVisibility)
  }
})

function onStorage(e: StorageEvent) {
  if (e.key === COMPARE_PROGRAMS_KEY) {
    loadProgramQueue()
    reloadProgramDetails()
  } else if (e.key === COMPARE_PAES_PROGRAMS_KEY) {
    loadPaesProgramQueue()
    // Prefetch logos para los nuevos programas PAES
    const codes = selectedPaesPrograms.value
      .map((p: any) => normalizeInstitutionCode(p.institution_code))
      .filter((v): v is number => v !== null)
    if (codes.length) prefetchLogos([...new Set(codes)])
  } else if (e.key === FAVORITES_KEY) {
    loadFavorites()
  } else if (e.key === COMPARE_INSTITUTIONS_KEY) {
    loadInstitutionQueue()
  }
}

watch([filterTipo, filterRegion], () => {
  triggerCompareAnimation()
})

async function onVisibility() {
  if (document.visibilityState === 'visible') {
    const prevCount = selectedPrograms.value.length
    loadProgramQueue()
    loadPaesProgramQueue()
    if (selectedPrograms.value.length !== prevCount) {
      await reloadProgramDetails()
    }
  }
}

</script>
