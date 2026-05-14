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
            <div
              class="w-16 h-16 rounded-3xl flex items-center justify-center shrink-0 border"
              :class="careerIconTone(career)">
              <TrendingUp v-if="careerIconKind(career) === 'business'" class="w-6 h-6" />
              <Code2 v-else-if="careerIconKind(career) === 'tech'" class="w-6 h-6" />
              <HeartPulse v-else-if="careerIconKind(career) === 'health'" class="w-6 h-6" />
              <GraduationCap v-else-if="careerIconKind(career) === 'education'" class="w-6 h-6" />
              <Wrench v-else-if="careerIconKind(career) === 'engineering'" class="w-6 h-6" />
              <Scale v-else-if="careerIconKind(career) === 'law'" class="w-6 h-6" />
              <Palette v-else-if="careerIconKind(career) === 'arts'" class="w-6 h-6" />
              <FlaskConical v-else-if="careerIconKind(career) === 'science'" class="w-6 h-6" />
              <Building2 v-else-if="careerIconKind(career) === 'architecture'" class="w-6 h-6" />
              <Leaf v-else-if="careerIconKind(career) === 'agro'" class="w-6 h-6" />
              <Users v-else-if="careerIconKind(career) === 'social'" class="w-6 h-6" />
              <Cpu v-else-if="careerIconKind(career) === 'electronics'" class="w-6 h-6" />
              <Truck v-else-if="careerIconKind(career) === 'logistics'" class="w-6 h-6" />
              <Megaphone v-else-if="careerIconKind(career) === 'communication'" class="w-6 h-6" />
              <ChefHat v-else-if="careerIconKind(career) === 'gastronomy'" class="w-6 h-6" />
              <Shield v-else-if="careerIconKind(career) === 'security'" class="w-6 h-6" />
              <Plane v-else-if="careerIconKind(career) === 'aviation'" class="w-6 h-6" />
              <BookOpen v-else class="w-6 h-6" />
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
            <Lightbulb class="w-4 h-4 text-amber-500 mt-0.5" />
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
                <Check class="w-4 h-4 text-emerald-500 mt-0.5" />
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
                <TriangleAlert class="w-4 h-4 text-amber-500 mt-0.5" />
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
                        <h4 class="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
                          <svg class="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25278C10.8324 5.47675 9.43015 5 8 5C5.79086 5 4 6.79086 4 9V17C4 14.7909 5.79086 13 8 13C9.43015 13 10.8324 13.4768 12 14.2528M12 6.25278C13.1676 5.47675 14.5699 5 16 5C18.2091 5 20 6.79086 20 9V17C20 14.7909 18.2091 13 16 13C14.5699 13 13.1676 13.4768 12 14.2528M12 6.25278V14.2528" />
                          </svg>
                          Teoría a dominar
                        </h4>
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
            <div v-if="officialSalaryRange" class="space-y-6">
              <div class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card">
                <div class="flex items-center justify-between mb-6">
                  <div>
                    <h3 class="text-lg font-bold text-slate-900">Ingresos en Chile (CLP mensual)</h3>
                    <p class="text-xs text-slate-500 mt-1">{{ officialSalaryMeta }}</p>
                  </div>
                  <span class="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">Datos oficiales SIES</span>
                </div>
                <div class="space-y-5">
                  <div v-for="level in salaryLevels" :key="level.key" class="space-y-1.5">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="w-8 h-8 rounded-xl border flex items-center justify-center"
                          :class="{
                            'border-emerald-200 bg-emerald-50 text-emerald-700': level.icon === 'junior',
                            'border-blue-200 bg-blue-50 text-blue-700': level.icon === 'mid',
                            'border-indigo-200 bg-indigo-50 text-indigo-700': level.icon === 'senior',
                          }">
                          <svg v-if="level.icon === 'junior'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 21V12M12 12L8.5 8.5M12 12l3.5-3.5" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M7 16c0-2.7614 2.23858-5 5-5s5 2.2386 5 5" />
                          </svg>
                          <svg v-else-if="level.icon === 'mid'" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l5-5 4 4 7-7" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M14 8h6v6" />
                          </svg>
                          <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l2.755 5.583 6.16.895-4.457 4.344 1.052 6.134L12 17.063 6.49 19.956l1.052-6.134L3.085 9.478l6.16-.895L12 3z" />
                          </svg>
                        </span>
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
                  * Ingresos reales basados en egresados según datos SIES/MiFuturo. Pueden variar según institución y región. Kora no rellena sueldos cuando no hay dato oficial.
                </p>
              </div>

              <div v-if="salaryGrowthPercent > 0" class="bg-gradient-to-br from-emerald-50 to-cyan-50 rounded-3xl p-6 border border-emerald-100">
                <div class="flex items-start gap-3">
                  <span class="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 16l5-5 4 4 7-7" />
                      <path stroke-linecap="round" stroke-linejoin="round" d="M14 8h6v6" />
                    </svg>
                  </span>
                  <div>
                    <h4 class="font-bold text-slate-900 mb-1">Potencial de crecimiento</h4>
                    <p class="text-sm text-slate-600">Desde junior hasta senior, el sueldo puede crecer hasta <span class="font-bold text-emerald-700">{{ salaryGrowthPercent }}%</span>. Una de las carreras con mejor trayectoria salarial en Chile.</p>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="w-16 h-16 mx-auto mb-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 6V5a3 3 0 013-3h0a3 3 0 013 3v1m-9 0h12a2 2 0 012 2v9a2 2 0 01-2 2H6a2 2 0 01-2-2V8a2 2 0 012-2z" />
                </svg>
              </span>
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
                <div class="w-12 h-12 mb-4 rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 flex items-center justify-center">
                  <svg class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25278C10.8324 5.47675 9.43015 5 8 5C5.79086 5 4 6.79086 4 9V17C4 14.7909 5.79086 13 8 13C9.43015 13 10.8324 13.4768 12 14.2528M12 6.25278C13.1676 5.47675 14.5699 5 16 5C18.2091 5 20 6.79086 20 9V17C20 14.7909 18.2091 13 16 13C14.5699 13 13.1676 13.4768 12 14.2528M12 6.25278V14.2528" />
                  </svg>
                </div>
                <h3 class="font-bold text-slate-900 text-base leading-snug">{{ book.title }}</h3>
                <p class="text-sm text-primary-600 font-medium mt-1">{{ book.author }}</p>
                <p class="text-sm text-slate-600 mt-3 leading-relaxed flex-1">{{ book.description }}</p>
              </div>
            </div>
            <div v-else class="bg-white rounded-3xl p-8 border border-slate-100 shadow-card text-center text-slate-500">
              <span class="w-16 h-16 mx-auto mb-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 6.25278C10.8324 5.47675 9.43015 5 8 5C5.79086 5 4 6.79086 4 9V17C4 14.7909 5.79086 13 8 13C9.43015 13 10.8324 13.4768 12 14.2528M12 6.25278C13.1676 5.47675 14.5699 5 16 5C18.2091 5 20 6.79086 20 9V17C20 14.7909 18.2091 13 16 13C14.5699 13 13.1676 13.4768 12 14.2528M12 6.25278V14.2528" />
                </svg>
              </span>
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
                    <div class="px-5 pt-3 pb-2 rounded-2xl bg-gradient-to-br from-primary-100 to-accent-100 border border-primary-200 cursor-default hover:scale-105 transition-transform duration-200 text-center">
                      <span class="font-bold text-primary-700 text-lg block">{{ type }}</span>
                      <span v-if="store.mbtiDescriptions[type]" class="text-primary-600 text-[11px] font-medium leading-tight block mt-0.5">
                        {{ store.mbtiDescriptions[type].label }}
                      </span>
                    </div>
                    <div v-if="store.mbtiDescriptions[type]" class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-900 text-white text-xs rounded-xl p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10 text-center leading-snug">
                      {{ store.mbtiDescriptions[type].description }}
                    </div>
                  </div>
                </div>
                <div v-else class="text-slate-500 text-sm">No se encontraron tipos de personalidad específicos para esta carrera.</div>
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
              <!-- Cabecera -->
              <p class="text-sm font-semibold text-slate-700 tracking-wide uppercase">
                Programas acreditados en Chile
                <span class="text-xs font-normal normal-case text-slate-400 ml-1">según datos oficiales Mineduc</span>
              </p>
              <!-- Filtros -->
              <div v-if="availableRegions.length > 1 || availableTipos.length > 1" class="flex flex-wrap gap-3">
                <!-- Filtro región -->
                <div v-if="availableRegions.length > 1" class="flex items-center gap-1.5 flex-1 min-w-[180px]">
                  <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                  <select
                    v-model="selectedRegion"
                    class="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition cursor-pointer"
                    aria-label="Filtrar por región">
                    <option value="">Todas las regiones</option>
                    <option v-for="r in availableRegions" :key="r" :value="r">{{ r }}</option>
                  </select>
                </div>
                <!-- Filtro tipo institución -->
                <div v-if="availableTipos.length > 1" class="flex items-center gap-1.5 flex-1 min-w-[180px]">
                  <svg class="w-4 h-4 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 21h18M9 8h1m-1 4h1m4-4h1m-1 4h1M3 3h18M3 8h18M3 3v18"/>
                  </svg>
                  <select
                    v-model="selectedTipoInstitucion"
                    class="w-full text-sm rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent transition cursor-pointer"
                    aria-label="Filtrar por tipo de institución">
                    <option value="">Todos los tipos</option>
                    <option v-for="tipo in availableTipos" :key="tipo" :value="tipo">{{ tipo }}</option>
                  </select>
                </div>
              </div>
              <div v-if="filteredDbPrograms.length === 0" class="text-center py-8 text-slate-500 text-sm">
                No hay programas con los filtros seleccionados.
                <button @click="selectedRegion = ''; selectedTipoInstitucion = ''" class="text-primary-600 underline">Ver todos</button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div
                  v-for="(prog, i) in filteredDbPrograms"
                  :key="i"
                  class="bg-white rounded-2xl p-5 border border-slate-100 shadow-card hover:shadow-card-hover transition-all duration-300 flex items-start gap-4">
                  <div class="w-11 h-11 rounded-xl shrink-0 overflow-hidden flex items-center justify-center bg-slate-50">
                    <InstitutionLogo
                      v-if="prog.institution_code && logoCache.get(prog.institution_code)"
                      :logo-url="logoCache.get(prog.institution_code) ?? null"
                      :institution-name="prog.nombre_institucion"
                      class="w-11 h-11 object-contain rounded-xl"
                    />
                    <div v-else class="w-11 h-11 rounded-xl flex items-center justify-center"
                      :class="{
                        'bg-blue-50 text-blue-600': prog.tipo_institucion === 'Universidades',
                        'bg-emerald-50 text-emerald-600': prog.tipo_institucion === 'Institutos Profesionales',
                        'bg-amber-50 text-amber-600': prog.tipo_institucion?.includes('Formaci'),
                        'bg-violet-50 text-violet-600': true,
                      }">
                      <GraduationCap v-if="prog.tipo_institucion === 'Universidades'" class="w-5 h-5" />
                      <School v-else-if="prog.tipo_institucion?.includes('Formaci')" class="w-5 h-5" />
                      <BookOpen v-else class="w-5 h-5" />
                    </div>
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
                    <GraduationCap v-if="uni.type === 'Universidad'" class="w-5 h-5" />
                    <School v-else-if="uni.type === 'CFT'" class="w-5 h-5" />
                    <BookOpen v-else class="w-5 h-5" />
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
              <span class="flex justify-center mb-3"><GraduationCap class="w-8 h-8 text-slate-500" /></span>
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
              <span class="w-16 h-16 mx-auto mb-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5h6M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 11h6M9 15h4" />
                </svg>
              </span>
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
                    <div class="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border border-sky-100 text-sky-700"
                      style="background: linear-gradient(135deg, #eff6ff, #ecfeff)">
                      <svg class="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" d="M5 20a7 7 0 0114 0" />
                      </svg>
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
              <span class="w-16 h-16 mx-auto mb-3 rounded-2xl border border-slate-200 bg-slate-50 text-slate-600 flex items-center justify-center">
                <svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 3l2.755 5.583 6.16.895-4.457 4.344 1.052 6.134L12 17.063 6.49 19.956l1.052-6.134L3.085 9.478l6.16-.895L12 3z" />
                </svg>
              </span>
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
              <span v-if="isSaved" class="inline-flex items-center gap-2"><Check class="w-4 h-4" />Guardado</span>
              <span v-else class="inline-flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Guardar carrera
              </span>
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>

  
  </div>
