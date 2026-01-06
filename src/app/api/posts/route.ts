import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { PostFilter, PostCreateInput } from '@/types';

// MIME 타입에서 확장자 추출
function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/gif': 'gif',
    'image/webp': 'webp',
  };
  return map[mimeType] || 'png';
}

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

    let imageUrl: string | null = null;

    // 이미지 데이터가 있으면 Supabase Storage에 업로드
    if (body.image_data && body.image_mime_type) {
      try {
        // base64를 Buffer로 변환
        const base64Data = body.image_data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // 파일명 생성 (타임스탬프 + 확장자)
        const timestamp = Date.now();
        const extension = getExtensionFromMimeType(body.image_mime_type);
        const fileName = `${timestamp}.${extension}`;

        // Supabase Storage에 업로드
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('blog-images')
          .upload(fileName, buffer, {
            contentType: body.image_mime_type,
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('이미지 업로드 실패:', uploadError);
          // 이미지 업로드 실패해도 포스트는 저장 (이미지 없이)
        } else if (uploadData) {
          // Public URL 획득
          const { data: urlData } = supabase.storage
            .from('blog-images')
            .getPublicUrl(uploadData.path);

          imageUrl = urlData.publicUrl;
        }
      } catch (imageError) {
        console.error('이미지 처리 중 오류:', imageError);
        // 이미지 처리 실패해도 포스트는 저장 (이미지 없이)
      }
    }

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
        },
      ])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(post);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
