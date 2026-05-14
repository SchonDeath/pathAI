<template>
  <main class="min-h-screen overflow-x-hidden" style="background: linear-gradient(180deg, #f8fafc 0%, #f5f3ff 18%, #ffffff 44%); color: #0f172a;">
    <section class="relative border-b border-slate-200/80">
      <div class="absolute inset-0 pointer-events-none opacity-90">
        <div class="absolute -top-24 right-[-10%] h-72 w-72 rounded-full blur-3xl" style="background: rgba(167, 139, 250, 0.18);"></div>
        <div class="absolute top-28 left-[-8%] h-72 w-72 rounded-full blur-3xl" style="background: rgba(34, 197, 94, 0.10);"></div>
      </div>

      <div class="relative max-w-[78rem] mx-auto px-4 sm:px-6 pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24 lg:pb-20">
        <div class="grid grid-cols-1 lg:grid-cols-[minmax(0,1.08fr)_24rem] gap-8 lg:gap-10 items-start">
          <div>
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] sm:text-xs font-semibold uppercase tracking-[0.18em]"
              style="background: rgba(255, 255, 255, 0.78); border: 1px solid rgba(221, 214, 254, 0.95); color: #6d28d9;"
            >
              <BadgeInfo class="w-3.5 h-3.5" />
              Propiedad intelectual
            </span>

            <h1 class="mt-5 max-w-[13ch] text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.04em] leading-none">
              Qué es nuestro, qué es de terceros y cómo puede usarse.
            </h1>

            <p class="mt-6 max-w-3xl text-base sm:text-lg leading-8" style="color: #475569;">
              Esta página aclara cómo entendemos la propiedad intelectual en KoraChile: el diseño, la marca, los textos y la experiencia propia del producto,
              junto con la existencia de datos oficiales, logos institucionales u otros elementos que pueden tener origen externo.
            </p>

            <div class="mt-8 flex flex-wrap items-center gap-3 text-sm">
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style="background: #ffffff; border: 1px solid #ddd6fe; color: #334155;">
                <Palette class="w-4 h-4 text-violet-600" />
                Última actualización: 13 de mayo de 2026
              </span>
              <span class="inline-flex items-center gap-2 rounded-full px-3 py-1.5" style="background: #ffffff; border: 1px solid #dcfce7; color: #334155;">
                <ShieldCheck class="w-4 h-4 text-emerald-600" />
                Respeto por contenido propio y de terceros
              </span>
            </div>

            <div class="mt-8 flex flex-wrap gap-3">
              <a href="#resumen" class="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-transform hover:-translate-y-0.5" style="background: #0f172a; color: #ffffff;">
                Ver resumen
                <ChevronRight class="w-4 h-4" />
              </a>
              <NuxtLink to="/" class="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition-colors hover:bg-white" style="border: 1px solid #dbe3f0; color: #0f172a;">
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
              <div class="flex h-11 w-11 items-center justify-center rounded-2xl" style="background: #f5f3ff; color: #7c3aed;">
                <Copyright class="w-5 h-5" />
              </div>
            </div>

            <nav class="mt-5 space-y-2">
              <a v-for="item in pageLinks" :key="item.href" :href="item.href" class="group flex items-start gap-3 rounded-2xl px-3 py-3 transition-colors hover:bg-slate-50">
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

            <div class="mt-5 rounded-[1.5rem] p-4" style="background: linear-gradient(135deg, #0f172a 0%, #6d28d9 100%); color: #f8fafc;">
              <div class="flex items-center gap-2 text-sm font-semibold">
                <BadgeInfo class="w-4 h-4" />
                Regla base
              </div>
              <p class="mt-2 text-sm leading-6" style="color: rgba(248, 250, 252, 0.84);">
                La experiencia, marca y contenido propio de KoraChile no se transfieren por usar la plataforma, y los elementos de terceros conservan su titularidad original.
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
            <h2 class="mt-2 text-2xl sm:text-3xl font-semibold tracking-tight">Propiedad intelectual en lectura rápida</h2>
          </div>
          <p class="max-w-2xl text-sm sm:text-base leading-7" style="color: #64748b;">
            Qué partes pertenecen a KoraChile, cómo tratamos elementos de terceros y qué usos no quedan autorizados por defecto.
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
              <p class="text-xs font-semibold uppercase tracking-[0.18em]" style="color: #64748b;">Puntos clave</p>
              <div class="mt-4 space-y-3">
                <div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" /><p class="text-sm leading-6" style="color: #475569;">Marca, diseño y experiencia propia protegidos.</p></div>
                <div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" /><p class="text-sm leading-6" style="color: #475569;">Elementos oficiales o de terceros mantienen su titularidad.</p></div>
                <div class="flex items-start gap-3"><CheckCircle2 class="mt-0.5 w-4 h-4 text-emerald-600" /><p class="text-sm leading-6" style="color: #475569;">Sin licencia general para copiar, redistribuir o reaprovechar todo el contenido.</p></div>
              </div>
            </div>
          </aside>

          <div class="space-y-6">
            <article v-for="section in ipSections" :id="section.id" :key="section.id" class="rounded-[2rem] p-6 sm:p-8 lg:p-9" :style="section.surfaceStyle">
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
                <div class="shrink-0 rounded-[1.5rem] px-4 py-3 text-sm leading-6 lg:max-w-xs" :style="section.calloutStyle">{{ section.callout }}</div>
              </div>

              <div class="mt-7 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_22rem] gap-6 xl:gap-8">
                <div class="space-y-4 text-sm sm:text-[15px] leading-7" style="color: #475569;">
                  <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
                </div>

                <div class="rounded-[1.5rem] p-5" style="background: rgba(248, 250, 252, 0.92); border: 1px solid #e2e8f0;">
                  <p class="text-xs font-semibold uppercase tracking-[0.16em]" style="color: #64748b;">En la práctica</p>
                  <ul class="mt-4 space-y-3">
                    <li v-for="point in section.points" :key="point" class="flex items-start gap-3">
                      <CheckCircle2 class="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
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
  BadgeInfo,
  CheckCircle2,
  ChevronRight,
  Copyright,
  FileText,
  Palette,
  ShieldCheck,
  Sparkles
} from 'lucide-vue-next'
import { markRaw } from 'vue'

