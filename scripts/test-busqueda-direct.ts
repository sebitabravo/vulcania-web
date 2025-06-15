import { createClient } from '@supabase/supabase-js';

// Variables directas para prueba
const supabaseUrl = "https://dlkmambmqjxgdlwobxrz.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsa21hbWJtcWp4Z2Rsd29ieHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mjc2MjgsImV4cCI6MjA2NTUwMzYyOH0.0pZwKWdTdNOIlVntbvHS9COC1NtIOoImz5op-hTpO3A";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Función para normalizar números de teléfono (misma que en auth-context)
const normalizarTelefono = (telefono: string): string => {
  return telefono.replace(/\s/g, "").trim();
};

async function testearBusquedaUsuarios() {
  console.log('🔍 Probando búsqueda de usuarios existentes...');

  try {
    // Obtener todos los usuarios
    const { data: usuarios, error } = await supabase
      .from('usuarios')
      .select('*')
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

    // Mostrar formatos normalizados
    usuarios.forEach((usuario, index) => {
      const normalizado = normalizarTelefono(usuario.telefono);
      console.log(`${index + 1}. ${usuario.nombre}`);
      console.log(`   Original: "${usuario.telefono}"`);
      console.log(`   Normalizado: "${normalizado}"`);
      console.log('');
    });

    // Probar búsqueda con algunos números que vimos en la imagen
    const numerosParaProbar = [
      '+56 9 1111 1111',  // Para Ana Pérez
      '+569111111111',    // Formato sin espacios del mismo
      '+56933333333',     // Para Claudia Soto
      '+56 9 3333 3333',  // Formato con espacios del mismo
      '+56 9 1234 5678',  // Para Usuario 5678
      '+569123456789'     // Otro formato sin espacios
    ];

    console.log('🧪 Probando búsquedas simulando login...');

    for (const numero of numerosParaProbar) {
      console.log(`\n🔍 Simulando login con: "${numero}"`);
      const normalizado = normalizarTelefono(numero);
      console.log(`   Normalizado: "${normalizado}"`);

      // Simular la lógica de búsqueda del login

      // 1. Búsqueda exacta
      const { data: exacto } = await supabase
        .from('usuarios')
        .select('*')
        .eq('telefono', numero)
        .single();

      if (exacto) {
        console.log(`   ✅ ENCONTRADO (búsqueda exacta): ${exacto.nombre}`);
        continue;
      }

      // 2. Búsqueda normalizada
      const { data: normalizada } = await supabase
        .from('usuarios')
        .select('*')
        .eq('telefono', normalizado)
        .single();

      if (normalizada) {
        console.log(`   ✅ ENCONTRADO (búsqueda normalizada): ${normalizada.nombre}`);
        continue;
      }

      // 3. Búsqueda flexible
      const usuarioEncontrado = usuarios.find(usuario => {
        const usuarioNormalizado = normalizarTelefono(usuario.telefono);
        return usuarioNormalizado === normalizado;
      });

      if (usuarioEncontrado) {
        console.log(`   ✅ ENCONTRADO (búsqueda flexible): ${usuarioEncontrado.nombre}`);
      } else {
        console.log(`   ❌ NO ENCONTRADO - Se crearía usuario nuevo`);
      }
    }

  } catch (error) {
    console.error('💥 Error crítico:', error);
  }
}

testearBusquedaUsuarios();
