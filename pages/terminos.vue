<template>
  <main class="min-h-screen overflow-x-hidden" style="background: linear-gradient(180deg, #f8fafc 0%, #fefce8 18%, #ffffff 44%); color: #0f172a;">
    <section class="relative border-b border-slate-200/80">
      <div class="absolute inset-0 pointer-events-none opacity-90">
        <div class="absolute -top-24 right-[-10%] h-72 w-72 rounded-full blur-3xl" style="background: rgba(250, 204, 21, 0.16);"></div>
        <div class="absolute top-28 left-[-8%] h-72 w-72 rounded-full blur-3xl" style="background: rgba(59, 130, 246, 0.12);"></div>
      </div>

      <div class="relative max-w-[78rem] mx-auto px-4 sm:px-6 pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_24rem] gap-8 lg:gap-10 items-start">
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em]"
              style="background: rgba(255, 255, 255, 0.78); border: 1px solid rgba(253, 224, 71, 0.9); color: #92400e;"
            >
              <Scale class="w-3.5 h-3.5" />
              Términos y condiciones
            </span>

            <h1 class="mt-5 max-w-[13ch] text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-none">
              Las reglas de uso, explicadas sin esconderlas.
            </h1>

            <p class="mt-6 max-w-3xl text-base sm:text-lg leading-8" style="color: #475569;">
              Esta página resume las condiciones generales para usar KoraChile: qué ofrece la plataforma, qué esperamos de quien la use,
              qué límites aplican y cómo se entienden nuestros servicios, contenidos y herramientas para usuarios en Chile.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style="background: #ffffff; border: 1px solid #fde68a; color: #334155;">
                <FileText class="w-4 h-4 text-amber-600" />
                Última actualización: 13 de mayo de 2026
              </span>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style="background: #ffffff; border: 1px solid #dbeafe; color: #334155;">
                <ShieldCheck class="w-4 h-4 text-blue-600" />
                Uso responsable del servicio
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

          <aside class="rounded-[2rem] p-5 sm:p-6 legal-panel" style="border: 1px solid rgba(226, 232, 240, 0.9); background: rgba(255, 255, 255, 0.84); box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: #64748b;">En esta página</p>
                <p class="mt-1 text-sm" style="color: #475569;">Navegación rápida por bloques.</p>
              </div>
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl" style="background: #fef3c7; color: #92400e;">
                <ScrollText class="w-5 h-5" />
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

            <div class="mt-5 rounded-[1.5rem] p-4" style="background: linear-gradient(135deg, #0f172a 0%, #92400e 100%); color: #f8fafc;">
              <div class="flex items-center gap-2 text-sm font-semibold">
                <ShieldCheck class="w-4 h-4" />
                Base del servicio
              </div>
              <p class="mt-2 text-sm leading-6" style="color: rgba(248, 250, 252, 0.84);">
                KoraChile orienta y acompaña, pero no reemplaza la revisión personal ni la verificación oficial de decisiones importantes.
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
            <h2 class="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Las reglas del servicio, en lectura rápida</h2>
          </div>
          <p class="max-w-2xl text-sm sm:text-base leading-7" style="color: #64748b;">
            Un resumen claro de acceso, uso esperado, límites de responsabilidad y actualizaciones de estas condiciones.
          </p>
        </div>

        <div class="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <article v-for="card in overviewCards" :key="card.title" class="rounded-[1.75rem] p-6" :style="card.surfaceStyle">
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
                <div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" /><p class="text-sm leading-6" style="color: #475569;">Uso honesto y responsable de las herramientas.</p></div>
                <div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" /><p class="text-sm leading-6" style="color: #475569;">Verificación propia antes de tomar decisiones finales.</p></div>
                <div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" /><p class="text-sm leading-6" style="color: #475569;">Actualización pública de cambios en esta misma ruta.</p></div>
              </div>
            </div>
          </aside>

          <div class="space-y-6">
            <article v-for="section in legalSections" :id="section.id" :key="section.id" class="rounded-[2rem] p-6 sm:p-8 lg:p-9" :style="section.surfaceStyle">
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
                    <li v-for="point in section.points" :key="point" class="flex items-start gap-3">
                      <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
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
  </main>
</template>

<script setup lang="ts">
import {
  ArrowUpRight,
  CheckCircle2,
  ChevronRight,
  FileText,
  Scale,
  ScrollText,
  ShieldCheck,
  Sparkles,
  TriangleAlert
} from 'lucide-vue-next'
import { markRaw } from 'vue'

definePageMeta({ layout: 'with-header' })

useHead({
  title: 'Términos y Condiciones — KoraChile',
  meta: [
    {
      name: 'description',
      content: 'Consulta los términos y condiciones de uso de KoraChile, sus límites, responsabilidades y reglas generales para usuarios en Chile.'
    }
  ]
})

const pageLinks = [
  {
    href: '#resumen',
    label: 'Resumen ejecutivo',
    caption: 'Reglas clave en lectura corta.',
    icon: markRaw(FileText),
    iconStyle: 'background: #fef3c7; color: #92400e;'
  },
  {
    href: '#uso',
    label: 'Uso de la plataforma',
    caption: 'Qué ofrece KoraChile y cómo debe usarse.',
    icon: markRaw(Scale),
    iconStyle: 'background: #eff6ff; color: #2563eb;'
  },
  {
    href: '#responsabilidad',
    label: 'Límites y responsabilidad',
    caption: 'Qué puedes esperar y qué debes verificar.',
    icon: markRaw(TriangleAlert),
    iconStyle: 'background: #fff7ed; color: #ea580c;'
  },
  {
    href: '#cambios',
    label: 'Actualizaciones',
    caption: 'Cómo cambia este documento con el tiempo.',
    icon: markRaw(Sparkles),
    iconStyle: 'background: #f5f3ff; color: #7c3aed;'
  }
] as const

