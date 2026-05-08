<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />

    <main class="flex-1 flex flex-col">

      <!-- ── Hero ── -->
      <section
        id="inicio"
        ref="heroSectionEl"
        class="relative flex min-h-[calc(100svh-64px)] flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-24 sm:pt-28 pb-24 sm:pb-28 scroll-mt-20 lg:scroll-mt-24">
        <div class="absolute inset-0 -z-10 overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #bfdbfe 0%, #a5f3fc 50%, transparent 70%)"></div>
          <div class="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full opacity-10 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #dbeafe 0%, transparent 70%)"></div>
        </div>

        <div class="w-full max-w-3xl mx-auto text-center space-y-6 animate-fade-up">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
            Descubre tu nuevo futuro
          </span>

          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Todo lo que necesitas para
            <span class="gradient-text"> elegir tu carrera</span>
          </h1>

          <p class="text-base sm:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed">
            Descubre carreras a tu medida, consulta datos oficiales de todas las instituciones del país y conversa con Kora, tu asistente de orientación vocacional.
          </p>

          <div class="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <NuxtLink
              to="/discover"
              class="px-6 py-3 rounded-2xl bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm shadow-lg shadow-primary-200 transition-all hover:-translate-y-0.5">
              Descubrir mi carrera →
            </NuxtLink>
            <NuxtLink
              to="/chat"
              class="px-6 py-3 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm transition-all hover:-translate-y-0.5">
              Hablar con Kora
            </NuxtLink>
          </div>
        </div>
        <div class="absolute inset-x-0 bottom-0 border-t border-slate-800/70 bg-[#0d1728]">
          <div class="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(56,189,248,0.08)_0%,_rgba(15,23,42,0)_72%)]"></div>

          <div class="relative mx-auto max-w-[90rem] px-4 sm:px-6 py-4 sm:py-5">
            <div class="flex items-center gap-4 sm:gap-6">
              <p class="hidden md:block whitespace-nowrap text-[11px] font-semibold text-slate-400">
                Instituciones destacadas
              </p>
              <p class="md:hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                Instituciones
              </p>

              <div class="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
                <div class="kora-marquee-track">
                  <div
                    v-for="(institution, index) in carouselLoopItems"
                    :key="`${institution.institution_code}-${index}`"
                    class="kora-marquee-item"
                    :title="institution.nombre_institucion">
                    <img
                      v-if="institution.logo_url"
                      :src="institution.logo_url"
                      :alt="institution.nombre_institucion"
                      class="kora-marquee-logo"
                      loading="lazy"
                      decoding="async">
                    <span class="kora-marquee-label">{{ shortInstitutionName(institution.nombre_institucion) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="relative border-y border-slate-200/80 bg-gradient-to-b from-white to-slate-50/50">
        <div class="max-w-[90rem] mx-auto px-4 sm:px-6 py-0 lg:grid lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10 xl:gap-14">
          <aside class="lg:sticky lg:top-20 lg:self-start lg:pt-6">
            <div class="lg:border-l lg:border-slate-200 lg:pl-6">
              <div class="hidden lg:block mb-6">
                <div class="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Recorrido</div>
                <p class="mt-2 text-sm font-semibold text-slate-900">Explora cómo funciona KoraChile</p>
              </div>

              <div class="flex flex-wrap justify-center gap-2 pb-1 lg:flex-col lg:gap-4 lg:overflow-visible lg:pb-0">
                <button
                  v-for="tab in landingTabs"
                  :key="tab.id"
                  type="button"
                  @click="scrollToLandingSection(tab.id)"
                  class="group inline-flex items-center gap-3 whitespace-nowrap rounded-2xl border px-4 py-3 text-sm font-semibold transition-all lg:w-full lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:text-left lg:text-[1.05rem] lg:font-medium lg:shadow-none"
                  :class="activeLandingTab === tab.id
                    ? 'border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-300 lg:bg-transparent lg:text-slate-950 lg:font-bold'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 lg:bg-transparent lg:text-slate-400 lg:hover:text-slate-700'">
                  <span
                    class="h-2.5 w-2.5 flex-shrink-0 rounded-full transition-opacity duration-200 lg:h-2.5 lg:w-2.5"
                    :class="activeLandingTab === tab.id ? 'opacity-100 bg-white lg:bg-slate-950' : 'opacity-0'" />
                  <span class="text-left leading-tight">{{ tab.label }}</span>
                </button>
              </div>
            </div>
          </aside>

          <div>
            <!-- ── Feature sections ── -->
            <section id="orientacion-vocacional" class="scroll-mt-20 lg:scroll-mt-24">
              <FeatureDiscover />
            </section>
            <section id="asistente-ia" class="scroll-mt-20 lg:scroll-mt-24">
              <FeatureKora />
            </section>
            <section id="datos-oficiales" class="scroll-mt-20 lg:scroll-mt-24">
              <FeatureRanking />
            </section>
          </div>
        </div>
      </section>
 




    </main>

    <footer class="bg-white border-t border-slate-100 mt-0">
      <div class="max-w-[90rem] mx-auto px-4 sm:px-6 py-12 sm:py-14">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-10">
          <!-- Brand -->
          <div class="md:col-span-2 space-y-4">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 shrink-0">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                  <defs>
                    <linearGradient id="fLogoGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#1A73E8"/>
                      <stop offset="100%" stop-color="#0891b2"/>
                    </linearGradient>
                  </defs>
                  <circle cx="16" cy="16" r="15" fill="url(#fLogoGrad)"/>
                  <polygon points="16,4 18.2,16 16,14.5" fill="white"/>
                  <polygon points="16,28 13.8,16 16,17.5" fill="white" fill-opacity="0.3"/>
                  <circle cx="16" cy="16" r="1.8" fill="white"/>
                </svg>
              </div>
              <span class="font-bold text-slate-900 text-lg tracking-tight">KoraChile</span>
            </div>
            <p class="text-sm text-slate-500 leading-relaxed max-w-sm">
              Orientación vocacional para Chile con datos oficiales de Mineduc/SIES e inteligencia artificial.
              Gratis, privado y sin publicidad.
            </p>
            <div class="flex items-center gap-2 text-xs text-slate-500">
              <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 font-medium">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Datos SIES 2025-2026
              </span>
            </div>
          </div>

          <!-- Producto -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Producto</h4>
            <ul class="space-y-2 text-sm">
              <li><NuxtLink to="/discover" class="text-slate-600 hover:text-primary-600 transition-colors">Descubrir carrera</NuxtLink></li>
              <li><NuxtLink to="/explore" class="text-slate-600 hover:text-primary-600 transition-colors">Explorar</NuxtLink></li>
              <li><NuxtLink to="/compare" class="text-slate-600 hover:text-primary-600 transition-colors">Comparar</NuxtLink></li>
              <li><NuxtLink to="/chat" class="text-slate-600 hover:text-primary-600 transition-colors">Chat con Kora</NuxtLink></li>
            </ul>
          </div>

          <!-- Recursos -->
          <div class="space-y-3">
            <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500">Recursos</h4>
            <ul class="space-y-2 text-sm">
              <li><a href="https://www.mifuturo.cl" target="_blank" rel="noopener" class="text-slate-600 hover:text-primary-600 transition-colors">MiFuturo.cl</a></li>
              <li><a href="https://www.mineduc.cl" target="_blank" rel="noopener" class="text-slate-600 hover:text-primary-600 transition-colors">Mineduc</a></li>
              <li><a href="https://acceso.mineduc.cl" target="_blank" rel="noopener" class="text-slate-600 hover:text-primary-600 transition-colors">Acceso a la educación</a></li>
              <li><NuxtLink to="/#how-it-works" class="text-slate-600 hover:text-primary-600 transition-colors">Cómo funciona</NuxtLink></li>
            </ul>
          </div>
        </div>

        <div class="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>© {{ new Date().getFullYear() }} KoraChile · Hecho en Chile 🇨🇱</span>
          <span>Fuente de datos: Mineduc / SIES · Uso responsable — la IA puede equivocarse.</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
useHead({
  title: 'KoraChile — Tu plataforma de orientación vocacional',
  meta: [
    { name: 'description', content: 'Descubre tu carrera ideal, consulta datos oficiales de instituciones chilenas y conversa con Kora, tu asistente de orientación vocacional impulsado por IA.' }
  ]
})

type CarouselInstitution = {
  institution_code: number
  nombre_institucion: string
  pagina_web: string | null
  logo_url: string | null
}

const fallbackUniversityCarousel: CarouselInstitution[] = [
  { institution_code: 39, nombre_institucion: 'Pontificia Universidad Católica de Chile', pagina_web: null, logo_url: null },
  { institution_code: 2, nombre_institucion: 'Universidad de Chile', pagina_web: null, logo_url: null },
  { institution_code: 12, nombre_institucion: 'Universidad de Santiago de Chile', pagina_web: null, logo_url: null },
  { institution_code: 72, nombre_institucion: 'Universidad Técnica Federico Santa María', pagina_web: null, logo_url: null },
  { institution_code: 54, nombre_institucion: 'Universidad de Concepción', pagina_web: null, logo_url: null },
  { institution_code: 110, nombre_institucion: 'Duoc UC', pagina_web: null, logo_url: null },
  { institution_code: 111, nombre_institucion: 'INACAP', pagina_web: null, logo_url: null },
  { institution_code: 26, nombre_institucion: 'Universidad Diego Portales', pagina_web: null, logo_url: null },
]

const featuredInstitutionsStore = useFeaturedInstitutionsStore()
await featuredInstitutionsStore.fetch()

const carouselItems = computed(() => {
  return featuredInstitutionsStore.items.length
    ? featuredInstitutionsStore.items
    : fallbackUniversityCarousel
})

const carouselLoopItems = computed(() => {
  return [...carouselItems.value, ...carouselItems.value]
})

function shortInstitutionName(name: string) {
  return name
    .replace(/^Pontificia\s+/i, '')
    .replace(/^Universidad\s+/i, 'U. ')
    .replace(/^Instituto Profesional\s+/i, 'IP ')
    .replace(/^Centro de Formación Técnica\s+/i, 'CFT ')
}

const landingTabs = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'orientacion-vocacional', label: 'Orientación vocacional' },
  { id: 'asistente-ia', label: 'Asistente Personal' },
  { id: 'datos-oficiales', label: 'Datos oficiales' },
]

