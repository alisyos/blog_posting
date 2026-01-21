import { NextRequest, NextResponse } from 'next/server';
import { getGeminiAI, IMAGE_MODEL } from '@/lib/gemini';
import { supabase } from '@/lib/supabase';
import type {
  GenerateImageRequest,
  GenerateImageResponse,
  GenerateMultipleImagesRequest,
  GenerateMultipleImagesResponse,
  GeneratedImageData,
  ImageStyle,
  ImageMood,
  ImagePurpose,
  ReferenceImage
} from '@/types/post';
import type { ImagePrompt, PurposePromptData } from '@/types/image-prompt';

// DB에서 활성 프롬프트 조회 (캐시 없이 매번 조회)
async function getImagePromptsFromDB(): Promise<ImagePrompt[]> {
  try {
    const { data, error } = await supabase
      .from('image_prompts')
      .select('*')
      .eq('is_active', true);

    if (error) {
      console.error('Failed to fetch image prompts from DB:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching image prompts:', err);
    return [];
  }
}

// 단일 이미지 생성 함수
async function generateSingleImage(
  title: string,
  content: string,
  purpose: ImagePurpose,
  style?: ImageStyle,
  mood?: ImageMood,
  includeText?: boolean,
  textContent?: string,
  additionalRequest?: string,
  referenceImage?: ReferenceImage
): Promise<{ image_data: string; mime_type: string } | null> {
  // DB에서 프롬프트 조회
  const dbPrompts = await getImagePromptsFromDB();

  const imagePrompt = generateImagePrompt(
    title,
    content,
    purpose,
    style,
    mood,
    includeText,
    textContent,
    additionalRequest,
    !!referenceImage,
    dbPrompts
  );

  // parts 배열 구성 (텍스트 프롬프트 + 선택적으로 참고 이미지)
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
    { text: imagePrompt },
  ];

  // 참고 이미지가 있으면 추가
  if (referenceImage) {
    parts.push({
      inlineData: {
        mimeType: referenceImage.mimeType,
        data: referenceImage.data,
      },
    });
  }

  const geminiAI = getGeminiAI();
  const response = await geminiAI.models.generateContent({
    model: IMAGE_MODEL,
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
  });

  if (response.candidates && response.candidates.length > 0) {
    const candidate = response.candidates[0];
    if (candidate.content && candidate.content.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          const imageData = part.inlineData.data || null;
          const mimeType = part.inlineData.mimeType || null;
          if (imageData && mimeType) {
            return { image_data: imageData, mime_type: mimeType };
          }
        }
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 다중 이미지 생성 요청인지 확인
    if (body.images && Array.isArray(body.images)) {
      // 다중 이미지 생성 처리
      const { content, title, images, referenceImage: globalReferenceImage } = body as GenerateMultipleImagesRequest;

      if (!content || !title) {
        return NextResponse.json(
          { error: 'Content and title are required' },
          { status: 400 }
        );
      }

      if (images.length === 0) {
        return NextResponse.json(
          { error: 'At least one image configuration is required' },
          { status: 400 }
        );
      }

      // 병렬로 이미지 생성
      const results = await Promise.allSettled(
        images.map(async (imgConfig) => {
          // 개별 이미지 설정의 참고 이미지가 있으면 사용, 없으면 전역 참고 이미지 사용
          const refImage = imgConfig.referenceImage || globalReferenceImage;
          const result = await generateSingleImage(
            title,
            content,
            imgConfig.purpose,
            imgConfig.style,
            imgConfig.mood,
            imgConfig.includeText,
            imgConfig.textContent,
            imgConfig.additionalRequest,
            refImage
          );
          if (result) {
            return {
              purpose: imgConfig.purpose,
              image_data: result.image_data,
              mime_type: result.mime_type,
            } as GeneratedImageData;
          }
          throw new Error(`Failed to generate ${imgConfig.purpose} image`);
        })
      );

      // 성공한 이미지만 추출
      const generatedImages: GeneratedImageData[] = results
        .filter((r): r is PromiseFulfilledResult<GeneratedImageData> => r.status === 'fulfilled')
        .map(r => r.value);

      if (generatedImages.length === 0) {
        return NextResponse.json(
          { error: 'Failed to generate any images' },
          { status: 500 }
        );
      }

      const responseData: GenerateMultipleImagesResponse = {
        images: generatedImages,
      };

      return NextResponse.json(responseData);
    }

    // 단일 이미지 생성 (기존 API 호환성 유지)
    const { content, title, style, mood, includeText, textContent, additionalRequest, referenceImage } = body as GenerateImageRequest;

    if (!content || !title) {
      return NextResponse.json(
        { error: 'Content and title are required' },
        { status: 400 }
      );
    }

    const result = await generateSingleImage(
      title,
      content,
      'main',
      style,
      mood,
      includeText,
      textContent,
      additionalRequest,
      referenceImage
    );

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to generate image' },
        { status: 500 }
      );
    }

    const responseData: GenerateImageResponse = {
      image_data: result.image_data,
      mime_type: result.mime_type,
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
 * DB 값 우선, 없으면 하드코딩된 폴백 사용
 */
function getStylePrompt(style?: ImageStyle, dbPrompts?: ImagePrompt[]): string {
  // 하드코딩된 폴백 값
  const styleMap: Record<ImageStyle, string> = {
    realistic: 'photorealistic, high-quality photograph style',
    illustration: 'digital illustration, vector art style',
    minimal: 'minimalist, clean and simple design',
    '3d': '3D rendered, modern CGI style',
    watercolor: 'watercolor painting, artistic brush strokes',
  };

  const targetStyle = style || 'realistic';

  // DB에서 해당 스타일 프롬프트 찾기
  if (dbPrompts && dbPrompts.length > 0) {
    const dbStylePrompt = dbPrompts.find(
      (p) => p.category === 'style' && p.key === targetStyle
    );
    if (dbStylePrompt) {
      return dbStylePrompt.prompt;
    }
  }

  return styleMap[targetStyle];
}

/**
 * 이미지 분위기를 영문 프롬프트로 변환
 * DB 값 우선, 없으면 하드코딩된 폴백 사용
 */
function getMoodPrompt(mood?: ImageMood, dbPrompts?: ImagePrompt[]): string {
  // 하드코딩된 폴백 값
  const moodMap: Record<ImageMood, string> = {
    professional: 'professional, corporate, business-appropriate',
    friendly: 'friendly, warm, approachable',
    creative: 'creative, artistic, unique',
    luxurious: 'luxurious, premium, elegant',
    bright: 'bright, cheerful, optimistic',
  };

  const targetMood = mood || 'professional';

  // DB에서 해당 분위기 프롬프트 찾기
  if (dbPrompts && dbPrompts.length > 0) {
    const dbMoodPrompt = dbPrompts.find(
      (p) => p.category === 'mood' && p.key === targetMood
    );
    if (dbMoodPrompt) {
      return dbMoodPrompt.prompt;
    }
  }

  return moodMap[targetMood];
}

/**
 * 이미지 용도에 따른 프롬프트 설명 생성
 * DB 값 우선, 없으면 하드코딩된 폴백 사용
 */
function getPurposePrompt(purpose: ImagePurpose, dbPrompts?: ImagePrompt[]): PurposePromptData {
  // 하드코딩된 폴백 값
  const purposeMap: Record<ImagePurpose, PurposePromptData> = {
    main: {
      role: 'main thumbnail/header image',
      focusDescription: 'This is the primary image that represents the entire blog post. It should be eye-catching and capture the essence of the content.',
    },
    sub1: {
      role: 'supporting illustration (section 1)',
      focusDescription: 'This is a supplementary image to support the main content. Focus on illustrating a specific aspect or example from the blog post.',
    },
    sub2: {
      role: 'supporting illustration (section 2)',
      focusDescription: 'This is a supplementary image that provides visual variety. Focus on a different perspective or detail from the blog content.',
    },
    sub3: {
      role: 'supporting illustration (section 3)',
      focusDescription: 'This is an additional supporting image. Focus on complementary visuals that enhance understanding of the topic.',
    },
  };

  // DB에서 해당 용도 프롬프트 찾기
  if (dbPrompts && dbPrompts.length > 0) {
    const dbPurposePrompt = dbPrompts.find(
      (p) => p.category === 'purpose' && p.key === purpose
    );
    if (dbPurposePrompt) {
      try {
        // JSON 파싱 시도
        const parsed = JSON.parse(dbPurposePrompt.prompt) as PurposePromptData;
        if (parsed.role && parsed.focusDescription) {
          return parsed;
        }
      } catch {
        console.error(`Failed to parse purpose prompt for ${purpose}:`, dbPurposePrompt.prompt);
      }
    }
  }

  return purposeMap[purpose];
}

/**
 * 텍스트 포함/미포함 프롬프트 조회
 * DB 값 우선, 없으면 하드코딩된 폴백 사용
 */
function getTextPrompt(
  includeText: boolean,
  textContent?: string,
  dbPrompts?: ImagePrompt[]
): string {
  // 하드코딩된 폴백 값
  const defaultInclude = `\n- Include the following text in the image: "{{TEXT_CONTENT}}"\n- The text should be clearly visible and well-integrated into the design`;
  const defaultExclude = '\n- Include minimal or no text in the image itself';

  if (includeText && textContent) {
    // DB에서 텍스트 포함 프롬프트 찾기
    if (dbPrompts && dbPrompts.length > 0) {
      const dbTextPrompt = dbPrompts.find(
        (p) => p.category === 'text' && p.key === 'include'
      );
      if (dbTextPrompt) {
        return dbTextPrompt.prompt.replace('{{TEXT_CONTENT}}', textContent);
      }
    }
    return defaultInclude.replace('{{TEXT_CONTENT}}', textContent);
  } else {
    // DB에서 텍스트 미포함 프롬프트 찾기
    if (dbPrompts && dbPrompts.length > 0) {
      const dbTextPrompt = dbPrompts.find(
        (p) => p.category === 'text' && p.key === 'exclude'
      );
      if (dbTextPrompt) {
        return dbTextPrompt.prompt;
      }
    }
    return defaultExclude;
  }
}

/**
 * 블로그 제목과 본문을 분석하여 적절한 이미지 생성 프롬프트를 만듭니다.
 * DB에서 템플릿 조회 후 변수 치환, 없으면 하드코딩된 형식 사용
 */
function generateImagePrompt(
  title: string,
  content: string,
  purpose: ImagePurpose,
  style?: ImageStyle,
  mood?: ImageMood,
  includeText?: boolean,
  textContent?: string,
  additionalRequest?: string,
  hasReferenceImage?: boolean,
  dbPrompts?: ImagePrompt[]
): string {
  // 본문에서 주요 키워드 추출 (첫 500자 정도만 사용)
  const excerpt = content.slice(0, 500);

  // 스타일과 분위기 프롬프트 (DB 값 우선)
  const stylePrompt = getStylePrompt(style, dbPrompts);
  const moodPrompt = getMoodPrompt(mood, dbPrompts);

  // 용도에 따른 프롬프트 (DB 값 우선)
  const purposeInfo = getPurposePrompt(purpose, dbPrompts);

  // 텍스트 포함 여부 (DB 값 우선)
  const textPrompt = getTextPrompt(!!includeText, textContent, dbPrompts);

  // 추가 요청사항
  const additionalPrompt = additionalRequest
    ? `\n\nAdditional Requirements:\n${additionalRequest}`
    : '';

  // 참고 이미지가 있는 경우 추가 지침
  const referenceImagePrompt = hasReferenceImage
    ? `

Reference Image Instructions:
- A reference image has been provided along with this prompt
- Use the reference image as inspiration for the visual style, composition, or subject matter
- If the reference image shows a product or object, incorporate it naturally into the blog image design
- Maintain the key visual elements from the reference while adapting to the blog context
- The generated image should feel cohesive with the reference while being unique and suitable for blog use`
    : '';

  // DB에서 기본 템플릿 조회
  if (dbPrompts && dbPrompts.length > 0) {
    const dbTemplate = dbPrompts.find(
      (p) => p.category === 'template' && p.key === 'default'
    );
    if (dbTemplate) {
      // 템플릿 변수 치환
      return dbTemplate.prompt
        .replace('{{STYLE}}', stylePrompt)
        .replace('{{MOOD}}', moodPrompt)
        .replace('{{PURPOSE_ROLE}}', purposeInfo.role)
        .replace('{{PURPOSE_FOCUS}}', purposeInfo.focusDescription)
        .replace('{{TEXT_PROMPT}}', textPrompt)
        .replace('{{TITLE}}', title)
        .replace('{{EXCERPT}}', excerpt)
        .replace('{{ADDITIONAL}}', additionalPrompt)
        .replace('{{REFERENCE_IMAGE}}', referenceImagePrompt)
        .replace('{{IS_MAIN}}', purpose === 'main'
          ? 'The image should be suitable as a blog header or featured image'
          : 'The image should complement the main image while offering visual variety')
        .trim();
    }
  }

  // 템플릿이 없으면 기존 하드코딩된 형식 사용
  return `
Create a professional, high-quality blog ${purposeInfo.role} based on the following Korean blog content:

Title: ${title}

Content Summary:
${excerpt}

Image Purpose: ${purposeInfo.focusDescription}

Style: ${stylePrompt}
Mood: ${moodPrompt}${referenceImagePrompt}

Requirements:
- Create a clean, modern design suitable for a blog post
- The image should visually represent the main topic of the blog post
- Use a color palette that is pleasing and matches the specified mood
- The style should be suitable for Korean blog audiences${textPrompt}
- Focus on visual elements that convey the blog's subject matter
- ${purpose === 'main' ? 'The image should be suitable as a blog header or featured image' : 'The image should complement the main image while offering visual variety'}
- Maintain high visual quality and clarity
- Use modern, clean design principles
- Avoid cluttered or overly complex compositions${additionalPrompt}

Generate an image that would make an excellent ${purposeInfo.role} for this content.
`.trim();
}
