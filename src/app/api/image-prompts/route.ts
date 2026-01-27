import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { ImagePrompt } from '@/types/image-prompt';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('image_prompts')
      .select('*')
      .order('category', { ascending: true })
      .order('key', { ascending: true });

    if (error) {
      console.error('이미지 프롬프트 조회 오류:', error);
      return NextResponse.json([] as ImagePrompt[]);
    }

    return NextResponse.json(data as ImagePrompt[]);
  } catch (error) {
    console.error('이미지 프롬프트 조회 중 예외 발생:', error);
    return NextResponse.json([] as ImagePrompt[]);
  }
}
