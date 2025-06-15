import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Verificar configuración básica
    if (!supabase) {
      return NextResponse.json(
        {
          error: 'Supabase no está configurado',
          configured: false,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'PRESENTE' : 'FALTANTE',
          key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'PRESENTE' : 'FALTANTE'
        },
        { status: 500 }
      );
    }

    // Intentar una consulta simple
    const { data, error } = await supabase
      .from('usuarios')
      .select('count(*)')
      .limit(1);

    return NextResponse.json({
      success: true,
      configured: true,
      connection: 'OK',
      queryResult: {
        data,
        error: error ? {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint
        } : null
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error en test de Supabase:', error);
    return NextResponse.json(
      {
        error: 'Error al probar conexión con Supabase',
        details: error instanceof Error ? error.message : 'Error desconocido',
        configured: !!supabase
      },
      { status: 500 }
    );
  }
}
