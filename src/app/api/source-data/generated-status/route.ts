import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // generated_posts 테이블에서 source_data_id 조회 (중복 제거)
    const { data, error } = await supabase
      .from('generated_posts')
      .select('source_data_id')
      .not('source_data_id', 'is', null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // 중복 제거
    const uniqueIds = Array.from(new Set(data?.map(item => item.source_data_id) || []));

    return NextResponse.json({
      generated_ids: uniqueIds,
      count: uniqueIds.length,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
