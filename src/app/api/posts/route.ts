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

// 이미지 업로드 헬퍼 함수
async function uploadImage(
  imageData: string,
  mimeType: string,
  suffix: string
): Promise<string | null> {
  try {
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const timestamp = Date.now();
    const extension = getExtensionFromMimeType(mimeType);
    const fileName = `${timestamp}-${suffix}.${extension}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('blog-images')
      .upload(fileName, buffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error(`이미지 업로드 실패 (${suffix}):`, uploadError);
      return null;
    }

    if (uploadData) {
      const { data: urlData } = supabase.storage
        .from('blog-images')
        .getPublicUrl(uploadData.path);
      return urlData.publicUrl;
    }
    return null;
  } catch (error) {
    console.error(`이미지 처리 중 오류 (${suffix}):`, error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: PostCreateInput = await request.json();

    let imageUrl: string | null = null;
    let subImageUrls: string[] = [];

    // 메인 이미지 업로드
    if (body.image_data && body.image_mime_type) {
      imageUrl = await uploadImage(body.image_data, body.image_mime_type, 'main');
    }

    // 서브 이미지들 업로드
    if (body.sub_images && body.sub_images.length > 0) {
      const uploadPromises = body.sub_images.map((subImg, index) =>
        uploadImage(subImg.image_data, subImg.mime_type, `sub${index + 1}`)
      );
      const results = await Promise.all(uploadPromises);
      subImageUrls = results.filter((url): url is string => url !== null);
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
          sub_image_urls: subImageUrls.length > 0 ? subImageUrls : null,
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
