const CACHE_NAME = 'ovis-v1'
const CACHE_URLS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/api/projects',
  '/api/teams',
  '/api/rooms'
]

// Service Worker 설치
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CACHE_URLS))
  )
})

// 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
})

// 네트워크 요청 처리
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache First 전략
        if (response) {
          // 캐시된 응답이 있으면 반환
          return response
        }

        // 네트워크 요청
        return fetch(event.request.clone())
          .then(response => {
            // 유효한 응답이 아니면 그대로 반환
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response
            }

            // 응답을 캐시에 저장
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, response.clone())
              })

            return response
          })
          .catch(() => {
            // 오프라인이고 캐시도 없는 경우
            return new Response('오프라인 상태입니다.', {
              status: 503,
              statusText: 'Service Unavailable'
            })
          })
      })
  )
})

// 백그라운드 동기화
self.addEventListener('sync', event => {
  if (event.tag === 'sync-updates') {
    event.waitUntil(syncData())
  }
})

// 푸시 알림
self.addEventListener('push', event => {
  const options = {
    body: event.data.text(),
    icon: '/icon.png',
    badge: '/badge.png'
  }

  event.waitUntil(
    self.registration.showNotification('Ovis', options)
  )
})

// 알림 클릭
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil(
    clients.openWindow('/')
  )
})

// 데이터 동기화
async function syncData() {
  try {
    const cache = await caches.open(CACHE_NAME)
    const requests = await cache.keys()
    
    const updates = requests
      .filter(request => request.method !== 'GET')
      .map(async request => {
        try {
          const response = await fetch(request.clone())
          if (response.ok) {
            await cache.delete(request)
          }
          return response
        } catch (error) {
          console.error('Sync failed:', error)
          return null
        }
      })

    return Promise.all(updates)
  } catch (error) {
    console.error('Sync failed:', error)
    return null
  }
}

// 캐시 관리
async function manageCache() {
  const cache = await caches.open(CACHE_NAME)
  const requests = await cache.keys()
  
  // 오래된 캐시 삭제
  const oldRequests = requests.filter(request => {
    const cachedAt = request.headers.get('sw-fetched-on')
    if (!cachedAt) return false
    
    const age = Date.now() - new Date(cachedAt).getTime()
    return age > 7 * 24 * 60 * 60 * 1000 // 1주일
  })

  return Promise.all(oldRequests.map(request => cache.delete(request)))
}

// 주기적인 캐시 관리
setInterval(manageCache, 24 * 60 * 60 * 1000) // 매일 