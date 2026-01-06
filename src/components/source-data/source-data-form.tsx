'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Button, Input, Label, Textarea } from '@/components/ui';
import type { SourceData, SourceDataInput } from '@/types';

const sourceDataSchema = z.object({
  number: z.number().min(1, '번호는 1 이상이어야 합니다'),
  category_large: z.string().min(1, '대분류를 입력해주세요'),
  category_medium: z.string().min(1, '중분류를 입력해주세요'),
  category_small: z.string().optional(),
  core_keyword: z.string().min(1, '핵심 키워드를 입력해주세요'),
  seo_keywords: z.string().min(1, 'SEO 키워드를 입력해주세요'),
  blog_topic: z.string().min(1, '블로그 주제를 입력해주세요'),
});

type FormData = z.infer<typeof sourceDataSchema>;

interface SourceDataFormProps {
  editData?: SourceData | null;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function SourceDataForm({
  editData,
  onSuccess,
  onCancel,
}: SourceDataFormProps) {
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(sourceDataSchema),
    defaultValues: editData
      ? {
          ...editData,
          seo_keywords: editData.seo_keywords.join(', '),
          category_small: editData.category_small || '',
        }
      : undefined,
  });

  const createMutation = useMutation({
    mutationFn: async (data: SourceDataInput) => {
      const res = await axios.post('/api/source-data', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-data'] });
      toast.success('저장되었습니다.');
      reset();
      onSuccess?.();
    },
    onError: () => {
      toast.error('저장에 실패했습니다.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: SourceDataInput) => {
      const res = await axios.put(`/api/source-data/${editData?.id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-data'] });
      toast.success('수정되었습니다.');
      onSuccess?.();
    },
    onError: () => {
      toast.error('수정에 실패했습니다.');
    },
  });

  const onSubmit = (data: FormData) => {
    const payload: SourceDataInput = {
      ...data,
      seo_keywords: data.seo_keywords.split(',').map((k) => k.trim()),
      category_small: data.category_small || undefined,
    };

    if (editData) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="number">번호</Label>
          <Input
            id="number"
            type="number"
            {...register('number', { valueAsNumber: true })}
          />
          {errors.number && (
            <p className="text-sm text-red-500">{errors.number.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="core_keyword">핵심 키워드</Label>
          <Input id="core_keyword" {...register('core_keyword')} />
          {errors.core_keyword && (
            <p className="text-sm text-red-500">{errors.core_keyword.message}</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="category_large">대분류</Label>
          <Input id="category_large" {...register('category_large')} />
          {errors.category_large && (
            <p className="text-sm text-red-500">
              {errors.category_large.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_medium">중분류</Label>
          <Input id="category_medium" {...register('category_medium')} />
          {errors.category_medium && (
            <p className="text-sm text-red-500">
              {errors.category_medium.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category_small">소분류</Label>
          <Input id="category_small" {...register('category_small')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="seo_keywords">SEO 키워드 (쉼표로 구분)</Label>
        <Input
          id="seo_keywords"
          placeholder="키워드1, 키워드2, 키워드3"
          {...register('seo_keywords')}
        />
        {errors.seo_keywords && (
          <p className="text-sm text-red-500">{errors.seo_keywords.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="blog_topic">블로그 콘텐츠 주제</Label>
        <Textarea
          id="blog_topic"
          rows={3}
          {...register('blog_topic')}
        />
        {errors.blog_topic && (
          <p className="text-sm text-red-500">{errors.blog_topic.message}</p>
        )}
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button
          type="submit"
          disabled={createMutation.isPending || updateMutation.isPending}
        >
          {createMutation.isPending || updateMutation.isPending
            ? '저장 중...'
            : editData
            ? '수정'
            : '저장'}
        </Button>
      </div>
    </form>
  );
}
