<template>
  <div class="h-screen chat-starfield overflow-hidden">
    <AppHeader />

    <!-- ── Sidebar fijo: en desktop arranca desde el tope; en mobile, debajo del AppHeader ── -->
    <div class="fixed top-16 sm:top-0 left-0 bottom-0 z-[60] flex">
      <!-- Panel deslizable -->
      <aside
        class="sidebar-panel overflow-hidden flex flex-col sidebar-glass"
        :class="showSidebar ? 'w-72 border-r border-slate-200/70' : 'w-0'">
        <div class="w-72 flex flex-col h-full">
          <div class="flex items-center gap-2 px-4 h-16 border-b border-slate-200/70 shrink-0">
            <svg class="w-4 h-4 text-primary-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z"/></svg>
            <h2 class="font-bold text-slate-800 text-sm flex-1">Conversaciones</h2>
            <!-- Eliminar todo -->
            <button
              v-if="sessions.length > 0"
              @click="deleteAllConfirm = true"
              title="Eliminar todas las conversaciones"
              aria-label="Eliminar todas las conversaciones"
              class="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </button>
            <!-- Botón colapsar -->
            <button
              @click="showSidebar = false"
              title="Colapsar"
              aria-label="Cerrar panel de conversaciones"
              class="p-1.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100/60 transition-colors">
              <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
          </div>
          <!-- Nueva conversación -->
          <button
            @click="startNewChat()"
            class="mx-3 mt-3 mb-1 px-3 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 border border-primary-500/20 text-white text-xs font-semibold transition flex items-center gap-2 shrink-0">
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            Nueva conversación
          </button>
          <!-- Lista de sesiones -->
          <div class="flex-1 overflow-y-auto px-2 py-2 space-y-1">
            <div v-if="sessionsLoading" class="px-2 py-3 space-y-1.5 animate-pulse">
              <div v-for="i in 5" :key="i" class="flex items-center gap-2 px-3 py-2.5 rounded-xl">
                <div class="flex-1 space-y-1.5">
                  <div class="h-3 bg-slate-200/70 rounded-full" :style="`width: ${55 + (i * 7) % 35}%`"></div>
                  <div class="h-2.5 bg-slate-100/80 rounded-full w-1/2"></div>
                </div>
              </div>
            </div>
            <div v-else-if="!visibleSessions.length" class="text-xs text-slate-500 text-center py-8 px-4 leading-relaxed">
              Sin conversaciones guardadas todavía.
            </div>
            <template v-else v-for="group in sessionGroups" :key="group.label">
              <button
                @click="toggleGroup(group.label)"
                class="w-full flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-100/70 transition-colors group/hdr">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-slate-500 group-hover/hdr:text-slate-600">{{ group.label }}</span>
                <svg
                  class="w-3 h-3 text-slate-300 group-hover/hdr:text-slate-500 transition-transform duration-200"
                  :class="collapsedGroups.has(group.label) ? '' : 'rotate-180'"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
              <TransitionGroup
                v-show="!collapsedGroups.has(group.label)"
                name="group-item"
                tag="div"
                class="space-y-0.5">
                <div
                  v-for="s in group.sessions"
                  :key="s.session_id"
                  class="group relative flex items-start rounded-xl transition-all duration-150 border"
                  :class="s.session_id === activeSessionId
                    ? 'bg-primary-100/80 border-primary-300/60'
                    : 'hover:bg-slate-100/60 border-transparent'">
                  <button
                    @click="switchSession(s.session_id)"
                    class="flex-1 min-w-0 text-left px-3 py-2.5">
                    <div
                      class="text-[14px] leading-relaxed line-clamp-2"
                      :class="s.session_id === activeSessionId ? 'text-primary-700 font-semibold' : 'text-slate-600'">
                      {{ s.preview }}
                    </div>
                  </button>
                  <div
                    v-if="s.session_id !== activeSessionId"
                    class="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col gap-0.5 p-1 mt-0.5 mr-0.5">
                    <button
                      @click.stop="confirmDeleteSession(s.session_id)"
                      title="Eliminar conversación permanentemente"
                      class="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </div>
                </div>
              </TransitionGroup>
            </template>
          </div>
        </div><!-- fin w-64 -->
      </aside>

      <!-- Tab minimal cuando sidebar está cerrado (solo desktop; en mobile usamos botón en el header del chat) -->
      <Transition name="fade-icon">
        <div v-if="!showSidebar" class="hidden sm:flex fixed top-0 left-0 h-16 z-[61] items-center pl-1">
          <button
            @click="showSidebar = true"
            title="Abrir historial"
            class="flex items-center justify-center w-8 h-8 rounded-r-xl bg-white/80 backdrop-blur-sm border border-l-0 border-slate-200/80 shadow-sm text-primary-500 hover:bg-white transition-colors">
            <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7"/>
            </svg>
          </button>
        </div>
      </Transition>
    </div><!-- fin sidebar fijo -->

    <!-- Modal confirmar eliminar TODAS las conversaciones -->
    <Transition name="msg">
      <div v-if="deleteAllConfirm" class="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="delete-all-title" ref="deleteAllModalEl">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="deleteAllConfirm = false"></div>
        <div class="relative rounded-2xl p-5 max-w-xs w-full space-y-4 modal-glass">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-full bg-red-400/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
            </div>
            <div>
              <p id="delete-all-title" class="font-semibold text-slate-800 text-sm">¿Eliminar todas las conversaciones?</p>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Se eliminarán permanentemente <strong class="text-slate-700">todas</strong> tus conversaciones. Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button
              @click="deleteAllConfirm = false"
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              @click="deleteAllSessions()"
              :disabled="deletingAll"
              class="flex-1 px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <svg v-if="deletingAll" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              {{ deletingAll ? 'Eliminando...' : 'Sí, eliminar todo' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Modal de confirmación de borrado -->
    <Transition name="msg">
      <div v-if="deleteConfirmId" class="fixed inset-0 z-[70] flex items-center justify-center px-4" role="dialog" aria-modal="true" aria-labelledby="delete-one-title" ref="deleteOneModalEl">
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="deleteConfirmId = null"></div>
        <div class="relative rounded-2xl p-5 max-w-xs w-full space-y-4 modal-glass">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-full bg-red-400/10 flex items-center justify-center shrink-0">
              <svg class="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
            </div>
            <div>
              <p id="delete-one-title" class="font-semibold text-slate-800 text-sm">¿Eliminar esta conversación?</p>
              <p class="text-xs text-slate-500 mt-1 leading-relaxed">Esta acción es permanente. Todos los mensajes serán eliminados y no se pueden recuperar.</p>
            </div>
          </div>
          <div class="flex gap-2 pt-1">
            <button
              @click="deleteConfirmId = null"
              class="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition">
              Cancelar
            </button>
            <button
              @click="deleteSession(deleteConfirmId!)"
              :disabled="deletingSession"
              class="flex-1 px-3 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 disabled:opacity-60 text-white text-xs font-semibold transition flex items-center justify-center gap-1.5">
              <svg v-if="deletingSession" class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              {{ deletingSession ? 'Eliminando...' : 'Sí, eliminar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Backdrop móvil cuando sidebar está abierto -->
    <Transition name="fade-icon">
      <div
        v-if="showSidebar"
        class="fixed inset-0 z-[59] bg-black/40 backdrop-blur-sm sm:hidden"
        @click="showSidebar = false"
      />
    </Transition>

    <!-- ── Contenido principal (offset dinámico por sidebar solo en desktop) ── -->
    <main
      class="absolute top-16 right-0 bottom-0 overflow-hidden px-3 sm:px-4 pb-4 sm:pb-6 pt-4 sm:pt-6"
      :style="{ left: isMobile ? '0px' : (showSidebar ? 288 : 0) + 'px' }">
      <div class="mx-auto w-full h-full max-w-4xl">
        <section class="relative h-full flex flex-col overflow-hidden rounded-3xl chat-glass-card">

          <!-- Header -->
          <div class="border-b border-slate-200/70 bg-white/50 backdrop-blur-sm flex items-center justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
            <div class="text-left min-w-0">
              <h1 class="text-lg sm:text-xl md:text-2xl font-bold leading-tight truncate">
                <span style="background: linear-gradient(135deg, #1A73E8, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">Habla con Kora</span>
              </h1>
              <p class="text-xs sm:text-sm text-slate-500 leading-snug hidden sm:block">Acá te ayudo a descubrir tu carrera ideal o saber sobre instituciones</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <!-- Botón historial (solo mobile, abre sidebar) -->
              <button
                @click="showSidebar = true"
                title="Ver conversaciones"
                aria-label="Ver conversaciones"
                class="sm:hidden w-9 h-9 rounded-full text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center justify-center">
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M4 6h16M4 12h16M4 18h7"/></svg>
              </button>
              <button
                @click="startNewChat"
                title="Nueva conversación"
                aria-label="Nueva conversación"
                class="px-3 py-1.5 rounded-full text-xs sm:text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition flex items-center gap-1.5">
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                <span class="hidden sm:inline">Nueva conversación</span>
              </button>
            </div>
          </div>

          <!-- Messages -->
          <div
            ref="messagesEl"
            @scroll="handleMessagesScroll"
            class="relative flex-1 overflow-y-auto space-y-4 px-4 sm:px-6 pt-4 pb-4"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-label="Conversación con Kora">
            <!-- Flash overlay al nueva conversación -->
            <Transition name="chat-flash">
              <div v-if="chatResetting" class="absolute inset-0 z-10 bg-white/80 pointer-events-none"></div>
            </Transition>

        <!-- Mensaje de bienvenida -->
        <Transition name="welcome-enter">
          <div v-if="messages.length === 0 && !chatResetting && !historyLoading" class="flex gap-3">
            <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-2 ring-slate-200/80">
              <MascotIcon />
            </div>
            <div class="bg-white/75 backdrop-blur-sm border border-slate-200/70 shadow-sm rounded-2xl rounded-tl-sm max-w-[85%] space-y-3 px-4 py-3">
              <p class="text-slate-700 text-sm leading-relaxed">
                <template v-if="careersContext">
                  ¡Hola{{ userFirstName ? `, ${userFirstName}` : '' }}! Vi que exploraste carreras relacionadas con <strong>{{ careersContext.query }}</strong>. 👋<br><br>
                  Te sugería <strong>{{ careersContext.careers.map(c => c.title).join(', ') }}</strong>. ¿Quieres profundizar en alguna, comparar opciones, o preguntar algo específico?
                </template>
                <template v-else>
                  ¡Hola{{ userFirstName ? `, ${userFirstName}` : '' }}! Soy KoraChile, tu orientador vocacional. 👋<br><br>
                  Cuéntame: ¿qué materias o actividades te gustan más? ¿Tienes alguna carrera en mente o estás comenzando desde cero?
                </template>
              </p>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="chip in QUICK_CHIPS"
                  :key="chip"
                  :disabled="loading"
                  @click="sendChip(chip)"
                  class="px-3 py-1.5 rounded-full text-xs font-medium bg-white/70 text-slate-600 border border-slate-200 hover:bg-white hover:text-slate-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed smooth-hover">
                  {{ chip }}
                </button>
              </div>
            </div>
          </div>
        </Transition>

        <!-- Skeleton loader mientras carga el historial -->
          <div v-if="historyLoading && messages.length === 0" class="space-y-4 pt-2">
          <!-- Burbuja asistente skeleton -->
          <div class="flex gap-3">
            <div class="w-9 h-9 rounded-full bg-slate-200/60 animate-pulse shrink-0"></div>
            <div class="space-y-2 flex-1 max-w-[75%]">
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-3/4"></div>
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-full"></div>
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-5/6"></div>
            </div>
          </div>
          <!-- Burbuja usuario skeleton -->
          <div class="flex gap-3 flex-row-reverse">
            <div class="w-9 h-9 rounded-full bg-slate-200/60 animate-pulse shrink-0"></div>
            <div class="space-y-2 flex-1 max-w-[55%]">
              <div class="h-3 bg-primary-200/50 animate-pulse rounded-full w-full"></div>
              <div class="h-3 bg-primary-200/50 animate-pulse rounded-full w-4/5"></div>
            </div>
          </div>
          <!-- Burbuja asistente skeleton 2 -->
          <div class="flex gap-3">
            <div class="w-9 h-9 rounded-full bg-slate-200/60 animate-pulse shrink-0"></div>
            <div class="space-y-2 flex-1 max-w-[80%]">
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-full"></div>
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-2/3"></div>
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-4/5"></div>
              <div class="h-3 bg-slate-200/60 animate-pulse rounded-full w-1/2"></div>
            </div>
          </div>
        </div>

        <TransitionGroup name="msg" tag="div" class="space-y-4">
          <div v-for="(msg, i) in messages" :key="msg.id || `${msg.role}-${i}-${msg.created_at || ''}`" class="flex gap-3 items-start" :class="msg.role === 'user' ? 'flex-row-reverse' : ''">
            <div class="flex-shrink-0">
              <UserAvatar
                v-if="msg.role === 'user'"
                :avatar="userAvatar"
                :name="userName"
                :size="compactMode ? 'xs' : 'sm'" />
              <div v-else :class="compactMode ? 'w-8 h-8 rounded-full overflow-hidden shadow-sm ring-2 ring-slate-200/80' : 'w-9 h-9 rounded-full overflow-hidden shadow-sm ring-2 ring-slate-200/80'">
                <MascotIcon />
              </div>
            </div>
            <div :class="[
              'rounded-2xl max-w-[85%] leading-relaxed',
              compactMode ? 'px-3 py-2.5 text-[13px]' : 'px-4 py-3 text-sm',
              msg.role === 'user'
                ? 'bg-primary-600 backdrop-blur-sm border border-primary-500/30 text-white rounded-tr-sm'
                : 'bg-white/75 backdrop-blur-sm border border-slate-200/70 text-slate-800 rounded-tl-sm shadow-sm'
            ]">
              <div
                v-if="msg.role === 'assistant'"
                class="prose prose-sm prose-slate max-w-none chat-markdown"
                v-html="displayContent(msg)"
              ></div>
              <span v-if="msg.role === 'assistant' && msg.id === typingMsgId" class="inline-block w-1.5 h-4 align-[-2px] bg-primary-400 ml-0.5 animate-pulse rounded-sm"></span>
              <div v-else-if="msg.role === 'user'" class="whitespace-pre-wrap">{{ msg.content }}</div>

              <div v-if="shouldShowProgramCards(i, msg)" class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div
                  v-for="card in latestProgramCards.slice(0, 4)"
                  :key="card.code"
                  class="rounded-xl border border-slate-200/80 bg-white/65 backdrop-blur-sm p-3 space-y-2 hover:border-primary-300 hover:bg-white/90 hover:shadow-sm transition-all duration-200">
                  <div class="flex items-start justify-between gap-2">
                    <div class="font-semibold text-slate-800 text-xs sm:text-sm leading-tight line-clamp-2">{{ card.title }}</div>
                    <span v-if="card.type" class="shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-primary-100 text-primary-700 border border-primary-200">{{ shortType(card.type) }}</span>
                  </div>
                  <div class="text-xs text-slate-500 flex items-center gap-1.5">
                    <span class="line-clamp-1">🏛 {{ card.institution }}</span>
                    <span v-if="card.region" class="text-slate-300">·</span>
                    <span v-if="card.region" class="shrink-0 text-slate-500">{{ card.region }}</span>
                  </div>
                  <div class="flex flex-wrap gap-1.5 text-[11px]">
                    <span v-if="card.semesters" class="px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-600 border border-slate-200">🗓 {{ card.semesters }} sem</span>
                    <span v-if="card.cost" class="px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-600 border border-slate-200">💸 {{ formatClp(card.cost) }}</span>
                    <span v-if="card.jornada" class="px-2 py-0.5 rounded-full bg-slate-100/80 text-slate-600 border border-slate-200">⏰ {{ card.jornada }}</span>
                    <span v-if="card.vacantes" class="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">✅ {{ card.vacantes }} vacantes</span>
                    <span v-if="card.titulados" class="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">🎓 {{ card.titulados }} titulados/año</span>
                  </div>
                  <div class="flex gap-1.5 pt-0.5">
                    <button
                      @click="addProgramToCompare(card)"
                      :disabled="isProgramQueued(card.code)"
                      class="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all duration-200"
                      :class="isProgramQueued(card.code)
                        ? 'border-primary-300 bg-primary-100 text-primary-700 cursor-default'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'">
                      {{ isProgramQueued(card.code) ? '✓ En comparador' : '+ Comparar' }}
                    </button>
                    <button
                      @click="viewProgramDetails(card)"
                      title="Ver información completa"
                      class="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200">
                      Ver más
                    </button>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </TransitionGroup>

        <!-- Typing indicator -->
        <div v-if="loading" class="flex gap-3 msg-enter">
          <div class="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 shadow-sm ring-2 ring-slate-200/80">
            <MascotIcon />
          </div>
          <div class="bg-white/75 backdrop-blur-sm border border-slate-200/70 shadow-sm rounded-2xl rounded-tl-sm px-4 py-3">
            <div class="flex items-center gap-2">
              <div class="flex gap-1 items-center">
                <span class="typing-dot"></span>
                <span class="typing-dot" style="animation-delay: 150ms"></span>
                <span class="typing-dot" style="animation-delay: 300ms"></span>
              </div>
              <span class="text-xs text-slate-500 italic">Generando…</span>
            </div>
          </div>
        </div>
          </div>

          <!-- Floating scroll-to-bottom -->
          <Transition name="msg">
            <button
              v-if="!isNearBottom"
              @click="() => { scrollToBottom(); hasNewBelow = false }"
              class="absolute right-6 bottom-[92px] z-10 px-3 py-1.5 rounded-full bg-primary-600/90 backdrop-blur-sm hover:bg-primary-600 border border-primary-500/20 text-white text-xs font-semibold shadow-lg flex items-center gap-1.5">
              <span v-if="hasNewBelow" class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
              Ir al final ↓
            </button>
          </Transition>

          <!-- Error -->
          <div v-if="error" class="mx-4 sm:mx-6 mb-3 px-4 py-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {{ error }}
          </div>

          <!-- Input -->
          <div :class="[
            'pt-1 border-t border-slate-200/60 bg-white/50 backdrop-blur-sm',
            compactMode ? 'px-3 sm:px-4 pb-3' : 'px-4 sm:px-6 pb-4'
          ]">
            <div class="bg-white/80 border border-slate-200 rounded-2xl flex items-end gap-2 p-2 focus-within:border-primary-400/70 transition-colors shadow-sm">
              <textarea
                v-model="input"
                ref="inputEl"
                placeholder="Escribe tu mensaje..."
                rows="1"
                class="flex-1 resize-none px-3 py-2 text-sm text-slate-800 placeholder:text-slate-500 focus:outline-none bg-transparent max-h-32 overflow-y-auto"
                @keydown.enter.exact.prevent="send()"
                @input="autoResize"
              />
              <button
                @click="send()"
                :disabled="loading || !input.trim()"
                class="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors border border-primary-500/20">
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>
            <p class="text-xs text-slate-500/70 text-center mt-2">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </section>
      </div>

      <!-- ══════════ Modal: Login requerido ══════════ -->
      <Transition name="msg">
        <div
          v-if="showLoginGate"
          class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-gate-title"
          ref="loginGateEl"
          @click.self="showLoginGate = false">
          <div class="modal-glass w-full max-w-md rounded-3xl p-6 sm:p-8 text-center">
            <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary-100 flex items-center justify-center">
              <svg class="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 11c0-1.104-.896-2-2-2s-2 .896-2 2v2h4v-2zm6 0V7a6 6 0 10-12 0v4M5 11h14v10H5V11z"/>
              </svg>
            </div>
            <h3 id="login-gate-title" class="text-xl font-bold text-slate-800 mb-2">Inicia sesión para continuar</h3>
            <p class="text-sm text-slate-600 mb-6 leading-relaxed">
              Para chatear con Kora y guardar tus conversaciones necesitas una cuenta.
              Es gratis y te toma menos de un minuto.
            </p>
            <div class="flex flex-col sm:flex-row gap-2">
              <button
                @click="goToLogin('register')"
                class="flex-1 px-4 py-3 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold transition-colors">
                Crear cuenta
              </button>
              <button
                @click="goToLogin('login')"
                class="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">
                Ya tengo cuenta
              </button>
            </div>
            <button
              @click="showLoginGate = false"
              class="mt-3 text-xs text-slate-500 hover:text-slate-600">
              Más tarde
            </button>
          </div>
        </div>
      </Transition>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
