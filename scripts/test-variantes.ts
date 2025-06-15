// Función para normalizar números de teléfono (misma que en auth-context)
const normalizarTelefono = (telefono: string): string => {
  return telefono.replace(/\s/g, "").trim();
};

// Función para generar variantes de búsqueda de un número (misma que en auth-context)
const generarVariantesBusqueda = (telefono: string): string[] => {
  const base = telefono.replace(/\s/g, "").trim();
  const variantes = [base];

  // Caso 1: Si el número es +569XXXXXXXX (con 9), generar +56XXXXXXXX (sin el primer 9)
  if (base.match(/^\+569\d{8,9}$/)) {
    const sinPrimerNueve = base.replace(/^\+569/, '+56');
    variantes.push(sinPrimerNueve);
  }

  // Caso 2: Si el número es +56XXXXXXX (sin 9), generar +569XXXXXXX (con 9)
  if (base.match(/^\+56\d{8,9}$/) && !base.startsWith('+569')) {
    const conNueve = base.replace(/^\+56/, '+569');
    variantes.push(conNueve);
  }

  // Caso 3: Si el número es +569XXXXXXXXX (con 9 y 9+ dígitos), puede ser +569 + 8 dígitos
  // Esto maneja casos donde el 9 está duplicado
  if (base.match(/^\+569\d{9,}$/)) {
    // Extraer los primeros 8 dígitos después del 9
    const digitosDespuesNueve = base.substring(4, 12); // +569 = 4 chars, tomar 8 dígitos
    const formatoCorto = '+569' + digitosDespuesNueve;
    const formatoSinNueve = '+56' + digitosDespuesNueve;
    variantes.push(formatoCorto);
    variantes.push(formatoSinNueve);
  }

  return [...new Set(variantes)]; // Remover duplicados
};

// Casos de prueba basados en los datos reales de la BD
const casosPrueba = [
  {
    input: '+56 9 1111 1111',  // Lo que ingresa el usuario
    enBD: '+56911111111',     // Lo que está en la BD (Ana Pérez)
    deberiaEncontrar: true
  },
  {
    input: '+569111111111',   // Otro formato del usuario
    enBD: '+56911111111',     // Lo que está en la BD (Ana Pérez)
    deberiaEncontrar: true
  },
  {
    input: '+56933333333',    // Entrada exacta
    enBD: '+56933333333',     // BD exacta (Claudia Soto)
    deberiaEncontrar: true
  },
  {
    input: '+56 9 3333 3333', // Entrada con espacios
    enBD: '+56933333333',     // BD sin espacios (Claudia Soto)
    deberiaEncontrar: true
  }
];

console.log('🧪 Probando sistema de variantes...\n');

casosPrueba.forEach((caso, index) => {
  console.log(`Caso ${index + 1}:`);
  console.log(`  Input: "${caso.input}"`);
  console.log(`  En BD: "${caso.enBD}"`);

  const variantesInput = generarVariantesBusqueda(caso.input);
  const variantesBD = generarVariantesBusqueda(caso.enBD);

  console.log(`  Variantes input: [${variantesInput.map(v => `"${v}"`).join(', ')}]`);
  console.log(`  Variantes BD: [${variantesBD.map(v => `"${v}"`).join(', ')}]`);

  // Verificar si hay coincidencia
  const coincide = variantesInput.some(varianteInput =>
    variantesBD.includes(varianteInput)
  );

  console.log(`  Coincide: ${coincide ? '✅' : '❌'}`);
  console.log(`  Esperado: ${caso.deberiaEncontrar ? '✅' : '❌'}`);
  console.log(`  Resultado: ${coincide === caso.deberiaEncontrar ? '🎯 CORRECTO' : '❌ ERROR'}\n`);
});

console.log('Fin de pruebas de variantes.');
