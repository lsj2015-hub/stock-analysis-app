'use client';

import { useState, useRef, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Lightbulb, User } from 'lucide-react';
import { StockHistoryData, FinancialStatementData } from '@/types/stock';
import { StockNews } from '@/types/common';
import { askAi } from '@/lib/api';

interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface AiQuestionSectionProps {
  symbol: string;
  financialData: FinancialStatementData | null;
  stockHistoryData: StockHistoryData[] | null;
  newsData: StockNews[] | null;
}

export default function AiQuestionSection({
  symbol,
  financialData,
  stockHistoryData,
  newsData,
}: AiQuestionSectionProps) {
  const [question, setQuestion] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ✅ 상태 업데이트 로직을 더 안정적으로 수정한 함수
  const handleAskAi = async () => {
    if (!question.trim() || loading) {
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString('ko-KR'),
    };

    // 1. 사용자 메시지를 먼저 화면에 표시합니다.
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    console.log('[DEBUG] 사용자 메시지 추가 후:', [...messages, userMessage]);

    setQuestion('');
    setLoading(true);
    setError(null);

    try {
      // ✅ financialData와 historyData는 이미 객체이므로 JSON.stringify를 제거합니다.
      // askAi 함수 내부에서 처리하므로 여기서 문자열로 만들 필요가 없습니다.
      const data = await askAi(
        symbol,
        userMessage.text,
        financialData, // 객체 그대로 전달
        stockHistoryData, // 객체 그대로 전달
        newsData
      );

      console.log('[DEBUG] AI 응답 수신:', data);

      const aiResponseMessage: ChatMessage = {
        id: Date.now() + 1, // 충돌 방지를 위해 +1
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString('ko-KR'),
      };

      // 2. AI 응답 메시지를 화면에 추가합니다.
      setMessages((prevMessages) => [...prevMessages, aiResponseMessage]);
      console.log('[DEBUG] AI 메시지 추가 후:', [
        ...messages,
        userMessage,
        aiResponseMessage,
      ]);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error('Error asking AI:', errorMessage);
      setError(`AI 응답을 가져오는 중 오류가 발생했습니다: ${errorMessage}`);

      const errorResponseMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: `죄송합니다. AI 응답을 가져오는 데 문제가 발생했습니다: ${errorMessage}`,
        timestamp: new Date().toLocaleTimeString('ko-KR'),
      };

      // 3. 에러 메시지를 화면에 추가합니다.
      setMessages((prevMessages) => [...prevMessages, errorResponseMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAi();
    }
  };

  return (
    <div className="rounded-2xl border border-gray-400 p-6 bg-white flex flex-col h-[500px]">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-lg">
          David에게 자유롭게 질문하세요
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 mb-4 custom-scrollbar">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 mb-4 ${
              msg.sender === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {msg.sender === 'ai' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
                <Lightbulb size={20} />
              </div>
            )}
            <div
              className={`max-w-[75%] p-3 rounded-lg shadow-sm text-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              {/* `dangerouslySetInnerHTML`을 사용하여 \n을 <br>로 변환하여 줄바꿈을 표시 */}
              <div
                dangerouslySetInnerHTML={{
                  __html: msg.text.replace(/\n/g, '<br/>'),
                }}
              />
              <div
                className={`text-[0.7rem] mt-1 text-right w-full ${
                  msg.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}
              >
                {msg.timestamp}
              </div>
            </div>
            {msg.sender === 'user' && (
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-700">
                <User size={20} />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex flex-col gap-2 items-end">
        <Textarea
          placeholder="David에게 궁금한 점을 입력하세요 (예: 이 기업의 최근 매출 추이, 주가 변동 요인 등)"
          className="mb-2 bg-neutral-100 min-h-[70px] w-full"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={loading}
        />
        <Button
          className="w-[200px] bg-black text-white"
          onClick={handleAskAi}
          disabled={loading}
        >
          {loading ? '답변 생성 중...' : 'David에게 질문하기'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <Terminal className="h-4 w-4" />
          <AlertTitle>AI 응답 오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
