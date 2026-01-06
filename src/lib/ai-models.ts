// AI 모델 설정 - 클라이언트에서도 사용 가능
export const AI_MODELS = [
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', description: '빠르고 효율적' },
  { id: 'gpt-4.1', name: 'GPT-4.1', description: '안정적인 품질' },
  { id: 'gpt-5.2', name: 'GPT-5.2', description: '최신 고성능 모델' },
] as const;

export type AIModelId = (typeof AI_MODELS)[number]['id'];

export const DEFAULT_MODEL: AIModelId = 'gpt-5-mini';
