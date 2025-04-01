import { EventEmitter } from 'events'
import { v4 as uuidv4 } from 'uuid'

// 메시지 우선순위
export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent'
}

// 메시지 상태
export enum MessageStatus {
  PENDING = 'pending',
  DELIVERED = 'delivered',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// 에이전트 메시지 인터페이스
export interface IAgentMessage {
  id: string
  type: string
  sender: string
  recipients: string[]
  payload: any
  priority: MessagePriority
  status: MessageStatus
  timestamp: number
  ttl?: number // Time-to-live (초 단위)
}

// 에이전트 응답 인터페이스
export interface IAgentResponse {
  id: string
  messageId: string
  sender: string
  recipient: string
  payload: any
  status: MessageStatus
  timestamp: number
}

/**
 * 메시지 버스 클래스
 * 
 * 에이전트 간 통신을 위한 중앙 메시지 버스입니다.
 * 발행-구독 패턴으로 구현되었습니다.
 */
export class MessageBus extends EventEmitter {
  private static instance: MessageBus
  private messageMap: Map<string, IAgentMessage> = new Map()
  private responses: Map<string, IAgentResponse[]> = new Map()
  private subscriptions: Map<string, Set<string>> = new Map() // messageType -> agentIds
  private responseSubscriptions: Map<string, Set<string>> = new Map() // messageId -> agentIds
  private messageHistory: IAgentMessage[] = []
  private responseHistory: IAgentResponse[] = []
  private maxHistoryAge: number = 86400 * 1000 // 기본값 24시간

  private constructor() {
    super()
    // 주기적으로 오래된 메시지 정리
    setInterval(() => this.cleanupOldMessages(), 3600 * 1000) // 1시간마다 실행
  }
  
