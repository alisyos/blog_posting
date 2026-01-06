# AI 블로그 생성 시스템

소스 데이터를 기반으로 OpenAI API를 활용하여 블로그 글을 자동 생성하는 시스템입니다.

## 주요 기능

- **소스 데이터 관리**: CSV 업로드 또는 직접 입력으로 블로그 주제 데이터 관리
- **블로그 글 생성**: AI 모델(GPT-4.1, GPT-5.2, GPT-5-mini)을 활용한 블로그 글 자동 생성
- **생성된 글 관리**: 목록 조회, 상세 보기, 수정, 삭제
- **프롬프트 관리**: 글 유형별 프롬프트 템플릿 설정

## 기술 스택

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **UI Components**: Radix UI
- **상태관리**: Zustand, TanStack Query
- **Database**: Supabase
- **AI**: OpenAI API
- **배포**: Vercel

## 설치 및 실행

### 1. 의존성 설치

```bash
npm install
```

### 2. 환경 변수 설정

`.env.example`을 `.env.local`로 복사하고 값을 채워주세요:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-api-key
```

### 3. Supabase 테이블 생성

Supabase SQL Editor에서 `supabase-schema.sql` 파일의 내용을 실행하세요.

### 4. 개발 서버 실행

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000)에서 확인할 수 있습니다.

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지
│   ├── api/               # API 라우트
│   ├── source-data/       # 소스 데이터 관리
│   ├── generate/          # 블로그 생성
│   ├── posts/             # 생성된 글 관리
│   └── settings/          # 설정
├── components/
│   ├── ui/                # 기본 UI 컴포넌트
│   ├── source-data/       # 소스 데이터 컴포넌트
│   ├── generate/          # 생성 관련 컴포넌트
│   └── posts/             # 글 관리 컴포넌트
├── lib/                   # 유틸리티
│   ├── supabase.ts       # Supabase 클라이언트
│   ├── openai.ts         # OpenAI 클라이언트
│   └── prompt-builder.ts # 프롬프트 생성
├── store/                 # Zustand 스토어
├── hooks/                 # 커스텀 훅
└── types/                 # TypeScript 타입
```

## 배포 (Vercel)

1. GitHub에 저장소 생성 및 푸시
2. [Vercel](https://vercel.com)에서 프로젝트 import
3. 환경 변수 설정
4. 배포

## 소스 데이터 형식

CSV 파일 업로드 시 다음 컬럼이 필요합니다:

| 컬럼명 | 필수 | 설명 |
|--------|------|------|
| 번호 | O | 고유 번호 |
| 대분류 | O | 상위 카테고리 |
| 중분류 | O | 중간 카테고리 |
| 소분류 | X | 세부 카테고리 |
| 핵심 키워드 | O | 주요 키워드 |
| SEO 키워드 | O | 쉼표로 구분된 키워드 |
| 블로그 콘텐츠 주제 | O | 블로그 글 주제 |
