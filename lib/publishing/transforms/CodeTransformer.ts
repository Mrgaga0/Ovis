/**
 * 코드 블록 변환 및 하이라이팅을 담당하는 모듈
 * 실제 구현에서는 highlight.js, prism.js 등의 라이브러리를 사용할 수 있음
 */

/**
 * 지원하는 코드 테마 목록
 */
export type CodeTheme = 'default' | 'dark' | 'light' | 'github' | 'vscode' | 'monokai';

/**
 * 지원하는 프로그래밍 언어 목록
 */
const SUPPORTED_LANGUAGES = [
  'javascript', 'typescript', 'java', 'python', 'ruby', 'go', 'rust',
  'php', 'c', 'cpp', 'csharp', 'swift', 'kotlin', 'scala',
  'html', 'css', 'xml', 'json', 'yaml', 'markdown', 'bash', 'sql'
];

/**
 * 언어별 키워드 매핑 (간소화 버전, 실제 구현에서는 더 상세한 매핑 필요)
 */
const LANGUAGE_KEYWORDS: Record<string, string[]> = {
  'javascript': ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'from', 'async', 'await'],
  'typescript': ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'export', 'import', 'from', 'async', 'await', 'interface', 'type', 'enum'],
  'python': ['def', 'class', 'if', 'elif', 'else', 'for', 'while', 'try', 'except', 'finally', 'import', 'from', 'as', 'return', 'yield', 'with'],
  'java': ['public', 'private', 'protected', 'class', 'interface', 'static', 'final', 'void', 'return', 'if', 'else', 'for', 'while', 'try', 'catch', 'finally', 'throw', 'throws'],
  'html': ['html', 'head', 'body', 'div', 'span', 'p', 'a', 'img', 'script', 'style', 'link', 'meta', 'title', 'h1', 'h2', 'h3', 'form', 'input', 'button'],
  'css': ['body', 'div', 'span', 'p', 'a', 'img', 'margin', 'padding', 'border', 'color', 'background', 'font', 'display', 'position', 'width', 'height', '@media', '@keyframes']
};

/**
 * 테마별 스타일 매핑
 */
const THEME_STYLES: Record<CodeTheme, Record<string, string>> = {
  'default': {
    background: '#f5f5f5',
    text: '#333',
    comment: '#998',
    keyword: '#07a',
    string: '#690',
    number: '#905',
    function: '#DD4A68',
    operator: '#9a6e3a',
    class: '#458',
    variable: '#336',
    lineNumber: '#999'
  },
  'dark': {
    background: '#282c34',
    text: '#abb2bf',
    comment: '#5c6370',
    keyword: '#c678dd',
    string: '#98c379',
    number: '#d19a66',
    function: '#61afef',
    operator: '#56b6c2',
    class: '#e6c07b',
    variable: '#e06c75',
    lineNumber: '#636d83'
  },
  'light': {
    background: '#ffffff',
    text: '#383a42',
    comment: '#a0a1a7',
    keyword: '#a626a4',
    string: '#50a14f',
    number: '#986801',
    function: '#4078f2',
    operator: '#0184bc',
    class: '#c18401',
    variable: '#e45649',
    lineNumber: '#9d9d9f'
  },
  'github': {
    background: '#f8f8f8',
    text: '#24292e',
    comment: '#6a737d',
    keyword: '#d73a49',
    string: '#032f62',
    number: '#005cc5',
    function: '#6f42c1',
    operator: '#d73a49',
    class: '#6f42c1',
    variable: '#e36209',
    lineNumber: '#babbbd'
  },
  'vscode': {
    background: '#1e1e1e',
    text: '#d4d4d4',
    comment: '#6a9955',
    keyword: '#569cd6',
    string: '#ce9178',
    number: '#b5cea8',
    function: '#dcdcaa',
    operator: '#d4d4d4',
    class: '#4ec9b0',
    variable: '#9cdcfe',
    lineNumber: '#858585'
  },
  'monokai': {
    background: '#272822',
    text: '#f8f8f2',
    comment: '#75715e',
    keyword: '#f92672',
    string: '#a6e22e',
    number: '#ae81ff',
    function: '#66d9ef',
    operator: '#f8f8f2',
    class: '#a6e22e',
    variable: '#f8f8f2',
    lineNumber: '#90908a'
  }
};