definePageMeta({ layout: 'with-header' })

useHead({
  title: 'Propiedad Intelectual — KoraChile',
  meta: [
    {
      name: 'description',
      content: 'Revisa cómo KoraChile trata su propiedad intelectual, la titularidad de contenido propio y el uso de elementos de terceros o fuentes oficiales.'
    }
  ]
})

const pageLinks = [
  {
    href: '#resumen',
    label: 'Resumen ejecutivo',
    caption: 'Titularidad y uso permitido en corto.',
    icon: markRaw(FileText),
    iconStyle: 'background: #f5f3ff; color: #7c3aed;'
  },
  {
    href: '#propio',
    label: 'Contenido propio',
    caption: 'Marca, diseño, textos y experiencia.',
    icon: markRaw(Palette),
    iconStyle: 'background: #ede9fe; color: #6d28d9;'
  },
  {
    href: '#terceros',
    label: 'Contenido de terceros',
    caption: 'Datos oficiales, logos y referencias externas.',
    icon: markRaw(ShieldCheck),
    iconStyle: 'background: #ecfdf5; color: #059669;'
  },
  {
    href: '#uso-permitido',
    label: 'Uso permitido',
    caption: 'Qué no autoriza automáticamente esta web.',
    icon: markRaw(Copyright),
    iconStyle: 'background: #eff6ff; color: #2563eb;'
  }
] as const

const overviewCards = [
  {
    title: 'KoraChile propio',
    body: 'La marca, identidad visual, copy, interfaz y experiencia original del producto forman parte del trabajo propio de KoraChile.',
    icon: markRaw(Palette),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ede9fe; color: #6d28d9;'
  },
  {
    title: 'Fuentes oficiales',
    body: 'Los datos públicos y referencias institucionales pueden tener origen oficial o externo y no pasan a ser propiedad de KoraChile por mostrarse aquí.',
    icon: markRaw(ShieldCheck),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ecfdf5; color: #059669;'
  },
  {
    title: 'Uso limitado',
    body: 'El acceso a la plataforma no concede una licencia general para copiar, revender o republicar en masa el contenido o la experiencia.',
    icon: markRaw(Copyright),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #eff6ff; color: #2563eb;'
  },
  {
    title: 'Documento vivo',
    body: 'Esta página sirve como referencia pública sobre titularidad, fuentes y reglas básicas de uso del contenido mostrado en KoraChile.',
    icon: markRaw(Sparkles),
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #fef3c7; color: #b45309;'
  }
] as const

