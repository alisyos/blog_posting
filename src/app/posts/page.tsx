'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Eye, Edit, Trash2, Search } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Badge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui';
import {
  CONTENT_TYPES,
  type PostListResponse,
  type PostStatus,
} from '@/types';

const STATUS_LABELS: Record<PostStatus, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  draft: { label: '임시저장', variant: 'secondary' },
  published: { label: '발행됨', variant: 'default' },
  archived: { label: '보관됨', variant: 'outline' },
};

export default function PostsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [contentType, setContentType] = useState<string>('all');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<PostListResponse>({
    queryKey: ['posts', page, search, status, contentType],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      if (status !== 'all') params.set('status', status);
      if (contentType !== 'all') params.set('content_type', contentType);

      const res = await axios.get(`/api/posts?${params}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/posts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('삭제되었습니다.');
    },
    onError: () => {
      toast.error('삭제에 실패했습니다.');
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">생성된 글 관리</h1>
        <p className="text-gray-500 mt-1">
          AI로 생성된 블로그 글을 확인하고 관리합니다.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>글 목록</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Input
              placeholder="제목 또는 내용으로 검색..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="max-w-xs"
            />
            <Button onClick={handleSearch} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              검색
            </Button>

            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="published">발행됨</SelectItem>
                <SelectItem value="archived">보관됨</SelectItem>
              </SelectContent>
            </Select>

            <Select value={contentType} onValueChange={(v) => { setContentType(v); setPage(1); }}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="글 유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                {CONTENT_TYPES.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>제목</TableHead>
                  <TableHead className="w-24">상태</TableHead>
                  <TableHead className="w-28">글 유형</TableHead>
                  <TableHead className="w-24">모델</TableHead>
                  <TableHead className="w-32">생성일</TableHead>
                  <TableHead className="w-28 text-center">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      로딩 중...
                    </TableCell>
                  </TableRow>
                ) : data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-gray-500"
                    >
                      생성된 글이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="max-w-md">
                          <p className="font-medium truncate">{post.title}</p>
                          {post.source_data && (
                            <p className="text-xs text-gray-500 truncate">
                              #{post.source_data.number} {post.source_data.blog_topic}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_LABELS[post.status].variant}>
                          {STATUS_LABELS[post.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {post.content_type && (
                          <span className="text-sm">
                            {CONTENT_TYPES.find((t) => t.id === post.content_type)?.name}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-xs text-gray-500">{post.model_used}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">
                          {format(new Date(post.created_at), 'yy.MM.dd HH:mm', {
                            locale: ko,
                          })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 justify-center">
                          <Link href={`/posts/${post.id}`}>
                            <Button size="icon" variant="ghost">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/posts/${post.id}/edit`}>
                            <Button size="icon" variant="ghost">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(post.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {data && data.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  />
                </PaginationItem>
                {Array.from({ length: data.totalPages }, (_, i) => i + 1).map(
                  (p) => (
                    <PaginationItem key={p}>
                      <PaginationLink
                        isActive={p === page}
                        onClick={() => setPage(p)}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    disabled={page === data.totalPages}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