  /**
   * MessageBus 인스턴스를 가져옵니다.
   * @returns MessageBus 인스턴스
   */
  public static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus()
    }
    return MessageBus.instance
  }
  
  /**
   * 새 메시지를 발행합니다.
   */
  public publish(message: Omit<IAgentMessage, 'id' | 'timestamp' | 'status'>): string {
    const id = uuidv4()
    const timestamp = Date.now()
    
    const fullMessage: IAgentMessage = {
      ...message,
      id,
      timestamp,
      status: MessageStatus.PENDING
    }

    this.messageMap.set(id, fullMessage)
    this.messageHistory.push(fullMessage)
    
    // 이 메시지 타입에 구독한 에이전트들에게 알림
    const subscribers = this.subscriptions.get(message.type) || new Set()
    subscribers.forEach(agentId => {
      if (message.recipients.length === 0 || message.recipients.includes(agentId)) {
        this.emit(`message:${agentId}`, fullMessage)
      }
    })

    // 상태 업데이트
    this.updateMessageStatus(id, MessageStatus.DELIVERED)
    
    return id
  }
  
  /**
   * 메시지에 대한 응답을 발행합니다.
   */
  public publishResponse(response: Omit<IAgentResponse, 'id' | 'timestamp'>): string {
    const id = uuidv4()
    const timestamp = Date.now()
    
    const fullResponse: IAgentResponse = {
      ...response,
      id,
      timestamp
    }

    // 응답 저장
    const responses = this.responses.get(response.messageId) || []
    responses.push(fullResponse)
    this.responses.set(response.messageId, responses)
    this.responseHistory.push(fullResponse)
    
    // 이 메시지의 응답을 구독한 에이전트들에게 알림
    const subscribers = this.responseSubscriptions.get(response.messageId) || new Set()
    if (subscribers.has(response.recipient)) {
      this.emit(`response:${response.recipient}:${response.messageId}`, fullResponse)
    }
    
    // 메시지 상태 업데이트 (모든 수신자가 응답했는지 확인)
    this.checkMessageCompletion(response.messageId)
    
    return id
  }
  
  /**
   * 특정 타입의 메시지를 구독합니다.
   */
  public subscribe(agentId: string, messageType: string, callback: (message: IAgentMessage) => void): void {
    const subscribers = this.subscriptions.get(messageType) || new Set()
    subscribers.add(agentId)
    this.subscriptions.set(messageType, subscribers)
    
    this.on(`message:${agentId}`, callback)
  }
  
  /**
   * 특정 메시지의 응답을 구독합니다.
   */
  public subscribeToResponse(
    agentId: string, 
    messageId: string, 
    callback: (response: IAgentResponse) => void
  ): void {
    const subscribers = this.responseSubscriptions.get(messageId) || new Set()
    subscribers.add(agentId)
    this.responseSubscriptions.set(messageId, subscribers)
    
    this.on(`response:${agentId}:${messageId}`, callback)
  }
  
  /**
   * 구독을 취소합니다.
   */
  public unsubscribe(agentId: string, messageType: string): void {
    const subscribers = this.subscriptions.get(messageType)
    if (subscribers) {
      subscribers.delete(agentId)
      if (subscribers.size === 0) {
        this.subscriptions.delete(messageType)
      } else {
        this.subscriptions.set(messageType, subscribers)
      }
    }
    
    this.removeAllListeners(`message:${agentId}`)
  }
  
  /**
   * 응답 구독을 취소합니다.
   */
  public unsubscribeFromResponse(agentId: string, messageId: string): void {
    const subscribers = this.responseSubscriptions.get(messageId)
    if (subscribers) {
      subscribers.delete(agentId)
      if (subscribers.size === 0) {
        this.responseSubscriptions.delete(messageId)
      } else {
        this.responseSubscriptions.set(messageId, subscribers)
      }
    }
    
    this.removeAllListeners(`response:${agentId}:${messageId}`)
  }
  
  /**
   * 메시지 상태를 업데이트합니다.
   */
  public updateMessageStatus(messageId: string, status: MessageStatus): void {
    const message = this.messageMap.get(messageId)
    if (message) {
      message.status = status
      this.messageMap.set(messageId, message)
      this.emit(`status:${messageId}`, { messageId, status })
    }
  }
  
  /**
   * 특정 에이전트에게 보내진 모든 메시지를 가져옵니다.
   */
  public getMessagesForAgent(agentId: string): IAgentMessage[] {
    return Array.from(this.messageMap.values()).filter(
      msg => msg.recipients.length === 0 || msg.recipients.includes(agentId)
    )
  }
  
  /**
   * 특정 타입의 모든 메시지를 가져옵니다.
   */
  public getMessagesByType(type: string): IAgentMessage[] {
    return Array.from(this.messageMap.values()).filter(msg => msg.type === type)
  }
  
  /**
   * 특정 메시지에 대한 모든 응답을 가져옵니다.
   */
  public getResponsesForMessage(messageId: string): IAgentResponse[] {
    return this.responses.get(messageId) || []
  }
  
  /**
   * 모든 메시지를 반환합니다.
   */
  public getAllMessages(): Map<string, IAgentMessage> {
    return new Map(this.messageMap)
  }
  
  /**
   * 모든 응답을 반환합니다.
   */
  public getAllResponses(): Map<string, IAgentResponse[]> {
    return new Map(this.responses)
  }
  
  /**
   * 메시지 완료 여부를 확인합니다.
   */
  private checkMessageCompletion(messageId: string): void {
    const message = this.messageMap.get(messageId)
    if (!message) return
    
    const responses = this.responses.get(messageId) || []
    const respondedAgents = new Set(responses.map(r => r.sender))
    
    // 모든 수신자가 응답했는지 확인
    const allResponded = message.recipients.every(recipient => respondedAgents.has(recipient))
    
    if (allResponded) {
      // 모든 응답의 상태 확인
      const allCompleted = responses.every(r => 
        r.status === MessageStatus.COMPLETED || r.status === MessageStatus.FAILED
      )
      
      if (allCompleted) {
        const anyFailed = responses.some(r => r.status === MessageStatus.FAILED)
        this.updateMessageStatus(
          messageId, 
          anyFailed ? MessageStatus.FAILED : MessageStatus.COMPLETED
        )
      } else {
        this.updateMessageStatus(messageId, MessageStatus.PROCESSING)
      }
    }
  }
  
  /**
   * 오래된 메시지와 응답을 정리합니다.
   */
  private cleanupOldMessages(): void {
    const cutoffTime = Date.now() - this.maxHistoryAge
    
    // 오래된 메시지 정리
    this.messageHistory = this.messageHistory.filter(msg => msg.timestamp >= cutoffTime)
    
    // 오래된 응답 정리
    this.responseHistory = this.responseHistory.filter(res => res.timestamp >= cutoffTime)
    
    // 맵에서도 제거
    Array.from(this.messageMap.keys()).forEach(id => {
      const message = this.messageMap.get(id)
      if (message && message.timestamp < cutoffTime) {
        this.messageMap.delete(id)
        this.responses.delete(id)
        this.responseSubscriptions.delete(id)
      }
    })
  }
  
  /**
   * 최대 히스토리 보존 기간을 설정합니다(밀리초 단위).
   */
  public setMaxHistoryAge(ageInMs: number): void {
    this.maxHistoryAge = ageInMs
  }
}

/**
 * 메시지 생성 도우미 함수
 * @param type 메시지 유형
 * @param payload 메시지 내용
 * @param options 추가 옵션
 * @returns 생성된 메시지
 */
export function createMessage(
  type: string,
  payload: any,
  options: {
    sender: string,
    recipients: string[],
    priority?: MessagePriority,
    ttl?: number
  }
): IAgentMessage {
  return {
    id: uuidv4(),
    type,
    payload,
    sender: options.sender,
    recipients: options.recipients,
    priority: options.priority || MessagePriority.NORMAL,
    status: MessageStatus.PENDING,
    timestamp: Date.now(),
    ttl: options.ttl
  };
}

/**
 * 응답 생성 도우미 함수
 * @param messageId 원본 메시지 ID
 * @param sender 응답 발신자
 * @param recipient 응답 수신자
 * @param payload 응답 내용
 * @param status 응답 상태
 * @returns 생성된 응답
 */
export function createResponse(
  messageId: string,
  sender: string,
  recipient: string,
  payload: any,
  status: MessageStatus = MessageStatus.COMPLETED
): IAgentResponse {
  return {
    id: uuidv4(),
    messageId,
    sender,
    recipient,
    payload,
    status,
    timestamp: Date.now()
  };
} 