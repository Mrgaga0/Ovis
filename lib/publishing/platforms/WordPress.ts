import axios, { AxiosInstance } from 'axios';
import { Article, ContentTransformOptions, PublishingPlatform, PublishResult, TransformedContent } from '../types';
import { BasePlatform } from './BasePlatform';

/**
 * WordPress REST API 연동을 위한 클래스
 */
export class WordPress extends BasePlatform {
  private client: AxiosInstance;
  private siteUrl: string;
  private wpRestUrl: string;
  private authConfig: {
    username?: string;
    password?: string;
    applicationPassword?: string;
    consumerKey?: string;
    consumerSecret?: string;
  };
  
  /**
   * WordPress 플랫폼 생성자
   * @param platform 플랫폼 정보
   */
  constructor(platform: PublishingPlatform) {
    super(platform);
    
    // WordPress REST API 엔드포인트 구성
    this.siteUrl = platform.url.endsWith('/') ? platform.url.slice(0, -1) : platform.url;
    this.wpRestUrl = `${this.siteUrl}/wp-json/wp/v2`;
    
    // 인증 설정
    this.authConfig = {
      username: platform.username,
      password: platform.password,
      applicationPassword: platform.settings?.applicationPassword,
      consumerKey: platform.settings?.consumerKey,
      consumerSecret: platform.settings?.consumerSecret
    };
    
    // Axios 인스턴스 생성
    this.client = axios.create({
      baseURL: this.wpRestUrl,
      timeout: 30000, // 30초 타임아웃
    });
    
    // 인증 방식에 따른 설정
    this.setupAuthentication();
  }
  
  /**
   * 인증 방식에 따른 Axios 설정
   */
  private setupAuthentication(): void {
    // 애플리케이션 패스워드 인증 (선호)
    if (this.authConfig.applicationPassword) {
      this.client.defaults.headers.common['Authorization'] = `Basic ${Buffer.from(
        `${this.authConfig.username}:${this.authConfig.applicationPassword}`
      ).toString('base64')}`;
    }
    // 기본 인증
    else if (this.authConfig.username && this.authConfig.password) {
      this.client.defaults.headers.common['Authorization'] = `Basic ${Buffer.from(
        `${this.authConfig.username}:${this.authConfig.password}`
      ).toString('base64')}`;
    }
    // OAuth 인증 (고급)
    else if (this.authConfig.consumerKey && this.authConfig.consumerSecret) {
      // OAuth 1.0a는 복잡한 서명이 필요하므로 실제 구현에서는 oauth-1.0a 라이브러리 사용 권장
      console.warn('OAuth 인증은 이 예제에서 완전히 구현되지 않았습니다.');
    }
  }
  
