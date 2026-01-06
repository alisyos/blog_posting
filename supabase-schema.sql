-- AI 블로그 생성 시스템 - Supabase 테이블 스키마
-- Supabase SQL Editor에서 실행하세요

-- 1. source_data 테이블 (소스 데이터)
CREATE TABLE IF NOT EXISTS source_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number INTEGER NOT NULL UNIQUE,
  category_large VARCHAR(100) NOT NULL,
  category_medium VARCHAR(100) NOT NULL,
  category_small VARCHAR(100),
  core_keyword VARCHAR(200) NOT NULL,
  seo_keywords TEXT[] DEFAULT '{}',
  blog_topic VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 검색 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_source_data_number ON source_data(number);
CREATE INDEX IF NOT EXISTS idx_source_data_category ON source_data(category_large, category_medium);

-- 2. prompts 테이블 (프롬프트 템플릿)
CREATE TABLE IF NOT EXISTS prompts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  content_type VARCHAR(50) NOT NULL,
  template TEXT NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. generated_posts 테이블 (생성된 글)
CREATE TABLE IF NOT EXISTS generated_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_data_id UUID REFERENCES source_data(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  content_type VARCHAR(50),
  additional_request TEXT,
  prompt_used TEXT,
  model_used VARCHAR(50) DEFAULT 'gpt-5-mini',
  tokens_used INTEGER,
  status VARCHAR(20) DEFAULT 'draft',
  image_url TEXT,  -- Supabase Storage에 저장된 이미지 URL (선택적)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 조회 최적화 인덱스
CREATE INDEX IF NOT EXISTS idx_generated_posts_source ON generated_posts(source_data_id);
CREATE INDEX IF NOT EXISTS idx_generated_posts_status ON generated_posts(status);
CREATE INDEX IF NOT EXISTS idx_generated_posts_created ON generated_posts(created_at DESC);

-- 4. RLS (Row Level Security) 정책
-- 개발용으로 모든 작업 허용. 프로덕션에서는 인증 기반 정책 권장

ALTER TABLE source_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_posts ENABLE ROW LEVEL SECURITY;

-- 모든 작업 허용 정책 (개발용)
CREATE POLICY "Allow all for source_data" ON source_data FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for prompts" ON prompts FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for generated_posts" ON generated_posts FOR ALL USING (true) WITH CHECK (true);

-- 5. 기본 프롬프트 템플릿 추가 (선택사항)
INSERT INTO prompts (name, content_type, template, is_default) VALUES
('정보성 글 기본', 'informational', '주제에 대한 정보를 제공하는 교육적인 글을 작성해주세요.', true),
('리뷰 글 기본', 'review', '제품/서비스에 대한 상세한 리뷰를 작성해주세요.', true),
('튜토리얼 기본', 'tutorial', '단계별로 따라할 수 있는 가이드를 작성해주세요.', true),
('비교 분석 기본', 'comparison', '여러 옵션을 비교 분석하는 글을 작성해주세요.', true),
('리스트형 기본', 'listicle', '리스트 형식으로 정리된 글을 작성해주세요.', true)
ON CONFLICT DO NOTHING;
