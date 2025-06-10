const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Cargar variables de entorno
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Configuración de Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Faltan variables de entorno de Supabase');
  console.log('Asegúrate de tener configurado:');
  console.log('- NEXT_PUBLIC_SUPABASE_URL');
  console.log('- SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function executeMigration() {
  try {
    console.log('🚀 Iniciando migración de base de datos...');

    // Verificar si la columna ya existe
    console.log('🔍 Verificando si la columna "ocupado" ya existe...');
    const { data: testData, error: testError } = await supabase
      .from('puntos_encuentro')
      .select('ocupado')
      .limit(1);

    if (!testError) {
      console.log('✅ La columna "ocupado" ya existe y es funcional');
      console.log('🎉 La funcionalidad de gestión de capacidad está lista para usar');
      return;
    }

    if (testError.message.includes('column "ocupado" does not exist')) {
      console.log('⚠️  La columna "ocupado" no existe. Necesitas ejecutar la migración manualmente en Supabase.');
      console.log('\n🔧 INSTRUCCIONES PARA EJECUTAR LA MIGRACIÓN:');
      console.log('1. Ve a tu proyecto Supabase: https://supabase.com/dashboard/projects');
      console.log('2. Selecciona tu proyecto (wfswbuoewaucyyzweknq)');
      console.log('3. Ve a "SQL Editor" en el menú lateral');
      console.log('4. Ejecuta este SQL:');
      console.log('\n--- EJECUTA ESTE SQL EN SUPABASE ---');
      console.log('ALTER TABLE puntos_encuentro ADD COLUMN IF NOT EXISTS ocupado BOOLEAN DEFAULT FALSE;');
      console.log('UPDATE puntos_encuentro SET ocupado = FALSE WHERE ocupado IS NULL;');
      console.log('--- FIN DEL SQL ---\n');
      console.log('5. Después ejecuta este script de nuevo para verificar');
      return;
    }

    throw testError;

  } catch (error) {
    console.error('❌ Error durante la migración:', error.message);
    console.log('\n🔧 SOLUCIÓN ALTERNATIVA:');
    console.log('Ejecuta manualmente este SQL en Supabase SQL Editor:');
    console.log('ALTER TABLE puntos_encuentro ADD COLUMN IF NOT EXISTS ocupado BOOLEAN DEFAULT FALSE;');
    console.log('UPDATE puntos_encuentro SET ocupado = FALSE WHERE ocupado IS NULL;');
    process.exit(1);
  }
}

// Ejecutar la migración
executeMigration();
