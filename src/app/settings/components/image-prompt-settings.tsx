'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Edit } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Badge,
} from '@/components/ui';
import type { ImagePrompt, ImagePromptCategory, ImagePromptUpdateInput } from '@/types';

// 카테고리별 탭 설정
const CATEGORY_TABS: { key: ImagePromptCategory; label: string }[] = [
  { key: 'style', label: '스타일' },
  { key: 'mood', label: '분위기' },
  { key: 'purpose', label: '용도' },
  { key: 'text', label: '텍스트' },
  { key: 'template', label: '기본 템플릿' },
];

export default function ImagePromptSettings() {
  const [activeCategory, setActiveCategory] = useState<ImagePromptCategory>('style');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<ImagePrompt | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [editName, setEditName] = useState('');
  const [editPromptText, setEditPromptText] = useState('');

  // 이미지 프롬프트 목록 조회
  const { data: prompts, isLoading } = useQuery<ImagePrompt[]>({
    queryKey: ['image-prompts'],
    queryFn: async () => {
      const res = await axios.get('/api/image-prompts');
      return res.data;
    },
  });

  // 프롬프트 수정 mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; input: ImagePromptUpdateInput }) => {
      const res = await axios.put(`/api/image-prompts/${data.id}`, data.input);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['image-prompts'] });
      toast.success('프롬프트가 수정되었습니다.');
      handleCloseEdit();
    },
    onError: () => {
      toast.error('수정에 실패했습니다.');
    },
  });

  // 카테고리별 프롬프트 필터링
  const filteredPrompts = prompts?.filter((p) => p.category === activeCategory) || [];

  // 카테고리별 개수 계산
  const getCategoryCount = (category: ImagePromptCategory) => {
    return prompts?.filter((p) => p.category === category).length || 0;
  };

  // 편집 다이얼로그 열기
  const handleOpenEdit = (prompt: ImagePrompt) => {
    setEditingPrompt(prompt);
    setEditName(prompt.name);
    setEditPromptText(prompt.prompt);
    setIsEditOpen(true);
  };

  // 편집 다이얼로그 닫기
  const handleCloseEdit = () => {
    setIsEditOpen(false);
    setEditingPrompt(null);
    setEditName('');
    setEditPromptText('');
  };

  // 수정 제출
  const handleSubmitEdit = () => {
    if (!editingPrompt) return;

    updateMutation.mutate({
      id: editingPrompt.id,
      input: {
        name: editName,
        prompt: editPromptText,
      },
    });
  };

  return (
    <>
      <div className="mb-6">
        <p className="text-gray-500">
          이미지 생성에 사용할 프롬프트를 카테고리별로 관리합니다.
        </p>
      </div>

      {/* 카테고리 서브탭 */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_TABS.map((tab) => {
          const count = getCategoryCount(tab.key);
          const isActive = activeCategory === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveCategory(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span
                  className={`ml-2 px-1.5 py-0.5 rounded text-xs ${
                    isActive ? 'bg-white/20' : 'bg-gray-200'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 프롬프트 목록 */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center py-8">로딩 중...</p>
          ) : filteredPrompts.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              이 카테고리에 등록된 프롬프트가 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {filteredPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{prompt.name}</h3>
                        <Badge variant="outline" className="text-xs font-mono">
                          {prompt.key}
                        </Badge>
                        {!prompt.is_active && (
                          <Badge variant="secondary" className="text-xs">
                            비활성
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2 break-all">
                        {prompt.prompt}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-4 flex-shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleOpenEdit(prompt)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 편집 다이얼로그 */}
      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>프롬프트 수정</DialogTitle>
          </DialogHeader>

          {editingPrompt && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono">
                  {editingPrompt.category}
                </Badge>
                <Badge variant="secondary" className="font-mono">
                  {editingPrompt.key}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-name">표시 이름</Label>
                <Input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="프롬프트 표시 이름"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-prompt">프롬프트 내용</Label>
                <Textarea
                  id="edit-prompt"
                  value={editPromptText}
                  onChange={(e) => setEditPromptText(e.target.value)}
                  rows={8}
                  placeholder="이미지 생성에 사용할 프롬프트 내용"
                  className="font-mono text-sm"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseEdit}>
                  취소
                </Button>
                <Button
                  onClick={handleSubmitEdit}
                  disabled={!editName || !editPromptText || updateMutation.isPending}
                >
                  {updateMutation.isPending ? '저장 중...' : '저장'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