import { marked } from 'marked'
import { useAuthStore } from '~/stores/auth'

// Configura marked para generar HTML seguro (sin script tags)
marked.setOptions({ breaks: true, gfm: true })

function renderMarkdown(text: string): string {
  if (!text) return ''
  // marked.parse devuelve string en modo síncrono con estas opciones
  return marked.parse(text) as string
}

useHead({ title: 'Chat — KoraChile' })

interface Message {
  id?: string
  role: 'user' | 'assistant'
  content: string
  created_at?: string
}

interface ChatSession {
  session_id: string
  preview: string
  created_at: string
}

interface ProgramCard {
  code: string
  title: string
  institution: string
  semesters: number | null
  cost: number | null
  type: string | null
  region: string | null
  jornada: string | null
  nivel: string | null
  vacantes: number | null
  titulados: number | null
}

const store = useCareerStore()
const authStore = useAuthStore()
const supabase = useSupabaseClient()
const router = useRouter()
const messages = ref<Message[]>([])
const input = ref('')
const loading = ref(false)
const error = ref<string | null>(null)
const messagesEl = ref<HTMLElement | null>(null)
const inputEl = ref<HTMLTextAreaElement | null>(null)
const historyLoading = ref(false)
const compactMode = false
const latestProgramCards = ref<ProgramCard[]>([])
const activeSessionId = ref<string>('')
const isMobile = ref(false)
// Inicializa cerrado para evitar flash en SSR/mobile.
// Se abre tras mount solo en desktop.
const showSidebar = ref(false)

