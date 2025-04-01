import logging
from typing import Dict, Any, List, Optional
import google.generativeai as genai

class GeminiClient:
    """Gemini API 클라이언트 클래스"""
    
    def __init__(self, api_key: str):
        """
        Gemini API 클라이언트 초기화
        
        Args:
            api_key: Gemini API 키
        """
        self.logger = logging.getLogger(__name__)
        
        if not api_key:
            self.logger.warning("Gemini API 키가 제공되지 않았습니다. 더미 응답만 가능합니다.")
            self.dummy_mode = True
        else:
            self.dummy_mode = False
            genai.configure(api_key=api_key)
            
        # 기본 모델 설정
        self.default_model = "gemini-1.5-pro"
        
    async def generate_content(self, prompt: str, model: Optional[str] = None) -> str:
        """
        Gemini API를 사용하여 텍스트 생성
        
        Args:
            prompt: 프롬프트 내용
            model: 사용할 모델 이름 (기본값: gemini-1.5-pro)
            
        Returns:
            생성된 텍스트
        """
        if self.dummy_mode:
            self.logger.warning("더미 모드에서 실행 중입니다. 실제 API 호출은 발생하지 않습니다.")
            return f"DUMMY RESPONSE: {prompt[:100]}..."
            
        try:
            model_name = model or self.default_model
            
            # Gemini 모델 설정
            genai_model = genai.GenerativeModel(model_name)
            
            # 비동기 API 호출
            response = await genai_model.generate_content_async(prompt)
            
            if not response.text:
                self.logger.warning("빈 응답이 반환되었습니다.")
                return ""
                
            return response.text
            
        except Exception as e:
            self.logger.error(f"Gemini API 호출 오류: {str(e)}")
            return f"[ERROR] Gemini API 호출 중 오류 발생: {str(e)}"
            
    async def extract_topics(self, text: str, count: int = 5) -> List[str]:
        """
        텍스트에서 핵심 토픽 추출
        
        Args:
            text: 분석할 텍스트
            count: 추출할 토픽 수
            
        Returns:
            추출된 토픽 리스트
        """
        prompt = f"""
        다음 텍스트에서 가장 중요한 {count}개의 핵심 토픽이나 키워드를 추출해주세요.
        리스트 형태로만 답변해주세요. 추가 설명 없이 키워드만 제공해주세요.
        
        {text}
        """
        
        response = await self.generate_content(prompt)
        
        # 응답에서 토픽 추출
        topics = []
        for line in response.split('\n'):
            line = line.strip()
            if line and not line.startswith('```') and not line.endswith('```'):
                # 번호 및 불릿 포인트 제거
                clean_line = line.lstrip('0123456789.-*# ')
                if clean_line:
                    topics.append(clean_line)
                    
        return topics[:count]
        
    async def summarize_text(self, text: str, max_words: int = 150) -> str:
        """
        텍스트 요약
        
        Args:
            text: 요약할 텍스트
            max_words: 최대 단어 수
            
        Returns:
            요약된 텍스트
        """
        prompt = f"""
        다음 텍스트를 최대 {max_words}단어로 요약해주세요. 핵심 내용에 집중하세요.
        불필요한 설명이나 인사말 없이 요약문만 제공해주세요.
        
        {text}
        """
        
        return await self.generate_content(prompt) 