<template>
  <section class="relative flex min-h-[calc(100svh-64px)] items-center px-4 sm:px-6 py-16 sm:py-[4.5rem] lg:py-20 overflow-hidden" style="background:transparent;">

    <div class="w-full max-w-6xl mx-auto">
      <div class="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">

        <!-- Texto -->
        <div class="space-y-8">
          <div>
            <span class="inline-flex items-center gap-2 px-3 py-1 mb-4 text-xs font-semibold uppercase tracking-wider" style="background:#f0f6ff; border:1px solid #cce0ff; color:#0071e3; border-radius:999px;">
              <BrainCircuit class="w-4 h-4" />Test vocacional
            </span>
            <h2 class="text-3xl sm:text-4xl font-semibold tracking-tight leading-tight" style="color:#1d1d1f; letter-spacing:-0.02em;">
              Descúbrete con el<br>
              <span class="gradient-text">Test RIASEC + MBTI</span>
            </h2>
            <p style="color:#474747;" class="mt-4 text-base leading-relaxed">
              En 10 minutos descubres tu código Holland (6 dimensiones de intereses vocacionales) y tu tipo de personalidad MBTI (16 tipos). Juntos revelan qué tipos de trabajo te generan energía y en qué entornos prosperas.
            </p>
          </div>

          <!-- RIASEC -->
          <div>
            <p class="text-xs font-bold uppercase tracking-widest mb-3" style="color:#86868b;">Código RIASEC — 6 dimensiones</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div v-for="dim in riasecDims" :key="dim.letter"
                class="rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
                style="border:1px solid #e8e8ed; background:rgba(255,255,255,0.92); box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);">
                <div class="flex h-9 w-9 items-center justify-center rounded-xl" style="background:#eef4ff; color:#0071e3;">
                  <component :is="dim.icon" class="w-4 h-4" />
                </div>
                <div class="mt-3">
                  <div class="flex items-center gap-2.5 flex-wrap">
                    <span class="inline-flex min-w-[2.4rem] items-center justify-center rounded-xl px-2.5 py-1.5 text-lg font-black leading-none shadow-sm" :style="dim.letterStyle">{{ dim.letter }}</span>
                    <span class="text-[15px] font-semibold" style="color:#1d1d1f;">{{ dim.name }}</span>
                  </div>
                  <p class="text-[11px] leading-relaxed mt-1.5" style="color:#86868b;">{{ dim.hint }}</p>
                </div>
              </div>
            </div>
          </div>

          <NuxtLink to="/discover?quiz=1"
            class="inline-flex items-center gap-2 font-semibold text-sm transition-opacity hover:opacity-80"
            style="background:#0071e3; color:#ffffff; border-radius:999px; padding:0.75rem 1.75rem;">
            Hacer el test gratis <ArrowRight class="w-4 h-4" />
          </NuxtLink>
        </div>

        <!-- Mockup tipos MBTI -->
        <div class="relative order-first lg:order-last">
          <div class="absolute -inset-4 rounded-3xl blur-xl -z-10"
            style="background: radial-gradient(ellipse, rgba(0,113,227,0.1) 0%, rgba(201,89,221,0.06) 60%, transparent 80%);"></div>
          <div class="relative overflow-hidden bg-white/95" style="border-radius:28px; border:1px solid #e8e8ed;">
            <div class="px-5 py-3 flex items-center gap-2" style="border-bottom:1px solid #e8e8ed; background:#f5f5f7;">
              <div class="flex gap-1.5"><span class="w-3 h-3 rounded-full" style="background:#ff5f57;"></span><span class="w-3 h-3 rounded-full" style="background:#febc2e;"></span><span class="w-3 h-3 rounded-full" style="background:#28c840;"></span></div>
              <span class="text-xs font-medium ml-1" style="color:#474747;">Tu perfil de personalidad</span>
            </div>
            <div class="p-5 space-y-3">
              <div>
                <p class="text-[11px] font-bold uppercase tracking-widest mb-3" style="color:#86868b;">Personalidad MBTI — 4 ejes</p>
                <div class="grid grid-cols-2 gap-3">
                  <div v-for="axis in mbtiAxes" :key="axis.left"
                    class="rounded-2xl p-3 transition-transform hover:-translate-y-0.5"
                    style="border:1px solid #e8e8ed; background:#ffffff; box-shadow: 0 10px 24px rgba(15, 23, 42, 0.04);">
                    <div class="flex items-center justify-between gap-2">
                      <span class="text-[10px] font-bold uppercase tracking-[0.18em]" style="color:#86868b;">Eje</span>
                      <span class="text-[10px] font-semibold" style="color:#0071e3;">{{ axis.left }} / {{ axis.right }}</span>
                    </div>
                    <div class="mt-3 flex items-center gap-2 text-xs">
                      <span class="font-bold w-4" style="color:#0071e3;">{{ axis.left }}</span>
                      <div class="flex-1 h-2 rounded-full overflow-hidden" style="background:#e8e8ed;">
                        <div class="h-full rounded-full" style="background:#0071e3; width:55%"></div>
                      </div>
                      <span class="font-bold w-4 text-right" style="color:#86868b;">{{ axis.right }}</span>
                    </div>
                    <p class="mt-3 text-[11px] leading-relaxed font-medium" style="color:#64748b;">{{ axis.label }}</p>
                  </div>
                </div>
              </div>

              <p class="text-[11px] font-bold uppercase tracking-widest" style="color:#86868b;">Tipos MBTI más frecuentes en cada área</p>
              <div v-for="group in mbtiGroups" :key="group.area" class="space-y-1.5">
                <p class="text-xs font-semibold" style="color:#474747;">{{ group.area }}</p>
                <div class="flex flex-wrap gap-1.5">
                  <div v-for="type in group.types" :key="type"
                    class="flex items-center gap-1 px-2.5 py-1 rounded-lg cursor-default group relative"
                    :style="group.badgeStyle"
                    :title="store.mbtiDescriptions[type]?.description">
                    <component :is="mbtiIcons[type]" class="w-3.5 h-3.5" :style="group.iconStyle" />
                    <span class="font-bold text-xs" :style="group.iconStyle">{{ type }}</span>
                    <span class="text-[10px]" :style="group.labelStyle">{{ store.mbtiDescriptions[type]?.label }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  BrainCircuit, ArrowRight,
  Wrench, Microscope, Palette, Users, Rocket, ClipboardList,
  Layers, Target, Lightbulb, Sprout, Sparkles, Star,
  ShieldCheck, BarChart3, Zap, Music
} from 'lucide-vue-next'
import { useCareerStore } from '~/stores/career'