// Refs DOM para modales (a11y trap-focus)
const deleteAllModalEl = ref<HTMLElement | null>(null)
const deleteOneModalEl = ref<HTMLElement | null>(null)
const loginGateEl = ref<HTMLElement | null>(null)

onMounted(() => {
  const checkMobile = () => { isMobile.value = window.innerWidth < 640 }
  checkMobile()
  showSidebar.value = !isMobile.value
  window.addEventListener('resize', checkMobile)
  // Cierra modales y sidebar (mobile) con Esc
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return
    if (deleteAllConfirm.value) { deleteAllConfirm.value = false; return }
    if (deleteConfirmId.value) { deleteConfirmId.value = null; return }
    if (showLoginGate.value) { showLoginGate.value = false; return }
    if (isMobile.value && showSidebar.value) showSidebar.value = false
  }
  document.addEventListener('keydown', handleEscape)
  onUnmounted(() => {
    window.removeEventListener('resize', checkMobile)
    document.removeEventListener('keydown', handleEscape)
  })
})
const sessions = ref<ChatSession[]>([])
const sessionsLoading = ref(false)
const chatResetting = ref(false)
const currentAbortController = ref<AbortController | null>(null)
const showLoginGate = ref(false)

function goToLogin(mode: 'login' | 'register' = 'login') {
  const pending = input.value.trim()
  if (typeof window !== 'undefined' && pending) {
    try { sessionStorage.setItem('KoraChile:chat:pendingMessage', pending) } catch {}
  }
  router.push({ path: '/login', query: { redirect: '/chat', mode } })
}

