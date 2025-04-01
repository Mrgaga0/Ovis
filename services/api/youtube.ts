import { google, youtube_v3 } from 'googleapis';

export interface YouTubeVideoMetadata {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  channelId: string;
  channelTitle: string;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
    standard?: { url: string; width: number; height: number };
  };
  tags: string[];
  categoryId: string;
  duration: string; // ISO 8601 형식 (PT1H2M3S)
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

export interface YouTubeChannelMetadata {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  subscriberCount: number;
  videoCount: number;
  viewCount: number;
  country?: string;
}

export interface YouTubeSearchResult {
  id: string;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnails: {
    default?: { url: string; width: number; height: number };
    medium?: { url: string; width: number; height: number };
    high?: { url: string; width: number; height: number };
  };
  channelId: string;
  channelTitle: string;
  type: 'video' | 'channel' | 'playlist';
}

export interface UploadVideoParams {
  title: string;
  description: string;
  tags?: string[];
  categoryId?: string;
  privacyStatus?: 'private' | 'public' | 'unlisted';
  filePath: string;
}

export class YouTubeAPI {
  private youtube: youtube_v3.Youtube;
  private apiKey: string;
  private pageSize: number;
  
  constructor(apiKey: string, pageSize: number = 10) {
    this.apiKey = apiKey;
    this.pageSize = pageSize;
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }
  
