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

## 사실 작성 원칙 (매우 중요)
위에 명시된 "블로그 주제 정보"에 포함되지 않은 구체적 사실은 절대로 만들어내지 마세요. 다음과 같은 검증되지 않은 정보 생성은 엄격히 금지됩니다:

- 특정 전문가/직업군과의 협업 주장 (예: "수의사와 공동 개발", "의사가 추천", "전문가 감수")
- 구체적인 임상 시험, 연구 결과, 학술 인용 (예: "○○대학교 연구에 따르면", "임상시험에서 효과 입증")
- 수상 내역, 인증, 특허 (예: "○○상 수상", "FDA 승인", "특허 출원")
- 구체적인 통계 수치, 점유율, 사용자 수 (예: "고객 만족도 98%", "100만 명이 선택")
- 특정 인물, 브랜드, 기업명을 임의로 언급
- 가격, 출시일, 모델명 등 검증이 필요한 제품 사양

확실하지 않은 정보는 "일반적으로", "흔히", "많은 사람들이", "전문가들은 권장합니다" 같은 일반적인 표현으로 대체하세요. 제공된 키워드와 주제, 일반적으로 알려진 상식 범위 안에서만 글을 작성하세요.
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
