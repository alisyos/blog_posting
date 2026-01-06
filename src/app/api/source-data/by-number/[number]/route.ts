import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ number: string }> }
) {
  try {
    const { number } = await params;
    const num = parseInt(number);

    if (isNaN(num)) {
      return NextResponse.json(
        { error: 'Invalid number parameter' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('source_data')
      .select('*')
      .eq('number', num)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