const activeLandingTab = ref(landingTabs[0].id)
const heroSectionEl = ref<HTMLElement | null>(null)
let scrollRAF: number | null = null
let sectionElements: HTMLElement[] = []
let pendingScrollTargetId: string | null = null
let pendingScrollTop: number | null = null
let pendingScrollExpiresAt = 0
let touchStartY: number | null = null
let landingSnapLockedUntil = 0

function getLandingStickyOffset() {
  return window.innerWidth >= 1024 ? 88 : 80
}

function getSectionScrollTop(section: HTMLElement) {
  return Math.max(0, window.scrollY + section.getBoundingClientRect().top - getLandingStickyOffset())
}

function getActiveLandingIndex() {
  return landingTabs.findIndex(tab => tab.id === activeLandingTab.value)
}

function isWithinLandingSnapRange(direction: 1 | -1) {
  if (!sectionElements.length) return false
  if (pendingScrollTargetId) return false
  if (Date.now() < landingSnapLockedUntil) return false

  const stickyOffset = getLandingStickyOffset()
  const firstTop = getSectionScrollTop(sectionElements[0])
  const lastTop = getSectionScrollTop(sectionElements[sectionElements.length - 1])

  if (direction < 0 && window.scrollY <= firstTop + 8) return false
  if (direction > 0 && window.scrollY >= lastTop + window.innerHeight * 0.35) return false

  return window.scrollY >= firstTop - 8 && window.scrollY <= lastTop + window.innerHeight * 0.45 + stickyOffset
}

