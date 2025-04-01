import { TransformedImage, ImageOptimizationOptions } from '../types';

/**
 * 이미지 변환 및 최적화를 담당하는 클래스
 */
export class ImageTransformer {
  /**
   * 이미지를 변환하고 최적화합니다
   * @param imageUrl 원본 이미지 URL
   * @param options 이미지 최적화 옵션
   * @returns 변환된 이미지 정보
   */
  async transform(imageUrl: string, options: ImageOptimizationOptions): Promise<TransformedImage> {
    try {
      // 여기서는 외부 이미지 처리 서비스를 사용한다고 가정
      // 실제 구현에서는 sharp, jimp 등의 라이브러리나 cloudinary 같은 서비스를 연동할 수 있음
      
      // 이미지 처리 서비스 URL 구성
      const serviceUrl = "https://image.service.ovis.ai/transform";
      const queryParams = new URLSearchParams();
      
      // 옵션 파라미터 설정
      if (options.quality) {
        queryParams.append('quality', options.quality.toString());
      }
      
      if (options.maxWidth) {
        queryParams.append('width', options.maxWidth.toString());
      }
      
      if (options.maxHeight) {
        queryParams.append('height', options.maxHeight.toString());
      }
      
      if (options.format) {
        queryParams.append('format', options.format);
      }
      
      if (options.addWatermark) {
        queryParams.append('watermark', 'true');
      }
      
      // 원본 이미지 URL 인코딩하여 추가
      queryParams.append('url', encodeURIComponent(imageUrl));
      
      const transformUrl = `${serviceUrl}?${queryParams.toString()}`;
      
      // 실제 서비스 호출 대신 샘플 응답 반환 (개발용)
      // 실제 구현에서는 fetch API나 axios 등으로 요청 전송
      // const response = await fetch(transformUrl);
      // const result = await response.json();
      
      // 샘플 응답 (개발용)
      const mockResponse = await this.mockTransformationService(imageUrl, options);
      
      return {
        originalUrl: imageUrl,
        transformedUrl: mockResponse.url,
        width: mockResponse.width,
        height: mockResponse.height,
        format: mockResponse.format,
        size: mockResponse.size
      };
    } catch (error) {
      console.error("이미지 변환 중 오류 발생:", error);
      
      // 오류 발생 시 원본 이미지 정보 그대로 반환
      return {
        originalUrl: imageUrl,
        transformedUrl: imageUrl,
        width: 0,
        height: 0,
        format: 'unknown',
        size: 0
      };
    }
  }
  
  /**
   * 여러 이미지 일괄 변환
   * @param imageUrls 원본 이미지 URL 배열
   * @param options 이미지 최적화 옵션
   * @returns 변환된 이미지 정보 배열
   */
  async batchTransform(imageUrls: string[], options: ImageOptimizationOptions): Promise<TransformedImage[]> {
    const transformPromises = imageUrls.map(url => this.transform(url, options));
    return Promise.all(transformPromises);
  }
  
  /**
   * 이미지 최적화 서비스 목업 (개발용)
   * 실제 구현에서는 제거하고 실제 서비스 호출로 대체
   */
  private async mockTransformationService(imageUrl: string, options: ImageOptimizationOptions): Promise<{
    url: string,
    width: number,
    height: number,
    format: string,
    size: number
  }> {
    // 원본 URL에서 파일명 추출
    const urlParts = imageUrl.split('/');
    const filename = urlParts[urlParts.length - 1];
    
    // 파일 확장자 추출 또는 기본값 설정
    let format = 'jpg';
    if (filename.includes('.')) {
      const parts = filename.split('.');
      const originalFormat = parts[parts.length - 1].toLowerCase();
      format = options.format || originalFormat;
    } else if (options.format) {
      format = options.format;
    }
    
    // 변환된 이미지의 가상 URL 생성
    const width = options.maxWidth || 1200;
    const height = options.maxHeight || Math.floor(width * 0.75); // 4:3 비율 가정
    const quality = options.quality || 80;
    
    // URL 파라미터 생성
    const params = new URLSearchParams();
    params.append('w', width.toString());
    params.append('h', height.toString());
    params.append('q', quality.toString());
    if (options.addWatermark) {
      params.append('wm', '1');
    }
    
    // 변환된 URL 형식 (CDN 주소 형식으로 가정)
    const transformedUrl = `https://cdn.ovis.ai/images/${urlParts[urlParts.length - 2]}/${filename.split('.')[0]}.${format}?${params.toString()}`;
    
    // 파일 크기 계산 (단순 추정)
    const estimatedSize = Math.floor((width * height * (quality / 100)) / 10);
    
    return {
      url: transformedUrl,
      width,
      height,
      format,
      size: estimatedSize
    };
  }
} 