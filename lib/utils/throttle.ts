/**
 * 지정된 시간 동안 함수 실행을 제한하는 throttle 유틸리티
 * @param func 실행할 함수
 * @param limit 제한 시간 (밀리초)
 * @returns throttle이 적용된 함수
 */
export function throttle<T extends (...args: any[]) => any>(func: T, limit: number): (...args: Parameters<T>) => ReturnType<T> | undefined {
  let lastFunc: ReturnType<typeof setTimeout> | undefined;
  let lastRan: number = 0;
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const context = this;
    
    if (!lastRan) {
      lastRan = Date.now();
      return func.apply(context, args);
    } else {
      if (lastFunc) {
        clearTimeout(lastFunc);
      }
      
      lastFunc = setTimeout(() => {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
    
    return undefined;
  };
}

/**
 * 지정된 시간동안 함수 실행을 지연시키는 debounce 유틸리티
 * @param func 실행할 함수
 * @param wait 지연 시간 (밀리초)
 * @param immediate 즉시 실행 여부
 * @returns debounce가 적용된 함수
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate: boolean = false
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(this: any, ...args: Parameters<T>): void {
    const context = this;
    const later = function() {
      timeout = null;
      if (!immediate) {
        func.apply(context, args);
      }
    };
    
    const callNow = immediate && !timeout;
    
    if (timeout) {
      clearTimeout(timeout);
    }
    
    timeout = setTimeout(later, wait);
    
    if (callNow) {
      func.apply(context, args);
    }
  };
} 