<template>
  <div class="min-h-screen flex flex-col">
    <AppHeader />

    <main class="flex-1 flex flex-col">

      <!-- ── Hero ── -->
      <section class="relative flex flex-col items-center justify-center px-4 sm:px-6 pt-28 pb-16 sm:pb-20 min-h-[80vh] overflow-hidden">
        <div class="absolute inset-0 -z-10 overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full opacity-20 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #bfdbfe 0%, #a5f3fc 50%, transparent 70%)"></div>
          <div class="absolute bottom-0 right-0 w-[400px] h-[300px] rounded-full opacity-10 blur-2xl pointer-events-none"
            style="background: radial-gradient(ellipse at center, #dbeafe 0%, transparent 70%)"></div>
        </div>

        <div class="w-full max-w-3xl mx-auto text-center space-y-6 animate-fade-up">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-xs font-semibold uppercase tracking-wider">
            Orientación vocacional con IA · Chile
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
      </section>

      <!-- ── Feature sections ── -->
      <FeatureDiscover />
      <FeatureKora />
      <FeatureRanking />

      <!-- ── CTA Simulador PAES ── -->
      <section class="relative px-4 sm:px-6 py-16 sm:py-20 bg-slate-900 overflow-hidden">
        <div class="absolute inset-0 -z-0 pointer-events-none overflow-hidden">
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] rounded-full opacity-20 blur-3xl"
            style="background: radial-gradient(ellipse, #6366f1 0%, #22d3ee 60%, transparent 80%)"></div>
        </div>
        <div class="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white text-xs font-semibold uppercase tracking-wider">
            🎯 Nuevo · Simulador PAES
          </span>
          <h2 class="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            ¿A qué carreras puedes entrar<br class="hidden sm:block" /> con tu puntaje PAES?
          </h2>
          <p class="text-slate-500 text-base leading-relaxed max-w-xl mx-auto">
            Ingresa tu NEM, Ranking y puntajes PAES y calcula en segundos los programas reales del sistema chileno a los que clasificas.
          </p>
          <NuxtLink
            to="/paes-simulator"
            class="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-white text-slate-900 font-semibold text-sm hover:bg-slate-100 transition-all hover:-translate-y-0.5 shadow-xl">
            Simular mis puntajes →
          </NuxtLink>
        </div>
      </section>



      <section class="px-4 sm:px-6 py-16 sm:py-20 bg-surface-50 border-t border-slate-100">
        <div class="max-w-5xl mx-auto">
          <div class="text-center mb-12">
            <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold uppercase tracking-wider mb-4">
              Usuarios reales
            </span>
            <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Lo que dicen sobre KoraChile</h2>
            <p class="text-slate-500 mt-2">Jóvenes chilenos que encontraron su camino</p>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div v-for="(review, i) in testimonials" :key="i"
              class="bg-white rounded-3xl p-6 border border-slate-100 shadow-card space-y-4 flex flex-col">
              <!-- Stars -->
              <div class="flex gap-0.5">
                <svg v-for="s in 5" :key="s" class="w-4 h-4" :class="s <= review.stars ? 'text-amber-400' : 'text-slate-200'" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <p class="text-sm text-slate-700 leading-relaxed flex-1">"{{ review.text }}"</p>
              <div class="flex items-center gap-3 pt-2 border-t border-slate-50">
                <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                  :style="`background: ${review.avatarColor}`">
                  {{ review.initials }}
                </div>
                <div>
                  <p class="text-sm font-semibold text-slate-900">{{ review.name }}</p>
                  <p class="text-xs text-slate-500">{{ review.role }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Average rating -->
          <div class="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 p-6 bg-white rounded-3xl border border-slate-100 shadow-card">
            <div class="text-center">
              <p class="text-5xl font-extrabold text-slate-900">4.9</p>
              <div class="flex gap-0.5 justify-center mt-1">
                <svg v-for="s in 5" :key="s" class="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
              </div>
              <p class="text-xs text-slate-500 mt-1">Promedio general</p>
            </div>
            <div class="hidden sm:block w-px h-16 bg-slate-100"></div>
            <div class="flex gap-8 text-center">
              <div>
                <p class="text-2xl font-bold text-slate-900">+2.400</p>
                <p class="text-xs text-slate-500 mt-1">Usuarios activos</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">+7.200</p>
                <p class="text-xs text-slate-500 mt-1">Carreras descubiertas</p>
              </div>
              <div>
                <p class="text-2xl font-bold text-slate-900">98%</p>
                <p class="text-xs text-slate-500 mt-1">Lo recomendarían</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <footer class="bg-white border-t border-slate-100 mt-0">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 py-12 sm:py-14">
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