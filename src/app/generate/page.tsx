'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Sparkles, Loader2, Copy, Check, Save, Image, Download, Upload, X } from 'lucide-react';
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
import {
  CONTENT_TYPES,
  IMAGE_STYLES,
  IMAGE_MOODS,
  IMAGE_PURPOSES,
  type ContentType,
  type SourceData,
  type GenerateResponse,
  type GenerateMultipleImagesResponse,
  type GeneratedImageData,
  type ImageStyle,
  type ImageMood,
  type ImagePurpose,
  type ImageOption,
  type ReferenceImage,
} from '@/types';
import { uploadImageToStorage } from '@/lib/supabase-storage';

// 기본 이미지 옵션 생성
const createDefaultImageOptions = (): ImageOption[] => [
  { purpose: 'main', style: 'realistic', mood: 'professional', includeText: false, enabled: true },
  { purpose: 'sub1', style: 'realistic', mood: 'professional', includeText: false, enabled: false },
  { purpose: 'sub2', style: 'realistic', mood: 'professional', includeText: false, enabled: false },
  { purpose: 'sub3', style: 'realistic', mood: 'professional', includeText: false, enabled: false },
];

export default function GeneratePage() {
  const router = useRouter();
  const [selectedNumber, setSelectedNumber] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<AIModelId>(DEFAULT_MODEL);
  const [contentType, setContentType] = useState<ContentType>('informational');
  const [additionalRequest, setAdditionalRequest] = useState('');
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [generateData, setGenerateData] = useState<GenerateResponse | null>(null);
  const [copied, setCopied] = useState(false);

  // 다중 이미지 관련 상태
  const [imageOptions, setImageOptions] = useState<ImageOption[]>(createDefaultImageOptions());
  const [generatedImages, setGeneratedImages] = useState<GeneratedImageData[]>([]);
  const [useBatchSettings, setUseBatchSettings] = useState(true);
  const [activeTab, setActiveTab] = useState<ImagePurpose>('main');

  // 참고 이미지 상태 (일괄 적용)
  const [referenceImage, setReferenceImage] = useState<ReferenceImage | null>(null);
  const [referenceImagePreview, setReferenceImagePreview] = useState<string | null>(null);

  // 필터링 상태
  const [rangeInput, setRangeInput] = useState({ start: '', end: '' });
  const [numberRange, setNumberRange] = useState<{ start: number | null; end: number | null }>({ start: null, end: null });
  const [hideGeneratedSources, setHideGeneratedSources] = useState(false);

  // Fetch all source data for dropdown
  const { data: sourceDataList } = useQuery({
    queryKey: ['source-data-all'],
    queryFn: async () => {
      const res = await axios.get('/api/source-data?limit=1000');
      return res.data.data as SourceData[];
    },
  });

  // Fetch generated source IDs
  const { data: generatedStatusData } = useQuery({
    queryKey: ['generated-source-ids'],
    queryFn: async () => {
      const res = await axios.get('/api/source-data/generated-status');
      return res.data as { generated_ids: string[]; count: number };
    },
  });

  // 필터링 로직
  const { filteredSourceData, stats } = useMemo(() => {
    if (!sourceDataList) return { filteredSourceData: [], stats: { total: 0, generated: 0, notGenerated: 0 } };

    const generatedIds = new Set(generatedStatusData?.generated_ids || []);

    let filtered = sourceDataList;

    // 번호 범위 필터
    if (numberRange.start !== null || numberRange.end !== null) {
      filtered = filtered.filter(item => {
        const num = item.number;
        if (numberRange.start !== null && num < numberRange.start) return false;
        if (numberRange.end !== null && num > numberRange.end) return false;
        return true;
      });
    }

    // 생성 여부 필터
    if (hideGeneratedSources) {
      filtered = filtered.filter(item => !generatedIds.has(item.id));
    }

    // 통계 계산
    const generated = sourceDataList.filter(item => generatedIds.has(item.id)).length;

    return {
      filteredSourceData: filtered,
      stats: {
        total: sourceDataList.length,
        generated,
        notGenerated: sourceDataList.length - generated,
      },
    };
  }, [sourceDataList, generatedStatusData, numberRange, hideGeneratedSources]);

  // 필터 적용 함수
  const handleApplyRange = useCallback(() => {
    const start = rangeInput.start ? parseInt(rangeInput.start) : null;
    const end = rangeInput.end ? parseInt(rangeInput.end) : null;
    setNumberRange({ start, end });
  }, [rangeInput]);

  // 필터 초기화 함수
  const handleResetFilters = useCallback(() => {
    setRangeInput({ start: '', end: '' });
    setNumberRange({ start: null, end: null });
    setHideGeneratedSources(false);
    setSelectedNumber('');
  }, []);

  // Get selected source data
  const selectedSourceData = sourceDataList?.find(
    (s) => s.number.toString() === selectedNumber
  );

  // 이미지 옵션 업데이트 함수
  const updateImageOption = useCallback((purpose: ImagePurpose, updates: Partial<ImageOption>) => {
    setImageOptions(prev => prev.map(opt =>
      opt.purpose === purpose ? { ...opt, ...updates } : opt
    ));
  }, []);

  // 일괄 설정 적용 함수
  const applyBatchSettings = useCallback((updates: Partial<ImageOption>) => {
    setImageOptions(prev => prev.map(opt => ({ ...opt, ...updates })));
  }, []);

  // 참고 이미지 업로드 핸들러
  const handleReferenceImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 형식 검증
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('지원하지 않는 이미지 형식입니다. (JPEG, PNG, WebP만 지원)');
      return;
    }

    // 파일 크기 검증 (10MB 제한)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('이미지 크기가 너무 큽니다. (최대 10MB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:image/jpeg;base64,xxx 형식에서 base64 데이터만 추출
      const base64Data = result.split(',')[1];

      setReferenceImage({
        data: base64Data,
        mimeType: file.type,
      });
      setReferenceImagePreview(result);
      toast.success('참고 이미지가 업로드되었습니다.');
    };
    reader.onerror = () => {
      toast.error('이미지 읽기에 실패했습니다.');
    };
    reader.readAsDataURL(file);

    // input 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = '';
  }, []);

  // 참고 이미지 제거 핸들러
  const handleRemoveReferenceImage = useCallback(() => {
    setReferenceImage(null);
    setReferenceImagePreview(null);
    toast.info('참고 이미지가 제거되었습니다.');
  }, []);

  // 활성화된 이미지 개수
  const enabledImagesCount = imageOptions.filter(opt => opt.enabled).length;

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

  // 다중 이미지 생성 mutation
  const imageGenerateMutation = useMutation({
    mutationFn: async () => {
      if (!generateData || !generatedContent) {
        throw new Error('생성된 콘텐츠가 없습니다');
      }

      const enabledOptions = imageOptions.filter(opt => opt.enabled);
      if (enabledOptions.length === 0) {
        throw new Error('최소 1개 이상의 이미지를 선택해주세요');
      }

      const res = await axios.post<GenerateMultipleImagesResponse>('/api/generate-image', {
        title: generateData.title,
        content: generatedContent,
        referenceImage: referenceImage || undefined,  // 참고 이미지 전달
        images: enabledOptions.map(opt => ({
          purpose: opt.purpose,
          style: opt.style,
          mood: opt.mood,
          includeText: opt.includeText,
          textContent: opt.includeText ? opt.textContent : undefined,
          additionalRequest: opt.additionalRequest || undefined,
        })),
      });
      return res.data;
    },
    onSuccess: (data) => {
      setGeneratedImages(data.images);
      toast.success(`${data.images.length}개의 이미지가 생성되었습니다.`);
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

      // 메인 이미지와 서브 이미지 분리
      const mainImage = generatedImages.find(img => img.purpose === 'main');
      const subImages = generatedImages.filter(img => img.purpose !== 'main');

      // 이미지를 먼저 Supabase Storage에 직접 업로드 (Vercel 요청 크기 제한 우회)
      let mainImageUrl: string | undefined;
      const subImageUrls: string[] = [];

      if (mainImage) {
        toast.info('메인 이미지 업로드 중...');
        const url = await uploadImageToStorage(
          mainImage.image_data,
          mainImage.mime_type,
          'main'
        );
        if (url) {
          mainImageUrl = url;
        } else {
          throw new Error('메인 이미지 업로드에 실패했습니다.');
        }
      }

      if (subImages.length > 0) {
        toast.info('서브 이미지 업로드 중...');
        for (const img of subImages) {
          const url = await uploadImageToStorage(
            img.image_data,
            img.mime_type,
            img.purpose
          );
          if (url) {
            subImageUrls.push(url);
          }
        }
      }

      // URL만 전송 (요청 크기 대폭 감소)
      const res = await axios.post('/api/posts', {
        source_data_id: generateData.source_data_id,
        title,
        content: generatedContent,
        content_type: generateData.content_type,
        additional_request: generateData.additional_request,
        prompt_used: generateData.prompt_used,
        model_used: generateData.model_used,
        tokens_used: generateData.tokens_used,
        image_url: mainImageUrl,
        sub_image_urls: subImageUrls.length > 0 ? subImageUrls : undefined,
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

  const handleDownloadImage = (imageData: string, mimeType: string, purpose: string) => {
    const link = document.createElement('a');
    link.href = `data:${mimeType};base64,${imageData}`;
    link.download = `blog-image-${purpose}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('이미지가 다운로드되었습니다.');
  };

  // 현재 탭의 이미지 옵션
  const currentOption = imageOptions.find(opt => opt.purpose === activeTab) || imageOptions[0];

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
              {/* 필터링 옵션 */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg space-y-4">
                <h4 className="text-sm font-semibold text-gray-700">필터링 옵션</h4>

                {/* 번호 범위 필터 */}
                <div className="space-y-2">
                  <Label className="text-sm">번호 범위</Label>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="number"
                      placeholder="시작"
                      value={rangeInput.start}
                      onChange={(e) => setRangeInput(prev => ({ ...prev, start: e.target.value }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                    <span className="text-gray-500">~</span>
                    <input
                      type="number"
                      placeholder="끝"
                      value={rangeInput.end}
                      onChange={(e) => setRangeInput(prev => ({ ...prev, end: e.target.value }))}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                    />
                    <Button variant="outline" size="sm" onClick={handleApplyRange}>
                      적용
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleResetFilters}>
                      초기화
                    </Button>
                  </div>
                </div>

                {/* 생성 여부 필터 */}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hideGeneratedSources}
                      onChange={(e) => setHideGeneratedSources(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">미생성 소스만 표시</span>
                  </label>
                  <span className="text-xs text-gray-500">
                    미생성: {stats.notGenerated}개 / 전체: {stats.total}개
                  </span>
                </div>
              </div>

              <Select value={selectedNumber} onValueChange={setSelectedNumber}>
                <SelectTrigger>
                  <SelectValue placeholder={`번호를 선택하세요 (${filteredSourceData.length}개)`} />
                </SelectTrigger>
                <SelectContent>
                  {filteredSourceData.map((item) => {
                    const isGenerated = generatedStatusData?.generated_ids?.includes(item.id);
                    return (
                      <SelectItem
                        key={item.id}
                        value={item.number.toString()}
                        className={isGenerated ? 'text-gray-400' : ''}
                      >
                        {item.number}. {item.blog_topic}
                        {isGenerated && <span className="ml-2 text-xs text-gray-400">(생성됨)</span>}
                      </SelectItem>
                    );
                  })}
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
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="생성된 콘텐츠가 여기에 표시됩니다..."
                />
                <p className="text-xs text-gray-500">
                  * 내용을 수정한 후 저장 버튼을 클릭하세요.
                </p>

                {/* 이미지 생성 섹션 */}
                <div className="mt-6 space-y-4 border-t pt-6">
                  <h3 className="text-lg font-semibold">이미지 생성</h3>

                  {/* 일괄/개별 설정 토글 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm font-medium">설정 모드</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setUseBatchSettings(true)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          useBatchSettings ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        일괄 설정
                      </button>
                      <button
                        onClick={() => setUseBatchSettings(false)}
                        className={`px-3 py-1 rounded-md text-sm ${
                          !useBatchSettings ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        개별 설정
                      </button>
                    </div>
                  </div>

                  {/* 참고 이미지 업로드 */}
                  <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-700">참고 이미지 (선택사항)</h4>
                        <p className="text-xs text-gray-500 mt-0.5">
                          제품 사진 등을 업로드하면 이를 참고하여 이미지를 생성합니다
                        </p>
                      </div>
                    </div>

                    {referenceImagePreview ? (
                      // 미리보기 모드
                      <div className="relative inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={referenceImagePreview}
                          alt="참고 이미지 미리보기"
                          className="w-32 h-32 object-cover rounded-lg border border-gray-200 shadow-sm"
                        />
                        <button
                          onClick={handleRemoveReferenceImage}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-md"
                          title="이미지 제거"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      // 업로드 모드
                      <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors">
                        <Upload className="w-8 h-8 text-gray-400" />
                        <span className="mt-2 text-xs text-gray-500">이미지 추가</span>
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleReferenceImageUpload}
                          className="hidden"
                        />
                      </label>
                    )}

                    <p className="text-xs text-gray-400">
                      지원 형식: JPEG, PNG, WebP (최대 10MB)
                    </p>
                  </div>

                  {/* 이미지 활성화 체크박스 */}
                  <div className="flex flex-wrap gap-3 p-3 bg-gray-50 rounded-lg">
                    {IMAGE_PURPOSES.map((purposeInfo) => {
                      const opt = imageOptions.find(o => o.purpose === purposeInfo.id);
                      const isMain = purposeInfo.id === 'main';
                      return (
                        <label
                          key={purposeInfo.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                            opt?.enabled ? 'bg-blue-100 text-blue-800' : 'bg-white text-gray-600'
                          } ${isMain ? 'cursor-not-allowed' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={opt?.enabled ?? false}
                            disabled={isMain}
                            onChange={(e) => updateImageOption(purposeInfo.id, { enabled: e.target.checked })}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                          <span className="text-sm font-medium">{purposeInfo.name}</span>
                        </label>
                      );
                    })}
                  </div>

                  {/* 이미지 생성 옵션 */}
                  <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                    {useBatchSettings ? (
                      // 일괄 설정 모드
                      <>
                        <h4 className="text-sm font-semibold text-gray-700">일괄 설정 (모든 이미지에 적용)</h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>이미지 스타일</Label>
                            <Select
                              value={currentOption.style}
                              onValueChange={(v) => applyBatchSettings({ style: v as ImageStyle })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {IMAGE_STYLES.map((style) => (
                                  <SelectItem key={style.id} value={style.id}>
                                    {style.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>분위기</Label>
                            <Select
                              value={currentOption.mood}
                              onValueChange={(v) => applyBatchSettings({ mood: v as ImageMood })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {IMAGE_MOODS.map((mood) => (
                                  <SelectItem key={mood.id} value={mood.id}>
                                    {mood.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="batchIncludeText"
                              checked={currentOption.includeText}
                              onChange={(e) => applyBatchSettings({ includeText: e.target.checked })}
                              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <Label htmlFor="batchIncludeText" className="cursor-pointer">이미지에 텍스트 포함</Label>
                          </div>
                          {currentOption.includeText && (
                            <input
                              type="text"
                              placeholder="이미지에 포함할 텍스트를 입력하세요"
                              value={currentOption.textContent || ''}
                              onChange={(e) => applyBatchSettings({ textContent: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label>추가 요청사항 (선택)</Label>
                          <Textarea
                            placeholder="이미지 생성 시 추가로 원하는 사항을 입력하세요..."
                            value={currentOption.additionalRequest || ''}
                            onChange={(e) => applyBatchSettings({ additionalRequest: e.target.value })}
                            rows={2}
                          />
                        </div>
                      </>
                    ) : (
                      // 개별 설정 모드
                      <>
                        <h4 className="text-sm font-semibold text-gray-700">개별 설정</h4>
                        {/* 탭 버튼 */}
                        <div className="flex gap-1 border-b">
                          {imageOptions.filter(opt => opt.enabled).map((opt) => {
                            const purposeInfo = IMAGE_PURPOSES.find(p => p.id === opt.purpose);
                            return (
                              <button
                                key={opt.purpose}
                                onClick={() => setActiveTab(opt.purpose)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                  activeTab === opt.purpose
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                              >
                                {purposeInfo?.name}
                              </button>
                            );
                          })}
                        </div>
                        {/* 선택된 탭의 옵션 */}
                        <div className="pt-4 space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>이미지 스타일</Label>
                              <Select
                                value={currentOption.style}
                                onValueChange={(v) => updateImageOption(activeTab, { style: v as ImageStyle })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {IMAGE_STYLES.map((style) => (
                                    <SelectItem key={style.id} value={style.id}>
                                      {style.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>분위기</Label>
                              <Select
                                value={currentOption.mood}
                                onValueChange={(v) => updateImageOption(activeTab, { mood: v as ImageMood })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {IMAGE_MOODS.map((mood) => (
                                    <SelectItem key={mood.id} value={mood.id}>
                                      {mood.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <input
                                type="checkbox"
                                id={`includeText-${activeTab}`}
                                checked={currentOption.includeText}
                                onChange={(e) => updateImageOption(activeTab, { includeText: e.target.checked })}
                                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                              <Label htmlFor={`includeText-${activeTab}`} className="cursor-pointer">이미지에 텍스트 포함</Label>
                            </div>
                            {currentOption.includeText && (
                              <input
                                type="text"
                                placeholder="이미지에 포함할 텍스트를 입력하세요"
                                value={currentOption.textContent || ''}
                                onChange={(e) => updateImageOption(activeTab, { textContent: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              />
                            )}
                          </div>
                          <div className="space-y-2">
                            <Label>추가 요청사항 (선택)</Label>
                            <Textarea
                              placeholder="이미지 생성 시 추가로 원하는 사항을 입력하세요..."
                              value={currentOption.additionalRequest || ''}
                              onChange={(e) => updateImageOption(activeTab, { additionalRequest: e.target.value })}
                              rows={2}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* 이미지 생성 버튼 */}
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => imageGenerateMutation.mutate()}
                    disabled={imageGenerateMutation.isPending || enabledImagesCount === 0}
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
                        이미지 생성 ({enabledImagesCount}개)
                      </>
                    )}
                  </Button>

                  {/* 생성된 이미지 미리보기 그리드 */}
                  {generatedImages.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-semibold text-gray-700">생성된 이미지</h4>
                      <div className="grid grid-cols-2 gap-4">
                        {generatedImages.map((img) => {
                          const purposeInfo = IMAGE_PURPOSES.find(p => p.id === img.purpose);
                          return (
                            <div key={img.purpose} className="space-y-2">
                              <div className="relative group">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={`data:${img.mime_type};base64,${img.image_data}`}
                                  alt={purposeInfo?.name || img.purpose}
                                  className="w-full rounded-lg shadow-md aspect-square object-cover"
                                />
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100">
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => handleDownloadImage(img.image_data, img.mime_type, img.purpose)}
                                    className="shadow-lg"
                                  >
                                    <Download className="h-4 w-4 mr-1" />
                                    저장
                                  </Button>
                                </div>
                              </div>
                              <p className="text-center text-sm font-medium text-gray-600">
                                {purposeInfo?.name}
                              </p>
                            </div>
                          );
                        })}
                      </div>
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