</template>

<script setup lang="ts">
import { BookOpen, Check, GraduationCap, Lightbulb, School, TriangleAlert, Code2, TrendingUp, HeartPulse, Wrench, Scale, Palette, FlaskConical, Building2, Leaf, Users, Cpu, Truck, Megaphone, ChefHat, Shield, Plane } from 'lucide-vue-next'
import { useCareerStore } from '~/stores/career'
import { useProgramDetailStore } from '~/stores/programDetail'
import { useInstitutionLogos } from '~/composables/useInstitutionLogos'

const route = useRoute()
const router = useRouter()
const store = useCareerStore()
const programDetailStore = useProgramDetailStore()
const supabase = useSupabaseClient()
const { prefetch: prefetchLogos, logoCache } = useInstitutionLogos()

const activeTab = ref('sueldo')
const expandedPhase = ref<number | null>(null)
const isChatOpen = ref(false)
const onKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') isChatOpen.value = false }

const TABS = [
  { key: 'sueldo', label: 'Sueldo' },
  { key: 'personalidad', label: 'Personalidad' },
  { key: 'universidades', label: 'Dónde estudiar' },
  { key: 'malla', label: 'Malla Curricular' },
]

const career = computed(() => store.selectedCareer)
const backLink = computed(() => `/results/${route.params.sessionId}`)

