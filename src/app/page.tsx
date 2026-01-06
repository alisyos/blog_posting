'use client';

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Database, FileText, Sparkles, ArrowRight, Clock } from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Badge } from '@/components/ui';
import type { SourceDataListResponse, PostListResponse, PostStatus } from '@/types';

const STATUS_LABELS: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: '임시저장', variant: 'secondary' },
  published: { label: '발행됨', variant: 'default' },
  archived: { label: '보관됨', variant: 'outline' },
};

export default function DashboardPage() {
  const { data: sourceData } = useQuery<SourceDataListResponse>({
    queryKey: ['source-data-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/source-data?limit=1');
      return res.data;
    },
  });

  const { data: posts } = useQuery<PostListResponse>({
    queryKey: ['posts-stats'],
    queryFn: async () => {
      const res = await axios.get('/api/posts?limit=5');
      return res.data;
    },
  });

  const stats = [
    {
      title: '소스 데이터',
      value: sourceData?.total || 0,
      icon: Database,
      href: '/source-data',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: '생성된 글',
      value: posts?.total || 0,
      icon: FileText,
      href: '/posts',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
  ];

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">대시보드</h1>
        <p className="text-gray-500 mt-1">
          AI 블로그 생성 시스템에 오신 것을 환영합니다.
        </p>
      </div>

      {/* 통계 카드 */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-full ${stat.bgColor}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}

        <Link href="/generate">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-purple-500 to-indigo-600 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-100">새 글 생성</p>
                  <p className="text-lg font-medium mt-1">AI로 블로그 작성하기</p>
                </div>
                <div className="p-3 rounded-full bg-white/20">
                  <Sparkles className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 최근 생성된 글 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            최근 생성된 글
          </CardTitle>
          <Link href="/posts">
            <Button variant="ghost" size="sm">
              전체보기
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {!posts?.data.length ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>아직 생성된 글이 없습니다.</p>
              <Link href="/generate" className="mt-2 inline-block">
                <Button variant="outline" size="sm">
                  첫 번째 글 생성하기
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.data.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{post.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={STATUS_LABELS[post.status].variant}>
                          {STATUS_LABELS[post.status].label}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {post.model_used}
                        </span>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500 ml-4">
                      {format(new Date(post.created_at), 'M월 d일', {
                        locale: ko,
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
