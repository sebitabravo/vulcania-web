import { config } from 'dotenv';
import { supabase } from '../lib/supabase';

// Cargar variables de entorno desde .env
config({ path: '.env' });

// Función para normalizar números de teléfono (misma que en auth-context)
const normalizarTelefono = (telefono: string): string => {
  return telefono.replace(/\s/g, "").trim();
};

async function testearBusquedaUsuarios() {
  console.log('🔍 Probando búsqueda de usuarios existentes...');

  if (!supabase) {
    console.error('❌ Supabase no está configurado');
    return;
  }

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

  // Probar búsqueda con algunos números
  const numerosParaProbar = [
    '+56 9 1111 1111',  // Formato con espacios
    '+569111111111',    // Formato sin espacios
    '+56933333333',     // Otro formato
    '+56 9 1234 5678'   // Otro formato con espacios
  ];

  console.log('🧪 Probando búsquedas...');

  for (const numero of numerosParaProbar) {
    console.log(`\n🔍 Buscando: "${numero}"`);
    const normalizado = normalizarTelefono(numero);
    console.log(`   Normalizado: "${normalizado}"`);

    // Buscar usuario que coincida
    const usuarioEncontrado = usuarios.find(usuario => {
      const usuarioNormalizado = normalizarTelefono(usuario.telefono);
      return usuarioNormalizado === normalizado;
    });

    if (usuarioEncontrado) {
      console.log(`   ✅ ENCONTRADO: ${usuarioEncontrado.nombre} (${usuarioEncontrado.telefono})`);
    } else {
      console.log(`   ❌ NO ENCONTRADO`);
    }
  }
}

testearBusquedaUsuarios();
