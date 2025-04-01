import { NextRequest, NextResponse } from 'next/server';
import { BraveSearchAPI } from '@/services/api/brave-search';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, options, type = 'web' } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: '유효한 검색어를 입력해주세요.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.BRAVE_SEARCH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Brave Search API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }

    const searchAPI = new BraveSearchAPI(apiKey);
    let results;

    if (type === 'news') {
      results = await searchAPI.searchNews(query, options);
    } else {
      results = await searchAPI.search(query, options);
    }

    return NextResponse.json(results);
  } catch (error) {
    console.error('검색 API 오류:', error);
    return NextResponse.json(
      { error: '검색 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 