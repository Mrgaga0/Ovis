import { NextRequest, NextResponse } from 'next/server';
import { YouTubeAPI } from '@/services/api/youtube';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action');
    
    if (!action) {
      return NextResponse.json(
        { error: '액션을 지정해주세요 (search, video, channel, trending, categories)' },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }
    
    const youtubeAPI = new YouTubeAPI(apiKey);
    
    switch (action) {
      case 'search': {
        const query = searchParams.get('query');
        const maxResults = searchParams.get('maxResults') ? parseInt(searchParams.get('maxResults')!, 10) : 10;
        
        if (!query) {
          return NextResponse.json(
            { error: '검색어를 입력해주세요.' },
            { status: 400 }
          );
        }
        
        const options = {
          type: searchParams.get('type')?.split(',') || ['video'],
          order: searchParams.get('order') || 'relevance',
          regionCode: searchParams.get('regionCode') || 'KR',
          relevanceLanguage: searchParams.get('relevanceLanguage') || 'ko'
        };
        
        const results = await youtubeAPI.searchVideos(query, maxResults, options);
        return NextResponse.json(results);
      }
      
      case 'video': {
        const videoId = searchParams.get('id');
        
        if (!videoId) {
          return NextResponse.json(
            { error: '비디오 ID를 입력해주세요.' },
            { status: 400 }
          );
        }
        
        const video = await youtubeAPI.getVideoMetadata(videoId);
        
        if (!video) {
          return NextResponse.json(
            { error: '비디오를 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(video);
      }
      
      case 'channel': {
        const channelId = searchParams.get('id');
        
        if (!channelId) {
          return NextResponse.json(
            { error: '채널 ID를 입력해주세요.' },
            { status: 400 }
          );
        }
        
        const channel = await youtubeAPI.getChannelMetadata(channelId);
        
        if (!channel) {
          return NextResponse.json(
            { error: '채널을 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(channel);
      }
      
      case 'channel-videos': {
        const channelId = searchParams.get('id');
        const maxResults = searchParams.get('maxResults') ? parseInt(searchParams.get('maxResults')!, 10) : 10;
        
        if (!channelId) {
          return NextResponse.json(
            { error: '채널 ID를 입력해주세요.' },
            { status: 400 }
          );
        }
        
        const videos = await youtubeAPI.getChannelVideos(channelId, maxResults);
        return NextResponse.json(videos);
      }
      
      case 'comments': {
        const videoId = searchParams.get('videoId');
        const maxResults = searchParams.get('maxResults') ? parseInt(searchParams.get('maxResults')!, 10) : 10;
        
        if (!videoId) {
          return NextResponse.json(
            { error: '비디오 ID를 입력해주세요.' },
            { status: 400 }
          );
        }
        
        const comments = await youtubeAPI.getVideoComments(videoId, maxResults);
        return NextResponse.json(comments);
      }
      
      case 'trending': {
        const regionCode = searchParams.get('regionCode') || 'KR';
        const categoryId = searchParams.get('categoryId');
        const maxResults = searchParams.get('maxResults') ? parseInt(searchParams.get('maxResults')!, 10) : 10;
        
        const videos = await youtubeAPI.getTrendingVideos(regionCode, categoryId || undefined, maxResults);
        return NextResponse.json(videos);
      }
      
      case 'categories': {
        const regionCode = searchParams.get('regionCode') || 'KR';
        
        const categories = await youtubeAPI.getVideoCategories(regionCode);
        return NextResponse.json(categories);
      }
      
      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('YouTube API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: '액션을 지정해주세요.' },
        { status: 400 }
      );
    }
    
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API 키가 설정되지 않았습니다.' },
        { status: 500 }
      );
    }
    
    const youtubeAPI = new YouTubeAPI(apiKey);
    
    switch (action) {
      case 'search': {
        const { query, maxResults = 10, ...options } = params;
        
        if (!query) {
          return NextResponse.json(
            { error: '검색어를 입력해주세요.' },
            { status: 400 }
          );
        }
        
        const results = await youtubeAPI.searchVideos(query, maxResults, options);
        return NextResponse.json(results);
      }
      
      // 다른 API 액션도 필요에 따라 구현 가능
      
      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('YouTube API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 