const store = useCareerStore()

const riasecDims = [
  { letter: 'R', name: 'Realista', icon: Wrench, hint: 'Trabajo manual, técnico y al aire libre', letterStyle: 'background:linear-gradient(180deg, #1677ff 0%, #0057d9 100%); color:#ffffff; border:1px solid #0052cc;' },
  { letter: 'I', name: 'Investigador', icon: Microscope, hint: 'Ciencia, análisis y resolución de problemas', letterStyle: 'background:linear-gradient(180deg, #1677ff 0%, #0057d9 100%); color:#ffffff; border:1px solid #0052cc;' },
  { letter: 'A', name: 'Artístico', icon: Palette, hint: 'Creatividad, expresión y originalidad', letterStyle: 'background:linear-gradient(180deg, #1677ff 0%, #0057d9 100%); color:#ffffff; border:1px solid #0052cc;' },
  { letter: 'S', name: 'Social', icon: Users, hint: 'Ayudar, enseñar y trabajar con personas', letterStyle: 'background:linear-gradient(180deg, #1677ff 0%, #0057d9 100%); color:#ffffff; border:1px solid #0052cc;' },
  { letter: 'E', name: 'Emprendedor', icon: Rocket, hint: 'Liderar, persuadir y tomar decisiones', letterStyle: 'background:linear-gradient(180deg, #1677ff 0%, #0057d9 100%); color:#ffffff; border:1px solid #0052cc;' },
  { letter: 'C', name: 'Convencional', icon: ClipboardList, hint: 'Organización, datos y procedimientos', letterStyle: 'background:linear-gradient(180deg, #1677ff 0%, #0057d9 100%); color:#ffffff; border:1px solid #0052cc;' },
]

const mbtiIcons: Record<string, unknown> = {
  INTJ: Layers,      INTP: Microscope,  ENTJ: Target,      ENTP: Lightbulb,
  INFJ: Sprout,      INFP: Sparkles,    ENFJ: Star,        ENFP: Rocket,
  ISTJ: ClipboardList, ISFJ: ShieldCheck, ESTJ: BarChart3, ESFJ: Users,
  ISTP: Wrench,      ISFP: Palette,     ESTP: Zap,         ESFP: Music,
}

const mbtiAxes = [
  { left: 'E', right: 'I', label: 'Extroversión — Introversión' },
  { left: 'S', right: 'N', label: 'Sensación — Intuición' },
  { left: 'T', right: 'F', label: 'Pensamiento — Sentimiento' },
  { left: 'J', right: 'P', label: 'Juicio — Percepción' },
]

const mbtiGroups = [
  {
    area: 'Tecnología & Ciencias',
    types: ['INTJ', 'INTP', 'ENTJ'],
    badgeStyle: 'background:#f0f6ff; border:1px solid #cce0ff;',
    iconStyle: 'color:#0071e3;',
    labelStyle: 'color:#0066cc;',
  },
  {
    area: 'Salud & Social',
    types: ['INFJ', 'ISFJ', 'ENFJ'],
    badgeStyle: 'background:#f0fff4; border:1px solid #b8ebcb;',
    iconStyle: 'color:#138a52;',
    labelStyle: 'color:#1a7a4a;',
  },
  {
    area: 'Artes & Comunicación',
    types: ['INFP', 'ENFP', 'ISFP'],
    badgeStyle: 'background:#f9f1ff; border:1px solid #e6ccff;',
    iconStyle: 'color:#9b4dca;',
    labelStyle: 'color:#8b3fc0;',
  },
  {
    area: 'Negocios & Gestión',
    types: ['ESTJ', 'ENTJ', 'ESTP'],
    badgeStyle: 'background:#fff7eb; border:1px solid #ffd9a8;',
    iconStyle: 'color:#d97706;',
    labelStyle: 'color:#b45309;',
  },
]
</script>