// Solo muestra las últimas 30 sesiones
const visibleSessions = computed(() => sessions.value.slice(0, 30))

// Grupos colapsables por fecha
const collapsedGroups = ref<Set<string>>(new Set())

function toggleGroup(label: string) {
  if (collapsedGroups.value.has(label)) collapsedGroups.value.delete(label)
  else collapsedGroups.value.add(label)
}

interface SessionGroup {
  label: string
  sessions: ChatSession[]
}

const sessionGroups = computed((): SessionGroup[] => {
  const now = new Date()
  const groups: Record<string, ChatSession[]> = {
    'Hoy': [],
    'Ayer': [],
    'Esta semana': [],
    'Anteriores': [],
  }
  for (const s of visibleSessions.value) {
    const diff = Math.floor((now.getTime() - new Date(s.created_at).getTime()) / 86_400_000)
    if (diff === 0) groups['Hoy'].push(s)
    else if (diff === 1) groups['Ayer'].push(s)
    else if (diff < 7) groups['Esta semana'].push(s)
    else groups['Anteriores'].push(s)
  }
  return Object.entries(groups)
    .filter(([, list]) => list.length > 0)
    .map(([label, sessions]) => ({ label, sessions }))
})

// Borrado permanente
const deleteConfirmId = ref<string | null>(null)
const deletingSession = ref(false)
const deleteAllConfirm = ref(false)
const deletingAll = ref(false)

// A11y: trap-focus en modales (registrado tras tener todos los refs)
useFocusTrap(deleteAllModalEl, deleteAllConfirm)
useFocusTrap(deleteOneModalEl, computed(() => !!deleteConfirmId.value))
useFocusTrap(loginGateEl, showLoginGate)

function confirmDeleteSession(sessionId: string) {
  deleteConfirmId.value = sessionId
}

