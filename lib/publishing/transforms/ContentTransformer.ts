import { Article, ContentTransformOptions, PublishingPlatform, TransformedContent } from '../types';
import { ImageTransformer } from './ImageTransformer';
import { sanitizeHtml } from './HtmlSanitizer';
import { applyCodeHighlighting } from './CodeTransformer';

/**
 * 콘텐츠 변환 인터페이스
 */
export interface IContentTransformer {
  transform(article: Article, options: ContentTransformOptions): Promise<TransformedContent>;
}

/**
 * 플랫폼별 콘텐츠 변환 지원을 위한 추상 클래스
 */
export abstract class PlatformTransformer implements IContentTransformer {
  abstract transform(article: Article, options: ContentTransformOptions): Promise<TransformedContent>;
  
  /**
   * 특정 플랫폼 타입에 대한 변환기인지 확인
   */
  abstract supportsType(type: string): boolean;
}

/**
 * 콘텐츠 변환 관리자 클래스
 */
export class ContentTransformer implements IContentTransformer {
  private platformTransformers: PlatformTransformer[] = [];
  private imageTransformer: ImageTransformer;
  
  constructor(imageTransformer?: ImageTransformer) {
    this.imageTransformer = imageTransformer || new ImageTransformer();
  }
  
  /**
   * 플랫폼 변환기 등록
   */
  registerPlatformTransformer(transformer: PlatformTransformer): void {
    this.platformTransformers.push(transformer);
  }
  
  /**
   * 플랫폼 타입에 맞는 변환기 찾기
   */
  private getPlatformTransformer(platform: PublishingPlatform): PlatformTransformer | null {
    for (const transformer of this.platformTransformers) {
      if (transformer.supportsType(platform.type)) {
        return transformer;
      }
    }
    return null;
  }
  
  /**
   * 콘텐츠 변환 메인 함수
   */
  async transform(article: Article, options: ContentTransformOptions): Promise<TransformedContent> {
    // 기본 콘텐츠 준비
    let transformedContent: TransformedContent = {
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      featuredImage: article.featuredImage,
      categories: article.categories,
      tags: article.tags,
      seo: article.seo,
      metadata: article.metadata || {},
      platformSpecific: {}
    };
    
    // 이미지 최적화
    if (options.optimizeImages && article.images && article.images.length > 0) {
      const optimizedImages = await this.transformImages(article, options);
      transformedContent.content = this.replaceImageUrls(transformedContent.content, optimizedImages);
      
      // 대표 이미지 변환
      if (article.featuredImage && optimizedImages.some(img => img.originalUrl === article.featuredImage?.url)) {
        const optimizedFeaturedImage = optimizedImages.find(img => img.originalUrl === article.featuredImage?.url);
        if (optimizedFeaturedImage) {
          transformedContent.featuredImage = {
            ...article.featuredImage,
            url: optimizedFeaturedImage.transformedUrl,
            width: optimizedFeaturedImage.width,
            height: optimizedFeaturedImage.height
          };
        }
      }
    }
    
    // 링크 변환
    if (options.transformLinks) {
      transformedContent.content = this.transformLinks(transformedContent.content, options);
    }
    
    // HTML 정리
    if (options.sanitizeHtml) {
      transformedContent.content = sanitizeHtml(transformedContent.content);
    }
    
    // 코드 블록 하이라이팅
    if (options.transformCodeBlocks) {
      transformedContent.content = await applyCodeHighlighting(
        transformedContent.content, 
        options.codeTheme || 'default'
      );
    }
    
    // 워터마크 추가
    if (options.addWatermark) {
      transformedContent.content = this.addWatermark(transformedContent.content);
    }
    
    // 푸터 추가
    if (options.addFooter && options.footerTemplate) {
      transformedContent.content = this.addFooter(
        transformedContent.content, 
        options.footerTemplate,
        article
      );
    }
    
    // 캐노니컬 링크 추가
    if (options.includeCanonicalLink) {
      transformedContent.platformSpecific.canonicalUrl = this.getCanonicalUrl(article);
    }
    
    // 플랫폼별 변환
    const platformTransformer = this.getPlatformTransformer(options.platform);
    if (platformTransformer) {
      transformedContent = await platformTransformer.transform(article, {
        ...options,
        // 이미 처리한 변환은 플랫폼 변환기에서 반복하지 않도록 설정
        optimizeImages: false,
        transformLinks: false,
        sanitizeHtml: false
      });
    }
    
    return transformedContent;
  }
  
