export interface SourceData {
  id: string;
  number: number;
  category_large: string;
  category_medium: string;
  category_small: string | null;
  core_keyword: string;
  seo_keywords: string[];
  blog_topic: string;
  created_at: string;
  updated_at: string;
}

export interface SourceDataInput {
  number: number;
  category_large: string;
  category_medium: string;
  category_small?: string;
  core_keyword: string;
  seo_keywords: string[];
  blog_topic: string;
}

export interface SourceDataFilter {
  search?: string;
  category_large?: string;
  category_medium?: string;
  page?: number;
  limit?: number;
}

export interface SourceDataListResponse {
  data: SourceData[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
