/**
 * Limpieza AGRESIVA del cache semántico.
 * Borra TODO lo que huela a sueldos/ingresos/salarios porque:
 *  - Los montos pudieron cachearse con datos incorrectos (bug anterior)
 *  - Las respuestas por institución específica NO deberían cachearse
 */
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

async function main() {
  // Borrar cualquier cache que tenga un símbolo peso ($) o palabras monetarias
  const patterns = [
    '%$%',               // cualquier monto
    '%sueldo%',
    '%gana%',
    '%ingreso%',
    '%salario%',
    '%CLP%',
    '%mensual%',
    '%millón%',
    '%millones%',
  ]

  let totalBorrado = 0
  for (const p of patterns) {
    const { error, count } = await supabase
      .from('chat_cache')
      .delete({ count: 'exact' })
      .or(`question.ilike.${p},answer.ilike.${p}`)
    if (error) console.error(`  Error con ${p}:`, error.message)
    else {
      console.log(`  Borrado con patrón ${p}: ${count ?? 0}`)
      totalBorrado += count ?? 0
    }
  }
  console.log(`\nTOTAL borrado: ${totalBorrado}`)

  // Verificar cuántas entradas quedan
  const { count } = await supabase.from('chat_cache').select('*', { count: 'exact', head: true })
  console.log(`Entradas restantes en chat_cache: ${count ?? 0}`)
}

main().catch(e => { console.error(e); process.exit(1) })