function snapLandingByDirection(direction: 1 | -1) {
  if (!isWithinLandingSnapRange(direction)) return false

  const currentIndex = getActiveLandingIndex()
  if (currentIndex === -1) return false

  const targetIndex = currentIndex + direction
  if (targetIndex < 0 || targetIndex >= sectionElements.length) return false

  const targetSection = sectionElements[targetIndex]
  if (!targetSection) return false

  landingSnapLockedUntil = Date.now() + 950
  scrollToLandingSection(targetSection.id)
  return true
}

function collectLandingSections() {
  sectionElements = landingTabs
    .map(tab => document.getElementById(tab.id))
    .filter((section): section is HTMLElement => Boolean(section))
}

function updateActiveSection() {
  if (!sectionElements.length) return

  const stickyOffset = getLandingStickyOffset()
  const anchorY = window.scrollY + stickyOffset + 20
  let activeId = sectionElements[0].id

  for (const section of sectionElements) {
    const sectionTop = section.getBoundingClientRect().top + window.scrollY
    if (sectionTop <= anchorY) {
      activeId = section.id
    } else {
      break
    }
  }

  activeLandingTab.value = activeId
}

function syncActiveTabDuringScroll() {
  if (pendingScrollTargetId && pendingScrollTop !== null) {
    if (Date.now() >= pendingScrollExpiresAt) {
      pendingScrollTargetId = null
      pendingScrollTop = null
      pendingScrollExpiresAt = 0
      updateActiveSection()
      return
    }

    const distance = Math.abs(window.scrollY - pendingScrollTop)
    activeLandingTab.value = pendingScrollTargetId

    if (distance <= 6) {
      pendingScrollTargetId = null
      pendingScrollTop = null
      pendingScrollExpiresAt = 0
      updateActiveSection()
    }

    return
  }

  updateActiveSection()
}

function onScroll() {
  if (scrollRAF !== null) return
  scrollRAF = requestAnimationFrame(() => {
    scrollRAF = null
    syncActiveTabDuringScroll()
  })
}

