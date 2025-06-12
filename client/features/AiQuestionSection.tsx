'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal, Lightbulb, User, Send } from 'lucide-react';
import { StockHistoryData, FinancialStatementData } from '@/types/stock';
import { StockNews } from '@/types/common';
import { askAi } from '@/lib/api';

// === 타입 보완 ===
interface AiQuestionSectionProps {
  symbol: string;
  financialData: FinancialStatementData | null;
  stockHistoryData: StockHistoryData[] | null;
  newsData: StockNews[] | null;
}

interface ChatMessage {
  id: number;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  isLoading?: boolean;
}

export default function AiQuestionSection({
  symbol,
  financialData,
  stockHistoryData,
  newsData,
}: AiQuestionSectionProps) {
  const [question, setQuestion] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setMessages([]);
    setError(null);
  }, [symbol]);

  const handleAskAi = useCallback(async () => {
    if (!question.trim() || isLoading) return;

    const trimmedQuestion = question.trim();
    const userMessage: ChatMessage = {
      id: Date.now(),
      sender: 'user',
      text: trimmedQuestion,
      timestamp: new Date().toLocaleTimeString('ko-KR'),
    };
    const loadingAiMessage: ChatMessage = {
      id: userMessage.id + 1,
      sender: 'ai',
      text: '...',
      timestamp: new Date().toLocaleTimeString('ko-KR'),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingAiMessage]);
    setQuestion('');
    setIsLoading(true);
    setError(null);

    try {
      const data = await askAi(
        symbol,
        trimmedQuestion,
        financialData,
        stockHistoryData,
        newsData
      );
      const aiResponseMessage: ChatMessage = {
        ...loadingAiMessage,
        text: data.response,
        isLoading: false,
      };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingAiMessage.id ? aiResponseMessage : msg
        )
      );
    } catch (err) {
      let errorMessage = '알 수 없는 오류가 발생했습니다.';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else {
        errorMessage = String(err);
      }

      setError(`AI 응답 오류: ${errorMessage}`);
      const errorResponseMessage: ChatMessage = {
        ...loadingAiMessage,
        text: `죄송합니다. 오류가 발생했습니다: ${errorMessage}`,
        isLoading: false,
      };
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingAiMessage.id ? errorResponseMessage : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [question, isLoading, symbol, financialData, stockHistoryData, newsData]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAskAi();
    }
  };

  return (
    <div className="rounded-2xl border-2 border-purple-400 p-6 bg-white flex flex-col h-[500px]">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">🤖</span>
        <span className="font-semibold text-lg">
          David에게 자유롭게 질문하세요
        </span>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 mb-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
            <Lightbulb size={40} className="mb-4 text-purple-400" />
            <p className="font-semibold text-gray-600">질문 예시:</p>
            <p className="text-sm">
              &quot;이 기업의 최신 뉴스를 요약하고, 긍정적/부정적 요소를
              알려줘.&quot;
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 mb-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center text-white">
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
                {msg.isLoading ? (
                  <div className="flex items-center space-x-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                  </div>
                ) : (
                  <div className="whitespace-pre-wrap">{msg.text}</div>
                )}
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
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        <Textarea
          placeholder="David에게 궁금한 점을 입력하세요 (Shift+Enter로 줄바꿈)"
          className="pr-12 bg-neutral-100 min-h-[70px] w-full"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2 h-8 w-8 bg-black text-white rounded-full"
          onClick={handleAskAi}
          disabled={isLoading || !question.trim()}
          aria-label="질문 보내기"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin"></span>
          ) : (
            <Send size={16} />
          )}
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
