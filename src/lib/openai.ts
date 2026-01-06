// 서버 전용 - OpenAI 클라이언트
import OpenAI from 'openai';

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// 클라이언트에서도 사용 가능한 설정은 ai-models.ts에서 import하세요
export { AI_MODELS, DEFAULT_MODEL, type AIModelId } from './ai-models';