const ipSections = [
  {
    id: 'propio',
    kicker: 'Contenido propio',
    title: 'La experiencia original de KoraChile sigue siendo de KoraChile',
    lead: 'Eso incluye la identidad de marca, interfaz, estructura original, textos propios, selección editorial y forma particular en que se organiza la experiencia.',
    icon: markRaw(Palette),
    callout: 'Usar la plataforma no equivale a recibir una cesión o licencia amplia sobre su diseño, marca o contenido original.',
    paragraphs: [
      'KoraChile puede incluir elementos originales como nombre comercial, diseño visual, jerarquía de información, textos explicativos y otros componentes creativos propios del producto.',
      'Esos elementos siguen siendo parte de la identidad y del trabajo desarrollado para la plataforma, aun cuando estén visibles públicamente en la web.',
      'El acceso normal al sitio permite usar la experiencia como usuario final, no apropiarse de su presentación o redistribuirla como si fuera propia.'
    ],
    points: [
      'Marca, naming e identidad visual.',
      'Textos, layouts y selección editorial propia.',
      'Experiencia de producto y estructura de navegación original.'
    ],
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ede9fe; color: #6d28d9;',
    calloutStyle: 'background: #f5f3ff; border: 1px solid #ddd6fe; color: #6d28d9;'
  },
  {
    id: 'terceros',
    kicker: 'Contenido de terceros',
    title: 'Mostrar algo no implica ser dueño de ese algo',
    lead: 'KoraChile puede referenciar instituciones, datos públicos, nombres oficiales, logos u otras señales cuya titularidad corresponde a sus respectivos dueños.',
    icon: markRaw(ShieldCheck),
    callout: 'Las marcas, logos y materiales de terceros siguen perteneciendo a sus titulares originales.',
    paragraphs: [
      'Parte de la plataforma puede mostrar datos provenientes de fuentes oficiales, nombres de instituciones, referencias académicas o identificadores visuales utilizados para informar mejor a la persona usuaria.',
      'La presencia de esos elementos en KoraChile no altera su origen ni transfiere su propiedad intelectual al proyecto.',
      'Cuando corresponda, esos elementos se entienden como referencias informativas, contextuales o funcionales dentro del servicio.'
    ],
    points: [
      'Datos públicos con fuente oficial o externa.',
      'Nombres, marcas o logos de instituciones.',
      'Referencias necesarias para orientar y contextualizar información.'
    ],
    surfaceStyle: 'background: linear-gradient(180deg, #ffffff 0%, #f7fffb 100%); border: 1px solid #d1fae5; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #ecfdf5; color: #059669;',
    calloutStyle: 'background: #ecfdf5; border: 1px solid #a7f3d0; color: #047857;'
  },
  {
    id: 'uso-permitido',
    kicker: 'Uso permitido',
    title: 'Acceder al sitio no habilita cualquier reutilización',
    lead: 'El uso normal del servicio es compatible con consulta, navegación y apoyo informativo. Lo que no existe por defecto es una autorización abierta para copiar o explotar todo su contenido.',
    icon: markRaw(Copyright),
    callout: 'Si se requiere un uso distinto al normal de usuario final, debería existir autorización específica o una base clara para hacerlo.',
    paragraphs: [
      'La existencia pública del sitio no significa que su contenido, estructura o materiales puedan copiarse íntegramente, redistribuirse masivamente o reutilizarse con fines comerciales sin contexto.',
      'Tampoco significa que cualquier elemento de terceros mostrado en la plataforma quede libre para ser reaprovechado por otras personas solo por estar visible aquí.',
      'Esta sección busca dejar un principio razonable y entendible, no reemplazar análisis específicos cuando existan usos más complejos o sensibles.'
    ],
    points: [
      'Navegar y consultar: sí.',
      'Copiar o republicar en masa: no por defecto.',
      'Uso comercial o derivado: requiere revisión adicional.'
    ],
    surfaceStyle: 'background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 22px 50px rgba(15, 23, 42, 0.05);',
    iconStyle: 'background: #eff6ff; color: #2563eb;',
    calloutStyle: 'background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8;'
  }
] as const
</script>

<style scoped>
.legal-panel {
  backdrop-filter: blur(14px);
}
</style>