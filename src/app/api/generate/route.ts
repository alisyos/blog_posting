import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { openai, DEFAULT_MODEL } from '@/lib/openai';
import { buildPrompt } from '@/lib/prompt-builder';
import type { GenerateRequest, SourceData } from '@/types';

// GPT-5 계열 모델인지 확인 (Responses API 사용 필요)
function isGpt5Model(model: string): boolean {
  return model.startsWith('gpt-5');
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();

    const { source_data_id, content_type, additional_request, model } = body;

    // Fetch source data
    const { data: sourceData, error: sourceError } = await supabase
      .from('source_data')
      .select('*')
      .eq('id', source_data_id)
      .single();

    if (sourceError || !sourceData) {
      return NextResponse.json(
        { error: 'Source data not found' },
        { status: 404 }
      );
    }

    // Build prompt
    const prompt = buildPrompt(
      sourceData as SourceData,
      content_type,
      additional_request
    );

    // Call OpenAI API
    const selectedModel = model || DEFAULT_MODEL;

    let generatedContent: string;
    let tokensUsed: number;

    const systemPrompt = '당신은 전문 블로그 콘텐츠 작가입니다. 주어진 정보를 바탕으로 SEO에 최적화된 고품질 블로그 글을 작성합니다.';

    if (isGpt5Model(selectedModel)) {
      // GPT-5 계열: Responses API 사용
      const response = await openai.responses.create({
        model: selectedModel,
        instructions: systemPrompt,
        input: prompt,
        reasoning: {
          effort: 'medium',
        },
        text: {
          verbosity: 'high',
        },
      });

      // Responses API 응답에서 텍스트 추출
      generatedContent = response.output_text || '';
      tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);
    } else {
      // GPT-4.1 등 기존 모델: Chat Completions API 사용
      const completion = await openai.chat.completions.create({
        model: selectedModel,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      generatedContent = completion.choices[0]?.message?.content || '';
      tokensUsed = completion.usage?.total_tokens || 0;
    }

    // Extract title from generated content
    const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
    const title = titleMatch
      ? titleMatch[1]
      : (sourceData as SourceData).blog_topic;

    // Return generated content without saving (user will save manually)
    return NextResponse.json({
      content: generatedContent,
      title,
      source_data_id,
      content_type,
      additional_request: additional_request || null,
      prompt_used: prompt,
      model_used: selectedModel,
      tokens_used: tokensUsed,
    });
  } catch (_error) {
    console.error('Generate error:', _error);
    return NextResponse.json(
      { error: 'Failed to generate blog post' },
      { status: 500 }
    );
  }
}
