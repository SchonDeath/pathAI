<template>
  <div class="min-h-screen flex flex-col bg-surface-50">
    <AppHeader />

    <main class="page-shell">
      <div class="max-w-4xl mx-auto space-y-8">

        <LoadingSpinner v-if="!authStore.hydrated" label="Cargando perfil..." />

        <!-- Sin sesión -->
        <div v-else-if="!authStore.isAuthenticated" class="text-center py-24 space-y-4 bg-white rounded-3xl border border-slate-100 shadow-sm">
          <div class="flex justify-center"><Lock class="w-12 h-12 text-slate-400" /></div>
          <h2 class="text-2xl font-bold text-slate-900">Inicia sesión para ver tu perfil</h2>
          <p class="text-slate-500">Guarda carreras, lleva tu historial y personaliza tu experiencia.</p>
          <NuxtLink to="/login" class="btn-primary inline-flex">Iniciar sesión</NuxtLink>
        </div>

        <template v-else>
          <!-- Perfil -->
          <div class="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm sm:p-8">
            <div class="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-6 sm:flex-wrap">
              <div class="relative">
                <UserAvatar
                  :avatar="profile?.avatar_url"
                  :name="profile?.name"
                  :email="profile?.email"
                  size="xl"
                  bordered />
              </div>

              <div class="min-w-0 flex-1 space-y-3 sm:min-w-[240px]">
                <template v-if="!editMode">
                  <h1 class="text-2xl font-bold text-slate-900">{{ profile?.name || 'Usuario' }}</h1>
                  <p class="text-slate-500">{{ profile?.email }}</p>
                  <div class="flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-500">
                    <span v-if="profile?.phone" class="inline-flex items-center gap-1"><Phone class="w-3.5 h-3.5" /> {{ profile.phone }}</span>
                    <span v-if="profile?.gender" class="inline-flex items-center gap-1">{{ genderLabel(profile.gender) }}</span>
                  </div>
                  <p v-if="profile?.bio" class="text-sm text-slate-600 italic">"{{ profile.bio }}"</p>

                  <!-- Preferencias vocacionales -->
                  <div v-if="(profile?.preferred_areas?.length || profile?.preferred_institution_types?.length || profile?.region_interes || profile?.anio_egreso)" class="pt-1 space-y-2">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preferencias</p>
                    <div class="flex flex-wrap gap-1.5">
                      <span v-for="area in (profile?.preferred_areas ?? [])" :key="area"
                        class="text-xs px-2 py-0.5 rounded-full bg-primary-50 border border-primary-200 text-primary-700 font-medium">
                        {{ AREA_LABELS[area] || area }}
                      </span>
                      <span v-for="tipo in (profile?.preferred_institution_types ?? [])" :key="tipo"
                        class="text-xs px-2 py-0.5 rounded-full bg-accent-50 border border-accent-200 text-accent-700 font-medium">
                        {{ tipo }}
                      </span>
                      <span v-if="profile?.region_interes" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"><MapPin class="w-3 h-3" />{{ profile.region_interes }}</span>
                      <span v-if="profile?.anio_egreso" class="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200"><GraduationCap class="w-3 h-3" />Egreso {{ profile.anio_egreso }}</span>
                    </div>
                  </div>

                  <button @click="startEdit" class="text-sm text-primary-600 hover:text-primary-700 font-semibold inline-flex items-center gap-1 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar perfil
                  </button>
                </template>

                <form v-else @submit.prevent="saveProfile" class="space-y-4">
                  <div class="space-y-2">
                    <label class="text-xs font-medium text-slate-600 uppercase tracking-wide">Elige tu avatar</label>
                    <AvatarPicker v-model="form.avatar_url" />
                  </div>

                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div class="space-y-1">
                      <label class="text-xs font-medium text-slate-600">Nombre</label>
                      <input v-model="form.name" type="text" maxlength="80"
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-medium text-slate-600">Teléfono</label>
                      <input v-model="form.phone" type="tel" maxlength="20" placeholder="+56 9 1234 5678"
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition" />
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-medium text-slate-600">Género</label>
                      <select v-model="form.gender"
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white transition">
                        <option :value="null">Sin especificar</option>
                        <option value="masculino">Masculino</option>
                        <option value="femenino">Femenino</option>
                        <option value="prefiero_no_decir">Prefiero no decir</option>
                      </select>
                    </div>
                    <div class="space-y-1">
                      <label class="text-xs font-medium text-slate-600">Fecha de nacimiento</label>
                      <input v-model="form.birth_date" type="date"
                        class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 transition" />
                    </div>
                  </div>

                  <div class="space-y-1">
                    <label class="text-xs font-medium text-slate-600">Bio corta</label>
                    <textarea v-model="form.bio" maxlength="240" rows="2" placeholder="Cuéntanos algo sobre ti..."
                      class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 resize-none transition" />
                  </div>

                  <!-- Preferencias vocacionales -->
                  <div class="border-t border-slate-100 pt-4 space-y-3">
                    <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preferencias vocacionales</p>

                    <div class="space-y-1">
                      <label class="text-xs font-medium text-slate-600">Áreas de interés</label>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="opt in AREA_OPTIONS" :key="opt.value" type="button"
                          @click="toggleArea(opt.value)"
                          class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-[background-color,border-color,color]"
                          :class="form.preferred_areas.includes(opt.value)
                            ? 'bg-primary-600 border-primary-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-primary-300'">
                          <component :is="opt.icon" class="w-3.5 h-3.5" />
                          {{ opt.label }}
                        </button>
                      </div>
                    </div>

                    <div class="space-y-1">
                      <label class="text-xs font-medium text-slate-600">Tipo de institución</label>
                      <div class="flex flex-wrap gap-2">
                        <button
                          v-for="opt in TIPO_INST_OPTIONS" :key="opt" type="button"
                          @click="toggleTipo(opt)"
                          class="px-2.5 py-1 rounded-full text-xs font-medium border transition-[background-color,border-color,color]"
                          :class="form.preferred_institution_types.includes(opt)
                            ? 'bg-accent-600 border-accent-600 text-white'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-accent-300'">
                          {{ opt }}
                        </button>
                      </div>
                    </div>

                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-600">Región donde quieres estudiar</label>
                        <select v-model="form.region_interes"
                          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white transition">
                          <option :value="null">Sin preferencia</option>
                          <option v-for="r in REGIONES" :key="r" :value="r">{{ r }}</option>
                        </select>
                      </div>
                      <div class="space-y-1">
                        <label class="text-xs font-medium text-slate-600">Año esperado de egreso</label>
                        <select v-model="form.anio_egreso"
                          class="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white transition">
                          <option :value="null">Sin especificar</option>
                          <option v-for="y in ANIOS_EGRESO" :key="y" :value="y">{{ y }}</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <p v-if="saveError" class="text-xs text-red-500">{{ saveError }}</p>
                  <div class="flex flex-col gap-2 pt-1 sm:flex-row sm:items-center">
                    <button type="submit" :disabled="saving"
                      class="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary-700 disabled:opacity-60 sm:w-auto">
                      {{ saving ? 'Guardando...' : 'Guardar' }}
                    </button>
                    <button type="button" @click="cancelEdit"
                      class="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto">
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>

              <button @click="signOut" class="self-start text-sm text-slate-500 transition hover:text-red-500 sm:self-auto">
                Cerrar sesión
              </button>
            </div>
          </div>

          <!-- Carreras guardadas -->
          <div class="space-y-4">
            <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 class="text-xl font-bold text-slate-900">Carreras guardadas</h2>
              <NuxtLink to="/explore" class="text-sm text-primary-600 hover:text-primary-700 font-medium">Explorar más →</NuxtLink>
            </div>

            <LoadingSpinner v-if="loadingSaved" label="Cargando tus carreras..." />

            <div v-else-if="savedCareers.length === 0" class="text-center py-12 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div class="flex justify-center"><BookOpen class="w-9 h-9 text-slate-400" /></div>
              <p class="text-slate-600 font-medium">No tienes carreras guardadas aún.</p>
              <NuxtLink to="/explore" class="btn-primary text-sm inline-flex">Explorar Carreras</NuxtLink>
            </div>

            <div v-else class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div
                v-for="item in savedCareers"
                :key="item.id"
                class="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5">
                <BookOpen class="w-8 h-8 text-primary-600 shrink-0" />
                <div class="flex-1 min-w-0">
                  <NuxtLink :to="`/careers/${item.career?.slug || item.career_id}`" class="font-bold text-slate-900 hover:text-primary-600 transition line-clamp-1">
                    {{ item.career?.title }}
                  </NuxtLink>
                  <p class="text-sm text-slate-500 mt-0.5 line-clamp-2">{{ item.career?.tagline }}</p>
                  <textarea
                    v-model="item.notes"
                    placeholder="Agrega notas..."
                    rows="2"
                    class="mt-2 w-full text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100 resize-none focus:outline-none focus:ring-1 focus:ring-primary-300"
                    @blur="saveNote(item)"
                  />
                </div>
                <button @click="removeSaved(item.id)" class="text-slate-300 hover:text-red-500 transition flex-shrink-0" title="Eliminar">
                  <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </template>

      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ middleware: 'auth' })
