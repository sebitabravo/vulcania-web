import { config } from 'dotenv';
import { supabase } from '../lib/supabase';

// Cargar variables de entorno
config({ path: '.env.local' });

async function verificarTelefonos() {
  console.log('📱 Verificando números de teléfono existentes en la base de datos...');

  if (!supabase) {
    console.error('❌ Supabase no está configurado');
    console.log('🔍 Variables de entorno:');
    console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENTE' : 'FALTANTE');
    console.log('SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENTE' : 'FALTANTE');
    return;
  }

  try {
    // Obtener todos los usuarios con sus teléfonos
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('id, nombre, telefono, fecha_creacion')
      .order('fecha_creacion', { ascending: false });

    if (error) {
      console.error('❌ Error al obtener usuarios:', error);
      return;
    }

    if (!usuarios || usuarios.length === 0) {
      console.log('📭 No hay usuarios en la base de datos');
      return;
    }

    console.log(`📊 Encontrados ${usuarios.length} usuarios:`);
    console.table(usuarios.map(u => ({
      ID: u.id.slice(0, 8) + '...',
      Nombre: u.nombre,
      Teléfono: u.telefono,
      'Longitud Tel': u.telefono.length,
      'Formato': u.telefono.match(/^\+56\s?9\s?\d{4}\s?\d{4}$/) ? '✅ Válido' : '❌ No válido',
      Creado: new Date(u.fecha_creacion).toLocaleDateString()
    })));

    // Mostrar formatos únicos
    const formatosUnicos = [...new Set(usuarios.map(u => u.telefono))];
    console.log('\n📋 Formatos de teléfono únicos encontrados:');
    formatosUnicos.forEach((telefono, index) => {
      const esValido = /^\+56\s?9\s?\d{4}\s?\d{4}$/.test(telefono);
      console.log(`${index + 1}. "${telefono}" (${telefono.length} chars) ${esValido ? '✅' : '❌'}`);
    });

  } catch (error) {
    console.error('💥 Error crítico:', error);
  }
}

verificarTelefonos();