  /**
   * 모든 이미지를 변환
   */
  private async transformImages(article: Article, options: ContentTransformOptions): Promise<Array<{originalUrl: string, transformedUrl: string, width: number, height: number}>> {
    if (!article.images || article.images.length === 0) {
      return [];
    }
    
    const transformPromises = article.images.map(image => 
      this.imageTransformer.transform(image.url, {
        quality: options.imageQuality || 80,
        maxWidth: options.imageMaxWidth,
        maxHeight: options.imageMaxHeight,
        addWatermark: options.addWatermark
      })
    );
    
    const transformedImages = await Promise.all(transformPromises);
    
    return article.images.map((image, index) => ({
      originalUrl: image.url,
      transformedUrl: transformedImages[index].transformedUrl,
      width: transformedImages[index].width,
      height: transformedImages[index].height
    }));
  }
  
  /**
   * 변환된 이미지 URL로 콘텐츠 내 이미지 URL 교체
   */
  private replaceImageUrls(content: string, transformedImages: Array<{originalUrl: string, transformedUrl: string}>): string {
    let updatedContent = content;
    
    transformedImages.forEach(image => {
      const regex = new RegExp(this.escapeRegExp(image.originalUrl), 'g');
      updatedContent = updatedContent.replace(regex, image.transformedUrl);
    });
    
    return updatedContent;
  }
  
  /**
   * 정규식 특수문자를 이스케이프하는 유틸리티 함수
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * 콘텐츠 내 링크 변환
   */
  private transformLinks(content: string, options: ContentTransformOptions): string {
    // HTML 파서 사용하여 링크 변환
    // 간단한 구현을 위해 정규식 사용 (프로덕션에서는 DOM 파서 사용 권장)
    const linkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g;
    
    return content.replace(linkRegex, (match, quote, url) => {
      // 외부 링크에 추적 파라미터 추가
      if (url.startsWith('http') && !url.includes(options.platform.url)) {
        const trackingParam = `utm_source=${encodeURIComponent(options.platform.name)}&utm_medium=article`;
        const separator = url.includes('?') ? '&' : '?';
        const newUrl = `${url}${separator}${trackingParam}`;
        return `<a href=${quote}${newUrl}${quote} rel="nofollow"`;
      }
      return match;
    });
  }
  
  /**
   * 워터마크 추가
   */
  private addWatermark(content: string): string {
    // 간단한 텍스트 워터마크 추가
    const watermark = `<div class="article-watermark">Originally published on Ovis</div>`;
    return `${content}\n\n${watermark}`;
  }
  
  /**
   * 푸터 추가
   */
  private addFooter(content: string, footerTemplate: string, article: Article): string {
    // 템플릿 변수 치환
    let footer = footerTemplate
      .replace(/\{title\}/g, article.title)
      .replace(/\{author\}/g, article.author.name)
      .replace(/\{date\}/g, article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : new Date().toLocaleDateString())
      .replace(/\{url\}/g, article.metadata?.originalUrl || '');
    
    return `${content}\n\n${footer}`;
  }
  
  /**
   * 캐노니컬 URL 생성
   */
  private getCanonicalUrl(article: Article): string {
    // 원본 URL이 메타데이터에 있으면 사용
    if (article.metadata?.originalUrl) {
      return article.metadata.originalUrl;
    }
    
    // 아니면 임의 URL 생성 (실제로는 원본 시스템의 URL 체계에 맞게 구현)
    return `https://app.ovis.ai/articles/${article.id}`;
  }
} 