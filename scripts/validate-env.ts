#!/usr/bin/env npx tsx

/**
 * Script para validar las variables de entorno de Supabase
 * Uso: npm run validate-env
 */

interface EnvVariable {
  name: string;
  required: boolean;
  description: string;
}

const REQUIRED_ENV_VARS: EnvVariable[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'URL del proyecto de Supabase'
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Clave anónima de Supabase (public)'
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: false,
    description: 'Clave de servicio de Supabase (para operaciones admin)'
  },
  {
    name: 'SUPABASE_JWT_SECRET',
    required: false,
    description: 'Secreto JWT de Supabase'
  }
];

function validateEnvironment() {
  console.log('🔍 Validando variables de entorno de Supabase...\n');

  let hasErrors = false;
  let hasWarnings = false;

  REQUIRED_ENV_VARS.forEach(({ name, required, description }) => {
    const value = process.env[name];
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
        console.log('   ⚠️  OPCIONAL - Funcionalidad limitada sin esta variable');
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
    console.log('');
    process.exit(1);
  } else if (hasWarnings) {
    console.log('⚠️  VALIDACIÓN PARCIAL: Variables opcionales faltantes');
    console.log('   El proyecto funcionará con funcionalidad limitada');
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

  REQUIRED_ENV_VARS.forEach(({ name, required }) => {
    console.log(`   ${required ? '🔴' : '🟡'} ${name}`);
  });

  console.log('');
  console.log('4. Redeploy tu aplicación');
  console.log('');
  console.log('🔴 = Obligatoria | 🟡 = Opcional');
}

if (require.main === module) {
  console.clear();
  validateEnvironment();

  if (process.argv.includes('--vercel-help')) {
    console.log('\n' + '='.repeat(50));
    showVercelInstructions();
  }
}

export { validateEnvironment, REQUIRED_ENV_VARS };
