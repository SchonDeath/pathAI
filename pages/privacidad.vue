<template>
  <main class="min-h-screen overflow-x-hidden" style="background: linear-gradient(180deg, #eff6ff 0%, #f8fbff 18%, #ffffff 44%); color: #0f172a;">
    <section class="relative border-b border-slate-200/80">
      <div class="absolute inset-0 pointer-events-none opacity-90">
        <div class="absolute -top-24 right-[-10%] h-72 w-72 rounded-full blur-3xl" style="background: rgba(59, 130, 246, 0.18);"></div>
        <div class="absolute top-28 left-[-8%] h-72 w-72 rounded-full blur-3xl" style="background: rgba(16, 185, 129, 0.12);"></div>
      </div>

      <div class="relative max-w-[78rem] mx-auto px-4 sm:px-6 pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_24rem] gap-8 lg:gap-10 items-start">
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em]"
              style="background: rgba(255, 255, 255, 0.72); border: 1px solid rgba(191, 219, 254, 0.9); color: #0f5ed7;"
            >
              <Shield class="w-3.5 h-3.5" />
              Privacidad de datos
            </span>

            <h1 class="mt-5 max-w-[12ch] text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-none">
              Una política clara, con diseño y control.
            </h1>

            <p class="mt-6 max-w-3xl text-base sm:text-lg leading-8" style="color: #475569;">
              Esta página resume cómo KoraChile usa datos personales en Chile, por qué los necesita y qué principios sigue para tratar la información
              de forma razonable. La idea es que se pueda leer rápido, navegar por secciones y volver siempre a esta URL como referencia estable.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style="background: #ffffff; border: 1px solid #dbeafe; color: #334155;">
                <Sparkles class="w-4 h-4 text-blue-600" />
                Última actualización: 13 de mayo de 2026
              </span>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style="background: #ffffff; border: 1px solid #dcfce7; color: #334155;">
                <CheckCircle2 class="w-4 h-4 text-emerald-600" />
                Sin venta de datos a terceros
              </span>
            </div>

            <div class="mt-8 flex flex-wrap gap-3">
              <a
                href="#resumen"
                class="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5"
                style="background: #0f172a; color: #ffffff;"
              >
                Ver resumen
                <ChevronRight class="w-4 h-4" />
              </a>
              <NuxtLink
                to="/"
                class="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors hover:bg-white"
                style="border: 1px solid #dbe3f0; color: #0f172a;"
              >
                Volver al inicio
                <ArrowUpRight class="w-4 h-4" />
              </NuxtLink>
            </div>
          </div>

          <aside class="rounded-[2rem] p-5 sm:p-6 privacy-panel" style="border: 1px solid rgba(226, 232, 240, 0.9); background: rgba(255, 255, 255, 0.8); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: #64748b;">En esta página</p>
                <p class="mt-1 text-sm" style="color: #475569;">Navegación rápida por bloques.</p>
              </div>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl" style="background: #eff6ff; color: #2563eb;">
                <FileText class="w-5 h-5" />
              </div>
            </div>

            <nav class="mt-5 space-y-2">
              <a
                v-for="item in pageLinks"
                :key="item.href"
                :href="item.href"
                class="group flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50"
              >
                <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" :style="item.iconStyle">
                  <component :is="item.icon" class="w-4 h-4" />
                </div>
                <div class="min-w-0 flex-1">
                  <p class="text-sm font-semibold text-slate-900">{{ item.label }}</p>
                  <p class="mt-1 text-xs leading-5" style="color: #64748b;">{{ item.caption }}</p>
                </div>
                <ChevronRight class="mt-1 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </a>
            </nav>

            <div class="mt-5 rounded-[1.5rem] p-4" style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); color: #e2e8f0;">
              <div class="flex items-center gap-2 text-sm font-semibold">
                <Lock class="w-4 h-4" />
                Principio base
              </div>
              <p class="mt-2 text-sm leading-6" style="color: rgba(226, 232, 240, 0.84);">
                Pedir lo mínimo necesario, explicar el uso y actualizar esta URL cuando cambie algo importante.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>

    <section id="resumen" class="scroll-mt-24">
      <div class="max-w-[78rem] mx-auto px-4 sm:px-6 py-12 sm:py-14 lg:py-16">
        <div class="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: #64748b;">Resumen ejecutivo</p>
            <h2 class="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Lo esencial, en lectura rápida</h2>
          </div>
          <p class="max-w-2xl text-sm sm:text-base leading-7" style="color: #64748b;">
            Inspirado en páginas legales modernas: bloques claros, iconos útiles y una jerarquía fácil de escanear.
          </p>
        </div>

        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <article
            v-for="card in overviewCards"
            :key="card.title"
            class="rounded-[1.75rem] p-6"
            :style="card.surfaceStyle"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl" :style="card.iconStyle">
              <component :is="card.icon" class="w-5 h-5" />
            </div>
            <h3 class="mt-5 text-lg font-semibold tracking-tight text-slate-900">{{ card.title }}</h3>
            <p class="mt-2 text-sm leading-7" style="color: #475569;">{{ card.body }}</p>
          </article>
        </div>
      </div>
    </section>

    <section class="pb-16 sm:pb-20 lg:pb-24">
      <div class="max-w-[78rem] mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 lg:grid-cols-[18rem_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          <aside class="lg:sticky lg:top-28 space-y-4">
            <div class="rounded-[1.75rem] p-5" style="background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.04);">
              <p class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: #64748b;">Principios</p>
              <div class="mt-4 space-y-3">
                <div class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" />
                  <p class="text-sm leading-6" style="color: #475569;">Finalidad clara antes de pedir datos.</p>
                </div>
                <div class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" />
                  <p class="text-sm leading-6" style="color: #475569;">Minimización de información cuando sea posible.</p>
                </div>
                <div class="flex items-start gap-3">
                  <CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" />
                  <p class="text-sm leading-6" style="color: #475569;">Avisos y cambios publicados en esta misma ruta.</p>
                </div>
              </div>
            </div>

            <div class="rounded-[1.75rem] p-5" style="background: linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%); border: 1px solid #dbeafe;">
              <div class="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <BellRing class="w-4 h-4 text-blue-600" />
                Cambios futuros
              </div>
              <p class="mt-3 text-sm leading-6" style="color: #475569;">
                Si este documento crece hacia una versión más legal o más detallada, esta URL seguirá siendo el punto de entrada.
              </p>
            </div>
          </aside>

          <div class="space-y-6">
            <article
              v-for="section in privacySections"
              :id="section.id"
              :key="section.id"
              class="rounded-[2rem] p-6 sm:p-8 lg:p-9"
              :style="section.surfaceStyle"
            >
              <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
                <div class="max-w-3xl">
                  <div class="flex items-center gap-3">
                    <div class="flex h-12 w-12 items-center justify-center rounded-2xl" :style="section.iconStyle">
                      <component :is="section.icon" class="w-5 h-5" />
                    </div>
                    <span class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: #64748b;">{{ section.kicker }}</span>
                  </div>

                  <h2 class="mt-5 text-2xl sm:text-[2rem] font-semibold tracking-tight text-slate-900">{{ section.title }}</h2>
                  <p class="mt-3 text-base sm:text-lg leading-8" style="color: #475569;">{{ section.lead }}</p>
                </div>

                <div class="shrink-0 rounded-[1.5rem] px-4 py-3 text-sm leading-6 lg:max-w-xs" :style="section.calloutStyle">
                  {{ section.callout }}
                </div>
              </div>

              <div class="mt-7 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 xl:gap-8">
                <div class="space-y-4 text-sm sm:text-[15px] leading-7" style="color: #475569;">
                  <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                </div>

                <div class="rounded-[1.5rem] p-5" style="background: rgba(248, 250, 252, 0.92); border: 1px solid #e2e8f0;">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: #64748b;">En la práctica</p>
                  <ul class="mt-4 space-y-3">
                    <li
                      v-for="point in section.points"
                      :key="point"
                      class="flex items-start gap-3"
                    >
                      <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
                      <span class="text-sm leading-6" style="color: #334155;">{{ point }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="pb-16 sm:pb-20">
      <div class="max-w-[78rem] mx-auto px-4 sm:px-6">
        <div class="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-5">
          <div class="rounded-[2rem] p-7 sm:p-8" style="background: linear-gradient(135deg, #0f172a 0%, #172554 100%); color: #e2e8f0;">
            <p class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: rgba(191, 219, 254, 0.9);">Cierre</p>
            <h2 class="mt-3 text-2xl sm:text-3xl font-semibold tracking-tight text-white">Privacidad entendible, no escondida.</h2>
            <p class="mt-4 max-w-2xl text-sm sm:text-base leading-7" style="color: rgba(226, 232, 240, 0.82);">
              La intención es que esta política se lea como producto y no como texto enterrado. Si más adelante añadimos controles,
              solicitudes o canales específicos para derechos de datos, los iremos incorporando acá sin romper la navegación.
            </p>
          </div>

          <div class="rounded-[2rem] p-7 sm:p-8" style="background: #ffffff; border: 1px solid #e2e8f0;">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl" style="background: #ecfeff; color: #0891b2;">
                <SlidersHorizontal class="w-5 h-5" />
              </div>
              <div>
                <p class="text-sm font-semibold text-slate-900">Lo que puede venir después</p>
                <p class="text-sm" style="color: #64748b;">Si quieres, esta página puede crecer en tres direcciones.</p>
              </div>
            </div>

            <div class="mt-5 space-y-3">
              <div class="flex items-start gap-3 rounded-2xl px-4 py-3" style="background: #f8fafc;">
                <Database class="mt-0.5 w-4 h-4 text-blue-600" />
                <p class="text-sm leading-6" style="color: #334155;">Versión legal completa con bases, conservación y derechos ARCO.</p>
              </div>
              <div class="flex items-start gap-3 rounded-2xl px-4 py-3" style="background: #f8fafc;">
                <Lock class="mt-0.5 w-4 h-4 text-emerald-600" />
                <p class="text-sm leading-6" style="color: #334155;">Sección separada para seguridad, proveedores y autenticación.</p>
              </div>
              <div class="flex items-start gap-3 rounded-2xl px-4 py-3" style="background: #f8fafc;">
                <UserRound class="mt-0.5 w-4 h-4 text-violet-600" />
                <p class="text-sm leading-6" style="color: #334155;">Centro de preferencias o solicitudes cuando esa parte del producto exista.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import {
  ArrowUpRight,
  BellRing,
  CheckCircle2,
  ChevronRight,
  Database,
  FileText,
  Lock,
  Shield,
  SlidersHorizontal,
  Sparkles,
  UserRound
} from 'lucide-vue-next'
import { markRaw } from 'vue'

definePageMeta({ layout: 'with-header' })

useHead({
  title: 'Política de Privacidad — KoraChile',
  meta: [
    {
      name: 'description',
      content: 'Conoce cómo KoraChile trata datos personales, qué información usa y para qué la ocupa dentro de la plataforma para usuarios en Chile.'
    }
  ]
})

const pageLinks = [
  {
    href: '#resumen',
    label: 'Resumen ejecutivo',
    caption: 'Principios rápidos y lectura corta.',
    icon: markRaw(FileText),
    iconStyle: 'background: #eff6ff; color: #2563eb;'
  },
  {
    href: '#datos',
    label: 'Qué datos usamos',
    caption: 'Cuenta, preferencias, puntajes y actividad.',
    icon: markRaw(Database),
    iconStyle: 'background: #ecfeff; color: #0891b2;'
  },
  {
    href: '#uso',
    label: 'Para qué los usamos',
    caption: 'Personalización, funcionamiento y mejora.',
    icon: markRaw(Sparkles),
    iconStyle: 'background: #f5f3ff; color: #7c3aed;'
  },
  {
    href: '#control',
    label: 'Tus decisiones',
    caption: 'Qué compartes y cómo cambia la experiencia.',
    icon: markRaw(SlidersHorizontal),
    iconStyle: 'background: #fefce8; color: #ca8a04;'
  },
  {
    href: '#seguridad',
    label: 'Seguridad y terceros',
    caption: 'Protección razonable y proveedores técnicos.',
    icon: markRaw(Lock),
    iconStyle: 'background: #ecfdf5; color: #059669;'
  }
] as const

const overviewCards = [
  {
    title: 'Datos mínimos',
    body: 'Intentamos pedir solo la información necesaria para operar cuenta, favoritos, recomendaciones y herramientas vocacionales.',
    icon: markRaw(Database),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #eff6ff; color: #2563eb;'
  },
  {
    title: 'Uso explicado',
    body: 'La finalidad principal es ayudarte dentro de KoraChile: guardar progreso, comparar mejor y personalizar recomendaciones.',
    icon: markRaw(FileText),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ecfeff; color: #0891b2;'
  },
  {
    title: 'Sin venta a terceros',
    body: 'No usamos tus datos para vender audiencias ni para publicidad de terceros fuera de la plataforma.',
    icon: markRaw(Shield),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ecfdf5; color: #059669;'
  },
  {
    title: 'URL estable',
    body: 'Si esta política evoluciona, la publicaremos aquí para que el enlace del footer siga apuntando al mismo lugar.',
    icon: markRaw(BellRing),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fef3c7; color: #b45309;'
  }
] as const

const privacySections = [
  {
    id: 'datos',
    kicker: 'Qué datos podemos usar',
    title: 'Información que un producto como KoraChile realmente necesita',
    lead: 'La plataforma combina orientación vocacional, guardado de preferencias y herramientas de exploración. Por eso el dato útil suele ser contextual y no excesivo.',
    icon: markRaw(Database),
    callout: 'La meta no es coleccionar información, sino usar la mínima necesaria para que las funciones tengan sentido.',
    paragraphs: [
      'Si creas una cuenta, podemos tratar datos básicos de perfil como correo, nombre visible, avatar o preferencias asociadas a tu uso.',
      'Si ocupas simuladores, descubrimiento vocacional, favoritos o comparadores, podemos usar puntajes, intereses, filtros y elecciones para mostrar resultados más relevantes dentro del producto.',
      'Si conversas con Kora, el contenido de tus preguntas puede procesarse para responderte mejor y sostener el contexto funcional de esa experiencia.'
    ],
    points: [
      'Correo o identificador de cuenta cuando te registras.',
      'Preferencias, carreras guardadas y decisiones de navegación.',
      'Puntajes o datos que ingresas voluntariamente en simuladores.',
      'Contenido funcional de interacción cuando usas el chat o herramientas guiadas.'
    ],
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #eff6ff; color: #2563eb;',
    calloutStyle: 'background: #eff6ff; border: 1px solid #dbeafe; color: #1d4ed8;'
  },
  {
    id: 'uso',
    kicker: 'Para qué se usan',
    title: 'Finalidad práctica antes que formulación abstracta',
    lead: 'La razón para tratar datos personales tiene que ser entendible: operar funciones, guardar estado, personalizar resultados y mejorar la experiencia.',
    icon: markRaw(Sparkles),
    callout: 'Si un dato no ayuda a crear valor real dentro de la experiencia, no debería pedirse por costumbre.',
    paragraphs: [
      'Usamos información para crear y mantener tu cuenta, recordar avances y permitir que herramientas como favoritos, comparaciones o simulaciones no partan de cero cada vez.',
      'También sirve para personalizar recomendaciones, priorizar programas más cercanos a tus intereses y mostrar resultados más útiles para tu contexto.',
      'Parte del tratamiento puede orientarse a estabilidad, monitoreo básico y mejora continua del producto, siempre dentro de un criterio razonable de funcionamiento.'
    ],
    points: [
      'Crear y administrar tu cuenta.',
      'Guardar progreso, favoritos y configuraciones.',
      'Personalizar recomendaciones y resultados vocacionales.',
      'Mejorar calidad, seguridad y rendimiento del servicio.'
    ],
    surfaceStyle: 'background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%); border: 1px solid #dbeafe; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #f5f3ff; color: #7c3aed;',
    calloutStyle: 'background: #f5f3ff; border: 1px solid #e9d5ff; color: #6d28d9;'
  },
  {
    id: 'control',
    kicker: 'Tus decisiones',
    title: 'Compartir menos también debe seguir siendo una opción',
    lead: 'No todas las funciones requieren el mismo nivel de información. Parte del control está en qué herramientas decides usar y qué datos decides ingresar.',
    icon: markRaw(SlidersHorizontal),
    callout: 'La política puede evolucionar hacia más controles de usuario, pero la idea base ya es dejar claro que tú no tienes que compartir todo.',
    paragraphs: [
      'Puedes elegir no usar ciertas funciones si no quieres ingresar datos como puntajes, intereses o preferencias más específicas.',
      'Cuando modifiques tu perfil, favoritos o datos voluntarios, la experiencia puede cambiar porque algunas recomendaciones dependen justamente de esa información.',
      'Si más adelante incorporamos herramientas formales para gestionar preferencias o solicitudes relacionadas con datos, se enlazarán desde esta misma página.'
    ],
    points: [
      'Tú decides qué información voluntaria ingresas en simuladores y formularios.',
      'Cambiar o borrar preferencias puede modificar recomendaciones y resultados.',
      'El producto debe seguir explicando con claridad cuándo un dato es opcional y cuándo es funcional.'
    ],
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fefce8; color: #ca8a04;',
    calloutStyle: 'background: #fefce8; border: 1px solid #fde68a; color: #a16207;'
  },
  {
    id: 'seguridad',
    kicker: 'Seguridad y terceros',
    title: 'Infraestructura, autenticación y cuidado razonable de la información',
    lead: 'KoraChile puede apoyarse en servicios técnicos para autenticación, almacenamiento, infraestructura o procesamiento. Eso no cambia el principio de usar la información solo para operar la plataforma.',
    icon: markRaw(Lock),
    callout: 'Terceros técnicos no deberían transformarse en terceros comerciales. Su rol es hacer funcionar el servicio.',
    paragraphs: [
      'Podemos usar proveedores para alojar datos, autenticar usuarios o soportar funciones técnicas del producto. Esos servicios tratan la información necesaria para cumplir su papel operativo.',
      'También aplicamos un criterio de seguridad razonable para reducir accesos no autorizados, errores de configuración y exposición innecesaria de datos.',
      'No vendemos datos personales ni construimos una lógica de publicidad de terceros basada en tu perfil dentro de KoraChile.'
    ],
    points: [
      'Servicios técnicos para autenticación, almacenamiento o infraestructura.',
      'Medidas razonables de resguardo y acceso controlado.',
      'Sin venta de datos personales a terceros con fines publicitarios.'
    ],
    surfaceStyle: 'background: linear-gradient(180deg, #ffffff 0%, #f7fffb 100%); border: 1px solid #d1fae5; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ecfdf5; color: #059669;',
    calloutStyle: 'background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857;'
  }
] as const
</script>

<style scoped>
.privacy-panel {
  backdrop-filter: blur(14px);
}
</style>