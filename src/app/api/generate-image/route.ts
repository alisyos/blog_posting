import { NextRequest, NextResponse } from 'next/server';
import { getGeminiAI, IMAGE_MODEL } from '@/lib/gemini';
import type { GenerateImageRequest, GenerateImageResponse, ImageStyle, ImageMood } from '@/types/post';

export async function POST(request: NextRequest) {
  try {
    const body: GenerateImageRequest = await request.json();

    const { content, title, style, mood, includeText, textContent, additionalRequest } = body;

    // 입력 검증
    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    // 블로그 내용을 분석하여 이미지 프롬프트 생성
    const imagePrompt = generateImagePrompt(
      title,
      content,
      style,
      mood,
      includeText,
      textContent,
      additionalRequest
    );

    // Gemini 모델을 사용하여 이미지 생성
    const geminiAI = getGeminiAI();
    const response = await geminiAI.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: imagePrompt,
            },
          ],
        },
      ],
    });

    // 응답에서 이미지 데이터 추출
    let imageData: string | null = null;
    let mimeType: string | null = null;

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            imageData = part.inlineData.data || null;
            mimeType = part.inlineData.mimeType || null;
            break;
          }
        }
      }
    }

    if (!imageData || !mimeType) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    // base64 이미지 데이터 반환
    const responseData: GenerateImageResponse = {
      image_data: imageData,
      mime_type: mimeType,
    };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Generate image error:', error);
    return NextResponse.json(
      { error: 'Failed to generate image' },
      { status: 500 }
    );
  }
}

/**
 * 이미지 스타일을 영문 프롬프트로 변환
 */
function getStylePrompt(style?: ImageStyle): string {
  const styleMap: Record<ImageStyle, string> = {
    realistic: 'photorealistic, high-quality photograph style',
    illustration: 'digital illustration, vector art style',
    minimal: 'minimalist, clean and simple design',
    '3d': '3D rendered, modern CGI style',
    watercolor: 'watercolor painting, artistic brush strokes',
  };

  return style ? styleMap[style] : styleMap.realistic;
}

/**
 * 이미지 분위기를 영문 프롬프트로 변환
 */
function getMoodPrompt(mood?: ImageMood): string {
  const moodMap: Record<ImageMood, string> = {
    professional: 'professional, corporate, business-appropriate',
    friendly: 'friendly, warm, approachable',
    creative: 'creative, artistic, unique',
    luxurious: 'luxurious, premium, elegant',
    bright: 'bright, cheerful, optimistic',
  };

  return mood ? moodMap[mood] : moodMap.professional;
}

/**
 * 블로그 제목과 본문을 분석하여 적절한 이미지 생성 프롬프트를 만듭니다.
 */
function generateImagePrompt(
  title: string,
  content: string,
  style?: ImageStyle,
  mood?: ImageMood,
  includeText?: boolean,
  textContent?: string,
  additionalRequest?: string
): string {
  // 본문에서 주요 키워드 추출 (첫 500자 정도만 사용)
  const excerpt = content.slice(0, 500);

  // 스타일과 분위기 프롬프트
  const stylePrompt = getStylePrompt(style);
  const moodPrompt = getMoodPrompt(mood);

  // 텍스트 포함 여부
  const textPrompt = includeText && textContent
    ? `\n- Include the following text in the image: "${textContent}"\n- The text should be clearly visible and well-integrated into the design`
    : '\n- Include minimal or no text in the image itself';

  // 추가 요청사항
  const additionalPrompt = additionalRequest
    ? `\n\nAdditional Requirements:\n${additionalRequest}`
    : '';

  return `
Create a professional, high-quality blog thumbnail image based on the following Korean blog content:

Title: ${title}

Content Summary:
${excerpt}

Style: ${stylePrompt}
Mood: ${moodPrompt}

Requirements:
- Create a clean, modern design suitable for a blog post
- The image should visually represent the main topic of the blog post
- Use a color palette that is pleasing and matches the specified mood
- The style should be suitable for Korean blog audiences${textPrompt}
- Focus on visual elements that convey the blog's subject matter
- The image should be suitable as a blog header or featured image
- Maintain high visual quality and clarity
- Use modern, clean design principles
- Avoid cluttered or overly complex compositions${additionalPrompt}

Generate an image that would make an excellent blog thumbnail or header image for this content.
`.trim();
}
