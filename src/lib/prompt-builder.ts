import type { SourceData, ContentType } from '@/types';

const CONTENT_TYPE_DESCRIPTIONS: Record<ContentType, string> = {
  informational: '정보를 제공하는 교육적인 글',
  review: '제품이나 서비스에 대한 상세한 리뷰',
  tutorial: '단계별 가이드 또는 튜토리얼',
  comparison: '여러 옵션을 비교 분석하는 글',
  listicle: '리스트 형식의 정리된 글',
};

export function buildPrompt(
  sourceData: SourceData,
  contentType: ContentType,
  additionalRequest?: string
): string {
  const contentTypeDesc = CONTENT_TYPE_DESCRIPTIONS[contentType];

  let prompt = `당신은 전문 블로그 콘텐츠 작가입니다. 아래 정보를 바탕으로 ${contentTypeDesc}을 작성해주세요.

## 블로그 주제 정보
- 대분류: ${sourceData.category_large}
- 중분류: ${sourceData.category_medium}
${sourceData.category_small ? `- 소분류: ${sourceData.category_small}` : ''}
- 핵심 키워드: ${sourceData.core_keyword}
- SEO 키워드: ${sourceData.seo_keywords.join(', ')}
- 블로그 콘텐츠 주제: ${sourceData.blog_topic}

## 작성 가이드라인
1. SEO 키워드를 자연스럽게 본문에 포함해주세요.
2. 핵심 키워드가 제목과 본문에 적절히 배치되도록 해주세요.
3. 독자가 이해하기 쉬운 친근한 어조로 작성해주세요.
4. 블로그 글의 구조: 제목, 서론, 본론(소제목 활용), 결론으로 구성해주세요.
5. 한국어로 작성하며, 1500-2000자 정도의 분량으로 작성해주세요.
`;

  if (additionalRequest) {
    prompt += `
## 추가 요청사항
${additionalRequest}
`;
  }

  prompt += `
## 출력 형식
마크다운 형식으로 작성해주세요. 제목은 # (H1)으로 시작하고, 소제목은 ## (H2)를 사용해주세요.
`;

  return prompt;
}
