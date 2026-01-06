import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import type { SourceDataInput } from '@/types';

interface CSVRow {
  번호: string;
  대분류: string;
  중분류: string;
  소분류?: string;
  '핵심 키워드': string;
  'SEO 키워드': string;
  '블로그 콘텐츠 주제': string;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();

    const { data: csvData, errors } = Papa.parse<CSVRow>(text, {
      header: true,
      skipEmptyLines: true,
    });

    if (errors.length > 0) {
      return NextResponse.json(
        { error: 'CSV parsing error', details: errors },
        { status: 400 }
      );
    }

    const sourceDataList: SourceDataInput[] = csvData.map((row) => ({
      number: parseInt(row['번호']) || 0,
      category_large: row['대분류'] || '',
      category_medium: row['중분류'] || '',
      category_small: row['소분류'] || undefined,
      core_keyword: row['핵심 키워드'] || '',
      seo_keywords: row['SEO 키워드']
        ? row['SEO 키워드'].split(',').map((k) => k.trim())
        : [],
      blog_topic: row['블로그 콘텐츠 주제'] || '',
    }));

    const validData = sourceDataList.filter(
      (item) =>
        item.number > 0 &&
        item.category_large &&
        item.category_medium &&
        item.core_keyword &&
        item.blog_topic
    );

    if (validData.length === 0) {
      return NextResponse.json(
        { error: 'No valid data found in CSV' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('source_data')
      .upsert(validData, { onConflict: 'number' })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      imported: data?.length || 0,
      total: csvData.length,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
