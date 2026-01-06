'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Upload } from 'lucide-react';
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
} from '@/components/ui';
import { SourceDataTable } from '@/components/source-data/source-data-table';
import { SourceDataForm } from '@/components/source-data/source-data-form';
import type { SourceData } from '@/types';

export default function SourceDataPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editData, setEditData] = useState<SourceData | null>(null);

  const handleEdit = (data: SourceData) => {
    setEditData(data);
    setIsFormOpen(true);
  };

  const handleClose = () => {
    setIsFormOpen(false);
    setEditData(null);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">소스 데이터 관리</h1>
          <p className="text-gray-500 mt-1">
            블로그 생성을 위한 기초 데이터를 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/source-data/upload">
            <Button variant="outline">
              <Upload className="h-4 w-4 mr-2" />
              CSV 업로드
            </Button>
          </Link>
          <Button onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            직접 추가
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>소스 데이터 목록</CardTitle>
        </CardHeader>
        <CardContent>
          <SourceDataTable onEdit={handleEdit} />
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editData ? '소스 데이터 수정' : '소스 데이터 추가'}
            </DialogTitle>
          </DialogHeader>
          <SourceDataForm
            editData={editData}
            onSuccess={handleClose}
            onCancel={handleClose}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
