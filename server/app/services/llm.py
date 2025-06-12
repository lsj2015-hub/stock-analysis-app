# server/app/services/llm.py
import openai
from typing import List, Dict, Any # Any 임포트 추가
import re # 정규식 모듈 임포트
from ..config import Settings

class LLMService:
    def __init__(self, settings: Settings):
        self.client = openai.AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    def _make_prompt(self, symbol: str, user_question: str, financial_data: str, history_data: str, news_data: List[Dict]) -> List[Dict[str, str]]:
        news_string = "\n".join([f"- {item['title']}" for item in news_data]) if news_data else "제공된 뉴스 데이터 없음"
        system_message_content = f"""
        당신은 유능한 주식 분석 AI 'David'입니다. 제공된 데이터를 기반으로 명확하고 통찰있게 답변해주세요.
        - 분석 대상: {symbol}
        - 재무 데이터: {financial_data}
        - 주가 히스토리: {history_data}
        - 최신 뉴스: {news_string}
        """
        return [{"role": "system", "content": system_message_content}, {"role": "user", "content": user_question}]

    async def get_qa_response(self, symbol: str, user_question: str, financial_data: str, history_data: str, news_data: List[dict]) -> str:
        messages = self._make_prompt(symbol, user_question, financial_data, history_data, news_data)
        try:
            response = await self.client.chat.completions.create(
                model="gpt-4o",
                messages=messages,
                temperature=0.7,
                max_tokens=700
            )
            return response.choices[0].message.content.strip()
        except openai.APIError as e:
            print(f"OpenAI API 오류: {e}")
            raise e # 예외를 다시 발생시켜 상위 핸들러가 처리하도록 함
