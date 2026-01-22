import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { PostFilter, PostCreateInput } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter: PostFilter = {
      status: searchParams.get('status') as PostFilter['status'] || undefined,
      content_type: searchParams.get('content_type') as PostFilter['content_type'] || undefined,
      search: searchParams.get('search') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    let query = supabase
      .from('generated_posts')
      .select('*, source_data(*)', { count: 'exact' });

    if (filter.status) {
      query = query.eq('status', filter.status);
    }

    if (filter.content_type) {
      query = query.eq('content_type', filter.content_type);
    }

    if (filter.search) {
      query = query.or(`title.ilike.%${filter.search}%,content.ilike.%${filter.search}%`);
    }

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PostCreateInput = await request.json();

    // 클라이언트에서 이미 업로드된 이미지 URL을 직접 사용
    // (Vercel 요청 크기 제한 4.5MB 우회)
    const imageUrl = body.image_url || null;
    const subImageUrls = body.sub_image_urls && body.sub_image_urls.length > 0
      ? body.sub_image_urls
      : null;

    const { data: post, error } = await supabase
      .from('generated_posts')
      .insert([
        {
          source_data_id: body.source_data_id,
          title: body.title,
          content: body.content,
          content_type: body.content_type,
          additional_request: body.additional_request || null,
          prompt_used: body.prompt_used,
          model_used: body.model_used,
          tokens_used: body.tokens_used,
          status: 'draft',
          image_url: imageUrl,
          sub_image_urls: subImageUrls,
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('포스트 저장 실패:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(post);
  } catch (err) {
    console.error('포스트 저장 중 예외 발생:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