async function deleteSession(sessionId: string) {
  deletingSession.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await $fetch('/api/chat/session', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      body: { sessionId },
    })
    // Quitar de la lista local sin recargar
    sessions.value = sessions.value.filter(s => s.session_id !== sessionId)
    // Si era la sesión activa, empezar nueva
    if (activeSessionId.value === sessionId) {
      startNewChat()
    }
  } catch (e: any) {
    console.warn('[chat] deleteSession failed:', e?.message)
  } finally {
    deletingSession.value = false
    deleteConfirmId.value = null
  }
}

async function deleteAllSessions() {
  deletingAll.value = true
  try {
    const { data: { session } } = await supabase.auth.getSession()
    await $fetch('/api/chat/sessions', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    })
    sessions.value = []
    startNewChat()
  } catch (e: any) {
    console.warn('[chat] deleteAllSessions failed:', e?.message)
  } finally {
    deletingAll.value = false
    deleteAllConfirm.value = false
  }
}
const compareProgramCodes = ref<string[]>([])
const COMPARE_PROGRAMS_KEY = 'KoraChile:compare:programs'
const PROGRAM_CARDS_SESSION_PREFIX = 'KoraChile:chat:program-cards:'

// --- typing animation (palabra por palabra, estilo Gemini) ---
const typingMsgId = ref<string | null>(null)
const typingWords = ref(0)  // cuántas palabras se muestran
let typingTimer: any = null

function startTypingAnimation(id: string, fullText: string) {
  if (typingTimer) clearInterval(typingTimer)
  // Dividir en tokens: palabras + espacios/saltos preservados
  const tokens = fullText.split(/(\s+)/)
  typingMsgId.value = id
  typingWords.value = 0
  // Velocidad: ~35ms/token para textos cortos, más rápido para textos largos
  const delay = tokens.length > 200 ? 18 : tokens.length > 80 ? 25 : 35
  typingTimer = setInterval(() => {
    typingWords.value = Math.min(typingWords.value + 1, tokens.length)
    if (isNearBottom.value) scrollToBottom()
    if (typingWords.value >= tokens.length) {
      clearInterval(typingTimer)
      typingTimer = null
      typingMsgId.value = null
    }
  }, delay)
}

// Cache de markdown renderizado para evitar re-parsear en cada tick del typingTimer
const renderedCache = new Map<string, string>()

function displayContent(msg: Message): string {
  if (msg.role !== 'assistant') return renderMarkdown(msg.content)
  if (msg.id !== typingMsgId.value) {
    // Mensaje ya finalizado: cachear para no re-parsear en cada re-render
    const key = msg.id || msg.content
    if (!renderedCache.has(key)) renderedCache.set(key, renderMarkdown(msg.content))
    return renderedCache.get(key)!
  }
  // Solo el mensaje en typing se re-parsea en cada tick
  const tokens = msg.content.split(/(\s+)/)
  const partial = tokens.slice(0, typingWords.value).join('')
  return renderMarkdown(partial)
}

// --- smart scroll ---
const isNearBottom = ref(true)
const hasNewBelow = ref(false)
function handleMessagesScroll() {
  const el = messagesEl.value
  if (!el) return
  const distance = el.scrollHeight - el.scrollTop - el.clientHeight
  isNearBottom.value = distance < 120
  if (isNearBottom.value) hasNewBelow.value = false
}

const CHIP_POOL = [
  '¿Qué carreras hay en salud?',
  '¿Cuánto gana un ingeniero en Chile?',
  'Recomiéndame carreras con alta empleabilidad',
  '¿Qué opciones hay en deporte y actividad física?',
  '¿Cuáles son las carreras mejor pagadas?',
  '¿Qué universidades tienen gratuidad?',
  '¿Qué estudiar si me gustan las matemáticas?',
  'Carreras con foco en sustentabilidad',
  '¿Qué puntaje PAES necesito para Ingeniería Comercial?',
  'Carreras cortas (CFT/IP) con buena salida laboral',
  'Diferencias entre Psicología y Trabajo Social',
  '¿Dónde estudiar Medicina Veterinaria en regiones?',
  'Carreras del área tecnológica con menor duración',
  '¿Qué hace un ingeniero civil industrial?',
  'Carreras relacionadas con el arte y la creatividad',
  'Profesiones con trabajo remoto en Chile',
  'Opciones en educación con alta empleabilidad',
  '¿Cómo elijo entre Derecho y Ciencia Política?',
]

const QUICK_CHIPS = ref<string[]>([])

function refreshChips() {
  const shuffled = [...CHIP_POOL].sort(() => Math.random() - 0.5)
  QUICK_CHIPS.value = shuffled.slice(0, 4)
}
refreshChips()

// Detecta el tema de la conversación para construir el prompt de comparación contextual
function buildComparePrompt(): string {  // Busca el último mensaje del usuario para extraer el tema
  const lastUser = [...messages.value].reverse().find(m => m.role === 'user')
  const lastAssistant = [...messages.value].reverse().find(m => m.role === 'assistant')
  // Si hay program cards, usamos su título directamente
  if (latestProgramCards.value.length > 0) {
    const career = latestProgramCards.value[0].title
    return `Compárame ${career} con otra carrera similar: explica diferencias en empleabilidad, ingresos, duración y perfil de estudiante ideal.`
  }
  // Intenta extraer una carrera mencionada en el último mensaje del asistente
  const assistantText = lastAssistant?.content || ''
  // Busca patrones como "Ingeniería Civil", "Medicina", "Psicología", etc.
  const careerMatch = assistantText.match(/\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){0,4})\b/)
  if (careerMatch) {
    return `Sobre ${careerMatch[1]}: compárala con una carrera similar y explica las diferencias clave en empleabilidad, ingresos y salida laboral.`
  }
  // Fallback con el tema del último mensaje del usuario
  const topic = lastUser?.content?.slice(0, 80) || 'esta carrera'
  return `En base a lo que discutimos sobre "${topic}", compara con una opción alternativa similar y explica pros/contras de cada una.`
}

const MAX_CONTEXT_MESSAGES = 14

const userAvatar = computed(() => authStore.profile?.avatar_url || null)
const userName = computed(() => authStore.profile?.name || authStore.profile?.email || 'Tú')
const userFirstName = computed(() => authStore.profile?.name?.split(' ')[0] || '')

