// 서버 전용 - Google Gemini AI 클라이언트
import { GoogleGenAI } from '@google/genai';

// 지연 초기화를 위한 함수
let geminiInstance: GoogleGenAI | null = null;

export function getGeminiAI(): GoogleGenAI {
  if (!geminiInstance) {
    if (!process.env.GOOGLE_AI_API_KEY) {
      throw new Error('GOOGLE_AI_API_KEY environment variable is not set');
    }
    geminiInstance = new GoogleGenAI({
      apiKey: process.env.GOOGLE_AI_API_KEY,
    });
  }
  return geminiInstance;
}

// 이미지 생성용 모델
export const IMAGE_MODEL = 'gemini-2.5-flash-image';

// 텍스트 생성용 모델 (필요시)
export const TEXT_MODEL = 'gemini-2.0-flash-exp';
