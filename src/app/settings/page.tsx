'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Plus, Edit, Trash2, Star } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge,
  Checkbox,
} from '@/components/ui';
import { CONTENT_TYPES, type Prompt, type ContentType } from '@/types';

export default function SettingsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState<Prompt | null>(null);
  const queryClient = useQueryClient();

  // Form state
  const [name, setName] = useState('');
  const [contentType, setContentType] = useState<ContentType>('informational');
  const [template, setTemplate] = useState('');
  const [isDefault, setIsDefault] = useState(false);

  const { data: prompts, isLoading } = useQuery<Prompt[]>({
    queryKey: ['prompts'],
    queryFn: async () => {
      const res = await axios.get('/api/prompts');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.post('/api/prompts', {
        name,
        content_type: contentType,
        template,
        is_default: isDefault,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('프롬프트가 저장되었습니다.');
      handleClose();
    },
    onError: () => {
      toast.error('저장에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const res = await axios.put(`/api/prompts/${editPrompt?.id}`, {
        name,
        content_type: contentType,
        template,
        is_default: isDefault,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('프롬프트가 수정되었습니다.');
      handleClose();
    },
    onError: () => {
      toast.error('수정에 실패했습니다.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prompts'] });
      toast.success('삭제되었습니다.');
    },
    onError: () => {
      toast.error('삭제에 실패했습니다.');
    },
  });

  const handleEdit = (prompt: Prompt) => {
    setEditPrompt(prompt);
    setName(prompt.name);
    setContentType(prompt.content_type);
    setTemplate(prompt.template);
    setIsDefault(prompt.is_default);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditPrompt(null);
    setName('');
    setContentType('informational');
    setTemplate('');
    setIsDefault(false);
  };

  const handleSubmit = () => {
    if (editPrompt) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">설정</h1>
          <p className="text-gray-500 mt-1">
            프롬프트 템플릿을 관리합니다.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          프롬프트 추가
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>프롬프트 템플릿</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8">로딩 중...</p>
          ) : prompts?.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              등록된 프롬프트가 없습니다.
            </p>
          ) : (
            <div className="space-y-4">
              {prompts?.map((prompt) => (
                <div
                  key={prompt.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{prompt.name}</h3>
                        {prompt.is_default && (
                          <Badge variant="default" className="text-xs">
                            <Star className="h-3 w-3 mr-1" />
                            기본
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {CONTENT_TYPES.find((t) => t.id === prompt.content_type)?.name}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                        {prompt.template}
                      </p>
                    </div>
                    <div className="flex gap-1 ml-4">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleEdit(prompt)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(prompt.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editPrompt ? '프롬프트 수정' : '프롬프트 추가'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">프롬프트 이름</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="예: 정보성 글 기본 템플릿"
                />
              </div>

              <div className="space-y-2">
                <Label>글 유형</Label>
                <Select
                  value={contentType}
                  onValueChange={(v) => setContentType(v as ContentType)}
                >
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">프롬프트 템플릿</Label>
              <Textarea
                id="template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={10}
                placeholder="프롬프트 내용을 입력하세요. {{변수}}를 사용할 수 있습니다."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_default"
                checked={isDefault}
                onCheckedChange={(checked) => setIsDefault(checked === true)}
              />
              <Label htmlFor="is_default" className="cursor-pointer">
                이 글 유형의 기본 프롬프트로 설정
              </Label>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleClose}>
                취소
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  !name ||
                  !template ||
                  createMutation.isPending ||
                  updateMutation.isPending
                }
              >
                {createMutation.isPending || updateMutation.isPending
                  ? '저장 중...'
                  : '저장'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