// Contexto de carreras descubiertas para la IA
const careersContext = computed(() => {
  if (!store.result?.variations?.length) return null
  return {
    query: store.result.query,
    careers: store.result.variations.map(v => ({
      title: v.title,
      description: v.description,
      skills: v.skills,
      salary_range: v.salary_range,
      pros: v.pros,
      cons: v.cons,
      match_score: v.match_score,
      job_demand: v.job_demand,
    }))
  }
})

async function send(customText?: string | Event) {
  const resolved = typeof customText === 'string' ? customText : input.value
  const text = String(resolved ?? '').trim()
  if (!text || loading.value) return

  // Login gate: si no está autenticado, muestra modal y NO envía al servidor.
  if (!authStore.isAuthenticated) {
    showLoginGate.value = true
    return
  }

  error.value = null
  const userMsg: Message = { id: makeId(), role: 'user', content: text }
  messages.value.push(userMsg)
  if (!customText) input.value = ''
  await nextTick()
  autoResize()
  scrollToBottom()

  await persistMessages([userMsg])

  loading.value = true
  try {
    const contextMessages = messages.value.slice(-MAX_CONTEXT_MESSAGES).map(m => ({
      role: m.role,
      content: m.content,
    }))

    currentAbortController.value = new AbortController()
    const { data: sessionData } = await supabase.auth.getSession()
    const accessToken = sessionData.session?.access_token
    if (!accessToken) {
      showLoginGate.value = true
      messages.value.pop()
      loading.value = false
      return
    }
    const data = await $fetch<{ reply: string; programCards?: ProgramCard[] }>('/api/chat', {
      method: 'POST',
      signal: currentAbortController.value.signal,
      headers: { Authorization: `Bearer ${accessToken}` },
      body: {
        messages: contextMessages,
        careersContext: careersContext.value,
      },
    })

    const aiMsg: Message = { id: makeId(), role: 'assistant', content: data.reply }
    messages.value.push(aiMsg)
    latestProgramCards.value = Array.isArray(data.programCards) ? data.programCards : []
    persistLatestProgramCards()
    await persistMessages([aiMsg])
    await nextTick()
    if (isNearBottom.value) scrollToBottom()
    else hasNewBelow.value = true
    startTypingAnimation(aiMsg.id!, aiMsg.content)
    focusInput()
  } catch (e: any) {
    if ((e as any)?.name === 'AbortError' || (e as any)?.cause?.name === 'AbortError') return
    error.value = e?.data?.message || 'Error al conectar con la IA. Intenta de nuevo.'
    messages.value.pop() // quita el mensaje del usuario si falló
  } finally {
    loading.value = false
    currentAbortController.value = null
    focusInput()
  }
}

async function sendChip(prompt: string) {
  if (loading.value) return
  await send(prompt)
}

async function sendInlineAction(actionId: string) {
  if (loading.value) return
  if (actionId === 'compare') {
    await send(buildComparePrompt())
  }
}

function isLastAssistantMessage(index: number, msg: Message) {
  if (msg.role !== 'assistant') return false
  if (!messages.value.length) return false
  return index === messages.value.length - 1
}

function shouldShowInlineButtons(index: number, msg: Message) {
  if (!isLastAssistantMessage(index, msg)) return false
  if (latestProgramCards.value.length > 0) return false
  const userMsgs = messages.value.filter(m => m.role === 'user').length
  if (userMsgs < 1) return false
  if (msg.content.length < 120) return false
  // Solo mostrar si la respuesta menciona una institución, carrera o comparación concreta
  const content = msg.content.toLowerCase()
  const hasInstitution = /universidad|instituto|cft|puc|uc |usach|udp|ucv|uai|uss|unab|duoc|inacap|santo tomás|andrés bello|los andes/.test(content)
  const hasCareer = /ingeniería|medicina|derecho|psicología|enfermería|administración|contador|pedagogía|arquitectura|diseño|informática|civil|carrera|programa/.test(content)
  const hasComparison = messages.value.some(m => m.role === 'user' && /compara|versus|vs\b|diferencia|mejor|cuál/.test(m.content.toLowerCase()))
  return hasInstitution || hasCareer || hasComparison
}

function shouldShowProgramCards(index: number, msg: Message) {
  // Mostrar cards en el último mensaje del asistente, independiente de los botones inline
  return isLastAssistantMessage(index, msg) && latestProgramCards.value.length > 0
}

function getProgramCardsSessionKey() {
  ensureSessionId()
  if (!activeSessionId.value) return null
  return `${PROGRAM_CARDS_SESSION_PREFIX}${activeSessionId.value}`
}

function persistLatestProgramCards() {
  if (typeof window === 'undefined') return
  const key = getProgramCardsSessionKey()
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(latestProgramCards.value.slice(0, 8)))
  } catch {
    // noop
  }
}

function loadLatestProgramCards() {
  if (typeof window === 'undefined') return
  const key = getProgramCardsSessionKey()
  if (!key) return
  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      latestProgramCards.value = []
      return
    }
    const parsed = JSON.parse(raw)
    latestProgramCards.value = Array.isArray(parsed) ? parsed : []
  } catch {
    latestProgramCards.value = []
  }
}

function clearLatestProgramCards() {
  if (typeof window === 'undefined') return
  const key = getProgramCardsSessionKey()
  if (!key) return
  localStorage.removeItem(key)
}

async function loadHistory() {
  if (!authStore.profile?.id) return
  historyLoading.value = true
  ensureSessionId()
  const { data, error: loadError } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('user_id', authStore.profile.id)
    .eq('session_id', activeSessionId.value)
    .order('created_at', { ascending: true })
    .limit(120)

  if (!loadError && data?.length) {
    messages.value = data.map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      created_at: m.created_at,
    }))
    loadLatestProgramCards()
    await nextTick()
    scrollToBottom()
  }
  historyLoading.value = false
}

async function loadSessions() {
  if (!authStore.profile?.id) return
  sessionsLoading.value = true
  // Trae hasta 600 mensajes de usuario para identificar las últimas 30 sesiones.
  // En la práctica 30 sesiones × ~10 msgs = 300 filas en usuarios activos.
  const { data } = await supabase
    .from('chat_messages')
    .select('session_id, content, created_at')
    .eq('user_id', authStore.profile.id)
    .eq('role', 'user')
    .order('created_at', { ascending: false })
    .limit(600)

  if (data?.length) {
    const map = new Map<string, ChatSession>()
    for (const row of data as any[]) {
      if (!map.has(row.session_id)) {
        map.set(row.session_id, {
          session_id: row.session_id,
          preview: (row.content as string).slice(0, 90),
          created_at: row.created_at,
        })
      }
    }
    // Ordenamos reciente → antiguo (data ya viene desc, map preserve insertion)
    sessions.value = [...map.values()]
  } else {
    sessions.value = []
  }
  sessionsLoading.value = false
}

