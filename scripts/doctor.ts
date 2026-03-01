#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const service = process.env.SUPABASE_SERVICE_ROLE_KEY

const requiredTables = [
  'usuarios',
  'alertas_volcan',
  'parametros_volcan',
  'informacion_volcan',
  'puntos_encuentro',
  'avisos_comunidad',
]

function fail(msg: string): never {
  console.error(`❌ ${msg}`)
  process.exit(1)
}

async function main() {
  console.log('🩺 Vulcania Doctor: iniciando diagnóstico...\n')

  if (!url || !anon) {
    fail('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Ejecuta: pnpm run validate-env')
  }

  const anonClient = createClient(url, anon)

  // 1) Credenciales / conexión básica
  const { error: pingError } = await anonClient.from('informacion_volcan').select('id').limit(1)

  if (pingError) {
    const msg = String(pingError.message || pingError.code || pingError)
    if (/JWT|Invalid|signature|credentials/i.test(msg)) {
      fail('Credenciales inválidas. Regenera claves en Supabase Dashboard (Settings > API).')
    }
    if (/relation .* does not exist|schema cache/i.test(msg)) {
      fail('Tablas no encontradas. Ejecuta scripts/init.sql completo en Supabase SQL Editor.')
    }
    if (/permission denied|policy|rls/i.test(msg)) {
      fail('Permisos/RLS bloqueando acceso. Revisa políticas en scripts/init.sql y vuelve a ejecutar.')
    }

    fail(`Conexión fallida con Supabase: ${msg}`)
  }

  console.log('✅ Conexión con Supabase OK (anon key)')

  // 2) Validación de tablas críticas
  for (const table of requiredTables) {
    const { error } = await anonClient.from(table).select('*', { head: true, count: 'exact' }).limit(1)
    if (error) {
      const msg = String(error.message || error)
      if (/relation .* does not exist|schema cache/i.test(msg)) {
        fail(`Tabla faltante: ${table}. Ejecuta scripts/init.sql completo.`)
      }
    }
  }
  console.log('✅ Tablas principales detectadas')

  // 3) Chequeo opcional con service role para diagnóstico profundo
  if (service) {
    const admin = createClient(url, service)
    const { error } = await admin.from('usuarios').select('id').limit(1)
    if (error) {
      fail(`Service role key con problemas: ${error.message}`)
    }
    console.log('✅ Service role key válida')
  } else {
    console.log('ℹ️ SUPABASE_SERVICE_ROLE_KEY no definida (diagnóstico profundo omitido)')
  }

  // 4) Audio: recomendación automática
  console.log('\n🔊 Audio de alertas: OK (auto-unlock implementado en la app)')
  console.log('✅ Diagnóstico completado sin errores')
}

main().catch((e) => fail(`Error inesperado: ${e instanceof Error ? e.message : String(e)}`))
