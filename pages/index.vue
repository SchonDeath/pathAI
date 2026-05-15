<template>
  <div class="min-h-screen flex flex-col" style="font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif; background: #ffffff; color: #1d1d1f;">
    <AppHeader />

    <main class="flex-1 flex flex-col">

      <!-- ── Hero ── -->
      <section
        id="inicio"
        ref="heroSectionEl"
        class="bg-shadow-element-center relative flex min-h-[calc(100svh-64px)] flex-col items-center justify-center overflow-hidden px-4 sm:px-6 pt-20 sm:pt-24 pb-0 scroll-mt-20 lg:scroll-mt-24"
        style="background: #ffffff;">

        <!-- Iridescent glow accent -->
        <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-[340px] pointer-events-none -z-10"
          style="background: linear-gradient(60deg, rgb(8,148,255) 0%, rgb(201,89,221) 40%, rgb(255,46,84) 67%, rgb(255,144,3) 100%); opacity: 0.08; filter: blur(80px); border-radius: 50%;"></div>

        <div class="relative z-[1] w-full max-w-[780px] mx-auto text-center" style="padding-bottom: 3rem;">
          <!-- Label badge -->
          <div class="mb-5">
            <span
              class="blur-reveal inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
              style="animation-delay: 0ms; background: linear-gradient(60deg, rgb(8,148,255) 0%, rgb(201,89,221) 40%, rgb(255,46,84) 67%, rgb(255,144,3) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
            >
              Orientación vocacional · Chile
            </span>
          </div>

          <!-- Headline -->
          <h1
            class="font-semibold tracking-tight leading-[1.07]"
            style="font-size: clamp(2rem, 8vw, 4rem); color: #1d1d1f; letter-spacing: -0.025em; margin-bottom: 1.25rem;">
            <span class="blur-reveal hero-reveal-line" style="animation-delay: 190ms;">
              Todo lo que necesitas
            </span>
            <span
              class="blur-reveal hero-reveal-line"
              style="animation-delay: 380ms; background: linear-gradient(60deg, rgb(8,148,255) 0%, rgb(201,89,221) 40%, rgb(255,46,84) 67%, rgb(255,144,3) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;"
            >
              para elegir tu carrera.
            </span>
          </h1>

          <!-- Subheadline -->
          <p
            class="blur-reveal mx-auto leading-relaxed text-base sm:text-lg"
            style="animation-delay: 570ms; color: #474747; max-width: 520px; margin-bottom: 2rem; font-weight: 400;">
            Descubre carreras a tu medida, consulta datos oficiales de todas las instituciones del país y conversa con Kora, tu asistente de orientación vocacional.
          </p>

          <!-- CTAs -->
          <div class="blur-reveal flex flex-col sm:flex-row gap-3 justify-center" style="animation-delay: 760ms;">
            <NuxtLink
              to="/discover"
              class="inline-flex w-full sm:w-auto items-center justify-center font-semibold transition-opacity hover:opacity-80 active:opacity-60"
              style="background: #0071e3; color: #ffffff; border-radius: 999px; padding: 0.75rem 1.75rem; font-size: 0.95rem;">
              Descubrir mi carrera
            </NuxtLink>
            <NuxtLink
              to="/chat"
              class="inline-flex w-full sm:w-auto items-center justify-center font-semibold transition-opacity hover:opacity-80 active:opacity-60"
              style="background: transparent; color: #0071e3; border-radius: 999px; padding: 0.75rem 1.75rem; font-size: 0.95rem; border: 1.5px solid #0071e3;">
              Hablar con Kora
            </NuxtLink>
          </div>

          <button
            type="button"
            class="blur-reveal group mx-auto mt-5 inline-flex flex-col items-center gap-1.5 rounded-full border border-slate-200 bg-white/90 px-4 py-2 text-[0.8rem] font-semibold tracking-[0.02em] shadow-sm transition-all hover:border-slate-300 hover:text-slate-700 hover:shadow-md"
            style="animation-delay: 930ms; color: #64748b;"
            @click="scrollToLandingSection('orientacion-vocacional')"
          >
            <span>Explorar</span>
            <svg class="h-4 w-4 transition-transform duration-300 group-hover:translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m0 0l-6-6m6 6l6-6" />
            </svg>
          </button>
        </div>

        <!-- Institution carousel strip -->
        <div class="absolute inset-x-0 bottom-0 z-[1]" style="background: #f5f5f7; border-top: 1px solid #e8e8ed;">
          <div class="relative mx-auto max-w-[90rem] px-4 sm:px-6 py-4 sm:py-5">
            <div class="flex items-center gap-4 sm:gap-6">
              <p class="hidden md:block whitespace-nowrap text-[11px] font-semibold" style="color: #86868b;">
                Instituciones destacadas
              </p>
              <p class="md:hidden whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.18em]" style="color: #86868b;">
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
                    <span class="kora-marquee-label" style="color: #474747;">{{ shortInstitutionName(institution.nombre_institucion) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ── Features ── -->
      <section style="background: #ffffff; border-top: 1px solid #e8e8ed;">
        <div class="max-w-[90rem] mx-auto px-4 sm:px-6 py-0 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-10 xl:gap-14">

          <!-- Sidebar nav -->
          <aside class="hidden lg:block lg:sticky lg:top-20 lg:self-start lg:pt-8">
            <div class="lg:pl-2">
              <div class="hidden lg:block mb-7">
                <div class="text-[10px] font-semibold uppercase tracking-[0.22em]" style="color: #86868b;">Recorrido</div>
                <p class="mt-2 text-sm font-semibold" style="color: #1d1d1f;">Explora cómo funciona KoraChile</p>
              </div>

              <div class="flex flex-wrap justify-center gap-2 pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                <button
                  v-for="tab in landingTabs"
                  :key="tab.id"
                  type="button"
                  @click="scrollToLandingSection(tab.id)"
                  class="inline-flex items-center gap-2.5 whitespace-nowrap transition-all lg:w-full lg:text-left"
                  :style="activeLandingTab === tab.id
                    ? 'color: #0071e3; border-radius: 10px; padding: 0.5rem 0.9rem; font-size: 0.85rem; font-weight: 600;'
                    : ' color: #474747; border-radius: 10px; padding: 0.5rem 0.9rem; font-size: 0.85rem; font-weight: 400;'">
                  <span
                    class="flex-shrink-0 rounded-full transition-all duration-200"
                    :style="activeLandingTab === tab.id
                      ? 'width:7px; height:7px; background:#0071e3; opacity:1;'
                      : 'width:7px; height:7px; background:#c7c7cc; opacity:0.5;'" />
                  <span class="leading-tight" style="font-weight: 600;">{{ tab.label }}</span>
                </button>
              </div>
            </div>
          </aside>

          <!-- Feature sections -->
          <div class="space-y-7 py-8 lg:space-y-10 lg:py-10">
            <section id="orientacion-vocacional" class="landing-feature-wrap landing-feature-wrap-soft scroll-mt-20 lg:scroll-mt-24 lg:mr-auto">
              <FeatureDiscover />
            </section>
            <section id="test-vocacional" class="landing-feature-wrap landing-feature-wrap-blue scroll-mt-20 lg:scroll-mt-24 lg:ml-auto">
              <FeatureQuiz />
            </section>
            <section id="asistente-ia" class="landing-feature-wrap landing-feature-wrap-soft scroll-mt-20 lg:scroll-mt-24 lg:mr-auto">
              <FeatureKora />
            </section>
            <section id="datos-oficiales" class="landing-feature-wrap landing-feature-wrap-blue scroll-mt-20 lg:scroll-mt-24 lg:ml-auto">
              <FeatureRanking />
            </section>
          </div>
        </div>
      </section>

    </main>

    <!-- ── Footer ── -->
    <footer style="background: #edf1fb; border-top: 1px solid #d7dfef;">
      <div class="max-w-[78rem] mx-auto px-4 sm:px-6 pt-10 sm:pt-12 pb-6 sm:pb-7">
        <div class="flex flex-col gap-8">
          <div class="flex flex-col gap-6 sm:gap-8 lg:min-h-[12rem] lg:justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-8 h-8 shrink-0">
                <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                  <defs>
                    <linearGradient id="footerKoraGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                      <stop offset="0%" stop-color="#0071e3"/>
                      <stop offset="100%" stop-color="#c959dd"/>
                    </linearGradient>
                  </defs>
                  <circle cx="16" cy="16" r="15" fill="url(#footerKoraGrad)"/>
                  <polygon points="16,4 18.2,16 16,14.5" fill="white"/>
                  <polygon points="16,28 13.8,16 16,17.5" fill="white" fill-opacity="0.3"/>
                  <circle cx="16" cy="16" r="1.8" fill="white"/>
                </svg>
              </div>
              <span class="font-semibold text-[1.65rem] tracking-tight" style="color: #111827; line-height: 1;">KoraChile</span>
            </div>

            <div class="space-y-4">
              <span class="inline-flex items-center gap-2 text-sm font-medium" style="background: rgba(255, 255, 255, 0.72); border: 1px solid #d8deee; border-radius: 0.9rem; padding: 0.6rem 0.95rem; color: #334155;">
                <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                Datos oficiales operativos
              </span>

              <p class="text-sm leading-7 max-w-md" style="color: #64748b;">
                Orientación vocacional para Chile con datos Mineduc / SIES, herramientas de exploración y políticas legales públicas en una URL estable.
              </p>
            </div>
          </div>

          <div class="grid grid-cols-3 gap-5 sm:gap-8 lg:grid-cols-[11rem_11rem_13rem] lg:justify-start">
            <div class="min-w-0 flex flex-col gap-3.5">
              <h4 class="text-sm font-semibold" style="color: #111827;">Recursos</h4>
              <ul class="flex flex-col gap-2.5">
                <li><NuxtLink to="/discover" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Descubrir</NuxtLink></li>
                <li><NuxtLink to="/explore" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Explorar</NuxtLink></li>
                <li><NuxtLink to="/ranking" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Ranking</NuxtLink></li>
                <li><NuxtLink to="/paes-simulator" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Simular PAES</NuxtLink></li>
              </ul>
            </div>

            <div class="min-w-0 flex flex-col gap-3.5">
              <h4 class="text-sm font-semibold" style="color: #111827;">Soporte</h4>
              <ul class="flex flex-col gap-2.5">
                <li><NuxtLink to="/#how-it-works" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Cómo funciona</NuxtLink></li>
                <li><NuxtLink to="/chat" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Chat con Kora</NuxtLink></li>
                <li><NuxtLink to="/compare" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Comparar</NuxtLink></li>
                <li><NuxtLink to="/login" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Iniciar sesión</NuxtLink></li>
              </ul>
            </div>

            <div class="min-w-0 flex flex-col gap-3.5">
              <h4 class="text-sm font-semibold" style="color: #111827;">Legal</h4>
              <ul class="flex flex-col gap-2.5">
                <li><NuxtLink to="/privacidad#resumen" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Privacy Policy</NuxtLink></li>
                <li><NuxtLink to="/terminos#resumen" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Terms of Service</NuxtLink></li>
                <li><NuxtLink to="/propiedad-intelectual#resumen" class="text-[13px] sm:text-sm transition-opacity hover:opacity-60" style="color: #1f2937;">Propiedad intelectual</NuxtLink></li>
              </ul>
            </div>
          </div>
        </div>

        <div class="mt-10 pt-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style="border-top: 1px solid #d7dfef; font-size: 0.82rem; color: #64748b;">
          <span>© {{ new Date().getFullYear() }} KoraChile</span>
          <span>Fuente de datos: Mineduc / SIES · Hecho para Chile.</span>
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
  { id: 'test-vocacional', label: 'Test RIASEC + MBTI' },
  { id: 'asistente-ia', label: 'Asistente Personal' },
  { id: 'datos-oficiales', label: 'Datos oficiales' },
] 

const activeLandingTab = ref<string>(landingTabs[0]!.id)
const heroSectionEl = ref<HTMLElement | null>(null)
let scrollRAF: number | null = null
let sectionElements: HTMLElement[] = []
let pendingScrollTargetId: string | null = null
let pendingScrollTop: number | null = null
let pendingScrollExpiresAt = 0
let touchStartY: number | null = null
let landingSnapLockedUntil = 0
const LANDING_DESKTOP_BREAKPOINT = 1024

function getLandingStickyOffset() {
  return window.innerWidth >= LANDING_DESKTOP_BREAKPOINT ? 88 : 80
}

function hasDesktopLandingExperience() {
  if (typeof window === 'undefined') return false
  return window.innerWidth >= LANDING_DESKTOP_BREAKPOINT
}

function getSectionScrollTop(section: HTMLElement) {
  return Math.max(0, window.scrollY + section.getBoundingClientRect().top - getLandingStickyOffset())
}

function getActiveLandingIndex() {
  return landingTabs.findIndex(tab => tab.id === activeLandingTab.value)
}

function isWithinLandingSnapRange(direction: 1 | -1) {
  if (!hasDesktopLandingExperience()) return false
  if (!sectionElements.length) return false
  if (pendingScrollTargetId) return false
  if (Date.now() < landingSnapLockedUntil) return false

  const stickyOffset = getLandingStickyOffset()
  const firstTop = getSectionScrollTop(sectionElements[0]!)
  const lastTop = getSectionScrollTop(sectionElements[sectionElements.length - 1]!)

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
  let activeId = sectionElements[0]!.id

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
  if (!hasDesktopLandingExperience()) return
  if (Math.abs(event.deltaY) <= 14) return
  const direction = event.deltaY > 0 ? 1 : -1
  if (!snapLandingByDirection(direction)) return
  event.preventDefault()
}

function onKeydown(event: KeyboardEvent) {
  if (!hasDesktopLandingExperience()) return
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
  if (!hasDesktopLandingExperience()) return
  touchStartY = event.touches[0]?.clientY ?? null
}

function onTouchEnd(event: TouchEvent) {
  if (!hasDesktopLandingExperience()) {
    touchStartY = null
    return
  }
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

<style scoped>
.bg-shadow-element-center {
  --left-side: 50%;
  --right-side: auto;
  --top-side: 30%;
  --color-shadow: rgba(100, 130, 255, 0.12);
  --scale: 1;
}

.bg-shadow-element-center::before,
.bg-shadow-element-left::before,
.bg-shadow-element-right::before,
.bg-shadow-element::before {
  content: "";
  position: absolute;
  border-radius: 50%;
  width: 1px;
  height: 1px;
  left: var(--left-side);
  right: var(--right-side);
  top: var(--top-side);
  box-shadow: 0 0 800px 470px var(--color-shadow);
  transform: scale(var(--scale));
  pointer-events: none;
  z-index: 0;
}

.hero-reveal-line {
  display: block;
}

.landing-feature-wrap {
  width: 100%;
  max-width: 72rem;
  overflow: hidden;
  border-radius: 2rem;
}

.landing-feature-wrap-soft {
  background: radial-gradient(92.09% 124.47% at 50% 99.24%, rgba(221, 226, 238, 0.4) 58.91%, rgba(187, 197, 221, 0.4) 100%);
  border: 1px solid rgba(210, 218, 234, 0.92);
}

.landing-feature-wrap-blue {
  background: #edf1fb;
  background-blend-mode: overlay, normal;
  box-shadow: rgba(0, 0, 0, 0.13) 1.899px 1.77px 8.174px 0px inset, rgba(255, 255, 255, 0.13) 1.007px 0.939px 4.087px 0px inset;
}

.blur-reveal {
  opacity: 0;
  filter: blur(12px);
  transform: translateY(8px);
  animation: blur-reveal 1180ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
  will-change: filter, opacity, transform;
}

@keyframes blur-reveal {
  0% {
    opacity: 0;
    filter: blur(12px);
    transform: translateY(8px);
  }
  100% {
    filter: blur(0);
    opacity: 1;
    transform: translateY(0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .blur-reveal {
    animation: none;
    filter: none;
    opacity: 1;
    transform: none;
  }
}
</style>