  /**
   * 플랫폼 연결 테스트
   * @returns 연결 성공 여부
   */
  async testConnection(): Promise<{ success: boolean; message?: string }> {
    try {
      const response = await this.client.get('/users/me');
      return {
        success: true,
        message: `연결 성공 (사용자: ${response.data.name})`
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류';
      return {
        success: false,
        message: `연결 실패: ${errorMessage}`
      };
    }
  }
  
  /**
   * 카테고리 목록 가져오기
   */
  async getCategories(): Promise<Array<{ id: number; name: string; slug: string }>> {
    try {
      const response = await this.client.get('/categories', {
        params: { per_page: 100 }
      });
      return response.data.map((category: any) => ({
        id: category.id,
        name: category.name,
        slug: category.slug
      }));
    } catch (error) {
      console.error('WordPress 카테고리 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 태그 목록 가져오기
   */
  async getTags(): Promise<Array<{ id: number; name: string; slug: string }>> {
    try {
      const response = await this.client.get('/tags', {
        params: { per_page: 100 }
      });
      return response.data.map((tag: any) => ({
        id: tag.id,
        name: tag.name,
        slug: tag.slug
      }));
    } catch (error) {
      console.error('WordPress 태그 조회 오류:', error);
      return [];
    }
  }
  
  /**
   * 이미지 업로드
   * @param imageUrl 이미지 URL
   * @param title 이미지 제목
   * @param alt 대체 텍스트
   * @returns 업로드된 이미지 ID와 URL
   */
  async uploadImage(imageUrl: string, title?: string, alt?: string): Promise<{ id: number; url: string; } | null> {
    try {
      // 이미지 파일 가져오기 (실제 구현에서는 blob/buffer 처리 필요)
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const buffer = Buffer.from(imageResponse.data, 'binary');
      
      // 파일명 추출
      const filename = imageUrl.split('/').pop() || 'image.jpg';
      
      // 파일 타입 추론
      const fileType = this.inferFileType(filename);
      
      // 미디어 업로드
      const uploadResponse = await this.client.post('/media', buffer, {
        headers: {
          'Content-Type': fileType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
      
      // 메타데이터 업데이트 (제목, 대체 텍스트)
      if (title || alt) {
        await this.client.post(`/media/${uploadResponse.data.id}`, {
          title: title || filename,
          alt_text: alt || title || filename
        });
      }
      
      return {
        id: uploadResponse.data.id,
        url: uploadResponse.data.source_url
      };
    } catch (error) {
      console.error('WordPress 이미지 업로드 오류:', error);
      return null;
    }
  }
  
  /**
   * 파일 타입 추론
   */
  private inferFileType(filename: string): string {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }
  
  /**
   * 아티클 발행
   * @param article 원본 아티클
   * @param transformedContent 변환된 콘텐츠
   * @param options 변환 옵션
   * @returns 발행 결과
   */
  async publish(
    article: Article,
    transformedContent: TransformedContent,
    options: ContentTransformOptions
  ): Promise<PublishResult> {
    try {
      // 1. 카테고리 처리
      const categoryIds: number[] = [];
      if (transformedContent.categories?.length) {
        // 카테고리 조회 또는 생성
        const wpCategories = await this.getCategories();
        
        for (const category of transformedContent.categories) {
          // 카테고리 이름으로 찾기
          const existingCategory = wpCategories.find(c => c.name.toLowerCase() === category.toLowerCase());
          
          if (existingCategory) {
            categoryIds.push(existingCategory.id);
          } else if (this.getSetting<boolean>('autoCreateCategories')) {
            // 자동 카테고리 생성이 활성화된 경우 생성
            try {
              const newCategory = await this.client.post('/categories', {
                name: category,
                slug: this.slugify(category)
              });
              categoryIds.push(newCategory.data.id);
            } catch (error) {
              console.warn(`카테고리 생성 실패: ${category}`, error);
            }
          }
        }
      }
      
      // 2. 태그 처리
      const tagIds: number[] = [];
      if (transformedContent.tags?.length) {
        // 태그 조회 또는 생성
        const wpTags = await this.getTags();
        
        for (const tag of transformedContent.tags) {
          // 태그 이름으로 찾기
          const existingTag = wpTags.find(t => t.name.toLowerCase() === tag.toLowerCase());
          
          if (existingTag) {
            tagIds.push(existingTag.id);
          } else if (this.getSetting<boolean>('autoCreateTags')) {
            // 자동 태그 생성이 활성화된 경우 생성
            try {
              const newTag = await this.client.post('/tags', {
                name: tag,
                slug: this.slugify(tag)
              });
              tagIds.push(newTag.data.id);
            } catch (error) {
              console.warn(`태그 생성 실패: ${tag}`, error);
            }
          }
        }
      }
      
      // 3. 대표 이미지 처리
      let featuredMediaId: number | undefined;
      if (transformedContent.featuredImage?.url) {
        const uploadedImage = await this.uploadImage(
          transformedContent.featuredImage.url,
          transformedContent.title,
          transformedContent.featuredImage.alt
        );
        
        if (uploadedImage) {
          featuredMediaId = uploadedImage.id;
        }
      }
      
      // 4. 게시물 상태 처리
      // 워드프레스 상태: publish, draft, pending, private, future
      let status = 'publish';
      if (article.status === 'draft') {
        status = 'draft';
      }
      
      // 5. 발행 요청
      const postData: Record<string, any> = {
        title: transformedContent.title,
        content: transformedContent.content,
        excerpt: transformedContent.excerpt || '',
        status,
        categories: categoryIds,
        tags: tagIds
      };
      
      // 대표 이미지가 있으면 추가
      if (featuredMediaId) {
        postData.featured_media = featuredMediaId;
      }
      
      // 슬러그 설정 (URL 경로)
      if (article.slug) {
        postData.slug = article.slug;
      }
      
      // 메타데이터 및 SEO 처리
      if (transformedContent.seo) {
        // Yoast SEO가 설치된 경우 해당 데이터 추가
        if (this.getSetting<boolean>('hasYoastSeo')) {
          postData.meta = {
            yoast_wpseo_title: transformedContent.seo.title || transformedContent.title,
            yoast_wpseo_metadesc: transformedContent.seo.description || '',
            yoast_wpseo_focuskw: transformedContent.seo.keywords?.join(', ') || ''
          };
        }
        
        // Rank Math SEO가 설치된 경우
        if (this.getSetting<boolean>('hasRankMathSeo')) {
          postData.meta = {
            rank_math_title: transformedContent.seo.title || transformedContent.title,
            rank_math_description: transformedContent.seo.description || '',
            rank_math_focus_keyword: transformedContent.seo.keywords?.join(', ') || ''
          };
        }
      }
      
      // 캐노니컬 URL 설정
      if (transformedContent.platformSpecific?.canonicalUrl && this.getSetting<boolean>('supportCanonical')) {
        if (this.getSetting<boolean>('hasYoastSeo')) {
          postData.meta = postData.meta || {};
          postData.meta.yoast_wpseo_canonical = transformedContent.platformSpecific.canonicalUrl;
        } else if (this.getSetting<boolean>('hasRankMathSeo')) {
          postData.meta = postData.meta || {};
          postData.meta.rank_math_canonical_url = transformedContent.platformSpecific.canonicalUrl;
        }
      }
      
      // 6. 게시물 생성 API 호출
      const response = await this.client.post('/posts', postData);
      
      // 7. 결과 반환
      return this.createSuccessResult(
        article.id,
        '',  // scheduleId - 호출 시 설정
        response.data.link,
        {
          postId: response.data.id,
          permalink: response.data.link
        }
      );
      
    } catch (error: any) {
      console.error('WordPress 발행 오류:', error);
      
      return this.createFailureResult(
        article.id,
        '',  // scheduleId - 호출 시 설정
        error
      );
    }
  }
  
  /**
   * 아티클 업데이트
   * @param postId 워드프레스 게시물 ID
   * @param article 원본 아티클
   * @param transformedContent 변환된 콘텐츠
   * @param options 변환 옵션
   * @returns 업데이트 결과
   */
  async update(
    postId: number,
    article: Article,
    transformedContent: TransformedContent,
    options: ContentTransformOptions
  ): Promise<PublishResult> {
    try {
      // 동일한 로직으로 카테고리, 태그, 대표 이미지 처리
      // 생략: publish 함수와 거의 동일한 로직
      
      // 게시물 업데이트용 데이터 구성
      const postData: Record<string, any> = {
        title: transformedContent.title,
        content: transformedContent.content,
        excerpt: transformedContent.excerpt || ''
      };
      
      // 게시물 업데이트 API 호출
      const response = await this.client.put(`/posts/${postId}`, postData);
      
      return this.createSuccessResult(
        article.id,
        '',  // scheduleId - 호출 시 설정
        response.data.link,
        {
          postId: response.data.id,
          permalink: response.data.link
        }
      );
      
    } catch (error: any) {
      console.error('WordPress 업데이트 오류:', error);
      
      return this.createFailureResult(
        article.id,
        '',  // scheduleId - 호출 시 설정
        error
      );
    }
  }
  
  /**
   * 게시물 삭제
   * @param postId 워드프레스 게시물 ID
   * @returns 삭제 성공 여부
   */
  async delete(postId: number): Promise<boolean> {
    try {
      await this.client.delete(`/posts/${postId}`);
      return true;
    } catch (error) {
      console.error('WordPress 게시물 삭제 오류:', error);
      return false;
    }
  }
  
  /**
   * 게시물 상태 변경
   * @param postId 워드프레스 게시물 ID
   * @param status 변경할 상태 (publish, draft, pending, private)
   * @returns 상태 변경 성공 여부
   */
  async changeStatus(postId: number, status: string): Promise<boolean> {
    try {
      await this.client.put(`/posts/${postId}`, { status });
      return true;
    } catch (error) {
      console.error('WordPress 게시물 상태 변경 오류:', error);
      return false;
    }
  }
  
  /**
   * 문자열을 URL 슬러그로 변환
   */
  private slugify(text: string): string {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')          // 공백을 하이픈으로 변경
      .replace(/[^\w\-]+/g, '')      // 알파벳, 숫자, 하이픈이 아닌 문자 제거
      .replace(/\-\-+/g, '-')        // 중복 하이픈 제거
      .replace(/^-+/, '')            // 시작 부분의 하이픈 제거
      .replace(/-+$/, '');           // 끝 부분의 하이픈 제거
  }
  
  /**
   * 게시물 통계 가져오기
   * @param postId 워드프레스 게시물 ID
   * @returns 통계 정보
   */
  async getPostStats(postId: number): Promise<{ views?: number; comments?: number; } | null> {
    // 워드프레스는 공식 API에서 조회수를 제공하지 않음
    // JetPack 또는 기타 플러그인이 설치된 경우 해당 API 활용 가능
    try {
      if (this.getSetting<boolean>('hasJetpack')) {
        // JetPack API를 사용한 조회수 가져오기 (가정)
        const response = await axios.get(`${this.siteUrl}/wp-json/jetpack/v4/stats/post/${postId}`);
        return {
          views: response.data.views,
          comments: response.data.comments
        };
      }
      
      // 댓글 수는 기본 API로 가져오기 가능
      const commentsResponse = await this.client.get(`/comments`, {
        params: { post: postId, per_page: 1 }
      });
      
      return {
        comments: parseInt(commentsResponse.headers['x-wp-total'] || '0')
      };
    } catch (error) {
      console.error('WordPress 게시물 통계 조회 오류:', error);
      return null;
    }
  }
} 