/**
 * 코드 블록 정규식 - Markdown 스타일
 */
const CODE_BLOCK_REGEX = /```([a-z]*)\n([\s\S]*?)```/g;

/**
 * HTML 코드 블록 정규식
 */
const HTML_CODE_BLOCK_REGEX = /<pre><code(?:\s+class="language-([a-z]+)")?>([^<]+)<\/code><\/pre>/g;

/**
 * 주석 정규식 매핑
 */
const COMMENT_REGEX: Record<string, RegExp> = {
  'javascript': /(\/\/.*?$)|(\/\*[\s\S]*?\*\/)/gm,
  'typescript': /(\/\/.*?$)|(\/\*[\s\S]*?\*\/)/gm,
  'java': /(\/\/.*?$)|(\/\*[\s\S]*?\*\/)/gm,
  'python': /(#.*?$)/gm,
  'ruby': /(#.*?$)/gm,
  'html': /(<!--[\s\S]*?-->)/g,
  'css': /(\/\*[\s\S]*?\*\/)/gm,
  'cpp': /(\/\/.*?$)|(\/\*[\s\S]*?\*\/)/gm,
  'csharp': /(\/\/.*?$)|(\/\*[\s\S]*?\*\/)/gm
};

/**
 * 문자열 정규식 매핑
 */
const STRING_REGEX: Record<string, RegExp> = {
  'javascript': /(["'`][^\\"'`]*(?:\\.[^\\"'`]*)*["'`])/g,
  'typescript': /(["'`][^\\"'`]*(?:\\.[^\\"'`]*)*["'`])/g,
  'python': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g,
  'java': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g,
  'html': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g,
  'css': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g,
  'cpp': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g,
  'csharp': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g,
  'ruby': /(["'][^\\"']*(?:\\.[^\\"']*)*["'])/g
};

/**
 * HTML 태그를 인코딩합니다
 * @param text HTML 태그를 포함하는 텍스트
 * @returns 인코딩된 텍스트
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 코드 언어를 감지합니다
 * @param code 코드 문자열
 * @returns 감지된 언어 (감지 실패 시 'text')
 */
function detectLanguage(code: string): string {
  // 간단한 언어 감지 로직
  if (code.includes('function') && code.includes('var') || code.includes('const') || code.includes('let')) {
    return 'javascript';
  } else if (code.includes('interface') || code.includes('type ') || code.includes('export')) {
    return 'typescript';
  } else if (code.includes('import ') && code.includes('def ')) {
    return 'python';
  } else if (code.includes('public class') || code.includes('private ')) {
    return 'java';
  } else if (code.includes('<html') || code.includes('<div') || code.includes('<body')) {
    return 'html';
  } else if (code.includes('margin:') || code.includes('padding:') || code.includes('@media')) {
    return 'css';
  }
  return 'text';
}

/**
 * 코드를 하이라이팅합니다
 * @param code 코드 문자열
 * @param language 프로그래밍 언어
 * @param theme 코드 테마
 * @returns 하이라이팅된 HTML
 */
function highlightCode(code: string, language: string, theme: CodeTheme): string {
  const styles = THEME_STYLES[theme];
  
  // 지원하지 않는 언어는 기본 텍스트로 처리
  const lang = SUPPORTED_LANGUAGES.includes(language) ? language : 'text';
  
  // 코드 이스케이프
  let highlightedCode = escapeHtml(code);
  
  // 언어별 문법 하이라이팅
  if (lang !== 'text') {
    // 주석 하이라이팅
    if (COMMENT_REGEX[lang]) {
      highlightedCode = highlightedCode.replace(
        COMMENT_REGEX[lang],
        match => `<span style="color: ${styles.comment}">${match}</span>`
      );
    }
    
    // 문자열 하이라이팅
    if (STRING_REGEX[lang]) {
      highlightedCode = highlightedCode.replace(
        STRING_REGEX[lang],
        match => `<span style="color: ${styles.string}">${match}</span>`
      );
    }
    
    // 숫자 하이라이팅
    highlightedCode = highlightedCode.replace(
      /\b(\d+(?:\.\d+)?)\b/g,
      match => `<span style="color: ${styles.number}">${match}</span>`
    );
    
    // 키워드 하이라이팅
    if (LANGUAGE_KEYWORDS[lang]) {
      const keywordPattern = new RegExp(`\\b(${LANGUAGE_KEYWORDS[lang].join('|')})\\b`, 'g');
      highlightedCode = highlightedCode.replace(
        keywordPattern,
        match => `<span style="color: ${styles.keyword}">${match}</span>`
      );
    }
    
    // 함수 호출 하이라이팅
    highlightedCode = highlightedCode.replace(
      /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g,
      (match, funcName) => `<span style="color: ${styles.function}">${funcName}</span>(`
    );
  }
  
  // 줄 번호 추가
  const lines = highlightedCode.split('\n');
  const lineNumbers = lines.map((_, index) => 
    `<span style="color: ${styles.lineNumber}; user-select: none; margin-right: 12px; display: inline-block; text-align: right; width: 24px;">${index + 1}</span>`
  ).join('\n');
  
  const codeWithLineNumbers = lines.map((line, index) => 
    `<div style="line-height: 1.5">${lineNumbers.split('\n')[index]}${line || ' '}</div>`
  ).join('');
  
  // 스타일이 적용된 코드 블록 생성
  return `<pre style="background-color: ${styles.background}; color: ${styles.text}; padding: 16px; border-radius: 4px; overflow: auto; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 14px; line-height: 1.5;"><code class="language-${lang}" style="white-space: pre;">${codeWithLineNumbers}</code></pre>`;
}

/**
 * 마크다운 코드 블록을 하이라이팅합니다
 * @param markdown 마크다운 문자열
 * @param theme 코드 테마
 * @returns 하이라이팅된 마크다운
 */
export async function applyCodeHighlighting(markdown: string, theme: CodeTheme = 'default'): Promise<string> {
  // 마크다운 스타일 코드 블록 변환 (```)
  let processedContent = markdown.replace(CODE_BLOCK_REGEX, (match, language, code) => {
    const detectedLang = language || detectLanguage(code);
    return highlightCode(code.trim(), detectedLang, theme);
  });
  
  // HTML 코드 블록 변환 (<pre><code>)
  processedContent = processedContent.replace(HTML_CODE_BLOCK_REGEX, (match, language, code) => {
    // HTML 디코딩 후 재처리
    const decodedCode = code
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, '&');
    
    const detectedLang = language || detectLanguage(decodedCode);
    return highlightCode(decodedCode, detectedLang, theme);
  });
  
  return processedContent;
}

/**
 * 인라인 코드 블록을 하이라이팅합니다
 * @param text 텍스트 문자열
 * @param theme 코드 테마
 * @returns 하이라이팅된 텍스트
 */
export function highlightInlineCode(text: string, theme: CodeTheme = 'default'): string {
  const styles = THEME_STYLES[theme];
  
  // 마크다운 인라인 코드 (`) 변환
  return text.replace(/`([^`]+)`/g, (match, code) => {
    const escapedCode = escapeHtml(code);
    return `<code style="background-color: ${styles.background}; color: ${styles.text}; padding: 2px 4px; border-radius: 3px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 85%;">${escapedCode}</code>`;
  });
} 