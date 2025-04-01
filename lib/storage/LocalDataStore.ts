import { openDB, IDBPDatabase, DBSchema } from 'idb';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const mkdir = promisify(fs.mkdir);
const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const unlink = promisify(fs.unlink);
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// DB 스키마 정의
interface StoreSchema extends DBSchema {
  'data-store': {
    key: string;
    value: any;
    indexes: { 'by-collection': string };
  };
}

// 저장소 옵션 인터페이스
export interface LocalDataStoreOptions {
  dbName?: string;
  storePath?: string;
  version?: number;
}

/**
 * 로컬 데이터 저장소
 * 
 * 브라우저에서는 IndexedDB를, Node.js에서는 파일 시스템을 사용하는
 * 크로스 플랫폼 로컬 데이터 저장소입니다.
 */
export class LocalDataStore {
  private static instance: LocalDataStore;
  private db: IDBPDatabase<StoreSchema> | null = null;
  private isInitialized: boolean = false;
  private isBrowser: boolean;
  private dbName: string;
  private storePath: string;
  private version: number;

  /**
   * 생성자
   */
  private constructor(options: LocalDataStoreOptions = {}) {
    this.isBrowser = typeof window !== 'undefined';
    this.dbName = options.dbName || 'ovis-local-store';
    this.storePath = options.storePath || './local-store';
    this.version = options.version || 1;
  }

  /**
   * 싱글톤 인스턴스를 반환합니다.
   */
  public static getInstance(options?: LocalDataStoreOptions): LocalDataStore {
    if (!LocalDataStore.instance) {
      LocalDataStore.instance = new LocalDataStore(options);
    }
    return LocalDataStore.instance;
  }

  /**
   * 저장소를 초기화합니다.
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.isBrowser) {
      await this.initBrowser();
    } else {
      await this.initNode();
    }

    this.isInitialized = true;
  }

  /**
   * 브라우저 환경에서 IndexedDB를 초기화합니다.
   */
  private async initBrowser(): Promise<void> {
    try {
      this.db = await openDB<StoreSchema>(this.dbName, this.version, {
        upgrade(db) {
          if (!db.objectStoreNames.contains('data-store')) {
            const store = db.createObjectStore('data-store');
            store.createIndex('by-collection', 'collection');
          }
        },
      });
    } catch (error) {
      console.error('IndexedDB 초기화 오류:', error);
      throw new Error('로컬 저장소 초기화에 실패했습니다.');
    }
  }

  /**
   * Node.js 환경에서 파일 시스템 저장소를 초기화합니다.
   */
  private async initNode(): Promise<void> {
    try {
      if (!fs.existsSync(this.storePath)) {
        await mkdir(this.storePath, { recursive: true });
      }
    } catch (error) {
      console.error('파일 시스템 저장소 초기화 오류:', error);
      throw new Error('로컬 저장소 초기화에 실패했습니다.');
    }
  }