async function switchSession(sessionId: string) {
  if (sessionId === activeSessionId.value) return
  clearLatestProgramCards()
  activeSessionId.value = sessionId
  if (authStore.profile?.id && typeof window !== 'undefined') {
    localStorage.setItem(`KoraChile:chat:session:${authStore.profile.id}`, sessionId)
  }
  messages.value = []
  latestProgramCards.value = []
  error.value = null
  if (isMobile.value) showSidebar.value = false
  await loadHistory()
}

function formatSessionDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000)
  if (diffDays === 0) return 'Hoy'
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

async function persistMessages(batch: Message[]) {
  if (!authStore.profile?.id || !batch.length) return
  ensureSessionId()
  const payload = batch.map((m) => ({
    user_id: authStore.profile!.id,
    session_id: activeSessionId.value,
    role: m.role,
    content: m.content,
  }))
  await supabase.from('chat_messages').insert(payload as any)
}

async function startNewChat() {
  // Cancela cualquier petición en curso
  if (currentAbortController.value) {
    currentAbortController.value.abort()
    currentAbortController.value = null
    loading.value = false
  }
  // En mobile, cerrar sidebar para ver el chat al instante
  if (isMobile.value) showSidebar.value = false
  // Animación: flash de salida
  chatResetting.value = true
  await nextTick()
  await new Promise(r => setTimeout(r, 180))
  clearLatestProgramCards()
  activeSessionId.value = makeId()
  if (authStore.profile?.id && typeof window !== 'undefined') {
    localStorage.setItem(`KoraChile:chat:session:${authStore.profile.id}`, activeSessionId.value)
  }
  messages.value = []
  latestProgramCards.value = []
  error.value = null
  input.value = ''
  await nextTick()
  chatResetting.value = false
  await nextTick()
  autoResize()
  focusInput()
}

function ensureSessionId() {
  if (!authStore.profile?.id) return
  if (activeSessionId.value) return
  if (typeof window === 'undefined') {
    activeSessionId.value = makeId()
    return
  }
  const key = `KoraChile:chat:session:${authStore.profile.id}`
  const saved = localStorage.getItem(key)
  activeSessionId.value = saved || makeId()
  localStorage.setItem(key, activeSessionId.value)
}

function scrollToBottom() {
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

function autoResize() {
  if (inputEl.value) {
    inputEl.value.style.height = 'auto'
    inputEl.value.style.height = Math.min(inputEl.value.scrollHeight, 128) + 'px'
  }
}

function focusInput() {
  inputEl.value?.focus({ preventScroll: true })
}

function formatClp(n: number) {
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n)
}

function shortType(t: string) {
  if (t.includes('Centros')) return 'CFT'
  if (t.includes('Institutos')) return 'IP'
  if (t.includes('Universidades')) return 'U'
  return t
}

function loadComparePrograms() {
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
  } catch {
    compareProgramCodes.value = []
  }
}

function isProgramQueued(code: string) {
  return compareProgramCodes.value.includes(code)
}

async function viewProgramDetails(card: ProgramCard) {
  // Agrega (si no está) y navega a compare con foco en ese programa
  await addProgramToCompare(card)
}

async function addProgramToCompare(card: ProgramCard) {
  if (typeof window === 'undefined') return
  try {
    const raw = localStorage.getItem(COMPARE_PROGRAMS_KEY)
    const arr = raw ? JSON.parse(raw) : []
    const safe = Array.isArray(arr) ? arr : []

    if (!safe.some((x: any) => (x?.program_unique_code || x?.code) === card.code)) {
      if (safe.length >= 4) safe.shift()
      safe.push({
        program_unique_code: card.code,
        nombre_carrera: card.title,
        nombre_institucion: card.institution,
        duracion_formal_semestres: card.semesters,
        arancel_anual: card.cost,
        tipo_institucion: card.type,
        region: card.region,
      })
      localStorage.setItem(COMPARE_PROGRAMS_KEY, JSON.stringify(safe))
      compareProgramCodes.value = safe.map((x: any) => String(x.program_unique_code))
    }

    await router.push('/compare?tab=programas')
  } catch (e: any) {
    console.warn('[chat] compare programs nav failed:', e?.message)
  }
}

function makeId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

onMounted(async () => {
  await authStore.ensureHydrated()
  applyResponsiveCompact()
  window.addEventListener('resize', applyResponsiveCompact)
  loadComparePrograms()
  refreshChips()
  window.addEventListener('storage', (e) => {
    if (e.key === COMPARE_PROGRAMS_KEY) loadComparePrograms()
  })
  await Promise.all([loadHistory(), loadSessions()])
  await nextTick()
  focusInput()

  // Recuperar mensaje pendiente tras login
  if (authStore.isAuthenticated && typeof window !== 'undefined') {
    try {
      const pending = sessionStorage.getItem('KoraChile:chat:pendingMessage')
      if (pending) {
        sessionStorage.removeItem('KoraChile:chat:pendingMessage')
        input.value = pending
        await nextTick()
        autoResize()
      }
    } catch {}
  }
})

function applyResponsiveCompact() {
  // compactMode eliminado — siempre modo normal
}

onBeforeUnmount(() => {
  if (typingTimer) clearInterval(typingTimer)
  currentAbortController.value?.abort()
  renderedCache.clear()
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', applyResponsiveCompact)
  }
})
</script>

