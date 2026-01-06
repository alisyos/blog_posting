import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import type { SourceDataInput, SourceDataFilter } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filter: SourceDataFilter = {
      search: searchParams.get('search') || undefined,
      category_large: searchParams.get('category_large') || undefined,
      category_medium: searchParams.get('category_medium') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      limit: parseInt(searchParams.get('limit') || '10'),
    };

    let query = supabase
      .from('source_data')
      .select('*', { count: 'exact' });

    if (filter.search) {
      query = query.or(
        `blog_topic.ilike.%${filter.search}%,core_keyword.ilike.%${filter.search}%`
      );
    }

    if (filter.category_large) {
      query = query.eq('category_large', filter.category_large);
    }

    if (filter.category_medium) {
      query = query.eq('category_medium', filter.category_medium);
    }

    const page = filter.page || 1;
    const limit = filter.limit || 10;
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    query = query.order('number', { ascending: true }).range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SourceDataInput = await request.json();

    const { data, error } = await supabase
      .from('source_data')
      .insert([body])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