function careerIconKind(careerData: any) {
  const haystack = `${careerData?.title || ''} ${careerData?.tagline || ''} ${careerData?.description || ''} ${(careerData?.skills || []).join(' ')}`.toLowerCase()

  if (/(derecho|ley|legal|jurídic|abogad|notari|justicia)/.test(haystack)) return 'law'
  if (/(arquitectura|urbanismo|diseño urbano|construcción|inmobiliar)/.test(haystack)) return 'architecture'
  if (/(salud|médic|clínic|enfermer|terapia|psicolog|nutri|kinesi|farmac|odontolog|veterinar|fonoaud|obstetr)/.test(haystack)) return 'health'
  if (/(software|datos|informática|program|digital|ia |inteligencia artificial|machine learning|web|desarrollo|ciberseguridad)/.test(haystack)) return 'tech'
  if (/(electrónica|eléctric|telecomunicacion|electromecán|automatizac|robótic|mecatrónic)/.test(haystack)) return 'electronics'
  if (/(ingeniería|mecánic|industrial|civil|minas|metalurgi|petróleo|estructur|procesos)/.test(haystack)) return 'engineering'
  if (/(comercial|negocio|finanza|marketing|ventas|gestión|administración|econom|mercado|audit|contabil|analista)/.test(haystack)) return 'business'
  if (/(pedagog|educación|docencia|aprendizaje|párvulo|básica|media|especial)/.test(haystack)) return 'education'
  if (/(diseño|arte|música|teatro|cine|fotografía|animación|moda|creatividad)/.test(haystack)) return 'arts'
  if (/(química|biología|física|laboratorio|ciencias|biotecnolog|genética|ambiental|geología)/.test(haystack)) return 'science'
  if (/(agronomía|agro|forestal|silvicultura|pesca|veterinar|medioambiente|sustentabilidad)/.test(haystack)) return 'agro'
  if (/(trabajo social|sociología|antropología|geografía|historia|filosofía|relaciones internacionales|ciencia política)/.test(haystack)) return 'social'
  if (/(logística|transporte|cadena de suministro|comercio exterior|aduana)/.test(haystack)) return 'logistics'
  if (/(comunicación|periodismo|publicidad|relaciones públicas|medios)/.test(haystack)) return 'communication'
  if (/(gastronomía|chef|cocina|hotelería|turismo|enología)/.test(haystack)) return 'gastronomy'
  if (/(seguridad|detective|policía|bombero|defensa|militar)/.test(haystack)) return 'security'
  if (/(aviación|aeronáutica|piloto|aerolínea)/.test(haystack)) return 'aviation'
  return 'general'
}

