'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Sparkles, Loader2, Copy, Check, Save, Image, Download } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from '@/components/ui';
import { AI_MODELS, DEFAULT_MODEL, type AIModelId } from '@/lib/ai-models';
import { CONTENT_TYPES, type ContentType, type SourceData, type GenerateResponse, type GenerateImageResponse } from '@/types';

export default function GeneratePage() {
  const router = useRouter();
  const [selectedNumber, setSelectedNumber] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<AIModelId>(DEFAULT_MODEL);
  const [contentType, setContentType] = useState<ContentType>('informational');
  const [additionalRequest, setAdditionalRequest] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generateData, setGenerateData] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [imageMimeType, setImageMimeType] = useState<string>('');

  // Fetch all source data for dropdown
  const { data: sourceDataList } = useQuery({
    queryKey: ['source-data-all'],
    queryFn: async () => {
      const res = await axios.get('/api/source-data?limit=1000');
      return res.data.data as SourceData[];
    },
  });

  // Get selected source data
  const selectedSourceData = sourceDataList?.find(
    (s) => s.number.toString() === selectedNumber
  );

  // Generate mutation (생성만, 저장하지 않음)
  const generateMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSourceData) throw new Error('소스 데이터를 선택해주세요');

      const res = await axios.post<GenerateResponse>('/api/generate', {
        source_data_id: selectedSourceData.id,
        content_type: contentType,
        additional_request: additionalRequest || undefined,
        model: selectedModel,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedContent(data.content);
      setGenerateData(data);
      toast.success(`블로그 글이 생성되었습니다. (토큰: ${data.tokens_used})`);
    },
    onError: (error) => {
      toast.error('생성에 실패했습니다. 다시 시도해주세요.');
      console.error(error);
    },
  });

  // Image generate mutation (이미지 생성)
  const imageGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!generateData || !generatedContent) {
        throw new Error('생성된 콘텐츠가 없습니다');
      }

      const res = await axios.post<GenerateImageResponse>('/api/generate-image', {
        title: generateData.title,
        content: generatedContent,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedImage(data.image_data);
      setImageMimeType(data.mime_type);
      toast.success('이미지가 생성되었습니다.');
    },
    onError: (error) => {
      toast.error('이미지 생성에 실패했습니다. 다시 시도해주세요.');
      console.error(error);
    },
  });

  // Save mutation (저장)
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!generateData) throw new Error('생성된 콘텐츠가 없습니다');

      // 제목 추출 (수정된 콘텐츠에서)
      const titleMatch = generatedContent.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1] : generateData.title;

      const res = await axios.post('/api/posts', {
        source_data_id: generateData.source_data_id,
        title,
        content: generatedContent,
        content_type: generateData.content_type,
        additional_request: generateData.additional_request,
        prompt_used: generateData.prompt_used,
        model_used: generateData.model_used,
        tokens_used: generateData.tokens_used,
        image_data: generatedImage || undefined,
        image_mime_type: imageMimeType || undefined,
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success('저장되었습니다.');
      router.push(`/posts/${data.id}`);
    },
    onError: (error) => {
      toast.error('저장에 실패했습니다.');
      console.error(error);
    },
  });

  const handleCopy = async () => {
    if (generatedContent) {
      await navigator.clipboard.writeText(generatedContent);
      setCopied(true);
      toast.success('클립보드에 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadImage = () => {
    if (!generatedImage || !imageMimeType) return;

    const link = document.createElement('a');
    link.href = `data:${imageMimeType};base64,${generatedImage}`;
    link.download = 'blog-image.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('이미지가 다운로드되었습니다.');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">블로그 글 생성</h1>
        <p className="text-gray-500 mt-1">
          소스 데이터를 선택하고 AI를 활용하여 블로그 글을 생성합니다.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 입력 영역 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. 소스 데이터 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger>
                  <SelectValue placeholder="번호를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {sourceDataList?.map((item) => (
                    <SelectItem key={item.id} value={item.number.toString()}>
                      {item.number}. {item.blog_topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedSourceData && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-2 text-sm">
                  <p>
                    <span className="font-medium text-gray-700">분류:</span>{' '}
                    <span className="text-gray-900">
                      {selectedSourceData.category_large}
                      {selectedSourceData.category_medium && ` > ${selectedSourceData.category_medium}`}
                      {selectedSourceData.category_small && ` > ${selectedSourceData.category_small}`}
                    </span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">주제:</span>{' '}
                    <span className="text-gray-900">{selectedSourceData.blog_topic}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">핵심키워드:</span>{' '}
                    <span className="text-gray-900">{selectedSourceData.core_keyword}</span>
                  </p>
                  <p>
                    <span className="font-medium text-gray-700">SEO키워드:</span>{' '}
                    <span className="text-gray-900">{selectedSourceData.seo_keywords.join(', ')}</span>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. 생성 옵션 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>AI 모델</Label>
                <Select value={selectedModel} onValueChange={(v) => setSelectedModel(v as AIModelId)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_MODELS.map((model) => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} - {model.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>글 유형</Label>
                <Select value={contentType} onValueChange={(v) => setContentType(v as ContentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>추가 요청사항 (선택)</Label>
                <Textarea
                  placeholder="특별히 강조하거나 포함했으면 하는 내용을 입력하세요..."
                  value={additionalRequest}
                  onChange={(e) => setAdditionalRequest(e.target.value)}
                  rows={4}
                />
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={() => generateMutation.mutate()}
                disabled={!selectedSourceData || generateMutation.isPending}
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    블로그 글 생성
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 결과 영역 */}
        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>생성 결과</CardTitle>
            {generatedContent && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCopy}>
                  {copied ? (
                    <Check className="h-4 w-4 mr-2" />
                  ) : (
                    <Copy className="h-4 w-4 mr-2" />
                  )}
                  {copied ? '복사됨' : '복사'}
                </Button>
                <Button
                  size="sm"
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  저장
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generateMutation.isPending ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Loader2 className="h-8 w-8 animate-spin mb-4" />
                <p>AI가 블로그 글을 작성하고 있습니다...</p>
                <p className="text-sm mt-1">잠시만 기다려주세요.</p>
              </div>
            ) : generatedContent ? (
              <div className="space-y-4">
                <Textarea
                  value={generatedContent}
                  onChange={(e) => setGeneratedContent(e.target.value)}
                  className="min-h-[500px] font-mono text-sm"
                  placeholder="생성된 콘텐츠가 여기에 표시됩니다..."
                />
                <p className="text-xs text-gray-500">
                  * 내용을 수정한 후 저장 버튼을 클릭하세요.
                </p>

                {/* 이미지 생성 섹션 */}
                <div className="mt-6 space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">이미지 생성</h3>

                  {/* 이미지 생성 버튼 */}
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => imageGenerateMutation.mutate()}
                    disabled={imageGenerateMutation.isPending}
                  >
                    {imageGenerateMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        이미지 생성 중...
                      </>
                    ) : (
                      <>
                        {/* eslint-disable-next-line jsx-a11y/alt-text */}
                        <Image className="h-4 w-4 mr-2" />
                        이미지 생성
                      </>
                    )}
                  </Button>

                  {/* 생성된 이미지 미리보기 */}
                  {generatedImage && (
                    <div className="space-y-4">
                      <div className="flex justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`data:${imageMimeType};base64,${generatedImage}`}
                          alt="생성된 이미지"
                          className="max-w-md w-full rounded-lg shadow-lg"
                        />
                      </div>

                      {/* 다운로드 버튼 */}
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={handleDownloadImage}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        이미지 다운로드
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>소스 데이터를 선택하고 생성 버튼을 클릭하면</p>
                <p>AI가 블로그 글을 작성합니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