  /**
   * 단일 비디오 메타데이터 조회
   */
  async getVideoMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
    try {
      const [videoResponse, statisticsResponse] = await Promise.all([
        this.youtube.videos.list({
          part: ['snippet', 'contentDetails'],
          id: [videoId]
        }),
        this.youtube.videos.list({
          part: ['statistics'],
          id: [videoId]
        })
      ]);
      
      const videoData = videoResponse.data.items?.[0];
      const statisticsData = statisticsResponse.data.items?.[0];
      
      if (!videoData) {
        return null;
      }
      
      return {
        id: videoData.id || '',
        title: videoData.snippet?.title || '',
        description: videoData.snippet?.description || '',
        publishedAt: new Date(videoData.snippet?.publishedAt || ''),
        channelId: videoData.snippet?.channelId || '',
        channelTitle: videoData.snippet?.channelTitle || '',
        thumbnails: videoData.snippet?.thumbnails || {},
        tags: videoData.snippet?.tags || [],
        categoryId: videoData.snippet?.categoryId || '',
        duration: videoData.contentDetails?.duration || '',
        viewCount: Number(statisticsData?.statistics?.viewCount) || 0,
        likeCount: Number(statisticsData?.statistics?.likeCount) || 0,
        commentCount: Number(statisticsData?.statistics?.commentCount) || 0
      };
    } catch (error) {
      console.error('비디오 메타데이터 가져오기 오류:', error);
      throw new Error('YouTube API에서 비디오 정보를 가져오는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 채널 메타데이터 조회
   */
  async getChannelMetadata(channelId: string): Promise<YouTubeChannelMetadata | null> {
    try {
      const [channelResponse, statisticsResponse] = await Promise.all([
        this.youtube.channels.list({
          part: ['snippet'],
          id: [channelId]
        }),
        this.youtube.channels.list({
          part: ['statistics'],
          id: [channelId]
        })
      ]);
      
      const channelData = channelResponse.data.items?.[0];
      const statisticsData = statisticsResponse.data.items?.[0];
      
      if (!channelData) {
        return null;
      }
      
      return {
        id: channelData.id || '',
        title: channelData.snippet?.title || '',
        description: channelData.snippet?.description || '',
        publishedAt: new Date(channelData.snippet?.publishedAt || ''),
        thumbnails: channelData.snippet?.thumbnails || {},
        subscriberCount: Number(statisticsData?.statistics?.subscriberCount) || 0,
        videoCount: Number(statisticsData?.statistics?.videoCount) || 0,
        viewCount: Number(statisticsData?.statistics?.viewCount) || 0,
        country: channelData.snippet?.country
      };
    } catch (error) {
      console.error('채널 메타데이터 가져오기 오류:', error);
      throw new Error('YouTube API에서 채널 정보를 가져오는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 유튜브 검색 수행
   */
  async searchVideos(query: string, maxResults: number = this.pageSize, options: any = {}): Promise<YouTubeSearchResult[]> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        maxResults,
        type: options.type || ['video'],
        order: options.order || 'relevance',
        publishedAfter: options.publishedAfter,
        publishedBefore: options.publishedBefore,
        regionCode: options.regionCode || 'KR',
        relevanceLanguage: options.relevanceLanguage || 'ko'
      });
      
      return (response.data.items || []).map(item => ({
        id: item.id?.videoId || item.id?.channelId || item.id?.playlistId || '',
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: new Date(item.snippet?.publishedAt || ''),
        thumbnails: item.snippet?.thumbnails || {},
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        type: (item.id?.videoId ? 'video' : item.id?.channelId ? 'channel' : 'playlist') as 'video' | 'channel' | 'playlist'
      }));
    } catch (error) {
      console.error('YouTube 검색 오류:', error);
      throw new Error('YouTube API에서 검색을 수행하는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 채널의 비디오 목록 가져오기
   */
  async getChannelVideos(channelId: string, maxResults: number = this.pageSize): Promise<YouTubeSearchResult[]> {
    try {
      const response = await this.youtube.search.list({
        part: ['snippet'],
        channelId,
        maxResults,
        order: 'date',
        type: ['video']
      });
      
      return (response.data.items || []).map(item => ({
        id: item.id?.videoId || '',
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: new Date(item.snippet?.publishedAt || ''),
        thumbnails: item.snippet?.thumbnails || {},
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        type: 'video'
      }));
    } catch (error) {
      console.error('채널 비디오 가져오기 오류:', error);
      throw new Error('YouTube API에서 채널 비디오를 가져오는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 댓글 목록 가져오기
   */
  async getVideoComments(videoId: string, maxResults: number = this.pageSize): Promise<any[]> {
    try {
      const response = await this.youtube.commentThreads.list({
        part: ['snippet'],
        videoId,
        maxResults
      });
      
      return (response.data.items || []).map(item => {
        const commentSnippet = item.snippet?.topLevelComment?.snippet;
        return {
          id: item.id,
          authorDisplayName: commentSnippet?.authorDisplayName || '',
          authorProfileImageUrl: commentSnippet?.authorProfileImageUrl || '',
          authorChannelId: commentSnippet?.authorChannelId?.value || '',
          textDisplay: commentSnippet?.textDisplay || '',
          textOriginal: commentSnippet?.textOriginal || '',
          likeCount: commentSnippet?.likeCount || 0,
          publishedAt: new Date(commentSnippet?.publishedAt || ''),
          updatedAt: new Date(commentSnippet?.updatedAt || ''),
          replyCount: item.snippet?.totalReplyCount || 0
        };
      });
    } catch (error) {
      console.error('비디오 댓글 가져오기 오류:', error);
      throw new Error('YouTube API에서 댓글을 가져오는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 인기 비디오 가져오기
   */
  async getTrendingVideos(regionCode: string = 'KR', categoryId?: string, maxResults: number = this.pageSize): Promise<YouTubeVideoMetadata[]> {
    try {
      const params: youtube_v3.Params$Resource$Videos$List = {
        part: ['snippet', 'contentDetails', 'statistics'],
        chart: 'mostPopular',
        regionCode,
        maxResults
      };
      
      if (categoryId) {
        params.videoCategoryId = categoryId;
      }
      
      const response = await this.youtube.videos.list(params);
      
      return (response.data.items || []).map(item => ({
        id: item.id || '',
        title: item.snippet?.title || '',
        description: item.snippet?.description || '',
        publishedAt: new Date(item.snippet?.publishedAt || ''),
        channelId: item.snippet?.channelId || '',
        channelTitle: item.snippet?.channelTitle || '',
        thumbnails: item.snippet?.thumbnails || {},
        tags: item.snippet?.tags || [],
        categoryId: item.snippet?.categoryId || '',
        duration: item.contentDetails?.duration || '',
        viewCount: Number(item.statistics?.viewCount) || 0,
        likeCount: Number(item.statistics?.likeCount) || 0,
        commentCount: Number(item.statistics?.commentCount) || 0
      }));
    } catch (error) {
      console.error('인기 비디오 가져오기 오류:', error);
      throw new Error('YouTube API에서 인기 비디오를 가져오는 중 오류가 발생했습니다.');
    }
  }
  
  /**
   * 비디오 카테고리 목록 가져오기
   */
  async getVideoCategories(regionCode: string = 'KR'): Promise<any[]> {
    try {
      const response = await this.youtube.videoCategories.list({
        part: ['snippet'],
        regionCode
      });
      
      return (response.data.items || []).map(item => ({
        id: item.id,
        title: item.snippet?.title || '',
        assignable: item.snippet?.assignable || false
      }));
    } catch (error) {
      console.error('비디오 카테고리 가져오기 오류:', error);
      throw new Error('YouTube API에서 비디오 카테고리를 가져오는 중 오류가 발생했습니다.');
    }
  }
} 