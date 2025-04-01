import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { v4 as uuidv4 } from 'uuid';

export interface RSSItem {
  id: string;
  title: string;
  link: string;
  description: string;
  content?: string;
  pubDate: Date;
  creator?: string;
  categories: string[];
  guid?: string;
  enclosure?: {
    url: string;
    type: string;
    length?: number;
  };
}

export interface RSSFeed {
  id: string;
  title: string;
  description: string;
  link: string;
  lastBuildDate?: Date;
  pubDate?: Date;
  language?: string;
  items: RSSItem[];
  imageUrl?: string;
  managingEditor?: string;
  webMaster?: string;
}

export interface RSSParserOptions {
  timeout?: number;
  headers?: Record<string, string>;
  maxItems?: number;
}

export class RSSParser {
  private options: Required<RSSParserOptions>;
  
  constructor(options: RSSParserOptions = {}) {
    this.options = {
      timeout: options.timeout || 10000,
      headers: options.headers || {},
      maxItems: options.maxItems || 100
    };
  }
  
  /**
   * RSS 피드 URL에서 피드를 가져와 파싱합니다.
   */
  async fetchAndParse(url: string): Promise<RSSFeed> {
    try {
      const response = await axios.get(url, {
        timeout: this.options.timeout,
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml',
          ...this.options.headers
        }
      });
      
      return this.parseRSS(response.data);
    } catch (error) {
      console.error(`RSS 피드 가져오기 오류 (${url}):`, error);
      throw new Error(`RSS 피드를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
  
  /**
   * 여러 RSS 피드 URL을 동시에 가져와 파싱합니다.
   */
  async fetchMultipleFeeds(urls: string[]): Promise<RSSFeed[]> {
    try {
      const promises = urls.map(url => this.fetchAndParse(url).catch(error => {
        console.error(`RSS 피드 가져오기 실패 (${url}):`, error);
        return null;
      }));
      
      const results = await Promise.all(promises);
      return results.filter((feed): feed is RSSFeed => feed !== null);
    } catch (error) {
      console.error('여러 RSS 피드 가져오기 오류:', error);
      throw new Error(`여러 RSS 피드를 가져오는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
  
  /**
   * RSS XML 문자열을 파싱합니다.
   */
  async parseRSS(xml: string): Promise<RSSFeed> {
    try {
      const result = await parseStringPromise(xml, {
        explicitArray: false,
        normalize: true,
        trim: true
      });
      
      if (result.rss && result.rss.channel) {
        return this.parseRSSChannel(result.rss.channel);
      } else if (result.feed) {
        return this.parseAtomFeed(result.feed);
      } else {
        throw new Error('지원되지 않는 피드 형식입니다.');
      }
    } catch (error) {
      console.error('RSS 파싱 오류:', error);
      throw new Error(`RSS를 파싱하는 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }
  
  /**
   * 표준 RSS 채널을 파싱합니다.
   */
  private parseRSSChannel(channel: any): RSSFeed {
    const feed: RSSFeed = {
      id: uuidv4(),
      title: this.getTextValue(channel.title),
      description: this.getTextValue(channel.description),
      link: this.getTextValue(channel.link),
      lastBuildDate: channel.lastBuildDate ? new Date(channel.lastBuildDate) : undefined,
      pubDate: channel.pubDate ? new Date(channel.pubDate) : undefined,
      language: channel.language,
      imageUrl: channel.image?.url,
      managingEditor: channel.managingEditor,
      webMaster: channel.webMaster,
      items: []
    };
    
    // 아이템 처리
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    feed.items = items.slice(0, this.options.maxItems).map(item => this.parseRSSItem(item));
    
    return feed;
  }
  
  /**
   * Atom 피드를 파싱합니다.
   */
  private parseAtomFeed(atomFeed: any): RSSFeed {
    const feed: RSSFeed = {
      id: atomFeed.id || uuidv4(),
      title: this.getTextValue(atomFeed.title),
      description: this.getTextValue(atomFeed.subtitle),
      link: this.getLinkFromAtom(atomFeed.link),
      pubDate: atomFeed.updated ? new Date(atomFeed.updated) : undefined,
      language: atomFeed.lang,
      items: []
    };
    
    // 아이템(entry) 처리
    const entries = Array.isArray(atomFeed.entry) ? atomFeed.entry : atomFeed.entry ? [atomFeed.entry] : [];
    feed.items = entries.slice(0, this.options.maxItems).map(entry => this.parseAtomEntry(entry));
    
    return feed;
  }
  
  /**
   * RSS 아이템을 파싱합니다.
   */
  private parseRSSItem(item: any): RSSItem {
    return {
      id: uuidv4(),
      title: this.getTextValue(item.title),
      link: this.getTextValue(item.link),
      description: this.getTextValue(item.description),
      content: this.getTextValue(item['content:encoded']) || this.getTextValue(item.content),
      pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
      creator: this.getTextValue(item['dc:creator']) || this.getTextValue(item.author),
      categories: this.getCategories(item.category),
      guid: item.guid?._ || item.guid,
      enclosure: item.enclosure ? {
        url: item.enclosure.url,
        type: item.enclosure.type,
        length: item.enclosure.length ? parseInt(item.enclosure.length, 10) : undefined
      } : undefined
    };
  }
  
  /**
   * Atom 항목을 파싱합니다.
   */
  private parseAtomEntry(entry: any): RSSItem {
    return {
      id: entry.id || uuidv4(),
      title: this.getTextValue(entry.title),
      link: this.getLinkFromAtom(entry.link),
      description: this.getTextValue(entry.summary),
      content: this.getTextValue(entry.content),
      pubDate: entry.published ? new Date(entry.published) : entry.updated ? new Date(entry.updated) : new Date(),
      creator: this.getAuthorFromAtom(entry.author),
      categories: this.getCategoriesFromAtom(entry.category),
      guid: entry.id
    };
  }
  
  /**
   * 텍스트 값을 안전하게 추출합니다.
   */
  private getTextValue(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') return value;
    if (value._ && typeof value._ === 'string') return value._;
    if (value.$t && typeof value.$t === 'string') return value.$t;
    return '';
  }
  
  /**
   * RSS 카테고리를 배열로 변환합니다.
   */
  private getCategories(category: any): string[] {
    if (!category) return [];
    if (typeof category === 'string') return [category];
    if (Array.isArray(category)) return category.map(c => typeof c === 'string' ? c : c._ || c.$t || '');
    if (category._ || category.$t) return [category._ || category.$t];
    return [];
  }
  
  /**
   * Atom 링크에서 URL을 추출합니다.
   */
  private getLinkFromAtom(link: any): string {
    if (!link) return '';
    if (typeof link === 'string') return link;
    if (Array.isArray(link)) {
      const alternateLink = link.find(l => l.rel === 'alternate');
      return alternateLink?.href || link[0]?.href || '';
    }
    return link.href || '';
  }
  
  /**
   * Atom 작성자 정보를 추출합니다.
   */
  private getAuthorFromAtom(author: any): string {
    if (!author) return '';
    if (typeof author === 'string') return author;
    if (Array.isArray(author)) return author.map(a => a.name || '').join(', ');
    return author.name || '';
  }
  
  /**
   * Atom 카테고리를 배열로 변환합니다.
   */
  private getCategoriesFromAtom(category: any): string[] {
    if (!category) return [];
    if (typeof category === 'string') return [category];
    if (Array.isArray(category)) return category.map(c => c.term || c.$t || c);
    return [category.term || category.$t || ''];
  }
} 