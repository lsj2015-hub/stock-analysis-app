// frontend/src/app/sectors/NewsSection.tsx

/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { StockNews } from '@/types/common'; // 수정된 타입을 사용
import { fetchStockNews, getTranslation } from '@/lib/api';

interface NewsSectionProps {
  symbol: string;
  setNewsData: (data: StockNews[] | null) => void;
}

export default function NewsSection({ symbol, setNewsData }: NewsSectionProps) {
  const [news, setNews] = useState<StockNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);

  // fetchNewsCallback 로직은 변경 없습니다.
  const fetchNewsCallback = useCallback(
    async (ticker: string) => {
      if (!ticker) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      setNews([]);
      setNewsData(null);
      try {
        const fetchedNews = await fetchStockNews(ticker);
        setNews(fetchedNews);
        setNewsData(fetchedNews);
        if (fetchedNews.length === 0) {
          setError('관련 뉴스를 찾을 수 없습니다.');
        }
      } catch (e: any) {
        console.error('fetchNewsCallback error:', e);
        setError(e.message || '뉴스 검색 실패');
        setNewsData(null);
      } finally {
        setLoading(false);
      }
    },
    [setNewsData]
  );

  useEffect(() => {
    fetchNewsCallback(symbol);
  }, [symbol, fetchNewsCallback]);

  // ✅ handleTranslate 함수 로직 전체 수정
  const handleTranslate = async (index: number) => {
    const originalItem = news[index];

    // 번역된 내용이 있다면 '원문 보기'로 토글 (번역 속성들 제거)
    if (originalItem.translatedTitle || originalItem.translatedSummary) {
      const updatedNews = [...news];
      delete updatedNews[index].translatedTitle;
      delete updatedNews[index].translatedSummary;
      setNews(updatedNews);
      setNewsData(updatedNews);
      return;
    }

    if (translatingIndex !== null) return;

    setTranslatingIndex(index);
    try {
      // ✅ Promise.all을 사용해 제목과 요약을 동시에 번역 요청 (효율적)
      const [translatedTitle, translatedSummary] = await Promise.all([
        getTranslation(originalItem.title),
        getTranslation(originalItem.summary),
      ]);

      const updatedNews = news.map((item, i) =>
        i === index ? { ...item, translatedTitle, translatedSummary } : item
      );
      setNews(updatedNews);
      setNewsData(updatedNews);
    } catch (err: any) {
      console.error('Translation failed:', err.message);
      const updatedNews = news.map((item, i) =>
        i === index
          ? { ...item, translatedSummary: `[번역 실패: ${err.message}]` }
          : item
      );
      setNews(updatedNews);
    } finally {
      setTranslatingIndex(null);
    }
  };

  const renderContent = () => {
    if (loading) {
      /* ... 로딩 UI ... */
    }
    if (error && news.length === 0) {
      /* ... 에러 UI ... */
    }
    if (news.length === 0) {
      /* ... 뉴스 없음 UI ... */
    }

    return (
      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {news.map((item, i) => (
          <Card key={item.url || i} className="border-l-4 border-green-600">
            <CardContent className="py-3 px-4 space-y-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-base font-semibold text-blue-700 hover:underline"
              >
                {item.title} {/* 원본 제목은 항상 표시 */}
              </a>
              <p className="text-sm text-gray-600">{item.summary}</p>
              <div className="flex justify-between items-center text-xs text-gray-400">
                <span>{item.source}</span>
                <span>
                  {item.publishedDate
                    ? new Date(item.publishedDate).toLocaleString('ko-KR')
                    : '날짜 정보 없음'}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleTranslate(i)}
                disabled={translatingIndex !== null}
              >
                {translatingIndex === i
                  ? '번역 중...'
                  : item.translatedTitle || item.translatedSummary
                  ? '원문 보기'
                  : '번역하기'}
              </Button>

              {/* ✅ 번역된 내용이 있을 경우 표시되는 영역 */}
              {(item.translatedTitle || item.translatedSummary) && (
                <div className="mt-2 bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap border space-y-2">
                  {item.translatedTitle && (
                    <p className="font-semibold">{item.translatedTitle}</p>
                  )}
                  {item.translatedSummary && <p>{item.translatedSummary}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <Card className="rounded-2xl border-2 border-green-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe size={20} /> 관련 최신 뉴스
        </CardTitle>
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