<style scoped>
/* ── Fondo galaxia clara ── */
.chat-starfield {
  background:
    radial-gradient(ellipse at 20% 0%, rgba(219,234,254,0.9) 0%, transparent 50%),
    radial-gradient(ellipse at 80% 10%, rgba(224,231,255,0.7) 0%, transparent 45%),
    radial-gradient(ellipse at 50% 100%, rgba(207,250,254,0.5) 0%, transparent 60%),
    linear-gradient(160deg, #f0f4ff 0%, #f8faff 40%, #eef6ff 70%, #f5f0ff 100%);
  position: relative;
}
.chat-starfield::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(2px 2px at 12% 18%, rgba(59,130,246,0.45) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 88% 12%, rgba(99,102,241,0.35) 0%, transparent 100%),
    radial-gradient(2.5px 2.5px at 45% 55%, rgba(147,197,253,0.5) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 72% 78%, rgba(59,130,246,0.3) 0%, transparent 100%),
    radial-gradient(2px 2px at 28% 88%, rgba(99,102,241,0.25) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 93% 48%, rgba(147,197,253,0.4) 0%, transparent 100%),
    radial-gradient(2px 2px at 8% 65%, rgba(59,130,246,0.35) 0%, transparent 100%),
    radial-gradient(2.5px 2.5px at 58% 8%, rgba(99,102,241,0.4) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 3% 38%, rgba(147,197,253,0.3) 0%, transparent 100%),
    radial-gradient(2px 2px at 78% 32%, rgba(59,130,246,0.25) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 22% 52%, rgba(196,181,253,0.4) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 62% 92%, rgba(147,197,253,0.35) 0%, transparent 100%),
    radial-gradient(2px 2px at 40% 30%, rgba(99,102,241,0.2) 0%, transparent 100%),
    radial-gradient(1.5px 1.5px at 95% 75%, rgba(59,130,246,0.3) 0%, transparent 100%);
  pointer-events: none;
  z-index: 0;
}

/* ── Card glass principal del chat ── */
.chat-glass-card {
  background: rgba(255, 255, 255, 0.68);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow:
    0 0 40px rgba(99, 102, 241, 0.07),
    0 0 0 1px rgba(255, 255, 255, 0.6) inset,
    0 20px 60px rgba(59, 130, 246, 0.06),
    0 4px 24px rgba(0, 0, 0, 0.05);
}
/* Glow azul en la parte superior */
.chat-glass-card::before {
  content: '';
  position: absolute;
  top: -1px;
  left: 50%;
  transform: translateX(-50%);
  width: 60%;
  height: 2px;
  background: linear-gradient(90deg, transparent, rgba(26,115,232,0.55), rgba(6,182,212,0.4), transparent);
  border-radius: 0 0 4px 4px;
  pointer-events: none;
  z-index: 1;
}

/* ── Sidebar glass ── */
.sidebar-glass {
  background: rgba(240, 245, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* ── Modal glass ── */
.modal-glass {
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.10), 0 4px 16px rgba(59, 130, 246, 0.06);
}

/* ── Markdown renderizado en burbujas del asistente (tema glass) ── */
.chat-markdown :deep(p) {
  margin: 0 0 0.5em;
  line-height: 1.6;
}
.chat-markdown :deep(p:last-child) {
  margin-bottom: 0;
}
.chat-markdown :deep(strong) {
  font-weight: 700;
  color: #0f172a;
}
.chat-markdown :deep(em) {
  font-style: italic;
}

/* ── Animación nueva conversación ── */
/* Flash de limpieza */
.chat-flash-enter-active { transition: opacity 0.08s ease; }
.chat-flash-leave-active { transition: opacity 0.25s ease; }
.chat-flash-enter-from  { opacity: 0; }
.chat-flash-leave-to    { opacity: 0; }

/* Entrada del mensaje de bienvenida */
.welcome-enter-enter-active {
  transition: opacity 0.4s cubic-bezier(0.2, 0, 0, 1) 0.05s,
              transform 0.4s cubic-bezier(0.2, 0, 0, 1) 0.05s;
}
.welcome-enter-enter-from {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

/* ── Icono fade en tira toggle ── */
.fade-icon-enter-active { transition: opacity 0.2s ease 0.15s, transform 0.2s ease 0.15s; }
.fade-icon-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.fade-icon-enter-from, .fade-icon-leave-to { opacity: 0; transform: scale(0.6); }

/* ── Sidebar: animación profesional ── */
.sidebar-panel {
  transition: width 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  will-change: width;
}
.sidebar-panel > div {
  opacity: 1;
  transform: translateX(0);
  transition:
    opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1) 0.08s,
    transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}
.sidebar-panel.w-0 > div {
  opacity: 0;
  transform: translateX(-12px);
  transition:
    opacity 0.15s cubic-bezier(0.4, 0, 1, 1),
    transform 0.25s cubic-bezier(0.4, 0, 1, 1);
}

.toggle-strip {
  cursor: pointer;
  transition: background-color 0.3s ease, border-color 0.3s ease;
}
.toggle-strip:focus-visible {
  outline: 2px solid var(--color-primary-400);
  outline-offset: -2px;
}

/* ── Markdown renderizado en burbujas del asistente ── */
.chat-markdown :deep(ul),
.chat-markdown :deep(ol) {
  margin: 0.4em 0 0.6em 1.2em;
  padding: 0;
}
.chat-markdown :deep(li) {
  margin-bottom: 0.25em;
  line-height: 1.5;
}
.chat-markdown :deep(h1),
.chat-markdown :deep(h2),
.chat-markdown :deep(h3) {
  font-weight: 700;
  margin: 0.6em 0 0.3em;
  color: #0f172a;
}
.chat-markdown :deep(h1) { font-size: 1.1em; }
.chat-markdown :deep(h2) { font-size: 1.05em; }
.chat-markdown :deep(h3) { font-size: 1em; }
.chat-markdown :deep(code) {
  background: rgba(59,130,246,0.08);
  border-radius: 4px;
  padding: 0.1em 0.35em;
  font-size: 0.85em;
  font-family: ui-monospace, monospace;
  color: #1d4ed8;
}
.chat-markdown :deep(pre) {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 0.75em 1em;
  overflow-x: auto;
  margin: 0.5em 0;
}
.chat-markdown :deep(pre code) {
  background: none;
  padding: 0;
}
.chat-markdown :deep(blockquote) {
  border-left: 3px solid #93c5fd;
  padding-left: 0.75em;
  margin: 0.5em 0;
  color: #64748b;
}
.chat-markdown :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 0.5em 0;
}
.chat-markdown :deep(a) {
  color: #1A73E8;
  text-decoration: underline;
}

/* ── Grupos colapsables ── */
.group-item-enter-active,
.group-item-leave-active {
  transition: all 0.15s ease;
}
.group-item-enter-from,
.group-item-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ── Puntos de typing ── */
.typing-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(26, 115, 232, 0.65);
  animation: typing-bounce 1.2s ease-in-out infinite;
}
@keyframes typing-bounce {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40%           { transform: scale(1);   opacity: 1; }
}

/* ── Transición de mensajes ── */
.msg-enter-active { transition: opacity 0.25s ease, transform 0.25s ease; }
.msg-enter-from   { opacity: 0; transform: translateY(6px); }
.msg-leave-active { transition: opacity 0.15s ease; }
.msg-leave-to     { opacity: 0; }
</style>

