import type { SourceData } from './source-data';
import type { AIModelId } from '@/lib/openai';

export type PostStatus = 'draft' | 'published' | 'archived';

export type ContentType =
  | 'informational'  // 정보성
  | 'review'         // 리뷰
  | 'tutorial'       // 튜토리얼
  | 'comparison'     // 비교
  | 'listicle';      // 리스트형

export const CONTENT_TYPES: { id: ContentType; name: string }[] = [
  { id: 'informational', name: '정보성 글' },
  { id: 'review', name: '리뷰' },
  { id: 'tutorial', name: '튜토리얼/가이드' },
  { id: 'comparison', name: '비교 분석' },
  { id: 'listicle', name: '리스트형 글' },
];

export interface GeneratedPost {
  id: string;
  source_data_id: string | null;
  title: string;
  content: string;
  content_type: ContentType | null;
  additional_request: string | null;
  prompt_used: string | null;
  model_used: string;
  tokens_used: number | null;
  status: PostStatus;
  created_at: string;
  updated_at: string;
  source_data?: SourceData;
  image_url?: string;  // 생성된 이미지 URL (선택적)
}

export interface GenerateRequest {
  source_data_id: string;
  content_type: ContentType;
  additional_request?: string;
  model: AIModelId;
}

export interface GenerateResponse {
  content: string;
  title: string;
  source_data_id: string;
  content_type: ContentType;
  additional_request: string | null;
  prompt_used: string;
  model_used: string;
  tokens_used: number;
}

export interface PostCreateInput {
  source_data_id: string;
  title: string;
  content: string;
  content_type: ContentType;
  additional_request?: string;
  prompt_used: string;
  model_used: string;
  tokens_used: number;
  image_data?: string;      // base64 이미지 데이터
  image_mime_type?: string; // 이미지 MIME 타입
}

export interface PostFilter {
  status?: PostStatus;
  content_type?: ContentType;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PostListResponse {
  data: GeneratedPost[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 이미지 스타일 타입
export type ImageStyle = 'realistic' | 'illustration' | 'minimal' | '3d' | 'watercolor';

export const IMAGE_STYLES: { id: ImageStyle; name: string }[] = [
  { id: 'realistic', name: '사실적' },
  { id: 'illustration', name: '일러스트' },
  { id: 'minimal', name: '미니멀' },
  { id: '3d', name: '3D' },
  { id: 'watercolor', name: '수채화' },
];

// 이미지 분위기 타입
export type ImageMood = 'professional' | 'friendly' | 'creative' | 'luxurious' | 'bright';

export const IMAGE_MOODS: { id: ImageMood; name: string }[] = [
  { id: 'professional', name: '전문적' },
  { id: 'friendly', name: '친근한' },
  { id: 'creative', name: '창의적' },
  { id: 'luxurious', name: '고급스러운' },
  { id: 'bright', name: '밝은' },
];

// 이미지 생성 요청 타입
export interface GenerateImageRequest {
  content: string;  // 블로그 본문 내용
  title: string;    // 블로그 제목
  style?: ImageStyle;  // 이미지 스타일
  mood?: ImageMood;  // 이미지 분위기
  includeText?: boolean;  // 텍스트 포함 여부
  textContent?: string;  // 포함할 텍스트 내용
  additionalRequest?: string;  // 추가 요청사항
}

// 이미지 생성 응답 타입
export interface GenerateImageResponse {
  image_data: string;  // base64 인코딩된 이미지 데이터
  mime_type: string;   // 이미지 MIME 타입 (예: image/png)
}
