import { supabase, isSupabaseConfigured } from './lib/supabase';

// Script de prueba para verificar la configuración de Supabase
export async function testSupabaseConnection() {
  console.log('🔧 Probando conexión a Supabase...');

  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase no está configurado');
    return false;
  }  try {
    // Probar conexión básica con la tabla usuarios
    const { data, error } = await supabase!.from('usuarios').select('id, nombre, telefono').limit(1);

    if (error) {
      console.error('❌ Error conectando a Supabase:', error);
      return false;
    }

    console.log('✅ Conexión a Supabase exitosa');
    console.log('📊 Datos de prueba usuarios:', data);
    return true;
  } catch (error) {
    console.error('❌ Error de conexión:', error);
    return false;
  }
}

export async function testTableStructure() {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase no está configurado');
    return;
  }

  console.log('🔧 Probando estructura de tablas...');

  try {
    // Probar tabla usuarios
    console.log('📋 Verificando tabla usuarios...');
    const { data: usuarios, error: errorUsuarios } = await supabase!
      .from('usuarios')
      .select('id, nombre, telefono, fecha_creacion')
      .limit(5);

    if (errorUsuarios) {
      console.error('❌ Error en tabla usuarios:', errorUsuarios);
      console.error('📋 Detalles:', {
        message: errorUsuarios.message,
        details: errorUsuarios.details,
        hint: errorUsuarios.hint,
        code: errorUsuarios.code
      });
    } else {
      console.log('✅ Tabla usuarios OK');
      console.log('📊 Usuarios encontrados:', usuarios?.length || 0);
      console.log('📄 Datos de muestra:', usuarios);
    }

    // Probar tabla avisos_comunidad
    console.log('📋 Verificando tabla avisos_comunidad...');
    const { data: avisos, error: errorAvisos } = await supabase!
      .from('avisos_comunidad')
      .select('id, usuario_id, mensaje, fecha_creacion, estado')
      .limit(5);

    if (errorAvisos) {
      console.error('❌ Error en tabla avisos_comunidad:', errorAvisos);
      console.error('📋 Detalles:', {
        message: errorAvisos.message,
        details: errorAvisos.details,
        hint: errorAvisos.hint,
        code: errorAvisos.code
      });
    } else {
      console.log('✅ Tabla avisos_comunidad OK');
      console.log('📊 Avisos encontrados:', avisos?.length || 0);
      console.log('📄 Datos de muestra:', avisos);
    }

    // Test de inserción en avisos_comunidad (simulada)
    console.log('🧪 Probando estructura de inserción...');
    const testData = {
      usuario_id: 'test-user-id',
      mensaje: 'Test message',
      estado: 'activo'
    };
    console.log('📋 Estructura de datos para insertar:', testData);

  } catch (error) {
    console.error('❌ Error general:', error);
  }
}

export async function testMessageInsertion(usuarioId: string) {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase no está configurado');
    return false;
  }

  console.log('🧪 Probando inserción de mensaje de prueba...');
  console.log('👤 Usuario ID:', usuarioId);

  try {
    const testMessage = {
      usuario_id: usuarioId,
      mensaje: `Mensaje de prueba - ${new Date().toISOString()}`,
      estado: 'activo'
    };

    console.log('📝 Datos a insertar:', testMessage);

    const { data, error } = await supabase!
      .from('avisos_comunidad')
      .insert([testMessage])
      .select(`
        *,
        usuarios (
          id,
          nombre,
          telefono
        )
      `);

    if (error) {
      console.error('❌ Error insertando mensaje de prueba:', error);
      console.error('📋 Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return false;
    }

    console.log('✅ Mensaje de prueba insertado exitosamente');
    console.log('📄 Datos insertados:', data);
    return true;

  } catch (error) {
    console.error('❌ Error general en inserción:', error);
    return false;
  }
}

export async function testUserCreation(telefono: string) {
  if (!isSupabaseConfigured()) {
    console.error('❌ Supabase no está configurado');
    return null;
  }

  console.log('🧪 Probando creación/búsqueda de usuario...');

  try {
    // Primero intentar encontrar el usuario
    const { data: existingUser, error: searchError } = await supabase!
      .from('usuarios')
      .select('*')
      .eq('telefono', telefono)
      .single();

    if (existingUser) {
      console.log('👤 Usuario encontrado:', existingUser);
      return existingUser;
    }

    if (searchError && searchError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Error buscando usuario:', searchError);
      return null;
    }

    // Si no existe, crear nuevo usuario
    console.log('👤 Usuario no encontrado, creando nuevo...');
    const { data: newUser, error: createError } = await supabase!
      .from('usuarios')
      .insert([{
        nombre: `Usuario ${telefono.slice(-4)}`,
        telefono: telefono
      }])
      .select()
      .single();

    if (createError) {
      console.error('❌ Error creando usuario:', createError);
      return null;
    }

    console.log('✅ Usuario creado exitosamente:', newUser);
    return newUser;

  } catch (error) {
    console.error('❌ Error general en gestión de usuario:', error);
    return null;
  }
}

// Para usar en la consola del navegador:
//
// 1. Importar las funciones:
// import { testSupabaseConnection, testTableStructure, testMessageInsertion, testUserCreation } from './supabase-test';
//
// 2. Probar conexión básica:
// await testSupabaseConnection();
//
// 3. Verificar estructura de tablas:
// await testTableStructure();
//
// 4. Crear/encontrar usuario de prueba:
// const usuario = await testUserCreation('+56912345678');
//
// 5. Probar inserción de mensaje:
// if (usuario) {
//   await testMessageInsertion(usuario.id);
// }
//
// 6. O ejecutar todo junto:
// const runAllTests = async () => {
//   await testSupabaseConnection();
//   await testTableStructure();
//   const usuario = await testUserCreation('+56912345678');
//   if (usuario) await testMessageInsertion(usuario.id);
// };
// runAllTests();
