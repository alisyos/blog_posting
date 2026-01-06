'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { ArrowLeft, Edit, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'react-toastify';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import { CONTENT_TYPES, type GeneratedPost, type PostStatus } from '@/types';

const STATUS_LABELS: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: '임시저장', variant: 'secondary' },
  published: { label: '발행됨', variant: 'default' },
  archived: { label: '보관됨', variant: 'outline' },
};

export default function PostDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const [copied, setCopied] = useState(false);

  const { data: post, isLoading } = useQuery<GeneratedPost>({
    queryKey: ['post', id],
    queryFn: async () => {
      const res = await axios.get(`/api/posts/${id}`);
      return res.data;
    },
  });

  const handleCopy = async () => {
    if (post?.content) {
      await navigator.clipboard.writeText(post.content);
      setCopied(true);
      toast.success('클립보드에 복사되었습니다.');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="container mx-auto py-8 px-4">
        <p>글을 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link href="/posts">
          <Button variant="ghost" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{post.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={STATUS_LABELS[post.status].variant}>
                {STATUS_LABELS[post.status].label}
              </Badge>
              {post.content_type && (
                <Badge variant="outline">
                  {CONTENT_TYPES.find((t) => t.id === post.content_type)?.name}
                </Badge>
              )}
              <span className="text-sm text-gray-500">
                {format(new Date(post.created_at), 'yyyy년 M월 d일 HH:mm', {
                  locale: ko,
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Copy className="h-4 w-4 mr-2" />
              )}
              {copied ? '복사됨' : '복사'}
            </Button>
            <Link href={`/posts/${id}/edit`}>
              <Button>
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>본문</CardTitle>
          </CardHeader>
          <CardContent>
            {post.image_url && (
              <div className="mb-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.image_url}
                  alt={post.title}
                  className="w-full max-w-2xl rounded-lg shadow-lg mx-auto"
                />
              </div>
            )}
            <div
              className="prose prose-sm max-w-none whitespace-pre-wrap"
              dangerouslySetInnerHTML={{
                __html: post.content
                  .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold mt-4 mb-2">$1</h1>')
                  .replace(/^## (.+)$/gm, '<h2 class="text-lg font-semibold mt-3 mb-2">$1</h2>')
                  .replace(/^### (.+)$/gm, '<h3 class="font-medium mt-2 mb-1">$1</h3>')
                  .replace(/\n/g, '<br />'),
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>메타 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">사용 모델</p>
                <p className="font-medium">{post.model_used}</p>
              </div>
              {post.tokens_used && (
                <div>
                  <p className="text-sm text-gray-500">사용 토큰</p>
                  <p className="font-medium">{post.tokens_used.toLocaleString()}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">생성일</p>
                <p className="font-medium">
                  {format(new Date(post.created_at), 'yyyy년 M월 d일 HH:mm', {
                    locale: ko,
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">수정일</p>
                <p className="font-medium">
                  {format(new Date(post.updated_at), 'yyyy년 M월 d일 HH:mm', {
                    locale: ko,
                  })}
                </p>
              </div>
            </CardContent>
          </Card>

          {post.source_data && (
            <Card>
              <CardHeader>
                <CardTitle>소스 데이터</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm">
                  <span className="text-gray-500">번호:</span>{' '}
                  {post.source_data.number}
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">주제:</span>{' '}
                  {post.source_data.blog_topic}
                </p>
                <p className="text-sm">
                  <span className="text-gray-500">핵심 키워드:</span>{' '}
                  {post.source_data.core_keyword}
                </p>
              </CardContent>
            </Card>
          )}

          {post.additional_request && (
            <Card>
              <CardHeader>
                <CardTitle>추가 요청사항</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{post.additional_request}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
