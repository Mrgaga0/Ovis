import { PublishingManager } from './PublishingManager';
import { WordPress } from './platforms/WordPress';
import { Medium } from './platforms/Medium';
import { DevTo } from './platforms/DevTo';
import { Hashnode } from './platforms/Hashnode';
import { CustomPlatform } from './platforms/CustomPlatform';
import { BasePlatform } from './platforms/BasePlatform';
import { ContentTransformer, IContentTransformer, PlatformTransformer } from './transforms/ContentTransformer';
import { ImageTransformer } from './transforms/ImageTransformer';
import { sanitizeHtml, stripHtml, extractMetaDescription } from './transforms/HtmlSanitizer';
import { applyCodeHighlighting, highlightInlineCode, CodeTheme } from './transforms/CodeTransformer';

// 타입 내보내기
export * from './types';

// 플랫폼 관련 항목 내보내기
export {
  BasePlatform,
  WordPress,
  Medium,
  DevTo,
  Hashnode,
  CustomPlatform
};

// 변환 관련 항목 내보내기
export {
  ContentTransformer,
  IContentTransformer,
  PlatformTransformer,
  ImageTransformer,
  sanitizeHtml,
  stripHtml,
  extractMetaDescription,
  applyCodeHighlighting,
  highlightInlineCode,
  CodeTheme
};

// 주요 관리 클래스 내보내기
export {
  PublishingManager
};

// 기본 인스턴스 생성 및 내보내기
const publishingManager = new PublishingManager();

export default publishingManager; 