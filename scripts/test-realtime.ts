#!/usr/bin/env tsx

/**
 * Script para probar la funcionalidad de Supabase Realtime
 * Ejecutar con: npm run test-realtime
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Cargar variables de entorno desde .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variables de entorno de Supabase no encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  console.log('🚀 Iniciando prueba de Supabase Realtime...\n');

  // 1. Verificar conexión básica
  console.log('1️⃣ Verificando conexión a Supabase...');
  try {
    const { error } = await supabase.from('usuarios').select('count').limit(1);
    if (error) throw error;
    console.log('✅ Conexión a Supabase exitosa\n');
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return;
  }

  // 2. Verificar que las tablas existen
  console.log('2️⃣ Verificando tablas requeridas...');
  const tablas = ['usuarios', 'mensajes_chat', 'puntos_encuentro'];

  for (const tabla of tablas) {
    try {
      const { error } = await supabase.from(tabla).select('*').limit(1);
      if (error && error.code !== 'PGRST116') { // PGRST116 = tabla vacía (OK)
        throw error;
      }
      console.log(`✅ Tabla '${tabla}' accesible`);
    } catch (error) {
      console.error(`❌ Error accediendo tabla '${tabla}':`, error);
    }
  }
  console.log('');

  // 3. Probar suscripción Realtime
  console.log('3️⃣ Probando suscripción Realtime...');

  const channel = supabase
    .channel('test_realtime_mensajes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'mensajes_chat' },
      (payload) => {
        console.log('📨 Evento Realtime recibido:', {
          event: payload.eventType,
          table: payload.table,
          timestamp: new Date().toISOString()
        });
      }
    )
    .subscribe((status) => {
      console.log('📡 Estado de suscripción:', status);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Suscripción Realtime exitosa!');
        console.log('💡 Ahora puedes enviar mensajes desde la aplicación para ver eventos en tiempo real\n');

        // Mantener el script corriendo por 30 segundos para escuchar eventos
        console.log('⏰ Escuchando eventos por 30 segundos...');
        setTimeout(() => {
          console.log('\n🏁 Prueba completada. Desconectando...');
          channel.unsubscribe();
          process.exit(0);
        }, 30000);

      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Error en canal Realtime');
        console.error('💡 Verifica que Realtime esté habilitado en el dashboard de Supabase');
        process.exit(1);

      } else if (status === 'TIMED_OUT') {
        console.error('⏰ Timeout en conexión Realtime');
        console.error('💡 Verifica tu conexión a internet y configuración de Supabase');
        process.exit(1);
      }
    });

  // 4. Información adicional
  console.log('\n📋 Información adicional:');
  console.log(`🔗 Supabase URL: ${supabaseUrl}`);
  console.log(`🔑 API Key: ${supabaseKey?.substring(0, 20)}...`);
  console.log('\n💡 Para habilitar Realtime en Supabase:');
  console.log('   1. Ve a tu dashboard de Supabase');
  console.log('   2. Settings > API');
  console.log('   3. En "Realtime" asegúrate que esté habilitado');
  console.log('   4. En Database > Replication, añade las tablas necesarias');
}

// Manejar Ctrl+C
process.on('SIGINT', () => {
  console.log('\n👋 Cerrando script...');
  process.exit(0);
});

testRealtime().catch(console.error);