import { BarChart3, BookOpen, BookText, FlaskConical, GraduationCap, HeartPulse, Laptop, Lock, MapPin, Palette, Phone, Scale } from 'lucide-vue-next'
import { useAuthStore } from '~/stores/auth'

useHead({ title: 'Mi Perfil — KoraChile' })

const supabase = useSupabaseClient()
const authStore = useAuthStore()
const router = useRouter()

const AREA_OPTIONS = [
  { value: 'tecnologia', label: 'Tecnología', icon: Laptop },
  { value: 'salud', label: 'Salud', icon: HeartPulse },
  { value: 'negocios', label: 'Negocios', icon: BarChart3 },
  { value: 'arte', label: 'Arte y Diseño', icon: Palette },
  { value: 'ciencias', label: 'Ciencias', icon: FlaskConical },
  { value: 'derecho', label: 'Derecho', icon: Scale },
  { value: 'educacion', label: 'Educación', icon: BookText },
]
const AREA_LABELS: Record<string, string> = Object.fromEntries(AREA_OPTIONS.map(o => [o.value, o.label]))

const TIPO_INST_OPTIONS = ['Universidades', 'Institutos Profesionales', 'Centros de Formación Técnica']

const REGIONES = [
  'Región de Arica y Parinacota', 'Región de Tarapacá', 'Región de Antofagasta',
  'Región de Atacama', 'Región de Coquimbo', 'Región de Valparaíso',
  'Región Metropolitana de Santiago', "Región del Libertador Gral. Bernardo O'Higgins",
  'Región del Maule', 'Región de Ñuble', 'Región del Biobío',
  'Región de La Araucanía', 'Región de Los Ríos', 'Región de Los Lagos',
  'Región de Aysén', 'Región de Magallanes',
]

