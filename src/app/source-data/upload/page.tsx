'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { CSVUploader } from '@/components/source-data/csv-uploader';

export default function UploadPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/source-data">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">CSV 파일 업로드</h1>
        <p className="text-gray-500 mt-1">
          CSV 파일을 업로드하여 소스 데이터를 일괄 등록합니다.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <CSVUploader />

        <Card>
          <CardHeader>
            <CardTitle>CSV 파일 형식 안내</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">필수 컬럼</h3>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>번호 - 고유 번호 (숫자)</li>
                <li>대분류 - 상위 카테고리</li>
                <li>중분류 - 중간 카테고리</li>
                <li>핵심 키워드 - 주요 키워드</li>
                <li>SEO 키워드 - SEO용 키워드 (쉼표로 구분)</li>
                <li>블로그 콘텐츠 주제 - 블로그 글 주제</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium mb-2">선택 컬럼</h3>
              <ul className="list-disc list-inside text-sm text-gray-600">
                <li>소분류 - 세부 카테고리</li>
              </ul>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">예시</h3>
              <pre className="text-xs overflow-x-auto">
{`번호,대분류,중분류,소분류,핵심 키워드,SEO 키워드,블로그 콘텐츠 주제
1,덴탈케어,덴탈껌,제품 소개,강아지 덴탈껌,"치석제거,덴탈껌",덴탈껌 고르는 법
2,덴탈케어,덴탈껌,제품 소개,포켄스 덴티페어리,"덴탈껌 추천,클로로필",포켄스 덴티페어리로 치석 관리하는 법`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
