// frontend/src/app/sectors/AiQuestionSection.tsx
'use client';

import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useState, useRef, useEffect } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Lightbulb, User } from 'lucide-react';
import { StockHistoryData, FinancialStatementData } from '@/types/stock';
import { StockNews } from '../../types/common';

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
  newsData: StockNews[] | null
}

export default function AiQuestionSection({
  symbol,
  financialData,
  stockHistoryData,
  newsData
}: AiQuestionSectionProps) {
  const [question, setQuestion] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleAskAi = async () => {
    if (!question.trim()) {
      setError('질문을 입력해주세요.');
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: question,
      timestamp: new Date().toLocaleTimeString('ko-KR'),
    };

    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setQuestion('');
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat-with-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: userMessage.text,
          symbol: symbol,
          financialData: financialData
            ? JSON.stringify(financialData, null, 2)
            : '재무 데이터 없음',
          historyData: stockHistoryData
            ? JSON.stringify(stockHistoryData, null, 2)
            : '주가 히스토리 데이터 없음',
          newsData: newsData
            ? JSON.stringify(newsData, null, 2)
            : '뉴스 데이터 없음',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || 'AI 응답을 가져오는데 실패했습니다.'
        );
      }

      const data = await response.json();
      console.log({data: data})
      const aiResponseMessage: ChatMessage = {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.response,
        timestamp: new Date().toLocaleTimeString('ko-KR'),
      };
      setMessages((prevMessages) => [...prevMessages, aiResponseMessage]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error('Error asking AI:', err);
      setError(
        `AI 응답을 가져오는 중 오류가 발생했습니다: ${
          err.message || String(err)
        }`
      );
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `죄송합니다. AI 응답을 가져오는 데 문제가 발생했습니다: ${
            err.message || String(err)
          }`,
          timestamp: new Date().toLocaleTimeString('ko-KR'),
        },
      ]);
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
        <span className="ml-2 text-xs text-muted-foreground">
          (조회한 데이터 기반)
        </span>
      </div>

      {/* ⭐ 여기가 핵심: 채팅 기록 표시 영역 */}
      <div className="flex-1 overflow-y-auto pr-2 mb-4 custom-scrollbar">
        {messages.length === 0 && (
          <div className="text-center text-gray-500 py-10">
            <p>궁금한 점을 입력하고 David에게 질문해 보세요!</p>
            <p className="text-sm mt-2">
              David가 조회된 재무 데이터와 주가 히스토리 데이터를 기반으로
              답변합니다.
            </p>
          </div>
        )}
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
              className={`max-w-[70%] p-3 rounded-lg shadow-sm text-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-500 text-white rounded-br-none'
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}
            >
              <div
                dangerouslySetInnerHTML={{
                  __html: msg.text.replace(/\n/g, '<br/>'),
                }}
              />
              <div
                className={`text-[0.7rem] mt-1 ${
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

      {/* 로딩 및 에러 메시지: 입력/버튼 영역 아래에 표시 */}
      {loading && (
        <div className="mt-4 p-4 border rounded bg-blue-50 text-blue-800">
          <p>AI가 답변을 생성 중입니다. 잠시만 기다려 주세요...</p>
        </div>
      )}

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