const currentYear = new Date().getFullYear()
const ANIOS_EGRESO = Array.from({ length: 5 }, (_, i) => currentYear + i)

const profile = computed(() => authStore.profile)
const savedCareers = ref<any[]>([])
const loadingSaved = ref(false)

const editMode = ref(false)
const saving = ref(false)
const saveError = ref<string | null>(null)
const form = reactive({
  name: '',
  avatar_url: null as string | null,
  phone: '',
  gender: null as string | null,
  birth_date: '',
  bio: '',
  preferred_areas: [] as string[],
  preferred_institution_types: [] as string[],
  region_interes: null as string | null,
  anio_egreso: null as number | null,
})

function toggleArea(val: string) {
  const i = form.preferred_areas.indexOf(val)
  if (i === -1) form.preferred_areas.push(val)
  else form.preferred_areas.splice(i, 1)
}

function toggleTipo(val: string) {
  const i = form.preferred_institution_types.indexOf(val)
  if (i === -1) form.preferred_institution_types.push(val)
  else form.preferred_institution_types.splice(i, 1)
}

function genderLabel(g: string | null | undefined) {
  if (g === 'masculino') return 'Masculino'
  if (g === 'femenino') return 'Femenino'
  if (g === 'prefiero_no_decir') return 'Prefiero no decir'
  return ''
}

function startEdit() {
  if (!profile.value) return
  form.name = profile.value.name || ''
  form.avatar_url = profile.value.avatar_url || null
  form.phone = profile.value.phone || ''
  form.gender = profile.value.gender || null
  form.birth_date = profile.value.birth_date || ''
  form.bio = profile.value.bio || ''
  form.preferred_areas = [...(profile.value.preferred_areas ?? [])]
  form.preferred_institution_types = [...(profile.value.preferred_institution_types ?? [])]
  form.region_interes = profile.value.region_interes || null
  form.anio_egreso = profile.value.anio_egreso || null
  saveError.value = null
  editMode.value = true
}

function cancelEdit() {
  editMode.value = false
  saveError.value = null
}

async function saveProfile() {
  if (!profile.value) return
  saving.value = true
  saveError.value = null
  try {
    const cleanName = form.name.trim().replace(/[<>"'`]/g, '').slice(0, 80)
    if (cleanName.length < 2) throw new Error('El nombre debe tener al menos 2 caracteres.')
    const cleanPhone = form.phone.trim().replace(/[<>"'`]/g, '').slice(0, 20) || null
    const cleanBio = form.bio.trim().replace(/[<>"'`]/g, '').slice(0, 240) || null
    const patch: Record<string, any> = {
      name: cleanName,
      avatar_url: form.avatar_url || null,
      phone: cleanPhone,
      gender: form.gender || null,
      birth_date: form.birth_date || null,
      bio: cleanBio,
      preferred_areas: form.preferred_areas,
      preferred_institution_types: form.preferred_institution_types,
      region_interes: form.region_interes || null,
      anio_egreso: form.anio_egreso || null,
    }
    const { error } = await supabase
      .from('users')
      .update(patch)
      .eq('id', profile.value.id)
    if (error) throw error

    authStore.setProfile({ ...profile.value, ...patch })
    editMode.value = false
  } catch (e: any) {
    saveError.value = e.message || 'No se pudo guardar.'
  } finally {
    saving.value = false
  }
}

async function fetchSaved() {
  if (!profile.value) return
  loadingSaved.value = true
  const { data } = await supabase
    .from('saved')
    .select('id, notes, career_id, career:careers(id, slug, title, tagline, emoji)')
    .eq('user_id', profile.value.id)
    .not('career_id', 'is', null)
    .order('created_at', { ascending: false })
  savedCareers.value = data ?? []
  loadingSaved.value = false
}

async function removeSaved(savedId: string) {
  await supabase.from('saved').delete().eq('id', savedId)
  savedCareers.value = savedCareers.value.filter(s => s.id !== savedId)
}

async function saveNote(item: any) {
  await supabase.from('saved').update({ notes: item.notes }).eq('id', item.id)
}

async function signOut() {
  await authStore.signOut()
  savedCareers.value = []
  await router.push('/')
}

onMounted(async () => {
  await authStore.ensureHydrated()
  if (authStore.isAuthenticated) await fetchSaved()
})
</script>
