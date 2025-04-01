import { NextRequest, NextResponse } from 'next/server';
import { RSSParser } from '@/lib/news/rss-parser';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, urls, options } = body;

    if (!url && (!urls || !Array.isArray(urls) || urls.length === 0)) {
      return NextResponse.json(
        { error: 'RSS 피드 URL을 제공해주세요.' },
        { status: 400 }
      );
    }

    const parser = new RSSParser(options);
    
    if (url) {
      // 단일 URL 처리
      const feed = await parser.fetchAndParse(url);
      return NextResponse.json(feed);
    } else {
      // 여러 URL 처리
      const feeds = await parser.fetchMultipleFeeds(urls);
      return NextResponse.json(feeds);
    }
  } catch (error) {
    console.error('RSS API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = request.nextUrl.searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'RSS 피드 URL을 제공해주세요.' },
        { status: 400 }
      );
    }
    
    const parser = new RSSParser();
    const feed = await parser.fetchAndParse(url);
    
    return NextResponse.json(feed);
  } catch (error) {
    console.error('RSS API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 