function careerIconTone(careerData: any) {
  const kind = careerIconKind(careerData)
  if (kind === 'business') return 'border-amber-200 bg-amber-50 text-amber-700'
  if (kind === 'tech') return 'border-sky-200 bg-sky-50 text-sky-700'
  if (kind === 'health') return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  if (kind === 'education') return 'border-violet-200 bg-violet-50 text-violet-700'
  if (kind === 'engineering') return 'border-orange-200 bg-orange-50 text-orange-700'
  if (kind === 'law') return 'border-blue-200 bg-blue-50 text-blue-700'
  if (kind === 'arts') return 'border-pink-200 bg-pink-50 text-pink-700'
  if (kind === 'science') return 'border-teal-200 bg-teal-50 text-teal-700'
  if (kind === 'architecture') return 'border-stone-200 bg-stone-50 text-stone-700'
  if (kind === 'agro') return 'border-lime-200 bg-lime-50 text-lime-700'
  if (kind === 'social') return 'border-indigo-200 bg-indigo-50 text-indigo-700'
  if (kind === 'electronics') return 'border-cyan-200 bg-cyan-50 text-cyan-700'
  if (kind === 'logistics') return 'border-yellow-200 bg-yellow-50 text-yellow-700'
  if (kind === 'communication') return 'border-rose-200 bg-rose-50 text-rose-700'
  if (kind === 'gastronomy') return 'border-red-200 bg-red-50 text-red-700'
  if (kind === 'security') return 'border-gray-200 bg-gray-50 text-gray-700'
  if (kind === 'aviation') return 'border-blue-200 bg-blue-50 text-blue-600'
  return 'border-slate-200 bg-slate-50 text-slate-700'
}

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
  { key: 'junior' as const, icon: 'junior', label: '1° año post-titulación', description: 'Ingreso promedio bruto mensual al primer año', color: 'bg-emerald-400' },
  { key: 'mid' as const, icon: 'mid', label: '3°/4° año post-titulación', description: 'Ingreso promedio bruto mensual intermedio', color: 'bg-blue-500' },
  { key: 'senior' as const, icon: 'senior', label: '5° año post-titulación', description: 'Ingreso promedio bruto mensual al quinto año, si está disponible', color: 'bg-gradient-to-r from-primary-600 to-accent-500' },
]