function onWheel(event: WheelEvent) {
  if (Math.abs(event.deltaY) <= 14) return
  const direction = event.deltaY > 0 ? 1 : -1
  if (!snapLandingByDirection(direction)) return
  event.preventDefault()
}

function onKeydown(event: KeyboardEvent) {
  let direction: 1 | -1 | null = null

  if (event.key === 'ArrowDown' || event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) {
    direction = 1
  } else if (event.key === 'ArrowUp' || event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) {
    direction = -1
  }

  if (!direction) return
  if (!snapLandingByDirection(direction)) return
  event.preventDefault()
}

function onTouchStart(event: TouchEvent) {
  touchStartY = event.touches[0]?.clientY ?? null
}

function onTouchEnd(event: TouchEvent) {
  if (touchStartY === null) return
  const endY = event.changedTouches[0]?.clientY ?? touchStartY
  const deltaY = touchStartY - endY
  touchStartY = null
  if (Math.abs(deltaY) <= 24) return
  snapLandingByDirection(deltaY > 0 ? 1 : -1)
}

function scrollToLandingSection(sectionId: string) {
  const section = document.getElementById(sectionId)
  if (!section) return

  activeLandingTab.value = sectionId

  const stickyOffset = getLandingStickyOffset()
  const top = window.scrollY + section.getBoundingClientRect().top - stickyOffset
  const safeTop = Math.max(0, top)

  pendingScrollTargetId = sectionId
  pendingScrollTop = safeTop
  pendingScrollExpiresAt = Date.now() + 1400
  landingSnapLockedUntil = Date.now() + 900

  window.scrollTo({
    top: safeTop,
    behavior: 'smooth',
  })
}

function onResize() {
  collectLandingSections()
  syncActiveTabDuringScroll()
}

onMounted(() => {
  collectLandingSections()
  updateActiveSection()
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onResize)
  window.addEventListener('wheel', onWheel, { passive: false })
  window.addEventListener('keydown', onKeydown)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchend', onTouchEnd, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('wheel', onWheel)
  window.removeEventListener('keydown', onKeydown)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchend', onTouchEnd)
  if (scrollRAF !== null) cancelAnimationFrame(scrollRAF)
})

const testimonials = [
  {
    stars: 5,
    text: 'No sabía qué estudiar después del colegio. KoraChile me mostró que el diseño UX era perfecto para mí. Hoy trabajo en una startup y amo lo que hago.',
    name: 'Valentina R.',
    role: 'Diseñadora UX, 22 años · Santiago',
    initials: 'VR',
    avatarColor: 'linear-gradient(135deg, #a78bfa, #818cf8)',
  },
  {
    stars: 5,
    text: 'Me dio un roadmap concreto con cursos en Chile. En 9 meses hice mi portafolio y conseguí mi primer trabajo como desarrollador frontend.',
    name: 'Matías C.',
    role: 'Dev Frontend, 25 años · Concepción',
    initials: 'MC',
    avatarColor: 'linear-gradient(135deg, #34d399, #059669)',
  },
  {
    stars: 5,
    text: 'Tengo 37 años y quería cambiarme de rubro. KoraChile me orientó hacia análisis de datos y los sueldos que mostró eran reales. Ya llevo 6 meses estudiando.',
    name: 'Patricia M.',
    role: 'Reconversión laboral · Viña del Mar',
    initials: 'PM',
    avatarColor: 'linear-gradient(135deg, #fb923c, #f43f5e)',
  },
  {
    stars: 5,
    text: 'Lo que más me gustó fue el test de personalidad MBTI integrado. Me ayudó a confirmar que soy INTJ y que la ingeniería de datos va perfecto con mi forma de pensar.',
    name: 'Diego A.',
    role: 'Estudiante Ingeniería · La Serena',
    initials: 'DA',
    avatarColor: 'linear-gradient(135deg, #38bdf8, #1A73E8)',
  },
  {
    stars: 5,
    text: 'Totalmente gratis y mucho mejor que pagar una orientadora vocacional. Las recomendaciones de libros también fueron muy buenas.',
    name: 'Camila F.',
    role: 'Recién egresada · Temuco',
    initials: 'CF',
    avatarColor: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  },
  {
    stars: 4,
    text: 'Me recomendó ser técnico en electricidad industrial, algo que nunca había considerado. Los sueldos que mostró me sorprendieron gratamente. Muy buena herramienta.',
    name: 'Luis H.',
    role: 'Técnico DUOC · Antofagasta',
    initials: 'LH',
    avatarColor: 'linear-gradient(135deg, #64748b, #334155)',
  },
]
</script>