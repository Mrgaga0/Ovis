import { diff_match_patch, Diff } from 'diff-match-patch';

/**
 * 병합 충돌 해결 전략 타입
 */
export type MergeStrategy = 'last-write-wins' | 'three-way-merge' | 'manual' | 'smart-merge' | 'recursive-merge';

/**
 * 충돌 상태 객체 인터페이스
 */
export interface IMergeConflict<T> {
  base: T;
  local: T;
  remote: T;
  path?: string;
  resolved?: boolean;
  resolution?: T;
}

/**
 * 병합 결과 인터페이스
 */
export interface IMergeResult<T> {
  success: boolean;
  merged?: T;
  conflicts?: IMergeConflict<T>[];
  error?: string;
}

/**
 * 병합 유틸리티 클래스
 * 
 * 데이터 병합과 충돌 해결을 위한 유틸리티 메서드를 제공합니다.
 */
export class MergeUtils {
  private static dmp = new diff_match_patch();
  private static MAX_RECURSIVE_DEPTH = 20;

  /**
   * 마지막 쓰기 우선 전략을 사용한 병합
   * @param base 기본 버전
   * @param local 로컬 버전
   * @param remote 원격 버전
   * @param localTimestamp 로컬 수정 타임스탬프
   * @param remoteTimestamp 원격 수정 타임스탬프
   */
  public static lastWriteWins<T>(
    base: T,
    local: T,
    remote: T,
    localTimestamp: number,
    remoteTimestamp: number
  ): IMergeResult<T> {
    try {
      // 타임스탬프 비교하여 가장 최근 수정본을 선택
      const winner = localTimestamp >= remoteTimestamp ? local : remote;
      
      return {
        success: true,
        merged: JSON.parse(JSON.stringify(winner))
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '병합 실패'
      };
    }
  }

