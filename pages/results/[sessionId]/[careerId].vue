<template>
  <div>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="flex-1 pt-24 pb-16 px-6">
      <div class="max-w-5xl mx-auto space-y-8">
        <!-- Header -->
        <div class="space-y-4">
          <NuxtLink :to="backLink" class="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors group">
            <svg class="w-4 h-4 transition-transform group-hover:-translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Volver a resultados
          </NuxtLink>

          <div class="flex items-start gap-4">
            <div class="w-16 h-16 rounded-3xl flex items-center justify-center text-5xl shrink-0 bg-gradient-to-br from-blue-50 to-cyan-50">
              {{ career?.emoji }}
            </div>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-3 flex-wrap">
                <h1 class="text-3xl font-bold text-slate-900">{{ career?.title }}</h1>
                <span v-if="career?.job_demand" class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="{
                    'bg-emerald-100 text-emerald-700': career.job_demand === 'Muy Alta',
                    'bg-blue-100 text-blue-700': career.job_demand === 'Alta',
                    'bg-amber-100 text-amber-700': career.job_demand === 'Media',
                  }">
                  Demanda {{ career.job_demand }}
                </span>
              </div>
              <p class="text-slate-600 mt-2">{{ career?.tagline }}</p>
              <div class="flex items-center gap-3 mt-4">
                <div class="flex items-center gap-1.5">
                  <div class="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div class="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-500" :style="{ width: `${career?.match_score}%` }"></div>
                  </div>
                  <span class="text-sm font-bold text-primary-600">{{ career?.match_score }}%</span>
                </div>
                <span class="text-sm text-slate-500">Compatibilidad</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Fun Facts strip -->
        <div v-if="career?.fun_facts?.length" class="flex gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <div
            v-for="(fact, i) in career.fun_facts"
            :key="i"
            class="shrink-0 flex items-start gap-2 bg-gradient-to-br from-primary-50 to-accent-50 border border-primary-100 rounded-2xl px-4 py-3 max-w-xs">
            <span class="text-lg leading-none mt-0.5">💡</span>
            <p class="text-sm text-slate-700 leading-snug">{{ fact }}</p>
          </div>
        </div>

        <!-- Descripción -->
        <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card">
          <p class="text-lg text-slate-700 leading-relaxed">{{ career?.description }}</p>
        </div>

        <!-- Pros y Cons Preview -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <h3 class="font-bold text-slate-900">Ventajas</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(pro, idx) in career?.pros" :key="idx" class="text-sm text-slate-700 flex items-start gap-2">
                <span class="text-emerald-500 mt-0.5">✓</span>
                {{ pro }}
              </li>
            </ul>
          </div>

          <div class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card">
            <div class="flex items-center gap-2 mb-4">
              <svg class="w-5 h-5 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
              </svg>
              <h3 class="font-bold text-slate-900">Desventajas</h3>
            </div>
            <ul class="space-y-2">
              <li v-for="(con, idx) in career?.cons" :key="idx" class="text-sm text-slate-700 flex items-start gap-2">
                <span class="text-amber-500 mt-0.5">⚠</span>
                {{ con }}
              </li>
            </ul>
          </div>
        </div>

        <!-- Tabs -->
        <div class="flex gap-1 border-b border-slate-200 overflow-x-auto scrollbar-hide">
          <button
            v-for="tab in TABS"
            :key="tab.key"
            @click="activeTab = tab.key"
            class="px-5 py-3 font-medium text-sm transition-colors relative whitespace-nowrap shrink-0"
            :class="activeTab === tab.key ? 'text-primary-600' : 'text-slate-500 hover:text-slate-700'">
            {{ tab.label }}
            <div v-if="activeTab === tab.key" class="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-600 to-accent-500 rounded-t-full"></div>
          </button>
        </div>

        <!-- Tab Contents -->
        <div class="space-y-8">
          <!-- Roadmap Tab -->
          <template v-if="activeTab === 'roadmap'">
            <!-- Progress bar -->
            <div class="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-semibold text-slate-700">Progreso del roadmap</span>
                <span class="text-sm font-bold text-primary-600">{{ roadmapProgress }}%</span>
              </div>
              <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  class="h-full rounded-full bg-gradient-to-r from-primary-600 to-accent-500 transition-all duration-500"
                  :style="{ width: `${roadmapProgress}%` }">
                </div>
              </div>
              <p class="text-xs text-slate-500 mt-2">{{ completedMilestonesCount }} de {{ totalMilestones }} hitos completados</p>
            </div>

            <div class="space-y-6">
              <div
                v-for="(phase, index) in career?.roadmap"
                :key="index"
                class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 cursor-pointer"
                @click="expandedPhase = expandedPhase === index ? null : index">
                <div class="flex items-start justify-between gap-4">
                  <div class="flex items-start gap-4">
                    <div class="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 flex items-center justify-center shrink-0 text-lg font-bold text-primary-600">
                      {{ index + 1 }}
                    </div>
                    <div>
                      <h3 class="text-xl font-bold text-slate-900">{{ phase.phase }}</h3>
                      <p class="text-sm text-slate-500 mt-1">{{ phase.duration }}</p>
                    </div>
                  </div>
                  <svg
                    class="w-6 h-6 text-slate-500 transition-transform duration-200 shrink-0 mt-1"
                    :class="expandedPhase === index ? 'rotate-180' : ''"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                <!-- Milestones -->
                <Transition
                  enter-active-class="transition-[opacity,transform] duration-250 ease-out"
                  enter-from-class="opacity-0 -translate-y-1"
                  enter-to-class="opacity-100 translate-y-0"
                  leave-active-class="transition-[opacity,transform] duration-150 ease-in"
                  leave-from-class="opacity-100 translate-y-0"
                  leave-to-class="opacity-0 -translate-y-1">
                  <div v-if="expandedPhase === index" class="overflow-hidden">
                    <div class="border-t border-slate-100 pt-6 space-y-6">
                      <!-- Hitos -->
                      <div>
                        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4">Hitos principales</h4>
                        <ul class="space-y-3">
                          <li
                            v-for="(milestone, mIdx) in phase.milestones"
                            :key="mIdx"
                            class="flex items-start gap-3 cursor-pointer group"
                            @click.stop="toggleMilestone(index, mIdx)">
                            <div class="w-5 h-5 shrink-0 mt-0.5 rounded-full border-2 flex items-center justify-center transition-all duration-200"
                              :class="isMilestoneCompleted(index, mIdx)
                                ? 'bg-primary-500 border-primary-500'
                                : 'border-slate-300 group-hover:border-primary-400'">
                              <svg v-if="isMilestoneCompleted(index, mIdx)" class="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                              </svg>
                            </div>
                            <span class="text-slate-700 leading-snug transition-colors" :class="isMilestoneCompleted(index, mIdx) ? 'line-through text-slate-500' : ''">{{ milestone }}</span>
                          </li>
                        </ul>
                      </div>

                      <!-- Teoría -->
                      <div v-if="phase.theory?.length" class="pt-4 border-t border-slate-100">
                        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3">📖 Teoría a dominar</h4>
                        <div class="flex flex-wrap gap-2">
                          <span
                            v-for="(topic, tIdx) in phase.theory"
                            :key="tIdx"
                            class="px-3 py-1.5 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-100">
                            {{ topic }}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Transition>
              </div>
            </div>
          </template>

          <!-- Sueldo Tab -->
          <template v-if="activeTab === 'sueldo'">
            <div v-if="dbSalary || career?.salary_range" class="space-y-6">
              <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card">
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-lg font-bold text-slate-900">Rangos salariales en Chile (CLP mensual)</h3>
                  <span v-if="dbSalary" class="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">Datos oficiales SIES</span>
                  <span v-else class="text-xs px-2.5 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100 font-medium">Estimación IA</span>
                </div>
                <div class="space-y-5">
                  <div v-for="level in salaryLevels" :key="level.key" class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="text-lg">{{ level.emoji }}</span>
                        <span class="font-semibold text-slate-800">{{ level.label }}</span>
                      </div>
                      <span class="font-bold text-slate-900">{{ formatCLP(activeSalary[level.key]) }}</span>
                    </div>
                    <div class="h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        class="h-full rounded-full transition-all duration-700"
                        :class="level.color"
                        :style="{ width: `${salaryBarWidth(activeSalary[level.key])}%` }">
                      </div>
                    </div>
                    <p class="text-xs text-slate-500">{{ level.description }}</p>
                  </div>
                </div>
                <p class="text-xs text-slate-500 mt-6 text-center">
                  <template v-if="dbSalary">* Ingresos reales basados en egresados según datos SIES/MiFuturo. Pueden variar según institución y región.</template>
                  <template v-else>* Estimaciones basadas en el mercado laboral chileno actual. Los valores pueden variar según empresa, ciudad y experiencia.</template>
                </p>
              </div>

              <div class="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-3xl p-6 border border-emerald-100">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">📈</span>
                  <div>
                    <h4 class="font-bold text-slate-900 mb-1">Potencial de crecimiento</h4>
                    <p class="text-sm text-slate-600">Desde junior hasta senior, el sueldo puede crecer hasta <span class="font-bold text-emerald-700">{{ salaryGrowthPercent }}%</span>. Una de las carreras con mejor trayectoria salarial en Chile.</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="text-4xl block mb-3">💼</span>
              <p>Información salarial no disponible para esta búsqueda.</p>
            </div>
          </template>

          <!-- Libros Tab -->
          <template v-if="activeTab === 'libros'">
            <div v-if="career?.books?.length" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              <div
                v-for="(book, idx) in career.books"
                :key="idx"
                class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col">
                <div class="text-4xl mb-4">{{ book.emoji }}</div>
                <h3 class="font-bold text-slate-900 text-base leading-snug">{{ book.title }}</h3>
                <p class="text-sm text-primary-600 font-medium mt-1">{{ book.author }}</p>
                <p class="text-sm text-slate-600 mt-3 leading-relaxed flex-1">{{ book.description }}</p>
              </div>
            </div>
            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="text-4xl block mb-3">📚</span>
              <p>Recomendaciones de libros no disponibles para esta búsqueda.</p>
            </div>
          </template>

          <!-- Personalidad Tab -->
          <template v-if="activeTab === 'personalidad'">
            <div class="space-y-6">
              <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card">
                <h3 class="text-lg font-bold text-slate-900 mb-2">Perfiles de personalidad que destacan</h3>
                <p class="text-sm text-slate-500 mb-6">Los siguientes tipos MBTI suelen tener afinidad natural con esta carrera.</p>
                <div v-if="career?.personality_types?.length" class="flex flex-wrap gap-3">
                  <div
                    v-for="type in career.personality_types"
                    :key="type"
                    class="group relative">
                    <div class="px-5 py-3 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 border border-primary-200 cursor-default hover:scale-105 transition-transform duration-200">
                      <span class="font-bold text-primary-700 text-lg">{{ type }}</span>
                    </div>
                    <div v-if="mbtiDescriptions[type]" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-slate-900 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 text-center leading-snug">
                      {{ mbtiDescriptions[type] }}
                    </div>
                  </div>
                </div>
                <div v-else class="text-slate-500 text-sm">No se encontraron tipos de personalidad específicos para esta carrera.</div>
              </div>

              <div class="bg-gradient-to-br from-violet-50 to-pink-50 rounded-3xl p-6 border border-violet-100">
                <div class="flex items-start gap-3">
                  <span class="text-2xl">🧠</span>
                  <div>
                    <h4 class="font-bold text-slate-900 mb-1">¿No conoces tu tipo MBTI?</h4>
                    <p class="text-sm text-slate-600 mb-3">Descubre tu perfil de personalidad con un test gratuito y confirma si esta carrera es para ti.</p>
                    <a
                      href="https://www.16personalities.com/es/test-de-personalidad"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-semibold hover:bg-violet-700 transition-colors">
                      Hacer test gratuito
                      <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- Universidades Tab -->
          <template v-if="activeTab === 'universidades'">
            <!-- Loading -->
            <div v-if="dbProgramsLoading" class="flex justify-center py-12">
              <div class="flex gap-1 items-center">
                <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay:0ms"></span>
                <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay:150ms"></span>
                <span class="w-2 h-2 rounded-full bg-primary-400 animate-bounce" style="animation-delay:300ms"></span>
              </div>
            </div>

            <!-- DB Programs -->
            <div v-else-if="dbPrograms.length" class="space-y-4">
              <p class="text-sm text-slate-500">Programas acreditados en Chile según datos oficiales Mineduc.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(prog, i) in dbPrograms"
                  :key="i"
                  class="bg-white rounded-2xl p-5 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-xl font-bold"
                    :class="{
                      'bg-blue-50 text-blue-600': prog.tipo_institucion === 'Universidades',
                      'bg-emerald-50 text-emerald-600': prog.tipo_institucion === 'Institutos Profesionales',
                      'bg-amber-50 text-amber-600': prog.tipo_institucion === 'Centros de Formación Técnica',
                      'bg-violet-50 text-violet-600': !['Universidades','Institutos Profesionales','Centros de Formación Técnica'].includes(prog.tipo_institucion),
                    }">
                    {{ prog.tipo_institucion === 'Universidades' ? '🎓' : prog.tipo_institucion === 'Centros de Formación Técnica' ? '🏫' : '📚' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 flex-wrap">
                      <h3 class="font-bold text-slate-900 text-sm leading-snug">{{ prog.nombre_institucion }}</h3>
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                        :class="{
                          'bg-blue-100 text-blue-700': prog.tipo_institucion === 'Universidades',
                          'bg-emerald-100 text-emerald-700': prog.tipo_institucion === 'Institutos Profesionales',
                          'bg-amber-100 text-amber-700': prog.tipo_institucion === 'Centros de Formación Técnica',
                          'bg-violet-100 text-violet-700': !['Universidades','Institutos Profesionales','Centros de Formación Técnica'].includes(prog.tipo_institucion),
                        }">
                        {{ prog.tipo_institucion === 'Universidades' ? 'Universidad' : prog.tipo_institucion === 'Institutos Profesionales' ? 'Instituto' : prog.tipo_institucion === 'Centros de Formación Técnica' ? 'CFT' : prog.tipo_institucion }}
                      </span>
                    </div>
                    <p class="text-xs text-primary-600 font-medium mt-1">{{ prog.nombre_carrera }}</p>
                    <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {{ prog.sede || prog.region }}
                    </p>
                    <p v-if="prog.arancel_anual" class="text-xs text-slate-500 mt-0.5">
                      Arancel anual: ${{ prog.arancel_anual.toLocaleString('es-CL') }}
                    </p>
                    <button
                      @click="addProgramToCompare(prog)"
                      class="mt-2 flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full transition-all duration-200"
                      :class="isProgramQueued(prog)
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-primary-50 text-primary-600 hover:bg-primary-100'"
                    >
                      <svg v-if="isProgramQueued(prog)" class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <svg v-else class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      {{ isProgramQueued(prog) ? 'En comparador' : 'Agregar al comparador' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- AI Fallback -->
            <div v-else-if="career?.universities?.length" class="space-y-4">
              <p class="text-sm text-slate-500">Instituciones en Chile donde puedes estudiar esta carrera o una formación equivalente.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(uni, i) in career.universities"
                  :key="i"
                  class="bg-white rounded-2xl p-5 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-xl font-bold"
                    :class="{
                      'bg-blue-50 text-blue-600': uni.type === 'Universidad',
                      'bg-emerald-50 text-emerald-600': uni.type === 'Instituto' || uni.type === 'DUOC',
                      'bg-amber-50 text-amber-600': uni.type === 'CFT',
                      'bg-violet-50 text-violet-600': !['Universidad','Instituto','DUOC','CFT'].includes(uni.type),
                    }">
                    {{ uni.type === 'Universidad' ? '🎓' : uni.type === 'CFT' ? '🏫' : '📚' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-2 flex-wrap">
                      <h3 class="font-bold text-slate-900 text-sm leading-snug">{{ uni.name }}</h3>
                      <span class="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                        :class="{
                          'bg-blue-100 text-blue-700': uni.type === 'Universidad',
                          'bg-emerald-100 text-emerald-700': uni.type === 'Instituto' || uni.type === 'DUOC',
                          'bg-amber-100 text-amber-700': uni.type === 'CFT',
                          'bg-violet-100 text-violet-700': !['Universidad','Instituto','DUOC','CFT'].includes(uni.type),
                        }">
                        {{ uni.type }}
                      </span>
                    </div>
                    <p class="text-xs text-primary-600 font-medium mt-1">{{ uni.program }}</p>
                    <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      {{ uni.location }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="text-4xl block mb-3">🎓</span>
              <p>Información de universidades no disponible para esta búsqueda.</p>
            </div>
          </template>

          <!-- Malla Curricular Tab -->
          <template v-if="activeTab === 'malla'">
            <div v-if="career?.curriculum?.length" class="space-y-4">
              <p class="text-sm text-slate-500">Malla curricular representativa basada en programas chilenos. Los contenidos varían por institución.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="sem in career.curriculum"
                  :key="sem.semester"
                  class="bg-white rounded-2xl p-5 border border-slate-100 shadow-card">
                  <div class="flex items-center gap-3 mb-4">
                    <div class="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-extrabold text-white shrink-0"
                      style="background: linear-gradient(135deg, #1A73E8, #06b6d4)">
                      {{ sem.semester }}
                    </div>
                    <h3 class="font-bold text-slate-900">Semestre {{ sem.semester }}</h3>
                  </div>
                  <ul class="space-y-2">
                    <li
                      v-for="(subject, idx) in sem.subjects"
                      :key="idx"
                      class="flex items-center gap-2 text-sm text-slate-700">
                      <div class="w-1.5 h-1.5 rounded-full bg-primary-400 shrink-0"></div>
                      {{ subject }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="text-4xl block mb-3">📋</span>
              <p>Malla curricular no disponible para esta búsqueda.</p>
            </div>
          </template>

          <!-- Referentes Tab -->
          <template v-if="activeTab === 'referentes'">
            <div v-if="career?.notable_people?.length" class="space-y-4">
              <p class="text-sm text-slate-500">Personas reales que han marcado la historia de esta área y son fuente de inspiración.</p>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div
                  v-for="(person, i) in career.notable_people"
                  :key="i"
                  class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 flex flex-col">
                  <div class="flex items-center gap-3 mb-4">
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0"
                      style="background: linear-gradient(135deg, #eff6ff, #ecfeff)">
                      {{ person.emoji }}
                    </div>
                    <div class="min-w-0">
                      <h3 class="font-bold text-slate-900 text-sm leading-snug truncate">{{ person.name }}</h3>
                      <p class="text-xs text-primary-600 font-medium mt-0.5">{{ person.role }}</p>
                      <p class="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                        <svg class="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                        </svg>
                        {{ person.country }}
                      </p>
                    </div>
                  </div>
                  <p class="text-sm text-slate-600 leading-relaxed flex-1">{{ person.contribution }}</p>
                </div>
              </div>
            </div>
            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="text-4xl block mb-3">🌟</span>
              <p>Referentes no disponibles para esta búsqueda.</p>
            </div>
          </template>
        </div>

        <!-- CTA -->
        <div class="bg-gradient-to-r from-primary-600 to-accent-500 rounded-3xl p-8 text-white text-center space-y-4">
          <h3 class="text-2xl font-bold">¿Listo para comenzar?</h3>
          <p class="text-white/90 max-w-xl mx-auto">Sigue el roadmap paso a paso, marca cada hito y alcanza tu objetivo.</p>
          <div class="flex gap-3 flex-wrap justify-center pt-3">
            <button
              @click="saveCareer"
              class="px-8 py-3 rounded-2xl bg-white text-primary-600 font-bold hover:bg-slate-50 transition-colors"
              :class="{ 'opacity-75': isSaved }">
              {{ isSaved ? '✓ Guardado' : '📌 Guardar Plan' }}
            </button>
            <button
              @click="exportPDF"
              class="px-8 py-3 rounded-2xl border-2 border-white text-white font-bold hover:bg-white/10 transition-colors">
              📥 Descargar PDF
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Chat flotante -->
  <button
    @click="isChatOpen = true"
    class="fixed bottom-[calc(env(safe-area-inset-bottom)+1rem)] right-[calc(env(safe-area-inset-right)+1rem)] sm:bottom-6 sm:right-6 z-40 inline-flex items-center gap-2 px-4 py-3 rounded-2xl text-sm font-semibold text-white shadow-lg bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-600 active:scale-[0.98] transition-all duration-200">
    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
    Preguntale a la IA
  </button>

  <!-- Modal de chat -->
  <Transition
    enter-active-class="transition-all duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition-all duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0">
    <div
      v-if="isChatOpen"
      class="fixed inset-0 z-50 bg-slate-900/30"
      @click.self="isChatOpen = false">
      <div class="absolute inset-0 pt-4 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:p-6 flex items-end justify-end pointer-events-none">
        <Transition
          enter-active-class="transition-all duration-220 ease-out"
          enter-from-class="opacity-0 translate-y-2 scale-[0.96]"
          enter-to-class="opacity-100 translate-y-0 scale-100"
          leave-active-class="transition-all duration-160 ease-in"
          leave-from-class="opacity-100 translate-y-0 scale-100"
          leave-to-class="opacity-0 translate-y-2 scale-[0.96]"
          appear>
          <div v-if="isChatOpen" class="pointer-events-auto w-full max-w-[420px]">
            <ResultsChatPanel mode="modal" @close="isChatOpen = false" />
          </div>
        </Transition>
      </div>
    </div>
  </Transition>
  </div>
</template>

<script setup lang="ts">
import { useCareerStore } from '~/stores/career'

const route = useRoute()
const router = useRouter()
const store = useCareerStore()

const activeTab = ref('sueldo')
const expandedPhase = ref<number | null>(null)
const isChatOpen = ref(false)
const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') isChatOpen.value = false }

const TABS = [
  { key: 'sueldo', label: '💰 Sueldo' },
  { key: 'personalidad', label: '🧠 Personalidad' },
  { key: 'universidades', label: '🎓 Dónde estudiar' },
  { key: 'malla', label: '📋 Malla Curricular' },
]

const career = computed(() => store.selectedCareer)
const backLink = computed(() => `/results/${route.params.sessionId}`)

// ── Roadmap Progress ─────────────────────────────────────────────────────────
const storageKey = computed(() => `roadmap-progress-${route.params.careerId}`)
const completedMilestones = ref<Set<string>>(new Set())

function milestoneKey(phaseIdx: number, mIdx: number) {
  return `${phaseIdx}-${mIdx}`
}

function isMilestoneCompleted(phaseIdx: number, mIdx: number) {
  return completedMilestones.value.has(milestoneKey(phaseIdx, mIdx))
}

function toggleMilestone(phaseIdx: number, mIdx: number) {
  const key = milestoneKey(phaseIdx, mIdx)
  const next = new Set(completedMilestones.value)
  if (next.has(key)) next.delete(key)
  else next.add(key)
  completedMilestones.value = next
  if (import.meta.client) {
    localStorage.setItem(storageKey.value, JSON.stringify([...next]))
  }
}

const totalMilestones = computed(() =>
  career.value?.roadmap?.reduce((sum, p) => sum + p.milestones.length, 0) ?? 0
)
const completedMilestonesCount = computed(() => completedMilestones.value.size)
const roadmapProgress = computed(() => {
  if (!totalMilestones.value) return 0
  return Math.round((completedMilestonesCount.value / totalMilestones.value) * 100)
})

// ── Salary ────────────────────────────────────────────────────────────────────
const salaryLevels = [
  { key: 'junior' as const, label: 'Junior', emoji: '🌱', description: '0-2 años de experiencia', color: 'bg-emerald-400' },
  { key: 'mid' as const, label: 'Semi-Senior', emoji: '🚀', description: '2-5 años de experiencia', color: 'bg-blue-500' },
  { key: 'senior' as const, label: 'Senior', emoji: '⭐', description: '5+ años de experiencia', color: 'bg-gradient-to-r from-primary-600 to-accent-500' },
]

// Prefer DB salary over AI-generated salary
const activeSalary = computed<{ junior: number; mid: number; senior: number }>(() => {
  if (dbSalary.value) return dbSalary.value
  const s = career.value?.salary_range
  return { junior: s?.junior ?? 0, mid: s?.mid ?? 0, senior: s?.senior ?? 0 }
})

function formatCLP(value: number) {
  return `$${value.toLocaleString('es-CL')} CLP`
}

function salaryBarWidth(value: number) {
  const max = activeSalary.value.senior
  return max ? Math.round((value / max) * 100) : 100
}

const salaryGrowthPercent = computed(() => {
  const s = activeSalary.value
  if (!s.junior || !s.senior) return 0
  return Math.round(((s.senior - s.junior) / s.junior) * 100)
})

// ── MBTI Descriptions ─────────────────────────────────────────────────────────
const mbtiDescriptions: Record<string, string> = {
  INTJ: 'Estratega. Pensamiento independiente y determinación para convertir ideas en realidad.',
  INTP: 'Lógico. Pensador innovador con sed de conocimiento y análisis profundo.',
  ENTJ: 'Comandante. Liderazgo audaz, voluntad fuerte y gran capacidad estratégica.',
  ENTP: 'Innovador. Mente ágil que disfruta los desafíos intelectuales y el debate.',
  INFJ: 'Consejero. Visionary con principios firmes e ideal para impacto social.',
  INFP: 'Mediador. Idealista con valores profundos y creatividad artística.',
  ENFJ: 'Protagonista. Carismático y empático, inspira y motiva a otros.',
  ENFP: 'Activista. Entusiasta, creativo y siempre buscando nuevas conexiones.',
  ISTJ: 'Inspector. Confiable, práctico y dedicado a mantener el orden.',
  ISFJ: 'Defensor. Cálido, cuidadoso y muy dedicado a las personas importantes.',
  ESTJ: 'Ejecutivo. Organizado, decidido y gran gestor de personas y proyectos.',
  ESFJ: 'Cónsul. Sociable y atento, siempre pendiente del bienestar del grupo.',
  ISTP: 'Artesano. Observador audaz que experimenta con flexibilidad y pragmatismo.',
  ISFP: 'Aventurero. Artista sensible y flexible que vive el momento presente.',
  ESTP: 'Emprendedor. Perspicaz, energético y le encanta vivir al límite.',
  ESFP: 'Animador. Espontáneo, enérgico y disfruta hacer que otros se diviertan.',
}

// ── Save / Export ─────────────────────────────────────────────────────────────
const isSaved = computed(() =>
  store.savedCareers.some(c => c.careerData.id === career.value?.id)
)

function saveCareer() {
  if (!career.value) return
  if (isSaved.value) {
    const saved = store.savedCareers.find(c => c.careerData.id === career.value?.id)
    if (saved) store.removeSavedCareer(saved.id)
  } else {
    store.addSavedCareer(career.value)
  }
}

async function exportPDF() {
  if (!career.value) return
  const { exportRoadmapToPDF } = await import('~/utils/exportPDF')
  exportRoadmapToPDF(career.value)
}

// ── DB Salary ─────────────────────────────────────────────────────────────────
interface DbSalary { junior: number; mid: number; senior: number }
const dbSalary = ref<DbSalary | null>(null)

async function fetchDbSalary(title: string) {
  try {
    const res = await $fetch<{ careers: { salary_junior?: number; salary_mid?: number; salary_senior?: number }[] }>(
      `/api/careers?q=${encodeURIComponent(title)}&limit=5`
    )
    const match = res.careers?.find(c => c.salary_junior && c.salary_mid && c.salary_senior)
    if (match?.salary_junior && match.salary_mid && match.salary_senior) {
      dbSalary.value = { junior: match.salary_junior, mid: match.salary_mid, senior: match.salary_senior }
    }
  } catch { /* fallback silently */ }
}

// ── DB Programs (Dónde estudiar) ───────────────────────────────────────────────
interface DbProgram {
  program_unique_code?: string
  nombre_carrera: string
  nombre_institucion: string
  tipo_institucion: string
  region: string
  sede: string
  arancel_anual?: number
  duracion_formal_semestres?: number
}
const dbPrograms = ref<DbProgram[]>([])
const dbProgramsLoading = ref(false)

// ── Comparador desde Dónde estudiar ───────────────────────────────────────────
const COMPARE_PROGRAMS_KEY = 'KoraChile:compare:programs'
const compareProgramCodes = ref<string[]>([])

function loadCompareProgramCodes() {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PROGRAMS_KEY)
    if (!raw) return
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) {
      compareProgramCodes.value = arr
        .map((x: any) => String(x?.program_unique_code || x?.code || ''))
        .filter(Boolean)
    }
  } catch { compareProgramCodes.value = [] }
}

function isProgramQueued(prog: DbProgram) {
  const code = prog.program_unique_code || `${prog.nombre_institucion}__${prog.nombre_carrera}`
  return compareProgramCodes.value.includes(code)
}

async function addProgramToCompare(prog: DbProgram) {
  if (typeof window === 'undefined') return
  const code = prog.program_unique_code || `${prog.nombre_institucion}__${prog.nombre_carrera}`
  try {
    const raw = localStorage.getItem(COMPARE_PROGRAMS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const safe = Array.isArray(arr) ? arr : []
    if (!safe.some((x: any) => (x?.program_unique_code || x?.code) === code)) {
      if (safe.length >= 4) safe.shift()
      safe.push({
        program_unique_code: code,
        nombre_carrera: prog.nombre_carrera,
        nombre_institucion: prog.nombre_institucion,
        duracion_formal_semestres: prog.duracion_formal_semestres,
        arancel_anual: prog.arancel_anual,
        tipo_institucion: prog.tipo_institucion,
        region: prog.sede || prog.region,
      })
      localStorage.setItem(COMPARE_PROGRAMS_KEY, JSON.stringify(safe))
      compareProgramCodes.value = safe.map((x: any) => String(x.program_unique_code))
    }
    await navigateTo('/compare?tab=programas')
  } catch { /* noop */ }
}

async function fetchDbPrograms(title: string) {
  dbProgramsLoading.value = true
  try {
    const res = await $fetch<{ results: DbProgram[] }>('/api/tools/search-career-match', {
      method: 'POST',
      body: { keywords: [title], limit: 12 },
    })
    dbPrograms.value = res.results ?? []
  } catch { /* fallback silently */ } finally {
    dbProgramsLoading.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────
onBeforeMount(() => {
  if (!career.value) {
    if (store.result?.variations) {
      const foundCareer = store.result.variations.find(c => c.id === route.params.careerId)
      if (foundCareer) {
        store.setSelectedCareer(foundCareer)
        return
      }
    }
    router.push(`/results/${route.params.sessionId}`)
  }
})

onMounted(() => {
  if (import.meta.client) {
    loadCompareProgramCodes()
    window.addEventListener('storage', (e) => {
      if (e.key === COMPARE_PROGRAMS_KEY) loadCompareProgramCodes()
    })
    const saved = localStorage.getItem(storageKey.value)
    if (saved) {
      try {
        completedMilestones.value = new Set(JSON.parse(saved))
      } catch {
        // ignore corrupt data
      }
    }
    if (career.value?.title) {
      fetchDbSalary(career.value.title)
      fetchDbPrograms(career.value.title)
    }
  }
  window.addEventListener('keydown', onKeyDown)
})

onBeforeUnmount(() => window.removeEventListener('keydown', onKeyDown))
</script>
