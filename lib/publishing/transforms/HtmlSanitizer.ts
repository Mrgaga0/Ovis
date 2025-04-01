/**
 * HTML 콘텐츠를 안전하게 정리하는 모듈
 * 실제 구현에서는 DOMPurify, sanitize-html 등의 라이브러리를 사용할 수 있음
 */

/**
 * 허용된 HTML 태그 목록
 */
const ALLOWED_TAGS = [
  // 서식 태그
  'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'b', 'i', 'u', 'em', 'strong', 'mark', 'small', 'del', 'ins', 'sub', 'sup',
  // 리스트 태그
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  // 테이블 태그
  'table', 'thead', 'tbody', 'tr', 'th', 'td', 'caption',
  // 링크 및 미디어
  'a', 'img', 'figure', 'figcaption', 'picture', 'source',
  // 기타 태그
  'blockquote', 'q', 'cite', 'code', 'pre', 'hr', 'br',
  // 의미론적 태그
  'article', 'section', 'aside', 'header', 'footer', 'nav', 'main',
  // 포매팅
  'audio', 'video'
];

/**
 * 속성 매핑 인터페이스
 */
interface AttributeMap {
  [key: string]: string[];
}

/**
 * 허용된 속성 목록
 */
const ALLOWED_ATTRIBUTES: AttributeMap = {
  // 글로벌 속성
  '*': ['id', 'class', 'style', 'title', 'dir', 'lang'],
  
  // 링크 속성
  'a': ['href', 'target', 'rel', 'download', 'hreflang'],
  
  // 이미지 속성
  'img': ['src', 'alt', 'width', 'height', 'loading', 'srcset', 'sizes'],
  
  // 테이블 속성
  'table': ['border', 'cellpadding', 'cellspacing', 'summary'],
  'th': ['scope', 'colspan', 'rowspan'],
  'td': ['colspan', 'rowspan', 'headers'],
  
  // 미디어 속성
  'audio': ['src', 'controls', 'autoplay', 'loop', 'muted', 'preload'],
  'video': ['src', 'controls', 'autoplay', 'loop', 'muted', 'poster', 'width', 'height', 'preload'],
  'source': ['src', 'srcset', 'media', 'sizes', 'type'],
  
  // 코드 블록 속성
  'pre': ['class'],
  'code': ['class', 'data-language']
};

/**
 * 안전하지 않은 URL 프로토콜 목록
 */
const UNSAFE_URL_PROTOCOLS = [
  'javascript:',
  'data:',
  'vbscript:',
  'file:'
];

/**
 * HTML 태그 정규식
 */
const HTML_TAG_REGEX = /<\/?([a-z][a-z0-9]*)\b[^>]*>?/gi;

/**
 * 속성 정규식
 */
const ATTRIBUTE_REGEX = /([a-z0-9\-_]+)\s*=\s*(['"])(.*?)\2/gi;

/**
 * 스크립트 태그 정규식
 */
const SCRIPT_TAG_REGEX = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;

/**
 * 스타일 태그 정규식
 */
const STYLE_TAG_REGEX = /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi;

/**
 * HTML을 안전하게 정리합니다
 * @param html 정리할 HTML 문자열
 * @returns 정리된 HTML 문자열
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // 스크립트 태그 제거
  let sanitized = html.replace(SCRIPT_TAG_REGEX, '');
  
  // 스타일 태그 제거
  sanitized = sanitized.replace(STYLE_TAG_REGEX, '');
  
  // HTML 주석 제거
  sanitized = sanitized.replace(/<!--[\s\S]*?-->/g, '');
  
  // 안전하지 않은 태그 처리
  sanitized = sanitized.replace(HTML_TAG_REGEX, (match, tagName) => {
    if (!ALLOWED_TAGS.includes(tagName.toLowerCase())) {
      return '';
    }
    return match;
  });
  
  // 속성 처리
  sanitized = sanitized.replace(/<([a-z][a-z0-9]*)\b([^>]*)>/gi, (match, tagName, attributes) => {
    const lowerTagName = tagName.toLowerCase();
    
    if (!ALLOWED_TAGS.includes(lowerTagName)) {
      return '';
    }
    
    let newAttributes = '';
    let attributeMatch;
    
    // eslint-disable-next-line no-cond-assign
    while (attributeMatch = ATTRIBUTE_REGEX.exec(attributes)) {
      const [fullMatch, attrName, quote, attrValue] = attributeMatch;
      const lowerAttrName = attrName.toLowerCase();
      
      // 속성이 허용 목록에 있는지 확인
      const isAllowed = (
        (ALLOWED_ATTRIBUTES['*'] && ALLOWED_ATTRIBUTES['*'].includes(lowerAttrName)) ||
        (ALLOWED_ATTRIBUTES[lowerTagName] && ALLOWED_ATTRIBUTES[lowerTagName].includes(lowerAttrName))
      );
      
      if (isAllowed) {
        // URL 속성 검사
        if (
          (lowerAttrName === 'href' || lowerAttrName === 'src') && 
          UNSAFE_URL_PROTOCOLS.some(protocol => attrValue.toLowerCase().startsWith(protocol))
        ) {
          // 안전하지 않은 URL 프로토콜 제거
          continue; 
        }
        
        // XSS 방지를 위한 속성값 인코딩
        const encodedValue = encodeAttributeValue(attrValue);
        newAttributes += ` ${attrName}=${quote}${encodedValue}${quote}`;
      }
    }
    
    return `<${lowerTagName}${newAttributes}>`;
  });
  
  return sanitized;
}

/**
 * 속성값의 특수 문자를 인코딩합니다
 * @param value 인코딩할 속성값
 * @returns 인코딩된 속성값
 */
function encodeAttributeValue(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * HTML 태그를 모두 제거하고 텍스트만 추출합니다
 * @param html HTML 문자열
 * @returns 추출된 텍스트
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }
  
  // 모든 HTML 태그 제거
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * HTML 문자열에서 메타 설명을 추출합니다
 * @param html HTML 문자열
 * @param maxLength 최대 길이
 * @returns 추출된 메타 설명
 */
export function extractMetaDescription(html: string, maxLength = 160): string {
  const text = stripHtml(html);
  if (!text) return '';
  
  // 앞부분 텍스트를 최대 길이만큼 추출
  let description = text.trim().substring(0, maxLength);
  
  // 단어가 잘리지 않도록 마지막 공백에서 자름
  const lastSpace = description.lastIndexOf(' ');
  if (lastSpace > maxLength * 0.8) { // 최소 80% 이상 포함되는 경우에만
    description = description.substring(0, lastSpace);
  }
  
  // 줄임표 추가
  if (text.length > description.length) {
    description += '...';
  }
  
  return description;
} 