  /**
   * 3-way 병합 전략을 사용한 객체 병합
   * @param base 기본 버전
   * @param local 로컬 버전
   * @param remote 원격 버전
   */
  public static threeWayMerge<T>(base: T, local: T, remote: T): IMergeResult<T> {
    try {
      // 객체를 문자열로 변환하여 차이점 분석
      if (typeof base !== 'object' || typeof local !== 'object' || typeof remote !== 'object') {
        throw new Error('병합 대상은 객체여야 합니다.');
      }

      // 객체 병합
      if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
        return this.mergeArrays(base, local, remote);
      } else {
        return this.mergeObjects(base, local, remote);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '병합 실패'
      };
    }
  }

  /**
   * 객체 병합
   * @param base 기본 객체
   * @param local 로컬 객체
   * @param remote 원격 객체
   * @param depth 현재 재귀 깊이
   */
  private static mergeObjects<T extends Record<string, any>>(
    base: T,
    local: T,
    remote: T,
    depth: number = 0
  ): IMergeResult<T> {
    // 재귀 깊이 제한 검사
    if (depth > this.MAX_RECURSIVE_DEPTH) {
      return {
        success: false,
        error: '최대 재귀 깊이 초과'
      };
    }

    const result = {} as T;
    const conflicts: IMergeConflict<any>[] = [];
    
    // 모든 키 수집
    const allKeys = new Set([
      ...Object.keys(base),
      ...Object.keys(local),
      ...Object.keys(remote)
    ]);
    
    // 각 키에 대해 병합 수행
    for (const key of allKeys) {
      // 키가 기본 객체에 없는 경우 (새로 추가된 키)
      if (!(key in base)) {
        // 로컬과 원격 모두에 있고 다른 경우 충돌
        if (key in local && key in remote && !this.isEqual(local[key], remote[key])) {
          // 만약 둘 다 객체인 경우, 병합 시도
          if (
            typeof local[key] === 'object' && 
            local[key] !== null && 
            typeof remote[key] === 'object' && 
            remote[key] !== null &&
            !Array.isArray(local[key]) && 
            !Array.isArray(remote[key])
          ) {
            const emptyBase = {} as Record<string, any>;
            const nestedResult = this.mergeObjects(
              emptyBase, 
              local[key] as Record<string, any>, 
              remote[key] as Record<string, any>,
              depth + 1
            );
            
            if (nestedResult.success && nestedResult.merged) {
              result[key] = nestedResult.merged as any;
              if (nestedResult.conflicts && nestedResult.conflicts.length > 0) {
                conflicts.push(...nestedResult.conflicts.map(conflict => ({
                  ...conflict,
                  path: key + (conflict.path ? '.' + conflict.path : '')
                })));
              }
            } else {
              conflicts.push({
                base: undefined,
                local: local[key],
                remote: remote[key],
                path: key
              });
            }
          }
          // 만약 둘 다 배열인 경우, 배열 병합 시도
          else if (
            Array.isArray(local[key]) && 
            Array.isArray(remote[key])
          ) {
            const emptyArray: any[] = [];
            const nestedResult = this.mergeArrays(
              emptyArray,
              local[key] as any[],
              remote[key] as any[],
              depth + 1
            );
            
            if (nestedResult.success && nestedResult.merged) {
              result[key] = nestedResult.merged as any;
              if (nestedResult.conflicts && nestedResult.conflicts.length > 0) {
                conflicts.push(...nestedResult.conflicts.map(conflict => ({
                  ...conflict,
                  path: key + (conflict.path ? '.' + conflict.path : '')
                })));
              }
            } else {
              conflicts.push({
                base: undefined,
                local: local[key],
                remote: remote[key],
                path: key
              });
            }
          }
          else {
            conflicts.push({
              base: undefined,
              local: local[key],
              remote: remote[key],
              path: key
            });
          }
        } 
        // 로컬에만 있는 경우
        else if (key in local) {
          result[key] = this.deepClone(local[key]);
        } 
        // 원격에만 있는 경우
        else if (key in remote) {
          result[key] = this.deepClone(remote[key]);
        }
      } 
      // 키가 기본 객체에 있는 경우
      else {
        // 로컬과 원격 모두 변경되었고 다르게 변경된 경우
        if (
          key in local && 
          key in remote && 
          !this.isEqual(base[key], local[key]) && 
          !this.isEqual(base[key], remote[key]) && 
          !this.isEqual(local[key], remote[key])
        ) {
          // 복잡한 객체인 경우 재귀적으로 병합 시도
          if (
            typeof base[key] === 'object' && base[key] !== null &&
            typeof local[key] === 'object' && local[key] !== null &&
            typeof remote[key] === 'object' && remote[key] !== null &&
            !Array.isArray(base[key]) && 
            !Array.isArray(local[key]) && 
            !Array.isArray(remote[key])
          ) {
            const nestedResult = this.mergeObjects(
              base[key] as Record<string, any>, 
              local[key] as Record<string, any>, 
              remote[key] as Record<string, any>,
              depth + 1
            );
            if (nestedResult.success && nestedResult.merged) {
              result[key] = nestedResult.merged as any;
              // 중첩된 충돌이 있으면 경로를 업데이트하여 추가
              if (nestedResult.conflicts && nestedResult.conflicts.length > 0) {
                conflicts.push(...nestedResult.conflicts.map(conflict => ({
                  ...conflict,
                  path: key + (conflict.path ? '.' + conflict.path : '')
                })));
              }
            } else {
              conflicts.push({
                base: base[key],
                local: local[key],
                remote: remote[key],
                path: key
              });
            }
          }
          // 배열인 경우 배열 병합 시도
          else if (
            Array.isArray(base[key]) && 
            Array.isArray(local[key]) && 
            Array.isArray(remote[key])
          ) {
            const nestedResult = this.mergeArrays(
              base[key] as any[], 
              local[key] as any[], 
              remote[key] as any[],
              depth + 1
            );
            if (nestedResult.success && nestedResult.merged) {
              result[key] = nestedResult.merged as any;
              if (nestedResult.conflicts && nestedResult.conflicts.length > 0) {
                conflicts.push(...nestedResult.conflicts.map(conflict => ({
                  ...conflict,
                  path: key + (conflict.path ? '.' + conflict.path : '')
                })));
              }
            } else {
              conflicts.push({
                base: base[key],
                local: local[key],
                remote: remote[key],
                path: key
              });
            }
          }
          // 문자열인 경우 텍스트 병합 시도
          else if (
            typeof base[key] === 'string' && 
            typeof local[key] === 'string' && 
            typeof remote[key] === 'string'
          ) {
            const textResult = this.mergeText(base[key], local[key], remote[key]);
            if (textResult.success && textResult.merged) {
              result[key] = textResult.merged;
            } else {
              conflicts.push({
                base: base[key],
                local: local[key],
                remote: remote[key],
                path: key
              });
            }
          } 
          // 그 외의 경우 충돌로 처리
          else {
            conflicts.push({
              base: base[key],
              local: local[key],
              remote: remote[key],
              path: key
            });
          }
        } 
        // 로컬만 변경된 경우
        else if (key in local && !this.isEqual(base[key], local[key])) {
          result[key] = this.deepClone(local[key]);
        } 
        // 원격만 변경된 경우
        else if (key in remote && !this.isEqual(base[key], remote[key])) {
          result[key] = this.deepClone(remote[key]);
        } 
        // 변경되지 않은 경우
        else {
          // 로컬에 키가 있으면 로컬 값 사용, 없으면 원격 값 사용
          result[key] = key in local ? 
            this.deepClone(local[key]) : 
            this.deepClone(remote[key]);
        }
      }
    }
    
    return {
      success: conflicts.length === 0,
      merged: result,
      conflicts: conflicts.length > 0 ? conflicts : undefined
    };
  }

  /**
   * 배열 병합
   * @param base 기본 배열
   * @param local 로컬 배열
   * @param remote 원격 배열
   * @param depth 현재 재귀 깊이
   */
  private static mergeArrays<T>(
    base: T[],
    local: T[],
    remote: T[],
    depth: number = 0
  ): IMergeResult<T[]> {
    // 재귀 깊이 제한 검사
    if (depth > this.MAX_RECURSIVE_DEPTH) {
      return {
        success: false,
        error: '최대 재귀 깊이 초과'
      };
    }

    try {
      // 객체 배열인 경우 아이템 ID 기반 병합 시도
      if (
        base.length > 0 && typeof base[0] === 'object' && base[0] !== null &&
        'id' in (base[0] as any)
      ) {
        return this.mergeObjectArrays(base as any[], local as any[], remote as any[], depth);
      }
      
      // 기본 배열 병합 전략: 양쪽에서 추가된 항목을 모두 포함
      const result: T[] = [...base];
      
      // 로컬에서 추가된 항목 찾기
      const localAdded = local.filter(item => 
        !base.some(baseItem => this.isEqual(baseItem, item))
      );
      
      // 원격에서 추가된 항목 찾기
      const remoteAdded = remote.filter(item => 
        !base.some(baseItem => this.isEqual(baseItem, item))
      );
      
      // 로컬에서 제거된 항목 찾기
      const localRemoved = base.filter(item => 
        !local.some(localItem => this.isEqual(localItem, item))
      );
      
      // 원격에서 제거된 항목 찾기
      const remoteRemoved = base.filter(item => 
        !remote.some(remoteItem => this.isEqual(remoteItem, item))
      );
      
      // 모든 추가된 항목을 결과에 추가
      for (const item of localAdded) {
        if (!result.some(resultItem => this.isEqual(resultItem, item))) {
          result.push(this.deepClone(item));
        }
      }
      
      for (const item of remoteAdded) {
        if (!result.some(resultItem => this.isEqual(resultItem, item))) {
          result.push(this.deepClone(item));
        }
      }
      
      // 양쪽에서 제거된 항목을 결과에서 제거
      for (const item of localRemoved) {
        if (remoteRemoved.some(remoteItem => this.isEqual(remoteItem, item))) {
          const index = result.findIndex(resultItem => this.isEqual(resultItem, item));
          if (index !== -1) {
            result.splice(index, 1);
          }
        }
      }
      
      return {
        success: true,
        merged: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '배열 병합 실패'
      };
    }
  }

  /**
   * ID 속성을 가진 객체 배열 병합
   * @param base 기본 객체 배열
   * @param local 로컬 객체 배열
   * @param remote 원격 객체 배열
   * @param depth 현재 재귀 깊이
   */
  private static mergeObjectArrays<T extends { id: string | number }>(
    base: T[],
    local: T[],
    remote: T[],
    depth: number = 0
  ): IMergeResult<T[]> {
    try {
      const result: T[] = [];
      const conflicts: IMergeConflict<any>[] = [];
      
      // ID 기반으로 모든 항목 매핑
      const baseMap = new Map<string | number, T>();
      const localMap = new Map<string | number, T>();
      const remoteMap = new Map<string | number, T>();
      
      base.forEach(item => baseMap.set(item.id, item));
      local.forEach(item => localMap.set(item.id, item));
      remote.forEach(item => remoteMap.set(item.id, item));
      
      // 모든 고유 ID 수집
      const allIds = new Set([
        ...baseMap.keys(),
        ...localMap.keys(),
        ...remoteMap.keys()
      ]);
      
      // 각 ID에 대해 항목 병합
      for (const id of allIds) {
        const baseItem = baseMap.get(id);
        const localItem = localMap.get(id);
        const remoteItem = remoteMap.get(id);
        
        // 기본에 없는 경우 (새로 추가된 항목)
        if (!baseItem) {
          // 로컬과 원격 모두에 있는 경우
          if (localItem && remoteItem) {
            // 같은 경우
            if (this.isEqual(localItem, remoteItem)) {
              result.push(this.deepClone(localItem));
            } 
            // 다른 경우 객체 병합 시도
            else {
              const emptyBase = {} as Record<string, any>;
              const nestedResult = this.mergeObjects(
                emptyBase,
                localItem as unknown as Record<string, any>,
                remoteItem as unknown as Record<string, any>,
                depth + 1
              );
              
              if (nestedResult.success && nestedResult.merged) {
                result.push(nestedResult.merged as unknown as T);
              } else {
                conflicts.push({
                  base: undefined,
                  local: localItem,
                  remote: remoteItem,
                  path: `[id=${id}]`
                });
                
                // 우선 로컬 항목 사용
                result.push(this.deepClone(localItem));
              }
            }
          } 
          // 로컬에만 있는 경우
          else if (localItem) {
            result.push(this.deepClone(localItem));
          } 
          // 원격에만 있는 경우
          else if (remoteItem) {
            result.push(this.deepClone(remoteItem));
          }
        } 
        // 기본에 있는 경우
        else {
          // 로컬과 원격 모두에서 변경된 경우
          if (
            localItem && remoteItem &&
            !this.isEqual(baseItem, localItem) &&
            !this.isEqual(baseItem, remoteItem) &&
            !this.isEqual(localItem, remoteItem)
          ) {
            // 객체 병합 시도
            const nestedResult = this.mergeObjects(
              baseItem as unknown as Record<string, any>,
              localItem as unknown as Record<string, any>,
              remoteItem as unknown as Record<string, any>,
              depth + 1
            );
            
            if (nestedResult.success && nestedResult.merged) {
              result.push(nestedResult.merged as unknown as T);
            } else {
              conflicts.push({
                base: baseItem,
                local: localItem,
                remote: remoteItem,
                path: `[id=${id}]`
              });
              
              // 우선 로컬 항목 사용
              result.push(this.deepClone(localItem));
            }
          } 
          // 로컬만 변경된 경우
          else if (localItem && !this.isEqual(baseItem, localItem)) {
            result.push(this.deepClone(localItem));
          } 
          // 원격만 변경된 경우
          else if (remoteItem && !this.isEqual(baseItem, remoteItem)) {
            result.push(this.deepClone(remoteItem));
          } 
          // 로컬에서 삭제된 경우
          else if (!localItem && remoteItem) {
            // 원격에서도 변경되지 않았다면 삭제 유지
            if (this.isEqual(baseItem, remoteItem)) {
              // 항목을 결과에 추가하지 않음 (삭제됨)
            } else {
              // 원격에서 변경되었다면 충돌
              conflicts.push({
                base: baseItem,
                local: undefined,
                remote: remoteItem,
                path: `[id=${id}]`
              });
              
              // 우선 원격 항목 사용
              result.push(this.deepClone(remoteItem));
            }
          } 
          // 원격에서 삭제된 경우
          else if (localItem && !remoteItem) {
            // 로컬에서도 변경되지 않았다면 삭제 유지
            if (this.isEqual(baseItem, localItem)) {
              // 항목을 결과에 추가하지 않음 (삭제됨)
            } else {
              // 로컬에서 변경되었다면 충돌
              conflicts.push({
                base: baseItem,
                local: localItem,
                remote: undefined,
                path: `[id=${id}]`
              });
              
              // 우선 로컬 항목 사용
              result.push(this.deepClone(localItem));
            }
          } 
          // 양쪽 모두에서 삭제된 경우
          else if (!localItem && !remoteItem) {
            // 항목을 결과에 추가하지 않음 (삭제됨)
          }
          // 변경되지 않은 경우
          else {
            result.push(this.deepClone(baseItem));
          }
        }
      }
      
      return {
        success: conflicts.length === 0,
        merged: result,
        conflicts: conflicts.length > 0 ? conflicts : undefined
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '객체 배열 병합 실패'
      };
    }
  }

  /**
   * 텍스트 병합
   * @param base 기본 텍스트
   * @param local 로컬 텍스트
   * @param remote 원격 텍스트
   */
  private static mergeText(
    base: string,
    local: string,
    remote: string
  ): IMergeResult<string> {
    try {
      // 기본-로컬, 기본-원격 차이 계산
      const baseToLocal = this.dmp.diff_main(base, local);
      const baseToRemote = this.dmp.diff_main(base, remote);
      
      // 삭제 및 삽입 패치 추출
      const localPatches = this.extractPatches(baseToLocal);
      const remotePatches = this.extractPatches(baseToRemote);
      
      // 패치 충돌 확인
      const conflicts = this.findPatchConflicts(localPatches, remotePatches);
      
      if (conflicts.length > 0) {
        // 충돌이 있는 경우
        return {
          success: false,
          conflicts: [{
            base,
            local,
            remote,
            path: 'text'
          }]
        };
      }
      
      // 패치 적용
      const patches = [...this.dmp.patch_make(base, baseToLocal), ...this.dmp.patch_make(base, baseToRemote)];
      const [merged, _] = this.dmp.patch_apply(patches, base);
      
      return {
        success: true,
        merged
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '텍스트 병합 실패'
      };
    }
  }

  /**
   * 패치에서 위치와 변경 사항 추출
   */
  private static extractPatches(diffs: Diff[]): Array<{ start: number; end: number; text: string; }> {
    const patches: Array<{ start: number; end: number; text: string; }> = [];
    let pos = 0;
    
    for (const [op, text] of diffs) {
      if (op === 0) { // EQUAL
        pos += text.length;
      } else if (op === -1) { // DELETE
        patches.push({ start: pos, end: pos + text.length, text: '' });
        pos += text.length;
      } else if (op === 1) { // INSERT
        patches.push({ start: pos, end: pos, text });
      }
    }
    
    return patches;
  }

  /**
   * 패치 간 충돌 찾기
   */
  private static findPatchConflicts(
    patchesA: Array<{ start: number; end: number; text: string; }>,
    patchesB: Array<{ start: number; end: number; text: string; }>
  ): Array<{ patchA: any; patchB: any; }> {
    const conflicts: Array<{ patchA: any; patchB: any; }> = [];
    
    for (const patchA of patchesA) {
      for (const patchB of patchesB) {
        // 범위가 겹치는지 확인
        if (
          (patchA.start < patchB.end && patchA.end > patchB.start) ||
          (patchB.start < patchA.end && patchB.end > patchA.start)
        ) {
          // 같은 변경이 아닌 경우 충돌로 처리
          if (patchA.text !== patchB.text) {
            conflicts.push({ patchA, patchB });
          }
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 두 값이 동일한지 확인
   */
  private static isEqual(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return a === b;
    }
  }

  /**
   * 깊은 복제 (Deep Clone)
   * @param value 복제할 값
   */
  private static deepClone<T>(value: T): T {
    if (value === null || value === undefined) {
      return value;
    }

    // 특수 객체 (Date, RegExp 등) 처리
    if (value instanceof Date) {
      return new Date(value.getTime()) as unknown as T;
    }
    
    if (value instanceof RegExp) {
      return new RegExp(value.source, value.flags) as unknown as T;
    }
    
    if (value instanceof Map) {
      const result = new Map();
      for (const [k, v] of value.entries()) {
        result.set(this.deepClone(k), this.deepClone(v));
      }
      return result as unknown as T;
    }
    
    if (value instanceof Set) {
      const result = new Set();
      for (const item of value) {
        result.add(this.deepClone(item));
      }
      return result as unknown as T;
    }

    // 객체 또는 배열인 경우
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        return value.map(item => this.deepClone(item)) as unknown as T;
      } else {
        const result: Record<string, any> = {};
        for (const key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            result[key] = this.deepClone((value as any)[key]);
          }
        }
        return result as unknown as T;
      }
    }

    // 기본 타입인 경우
    return value;
  }

  /**
   * 스마트 병합 전략을 사용한 객체 병합
   * @param base 기본 버전
   * @param local 로컬 버전
   * @param remote 원격 버전
   */
  public static smartMerge<T>(base: T, local: T, remote: T): IMergeResult<T> {
    try {
      if (typeof base !== 'object' || base === null || 
          typeof local !== 'object' || local === null || 
          typeof remote !== 'object' || remote === null) {
        // 기본 타입인 경우 three-way merge 시도
        return this.threeWayMerge(base, local, remote);
      }

      // 객체 타입인 경우 재귀적 병합 수행
      if (Array.isArray(base) && Array.isArray(local) && Array.isArray(remote)) {
        return this.mergeArrays(base, local, remote);
      } else {
        return this.mergeObjects(base as any, local as any, remote as any);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '스마트 병합 실패'
      };
    }
  }

  /**
   * 충돌 해결
   * @param conflict 충돌 객체
   * @param resolution 해결 방식
   * @param customValue 사용자 정의 값
   */
  public static resolveConflict<T>(
    conflict: IMergeConflict<T>,
    resolution: 'local' | 'remote' | 'custom' | 'auto',
    customValue?: T
  ): T {
    if (resolution === 'local') {
      return this.deepClone(conflict.local);
    } else if (resolution === 'remote') {
      return this.deepClone(conflict.remote);
    } else if (resolution === 'custom' && customValue !== undefined) {
      return this.deepClone(customValue);
    } else if (resolution === 'auto') {
      // 자동 병합 시도
      try {
        if (
          typeof conflict.local === 'object' && conflict.local !== null &&
          typeof conflict.remote === 'object' && conflict.remote !== null
        ) {
          // 객체인 경우 스마트 병합 시도
          const base = conflict.base || (Array.isArray(conflict.local) ? [] : {});
          const result = this.smartMerge(base, conflict.local, conflict.remote);
          if (result.success && result.merged) {
            return result.merged;
          }
        }
        
        // 자동 병합 실패 시 로컬 값 기본 사용
        return this.deepClone(conflict.local);
      } catch {
        return this.deepClone(conflict.local);
      }
    } else {
      throw new Error('유효하지 않은 충돌 해결 방식');
    }
  }

  /**
   * 복수의 충돌 자동 해결 시도
   * @param conflicts 충돌 목록
   */
  public static autoResolveConflicts<T>(conflicts: IMergeConflict<T>[]): Record<string, T> {
    const resolutions: Record<string, T> = {};
    
    for (const conflict of conflicts) {
      if (!conflict.path) continue;
      
      try {
        resolutions[conflict.path] = this.resolveConflict(conflict, 'auto');
      } catch {
        // 자동 해결 실패 시 로컬 값 사용
        resolutions[conflict.path] = this.deepClone(conflict.local);
      }
    }
    
    return resolutions;
  }
} 