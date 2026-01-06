'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import { Trash2, Edit, Search } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Input,
  Badge,
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui';
import type { SourceData, SourceDataListResponse } from '@/types';

interface SourceDataTableProps {
  onEdit?: (data: SourceData) => void;
}

export function SourceDataTable({ onEdit }: SourceDataTableProps) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<SourceDataListResponse>({
    queryKey: ['source-data', page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      });
      if (search) params.set('search', search);
      const res = await axios.get(`/api/source-data?${params}`);
      return res.data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await axios.delete(`/api/source-data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['source-data'] });
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="키워드 또는 주제로 검색..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-sm"
        />
        <Button onClick={handleSearch} variant="outline">
          <Search className="h-4 w-4 mr-2" />
          검색
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">번호</TableHead>
              <TableHead className="w-24">대분류</TableHead>
              <TableHead className="w-24">중분류</TableHead>
              <TableHead className="w-24">소분류</TableHead>
              <TableHead>블로그 주제</TableHead>
              <TableHead>핵심 키워드</TableHead>
              <TableHead className="w-32">SEO 키워드</TableHead>
              <TableHead className="w-24 text-center">작업</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  로딩 중...
                </TableCell>
              </TableRow>
            ) : data?.data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  데이터가 없습니다.
                </TableCell>
              </TableRow>
            ) : (
              data?.data.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.number}</TableCell>
                  <TableCell>{item.category_large}</TableCell>
                  <TableCell>{item.category_medium}</TableCell>
                  <TableCell>{item.category_small || '-'}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {item.blog_topic}
                  </TableCell>
                  <TableCell>{item.core_keyword}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {item.seo_keywords.slice(0, 2).map((kw, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {kw}
                        </Badge>
                      ))}
                      {item.seo_keywords.length > 2 && (
                        <Badge variant="outline" className="text-xs">
                          +{item.seo_keywords.length - 2}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-center">
                      {onEdit && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => onEdit(item)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
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
                  <PaginationLink isActive={p === page} onClick={() => setPage(p)}>
                    {p}
                  </PaginationLink>
                </PaginationItem>
              )
            )}
            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                disabled={page === data.totalPages}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
