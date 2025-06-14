#!/usr/bin/env node

/**
 * Script para desplegar a Vercel con validación de variables de entorno
 */

import { execSync } from 'child_process';

console.log('🚀 Preparando despliegue a Vercel...\n');

// 1. Validar build local
console.log('1️⃣ Validando build local...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build local exitoso');
} catch {
  console.error('❌ Build local falló. Corrige los errores antes de desplegar.');
  process.exit(1);
}

// 2. Verificar que tenemos el proyecto configurado en Vercel
console.log('\n2️⃣ Verificando configuración de Vercel...');
try {
  execSync('vercel env ls', { encoding: 'utf8', stdio: 'pipe' });
  console.log('✅ Vercel configurado correctamente');
} catch {
  console.log('⚠️  Parece que necesitas configurar Vercel primero');
  console.log('Ejecuta: vercel link');
  process.exit(1);
}

// 3. Mostrar variables que deben estar en Vercel
console.log('\n3️⃣ Variables requeridas en Vercel:');
console.log('   🔴 NEXT_PUBLIC_SUPABASE_URL');
console.log('   🔴 NEXT_PUBLIC_SUPABASE_ANON_KEY');
console.log('   🟡 SUPABASE_SERVICE_ROLE_KEY (opcional)');
console.log('   🟡 SUPABASE_JWT_SECRET (opcional)');

console.log('\n4️⃣ Desplegando a producción...');
try {
  execSync('vercel --prod', { stdio: 'inherit' });
  console.log('✅ Despliegue completado');

} catch (deployError) {
  console.error('❌ Error en el despliegue:', deployError.message);
  process.exit(1);
}

console.log('\n🎉 ¡Despliegue exitoso!');
console.log('No olvides verificar que el mapa se renderice correctamente en producción.');
