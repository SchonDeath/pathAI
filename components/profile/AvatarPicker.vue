<template>
  <div class="space-y-3">
    <div class="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        v-for="cat in categories"
        :key="cat.id"
        @click="activeCat = cat.id"
        :class="[
          'px-3 py-1 rounded-full text-xs font-medium transition-all duration-200',
          activeCat === cat.id
            ? 'bg-primary-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        ]">
        {{ cat.label }}
      </button>
    </div>

    <div class="grid grid-cols-6 sm:grid-cols-9 gap-2">
      <button
        v-for="a in filtered"
        :key="a.id"
        type="button"
        @click="select(a)"
        :title="a.label"
        :class="[
          'relative w-12 h-12 rounded-full flex items-center justify-center text-2xl transition-all duration-200 border-2',
          isSelected(a)
            ? 'border-primary-500 scale-110 shadow-md'
            : 'border-transparent hover:scale-105 hover:shadow-sm'
        ]"
        :style="{ backgroundColor: a.bg }">
        <span>{{ a.emoji }}</span>
        <span v-if="isSelected(a)"
          class="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-primary-600 text-white text-[10px] flex items-center justify-center border-2 border-white">
          <Check class="w-2.5 h-2.5" />
        </span>
      </button>
    </div>

    <details class="text-xs text-slate-500">
      <summary class="cursor-pointer hover:text-slate-700 select-none">O usar URL personalizada</summary>
      <input
        :value="customUrl"
        @input="onUrlInput"
        type="url"
        placeholder="https://..."
        class="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
    </details>
  </div>
</template>

<script setup lang="ts">
import { Check } from 'lucide-vue-next'
import { ANIMAL_AVATARS, serializeAnimalAvatar, parseAvatar, type AnimalAvatar } from '~/utils/avatars'

const props = defineProps<{ modelValue: string | null }>()
const emit = defineEmits<{ (e: 'update:modelValue', v: string | null): void }>()

const categories = [
  { id: 'todos', label: 'Todos' },
  { id: 'perro', label: 'Perros' },
  { id: 'gato', label: 'Gatos' },
  { id: 'otro', label: 'Otros' },
] as const

const activeCat = ref<'todos' | 'perro' | 'gato' | 'otro'>('todos')

const filtered = computed(() =>
  activeCat.value === 'todos'
    ? ANIMAL_AVATARS
    : ANIMAL_AVATARS.filter(a => a.category === activeCat.value)
)

const parsed = computed(() => parseAvatar(props.modelValue))

const customUrl = computed(() => parsed.value.kind === 'url' ? parsed.value.url : '')

function isSelected(a: AnimalAvatar) {
  return parsed.value.kind === 'emoji' && parsed.value.emoji === a.emoji
}

function select(a: AnimalAvatar) {
  emit('update:modelValue', serializeAnimalAvatar(a))
}

function onUrlInput(e: Event) {
  const v = (e.target as HTMLInputElement).value.trim()
  emit('update:modelValue', v || null)
}
</script>