const overviewCards = [
  {
    title: 'Uso del servicio',
    body: 'KoraChile entrega orientación, exploración y apoyo comparativo, no una decisión académica automática ni una garantía de resultados.',
    icon: markRaw(Scale),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fef3c7; color: #92400e;'
  },
  {
    title: 'Uso responsable',
    body: 'La plataforma no debe usarse para fines ilícitos, abusivos o que afecten su funcionamiento o la experiencia de otras personas.',
    icon: markRaw(ShieldCheck),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ecfdf5; color: #059669;'
  },
  {
    title: 'Límites razonables',
    body: 'Los datos y respuestas ayudan a orientar, pero deben complementarse con revisión oficial cuando la decisión sea relevante.',
    icon: markRaw(TriangleAlert),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fff7ed; color: #ea580c;'
  },
  {
    title: 'Documento vivo',
    body: 'Si ajustamos condiciones de uso, lo publicaremos aquí para mantener una ruta estable en el footer.',
    icon: markRaw(ScrollText),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #eff6ff; color: #2563eb;'
  }
] as const

const legalSections = [
  {
    id: 'uso',
    kicker: 'Uso de la plataforma',
    title: 'KoraChile es una herramienta de orientación, no una promesa de resultado',
    lead: 'El servicio ayuda a explorar carreras, comparar programas, revisar información y recibir orientación con apoyo de datos e IA.',
    icon: markRaw(Scale),
    callout: 'La plataforma está pensada para informar y orientar. La decisión final siempre requiere criterio propio y revisión adicional cuando corresponda.',
    paragraphs: [
      'KoraChile está diseñado para entregar orientación vocacional, acceso a datos oficiales, comparaciones y experiencias de exploración apoyadas en herramientas digitales.',
      'Eso significa que puedes usar el servicio para informarte, ordenar opciones y avanzar más rápido en tu búsqueda, pero no para reemplazar toda validación externa ni la revisión de fuentes oficiales.',
      'El uso esperado es personal, legítimo y coherente con el propósito del producto.'
    ],
    points: [
      'Explorar carreras, instituciones y comparaciones.',
      'Usar simuladores, favoritos y chat de forma legítima.',
      'No intentar afectar, saturar o explotar indebidamente la plataforma.'
    ],
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fef3c7; color: #92400e;',
    calloutStyle: 'background: #fef3c7; border: 1px solid #fde68a; color: #92400e;'
  },
  {
    id: 'responsabilidad',
    kicker: 'Límites y responsabilidad',
    title: 'Hay información útil, pero también límites que debes tener presentes',
    lead: 'Las recomendaciones, puntajes, comparaciones o respuestas generadas pueden ayudar mucho, pero no equivalen a asesoría profesional individual ni a garantía de admisión o resultado.',
    icon: markRaw(TriangleAlert),
    callout: 'Cuando una decisión sea importante, valida siempre con la institución, con la fuente oficial o con el contexto real de tu caso.',
    paragraphs: [
      'KoraChile puede mostrar datos de referencia, resultados calculados, explicaciones o recomendaciones basadas en la información disponible y en lo que ingresas como usuario.',
      'Aun así, pueden existir diferencias de actualización, criterios institucionales específicos o límites propios de herramientas automatizadas, incluyendo sistemas de IA.',
      'Por eso el servicio se ofrece como apoyo informativo y funcional, no como una garantía contractual de exactitud absoluta para todos los casos.'
    ],
    points: [
      'Las respuestas de IA pueden equivocarse o simplificar demasiado.',
      'Los requisitos reales de acceso pueden cambiar fuera de la plataforma.',
      'Las decisiones finales deben contrastarse con fuentes oficiales.'
    ],
    surfaceStyle: 'background: linear-gradient(180deg, #ffffff 0%, #fffaf5 100%); border: 1px solid #fed7aa; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fff7ed; color: #ea580c;',
    calloutStyle: 'background: #fff7ed; border: 1px solid #fdba74; color: #c2410c;'
  },
  {
    id: 'cambios',
    kicker: 'Actualizaciones',
    title: 'Estas condiciones pueden evolucionar junto con el producto',
    lead: 'Si cambian funciones, alcances o la forma en que se presta el servicio, esta página se actualizará para reflejar esos ajustes.',
    icon: markRaw(ScrollText),
    callout: 'El footer de KoraChile apunta a esta URL para que exista un lugar fijo donde revisar las condiciones vigentes.',
    paragraphs: [
      'KoraChile puede mejorar, reorganizar o ampliar sus herramientas. Cuando eso implique ajustar condiciones de uso, las publicaremos en esta ruta.',
      'La idea es que el documento sea entendible y visible, no una cláusula escondida en un lugar difícil de encontrar.',
      'El uso continuado del servicio después de cambios relevantes supone revisar la versión actualizada de estas condiciones.'
    ],
    points: [
      'Versión pública y visible desde el footer.',
      'Actualizaciones vinculadas a cambios del servicio.',
      'Lenguaje claro y revisión continua.'
    ],
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #f5f3ff; color: #7c3aed;',
    calloutStyle: 'background: #f5f3ff; border: 1px solid #e9d5ff; color: #6d28d9;'
  }
] as const
</script>

<style scoped>
.legal-panel {
  backdrop-filter: blur(14px);
}
</style>