  /**
   * 아이템을 저장합니다.
   * @param collection 컬렉션 이름
   * @param key 키
   * @param data 저장할 데이터
   */
  public async setItem<T>(collection: string, key: string, data: T): Promise<void> {
    await this.ensureInitialized();

    const fullKey = this.getFullKey(collection, key);
    const value = {
      collection,
      ...data,
    };

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      await this.db.put('data-store', value, fullKey);
    } else {
      const collectionPath = path.join(this.storePath, collection);
      if (!fs.existsSync(collectionPath)) {
        await mkdir(collectionPath, { recursive: true });
      }
      await writeFile(
        path.join(collectionPath, `${key}.json`),
        JSON.stringify(data),
        'utf8'
      );
    }
  }

  /**
   * 아이템을 가져옵니다.
   * @param collection 컬렉션 이름
   * @param key 키
   */
  public async getItem<T>(collection: string, key: string): Promise<T | null> {
    await this.ensureInitialized();

    const fullKey = this.getFullKey(collection, key);

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      const result = await this.db.get('data-store', fullKey);
      return result ? (result as unknown as T) : null;
    } else {
      const filePath = path.join(this.storePath, collection, `${key}.json`);
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const data = await readFile(filePath, 'utf8');
      return JSON.parse(data) as T;
    }
  }

  /**
   * 아이템을 삭제합니다.
   * @param collection 컬렉션 이름
   * @param key 키
   */
  public async removeItem(collection: string, key: string): Promise<void> {
    await this.ensureInitialized();

    const fullKey = this.getFullKey(collection, key);

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      await this.db.delete('data-store', fullKey);
    } else {
      const filePath = path.join(this.storePath, collection, `${key}.json`);
      
      if (fs.existsSync(filePath)) {
        await unlink(filePath);
      }
    }
  }

  /**
   * 컬렉션의 모든 아이템을 가져옵니다.
   * @param collection 컬렉션 이름
   */
  public async getCollection<T>(collection: string): Promise<T[]> {
    await this.ensureInitialized();

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      
      // 인덱스를 사용하여 컬렉션별로 데이터 조회
      const index = this.db.transaction('data-store').store.index('by-collection');
      const items = await index.getAll(collection);
      return items as unknown as T[];
    } else {
      const collectionPath = path.join(this.storePath, collection);
      
      if (!fs.existsSync(collectionPath)) {
        return [];
      }
      
      const files = await readdir(collectionPath);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      const items: T[] = [];
      
      for (const file of jsonFiles) {
        const filePath = path.join(collectionPath, file);
        const stats = await stat(filePath);
        
        if (stats.isFile()) {
          const data = await readFile(filePath, 'utf8');
          items.push(JSON.parse(data) as T);
        }
      }
      
      return items;
    }
  }

  /**
   * 컬렉션 데이터를 일괄 저장합니다.
   * @param collection 컬렉션 이름
   * @param items 저장할 아이템들 (키-값 쌍)
   */
  public async bulkSet<T>(collection: string, items: Record<string, T>): Promise<void> {
    await this.ensureInitialized();

    const entries = Object.entries(items);
    
    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      
      const tx = this.db.transaction('data-store', 'readwrite');
      
      for (const [key, value] of entries) {
        const fullKey = this.getFullKey(collection, key);
        await tx.store.put({
          collection,
          ...value
        }, fullKey);
      }
      
      await tx.done;
    } else {
      const collectionPath = path.join(this.storePath, collection);
      
      if (!fs.existsSync(collectionPath)) {
        await mkdir(collectionPath, { recursive: true });
      }
      
      for (const [key, value] of entries) {
        await writeFile(
          path.join(collectionPath, `${key}.json`),
          JSON.stringify(value),
          'utf8'
        );
      }
    }
  }

  /**
   * 컬렉션을 비웁니다.
   * @param collection 컬렉션 이름
   */
  public async clearCollection(collection: string): Promise<void> {
    await this.ensureInitialized();

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      
      const index = this.db.transaction('data-store', 'readwrite').store.index('by-collection');
      let cursor = await index.openCursor(collection);
      
      while (cursor) {
        await cursor.delete();
        cursor = await cursor.continue();
      }
    } else {
      const collectionPath = path.join(this.storePath, collection);
      
      if (fs.existsSync(collectionPath)) {
        const files = await readdir(collectionPath);
        
        for (const file of files) {
          const filePath = path.join(collectionPath, file);
          const stats = await stat(filePath);
          
          if (stats.isFile()) {
            await unlink(filePath);
          }
        }
      }
    }
  }

  /**
   * 저장소 전체를 비웁니다.
   */
  public async clear(): Promise<void> {
    await this.ensureInitialized();

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      
      await this.db.clear('data-store');
    } else {
      // 각 컬렉션 디렉토리 순회
      const collections = await readdir(this.storePath);
      
      for (const collection of collections) {
        const collectionPath = path.join(this.storePath, collection);
        const stats = await stat(collectionPath);
        
        if (stats.isDirectory()) {
          await this.clearCollection(collection);
        }
      }
    }
  }

  /**
   * 전체 키-값 쌍의 수를 반환합니다.
   */
  public async size(): Promise<number> {
    await this.ensureInitialized();

    if (this.isBrowser) {
      if (!this.db) throw new Error('DB가 초기화되지 않았습니다.');
      
      return await this.db.count('data-store');
    } else {
      let count = 0;
      const collections = await readdir(this.storePath);
      
      for (const collection of collections) {
        const collectionPath = path.join(this.storePath, collection);
        const stats = await stat(collectionPath);
        
        if (stats.isDirectory()) {
          const files = await readdir(collectionPath);
          count += files.filter(file => file.endsWith('.json')).length;
        }
      }
      
      return count;
    }
  }

  /**
   * 저장소가 초기화되었는지 확인하고, 아니라면 초기화합니다.
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  /**
   * 컬렉션과 키를 결합하여 전체 키를 생성합니다.
   */
  private getFullKey(collection: string, key: string): string {
    return `${collection}:${key}`;
  }
}

// 기본 인스턴스 생성
export const localDataStore = LocalDataStore.getInstance(); 