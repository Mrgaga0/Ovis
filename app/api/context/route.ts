import { NextRequest, NextResponse } from 'next/server';
import { ContextManager, IContextItem, IContextMessage } from '@/lib/context-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, conversationId, message, type, content, tags, projectId, query, options } = body;
    
    if (!action) {
      return NextResponse.json(
        { error: '액션을 지정해주세요.' },
        { status: 400 }
      );
    }
    
    const contextManager = ContextManager.getInstance();
    
    switch (action) {
      case 'createConversation': {
        const newConversationId = await contextManager.getOrCreateConversation(undefined, body.metadata);
        return NextResponse.json({ conversationId: newConversationId });
      }
      
      case 'addMessage': {
        if (!conversationId) {
          return NextResponse.json(
            { error: '대화 ID를 제공해주세요.' },
            { status: 400 }
          );
        }
        
        if (!message || !message.role || !message.content) {
          return NextResponse.json(
            { error: '유효한 메시지를 제공해주세요.' },
            { status: 400 }
          );
        }
        
        const messageId = await contextManager.addMessageToConversation(conversationId, message);
        return NextResponse.json({ messageId });
      }
      
      case 'getMessages': {
        if (!conversationId) {
          return NextResponse.json(
            { error: '대화 ID를 제공해주세요.' },
            { status: 400 }
          );
        }
        
        const messages = await contextManager.getConversationMessages(conversationId);
        return NextResponse.json({ messages });
      }
      
      case 'addContextItem': {
        if (!type || content === undefined) {
          return NextResponse.json(
            { error: '유형과 콘텐츠를 제공해주세요.' },
            { status: 400 }
          );
        }
        
        const contextItem: Omit<IContextItem, 'id' | 'timestamp'> = {
          type,
          content,
          tags,
          projectId,
          metadata: body.metadata
        };
        
        const itemId = await contextManager.addContextItem(contextItem);
        return NextResponse.json({ itemId });
      }
      
      case 'getContextItem': {
        if (!body.id) {
          return NextResponse.json(
            { error: '컨텍스트 항목 ID를 제공해주세요.' },
            { status: 400 }
          );
        }
        
        const item = await contextManager.getContextItem(body.id);
        
        if (!item) {
          return NextResponse.json(
            { error: '컨텍스트 항목을 찾을 수 없습니다.' },
            { status: 404 }
          );
        }
        
        return NextResponse.json(item);
      }
      
      case 'getRelevantContext': {
        if (!query) {
          return NextResponse.json(
            { error: '검색어를 제공해주세요.' },
            { status: 400 }
          );
        }
        
        const items = await contextManager.getRelevantContext(query, options);
        return NextResponse.json({ items });
      }
      
      case 'getRecentConversations': {
        const limit = body.limit || 10;
        const conversations = await contextManager.getRecentConversations(limit);
        return NextResponse.json({ conversations });
      }
      
      default:
        return NextResponse.json(
          { error: '지원하지 않는 액션입니다.' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('컨텍스트 API 오류:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 