const officialSalaryRange = computed(() => dbSalary.value?.salary_range ?? (
  career.value?.salary_source === 'sies' ? career.value.salary_range : null
))

const officialSalaryMeta = computed(() => {
  const salary = dbSalary.value
  if (salary?.matched_career) return `${salary.salary_label}. Match: ${salary.matched_career}.`
  if (career.value?.matched_career) return `${career.value.salary_label}. Match: ${career.value.matched_career}.`
  return 'Ingresos oficiales SIES/MiFuturo por año post-titulación.'
})

const activeSalary = computed<{ junior: number | null; mid: number | null; senior: number | null }>(() => {
  const s = officialSalaryRange.value
  return { junior: s?.junior ?? null, mid: s?.mid ?? null, senior: s?.senior ?? null }
})

function formatCLP(value?: number | null) {
  if (!value) return 'Sin dato'
  return `$${value.toLocaleString('es-CL')} CLP`
}

function salaryBarWidth(value?: number | null) {
  if (!value) return 0
  const max = activeSalary.value.senior || activeSalary.value.mid || activeSalary.value.junior
  return max ? Math.round((value / max) * 100) : 0
}

const salaryGrowthPercent = computed(() => {
  const s = activeSalary.value
  if (!s.junior || !s.senior) return 0
  return Math.round(((s.senior - s.junior) / s.junior) * 100)
})

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
interface DbSalary {
  salary_range: { junior: number | null; mid: number | null; senior: number | null; currency: string }
  salary_label: string
  matched_career: string
}
const dbSalary = ref<DbSalary | null>(null)

