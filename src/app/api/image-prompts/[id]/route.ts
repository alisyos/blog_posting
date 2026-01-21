import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ImagePrompt, ImagePromptUpdateInput } from '@/types/image-prompt';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body: ImagePromptUpdateInput = await request.json();

    // 수정 가능한 필드만 추출
    const updateData: ImagePromptUpdateInput & { updated_at: string } = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) {
      updateData.name = body.name;
    }
    if (body.prompt !== undefined) {
      updateData.prompt = body.prompt;
    }
    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    const { data, error } = await supabase
      .from('image_prompts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('이미지 프롬프트 수정 오류:', error);
      return NextResponse.json(
        { error: '프롬프트 수정에 실패했습니다.' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: '해당 프롬프트를 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json(data as ImagePrompt);
  } catch (error) {
    console.error('이미지 프롬프트 수정 중 예외 발생:', error);
    return NextResponse.json(
      { error: '서버 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
