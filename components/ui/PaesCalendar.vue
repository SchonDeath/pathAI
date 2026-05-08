<template>
  <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
    <!-- Header -->
    <div class="px-5 py-3 bg-gradient-to-r from-primary-50 to-accent-50 border-b border-slate-200 space-y-2">
      <div class="flex items-center gap-2">
        <CalendarDays class="w-4 h-4 text-primary-700" />
        <span class="font-bold text-slate-800 text-sm">Calendario PAES {{ PAES_YEAR }}</span>
      </div>
      <!-- Filtro de proceso — fila separada para que no se comprima -->
      <div class="flex rounded-lg overflow-hidden border border-slate-200 text-xs font-semibold w-full">
        <button
          v-for="opt in PROCESS_OPTS"
          :key="opt.value ?? 'todos'"
          @click="activeProcess = opt.value"
          class="flex-1 py-1.5 transition-colors whitespace-nowrap text-center"
          :class="activeProcess === opt.value
            ? 'bg-primary-600 text-white'
            : 'bg-white text-slate-600 hover:bg-slate-50'">
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- Próximo evento destacado -->
    <div v-if="nextEvent" class="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50/60 to-white">
      <div class="flex items-center gap-3">
        <div class="shrink-0 text-center bg-white border-2 rounded-xl p-2 min-w-[52px]"
          :class="eventBorderColor(nextEvent.type)">
          <div class="text-[10px] font-bold uppercase tracking-wider" :class="eventTextColor(nextEvent.type)">{{ monthShort(nextEvent.date) }}</div>
          <div class="text-xl font-extrabold text-slate-900 leading-none">{{ dayNum(nextEvent.date) }}</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="text-xs px-2 py-0.5 rounded-full border font-semibold" :class="PAES_EVENT_COLORS[nextEvent.type]">
              <component :is="TYPE_ICONS[nextEvent.type]" class="w-3 h-3 inline-block mr-1" />
              {{ TYPE_LABELS[nextEvent.type] }}
            </span>
            <span class="text-xs text-slate-500">{{ PAES_PROCESS_LABELS[nextEvent.process] }}</span>
          </div>
          <p class="font-bold text-slate-900 text-sm mt-0.5 truncate">{{ nextEvent.label }}</p>
          <p class="text-xs text-slate-500">
            {{ daysUntilLabel(nextEvent.date) }}
            <span v-if="nextEvent.dateEnd"> · hasta {{ formatDate(nextEvent.dateEnd) }}</span>
          </p>
        </div>
        <a
          v-if="nextEvent.url"
          :href="nextEvent.url"
          target="_blank"
          rel="noopener"
          class="shrink-0 px-2.5 py-1.5 rounded-lg border border-primary-200 text-primary-700 text-xs font-semibold hover:bg-primary-50 transition">
          Ver →
        </a>
      </div>
    </div>

    <!-- Lista de eventos -->
    <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
      <div
        v-for="event in filteredEvents"
        :key="event.id"
        class="flex items-start gap-3 px-5 py-3 hover:bg-slate-50/60 transition"
        :class="isPast(event.date) ? 'opacity-45' : ''">
        <!-- Fecha mini -->
        <div class="shrink-0 text-center min-w-[40px]">
          <div class="text-[9px] font-bold uppercase tracking-wider text-slate-500">{{ monthShort(event.date) }}</div>
          <div class="text-base font-extrabold text-slate-700 leading-tight">{{ dayNum(event.date) }}</div>
        </div>
        <!-- Contenido -->
        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] px-1.5 py-0.5 rounded-full border font-semibold" :class="PAES_EVENT_COLORS[event.type]">
              <component :is="TYPE_ICONS[event.type]" class="w-3 h-3 inline-block mr-1" />
              {{ TYPE_LABELS[event.type] }}
            </span>
          </div>
          <p class="text-sm font-semibold text-slate-800 leading-snug">{{ event.label }}</p>
          <p class="text-xs text-slate-500 leading-snug line-clamp-2">{{ event.description }}</p>
        </div>
        <!-- Estado -->
        <div class="shrink-0 text-right">
          <span v-if="isPast(event.date)" class="text-[10px] text-slate-500 font-medium">Pasado</span>
          <span v-else class="text-[10px] font-bold text-primary-600">{{ daysUntil(event.date) }}d</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="px-5 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
      <p class="text-[10px] text-slate-500">Fuente: DEMRE · Fechas referenciales {{ PAES_YEAR }}</p>
      <a href="https://demre.cl" target="_blank" rel="noopener" class="text-[10px] text-primary-600 hover:underline font-semibold">demre.cl →</a>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { CalendarDays, Clock3, FilePenLine, FileText, Info, Trophy } from 'lucide-vue-next'
import {
  PAES_EVENTS,
  PAES_YEAR,
  PAES_EVENT_COLORS,
  PAES_PROCESS_LABELS,
  getNextPaesEvent,
  daysUntil,
  type PaesEvent,
} from '~/utils/paesDates'

const PROCESS_OPTS = [
  { value: null, label: 'Todos' },
  { value: 'invierno', label: 'Invierno' },
  { value: 'regular', label: 'Regular' },
] as const

const activeProcess = ref<'regular' | 'invierno' | null>(null)

const filteredEvents = computed(() =>
  PAES_EVENTS.filter(e => {
    if (!activeProcess.value) return true
    return e.process === activeProcess.value || e.process === 'ambos'
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
)

const nextEvent = computed(() => getNextPaesEvent(activeProcess.value ?? undefined))

const TYPE_LABELS: Record<PaesEvent['type'], string> = {
  exam: 'Examen',
  result: 'Resultados',
  registration: 'Inscripción',
  deadline: 'Plazo',
  info: 'Info',
}

const TYPE_ICONS: Record<PaesEvent['type'], Component> = {
  exam: FileText,
  result: Trophy,
  registration: FilePenLine,
  deadline: Clock3,
  info: Info,
}

function isPast(dateIso: string): boolean {
  return new Date(dateIso) < new Date()
}

function daysUntilLabel(dateIso: string): string {
  const d = daysUntil(dateIso)
  if (d === 0) return 'Hoy'
  if (d === 1) return 'Mañana'
  if (d < 0) return `Hace ${Math.abs(d)} días`
  return `En ${d} días`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })
}

function monthShort(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CL', { month: 'short' }).replace('.', '')
}

function dayNum(iso: string): string {
  return new Date(iso).getDate().toString()
}

function eventBorderColor(type: PaesEvent['type']): string {
  const m: Record<string, string> = {
    exam: 'border-red-300',
    result: 'border-emerald-300',
    registration: 'border-blue-300',
    deadline: 'border-amber-300',
    info: 'border-slate-300',
  }
  return m[type] ?? 'border-slate-200'
}

function eventTextColor(type: PaesEvent['type']): string {
  const m: Record<string, string> = {
    exam: 'text-red-600',
    result: 'text-emerald-600',
    registration: 'text-blue-600',
    deadline: 'text-amber-600',
    info: 'text-slate-600',
  }
  return m[type] ?? 'text-slate-600'
}
</script>
