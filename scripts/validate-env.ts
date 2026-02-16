#!/usr/bin/env npx tsx

/**
 * Script para validar variables de entorno (modo demo u modo completo con Supabase)
 * Uso: npm run validate-env
 */

interface EnvVariable {
  name: string;
  requiredInFullMode?: boolean;
  description: string;
}

const ENV_VARS: EnvVariable[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    requiredInFullMode: true,
    description: 'URL del proyecto de Supabase'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    requiredInFullMode: true,
    description: 'Clave anónima de Supabase (public)'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    description: 'Clave de servicio de Supabase (para operaciones admin)'
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    description: 'Secreto JWT de Supabase'
  },
  {
    name: 'NEXT_PUBLIC_DEMO_MODE',
    description: 'Activa modo demo en el frontend'
  },
  {
    name: 'NEXT_PUBLIC_DEMO_READONLY',
    description: 'Bloquea escrituras en modo demo'
  },
  {
    name: 'NEXT_PUBLIC_DEMO_PHONE',
    description: 'Teléfono sugerido para acceso demo'
  },
  {
    name: 'NEXT_PUBLIC_ENABLE_ADMIN_PANEL',
    description: 'Permite abrir panel admin con atajo (Ctrl+Shift+A)'
  }
];

function validateEnvironment() {
  console.log('🔍 Validando variables de entorno...\n');

  let hasErrors = false;
  let hasWarnings = false;
  const hasSupabaseConfig = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  const demoModeSetting = process.env.NEXT_PUBLIC_DEMO_MODE;
  const demoMode = demoModeSetting
    ? demoModeSetting.toLowerCase() === 'true'
    : !hasSupabaseConfig;

  console.log(`🧭 Modo detectado: ${demoMode ? 'DEMO OFFLINE' : 'MODO COMPLETO (con Supabase)'}`);
  console.log('');

  ENV_VARS.forEach(({ name, requiredInFullMode, description }) => {
    const value = process.env[name];
    const required = Boolean(requiredInFullMode && !demoMode);
    const status = value ? '✅' : (required ? '❌' : '⚠️');

    console.log(`${status} ${name}`);
    console.log(`   ${description}`);

    if (value) {
      console.log(`   Valor: ${name.includes('KEY') || name.includes('SECRET')
        ? value.substring(0, 20) + '...'
        : value}`);
    } else {
      if (required) {
        console.log('   ❌ FALTANTE - Esta variable es OBLIGATORIA');
        hasErrors = true;
      } else {
        console.log('   ⚠️  OPCIONAL - Funcionalidad limitada o modo demo activo');
        hasWarnings = true;
      }
    }
    console.log();
  });

  // Información adicional sobre el entorno
  console.log('📋 Información del entorno:');
  console.log(`   NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Plataforma: ${process.platform}`);
  console.log();

  // Resumen
  if (hasErrors) {
    console.log('❌ VALIDACIÓN FALLIDA: Variables obligatorias faltantes');
    console.log('');
    console.log('🔧 Para corregir:');
    console.log('   • Local: Agrega las variables a tu archivo .env.local');
    console.log('   • Vercel: Ve a tu proyecto → Settings → Environment Variables');
    console.log('   • Si no usarás Supabase, activa NEXT_PUBLIC_DEMO_MODE=true');
    console.log('');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  VALIDACIÓN PARCIAL: Variables opcionales faltantes');
    console.log(
      demoMode
        ? '   El proyecto funcionará en modo demo sin Supabase'
        : '   El proyecto funcionará con funcionalidad limitada'
    );
  } else {
    console.log('✅ VALIDACIÓN EXITOSA: Todas las variables están configuradas');
  }

  console.log();
}

// Instrucciones para Vercel
function showVercelInstructions() {
  console.log('📚 INSTRUCCIONES PARA VERCEL:');
  console.log('');
  console.log('1. Ve a tu proyecto en Vercel Dashboard');
  console.log('2. Settings → Environment Variables');
  console.log('3. Agrega estas variables:');
  console.log('');

  ENV_VARS.forEach(({ name, requiredInFullMode }) => {
    console.log(`   ${requiredInFullMode ? '🟡' : '🟢'} ${name}`);
  });

  console.log('');
  console.log('4. Redeploy tu aplicación');
  console.log('5. Si usas demo offline, define NEXT_PUBLIC_DEMO_MODE=true.');
  console.log('6. Si usas modo completo, agrega URL y ANON KEY de Supabase.');
  console.log('');
  console.log('🟡 = Requerida solo en modo completo | 🟢 = Opcional');
}

if (require.main === module) {
  console.clear();
  validateEnvironment();

  if (process.argv.includes('--vercel-help')) {
    console.log('\n' + '='.repeat(50));
    showVercelInstructions();
  }
}

export { validateEnvironment, ENV_VARS };