async function fetchDbSalary(title: string) {
  const careerId = career.value?.id
  if (!careerId) return

  // Verificar cache en store antes de hacer la petición
  const cached = store.getCachedSalary(careerId) as DbSalary | undefined
  if (cached) {
    dbSalary.value = cached
    return
  }

  try {
    const res = await $fetch<{ salary: DbSalary | null }>('/api/careers/official-salary', {
      query: { q: title, career_generic_id: career.value?.career_generic_id || undefined },
    })
    if (res.salary) {
      dbSalary.value = res.salary
      store.setCachedSalary(careerId, res.salary)
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
  nombre_sede?: string | null
  comuna?: string | null
  arancel_anual?: number
  matricula_anual?: number | null
  arancel_referencia_becas?: number | null
  arancel_referencia_creditos?: number | null
  brecha_arancel_becas?: number | null
  brecha_arancel_creditos?: number | null
  duracion_formal_semestres?: number
  jornada?: string | null
  modalidad?: string | null
  nivel_carrera?: string | null
  vacantes_semestre_1?: number | null
  vacantes_semestre_2?: number | null
  puntaje_promedio_matriculados?: number | null
  anio_puntajes?: number | null
  institution_code?: number | null
  career_generic_id?: string | null
  area_carrera_generica?: string | null
  stats?: any
  institution_data?: any
}
const dbPrograms = ref<DbProgram[]>([])
const dbProgramsLoading = ref(false)
const selectedRegion = ref<string>('')
const selectedTipoInstitucion = ref<string>('')

const availableRegions = computed(() => {
  const regions = [...new Set(dbPrograms.value.map(p => p.region).filter(Boolean))]
  return regions.sort((a, b) => a.localeCompare(b, 'es'))
})

const availableTipos = computed(() => {
  const tipos = [...new Set(dbPrograms.value.map(p => p.tipo_institucion).filter(Boolean))]
  return tipos.sort((a, b) => a.localeCompare(b, 'es'))
})

const filteredDbPrograms = computed(() => {
  return dbPrograms.value
    .filter(p => !selectedRegion.value || p.region === selectedRegion.value)
    .filter(p => !selectedTipoInstitucion.value || p.tipo_institucion === selectedTipoInstitucion.value)
})

async function authHeaders() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

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
      const compareProgram = {
        ...prog,
        program_unique_code: code,
        nombre_carrera: prog.nombre_carrera,
        nombre_institucion: prog.nombre_institucion,
        nombre_sede: prog.nombre_sede ?? prog.sede ?? null,
        comuna: prog.comuna ?? null,
        duracion_formal_semestres: prog.duracion_formal_semestres,
        arancel_anual: prog.arancel_anual,
        matricula_anual: prog.matricula_anual ?? null,
        arancel_referencia_becas: prog.arancel_referencia_becas ?? null,
        arancel_referencia_creditos: prog.arancel_referencia_creditos ?? null,
        brecha_arancel_becas: prog.brecha_arancel_becas ?? null,
        brecha_arancel_creditos: prog.brecha_arancel_creditos ?? null,
        tipo_institucion: prog.tipo_institucion,
        region: prog.region,
        source: 'results',
        saved_from: 'career-results',
      }
      safe.push(compareProgram)
      programDetailStore.set(code, compareProgram)
      if (prog.institution_data) programDetailStore.setInstitution(code, prog.institution_data)
      localStorage.setItem(COMPARE_PROGRAMS_KEY, JSON.stringify(safe))
      compareProgramCodes.value = safe.map((x: any) => String(x.program_unique_code))
      void useIntentTracker().track({
        event_name: 'compare_added',
        source: 'results',
        program_unique_code: prog.program_unique_code,
        institution_code: prog.institution_code,
        career_generic_id: prog.career_generic_id,
        metadata: {
          nombre_carrera: prog.nombre_carrera,
          nombre_institucion: prog.nombre_institucion,
          sede: prog.sede,
          region: prog.region,
        },
      })
    }
    await navigateTo('/compare?tab=programas')
  } catch { /* noop */ }
}

async function fetchDbPrograms(title: string) {
  const careerId = career.value?.id
  if (!careerId) return

  // Verificar cache en store antes de hacer la petición
  const cached = store.getCachedPrograms(careerId) as DbProgram[] | undefined
  if (cached) {
    dbPrograms.value = cached
    selectedRegion.value = ''
    selectedTipoInstitucion.value = ''
    const codes = cached.map(p => p.institution_code).filter(Boolean) as number[]
    if (codes.length) prefetchLogos(codes)
    return
  }

  dbProgramsLoading.value = true
  try {
    const headers = await authHeaders()
    if (!headers) {
      dbPrograms.value = []
      return
    }
    const res = await $fetch<{ results: DbProgram[] }>('/api/tools/search-career-match', {
      method: 'POST',
      headers,
      body: {
        keywords: [career.value?.matched_career || title],
        career_generic_id: career.value?.career_generic_id || undefined,
        limit: 25,
      },
    })
    dbPrograms.value = res.results ?? []
    // Guardar en cache del store para evitar re-fetch al volver a esta carrera
    store.setCachedPrograms(careerId, dbPrograms.value)
    selectedRegion.value = ''
    selectedTipoInstitucion.value = ''
    // Pre-cargar logos de las instituciones retornadas
    const codes = dbPrograms.value.map(p => p.institution_code).filter(Boolean) as number[]
    if (codes.length) await prefetchLogos(codes)
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
    window.addEventListener('storage', handleCareerStorage)
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

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  if (import.meta.client) {
    window.removeEventListener('storage', handleCareerStorage)
  }
})

function handleCareerStorage(e: StorageEvent) {
  if (e.key === COMPARE_PROGRAMS_KEY) loadCompareProgramCodes()
}
</script>
