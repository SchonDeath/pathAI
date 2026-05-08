import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!,
)

const SUSPICIOUS_RE = /(Ã.|Â.|â.|ð.|�)/

function maybeFixMojibake(value: string | null | undefined): string | null | undefined {
  if (!value || !SUSPICIOUS_RE.test(value)) return value
  try {
    const fixed = Buffer.from(value, 'latin1').toString('utf8')
    return fixed
  } catch {
    return value
  }
}

function mapStringArray(arr: string[] | null | undefined): string[] | null | undefined {
  if (!arr) return arr
  return arr.map((x) => maybeFixMojibake(x) || x)
}

async function fixCareers() {
  const pageSize = 500
  let from = 0
  let updated = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('careers')
      .select('id,title,tagline,description,category,match_keywords')
      .range(from, to)

    if (error) throw new Error(`careers select: ${error.message}`)
    if (!data?.length) break

    for (const row of data) {
      const title = maybeFixMojibake(row.title)
      const tagline = maybeFixMojibake(row.tagline)
      const description = maybeFixMojibake(row.description)
      const category = maybeFixMojibake(row.category)
      const match_keywords = mapStringArray(row.match_keywords)

      const changed =
        title !== row.title ||
        tagline !== row.tagline ||
        description !== row.description ||
        category !== row.category ||
        JSON.stringify(match_keywords || []) !== JSON.stringify(row.match_keywords || [])

      if (!changed) continue

      const { error: updErr } = await supabase
        .from('careers')
        .update({ title, tagline, description, category, match_keywords })
        .eq('id', row.id)

      if (updErr) throw new Error(`careers update ${row.id}: ${updErr.message}`)
      updated++
    }

    if (data.length < pageSize) break
    from += pageSize
  }

  return updated
}

async function fixCurricula() {
  const pageSize = 500
  let from = 0
  let updated = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase
      .from('curricula')
      .select('id,institution,institution_type,location,program')
      .range(from, to)

    if (error) throw new Error(`curricula select: ${error.message}`)
    if (!data?.length) break

    for (const row of data) {
      const institution = maybeFixMojibake(row.institution)
      const institution_type = maybeFixMojibake(row.institution_type)
      const location = maybeFixMojibake(row.location)
      const program = maybeFixMojibake(row.program)

      const changed =
        institution !== row.institution ||
        institution_type !== row.institution_type ||
        location !== row.location ||
        program !== row.program

      if (!changed) continue

      const { error: updErr } = await supabase
        .from('curricula')
        .update({ institution, institution_type, location, program })
        .eq('id', row.id)

      if (updErr) throw new Error(`curricula update ${row.id}: ${updErr.message}`)
      updated++
    }

    if (data.length < pageSize) break
    from += pageSize
  }

  return updated
}

async function main() {
  console.log('Fix encoding: scanning careers/curricula...')
  const [careersUpdated, curriculaUpdated] = await Promise.all([fixCareers(), fixCurricula()])
  console.log(`Done. careers updated: ${careersUpdated}, curricula updated: ${curriculaUpdated}`)
}

main().catch((e) => {
  console.error('Fix encoding failed:', e.message)
  process.exit(1)
})
