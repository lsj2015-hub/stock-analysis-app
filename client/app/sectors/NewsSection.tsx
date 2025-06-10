/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Globe } from 'lucide-react';
import { StockNews } from '@/types/common';
import { fetchStockNews, getTranslation } from '@/lib/data-manager';

interface NewsSectionProps {
  symbol: string;
  setNewsData: (data: StockNews[] | null) => void;
}

export default function NewsSection({ symbol, setNewsData }: NewsSectionProps) {
  const [news, setNews] = useState<StockNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [translatingIndex, setTranslatingIndex] = useState<number | null>(null);

  const fetchNewsCallback = useCallback(
    async (ticker: string) => {
      // ... (뉴스 로딩 로직은 변경 없음)
      if (!ticker) return;
      setLoading(true);
      setError(null);
      setNews([]);
      setNewsData(null);
      try {
        const fetchedNews = await fetchStockNews(ticker);
        setNews(fetchedNews);
        setNewsData(fetchedNews);
      } catch (e: any) {
        setError(e.message || '알 수 없는 오류로 뉴스 검색에 실패했습니다.');
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

  const handleTranslate = async (index: number) => {
    // ★ 1. 이미 번역된 내용이 있는지 확인
    if (news[index].translated) {
      // 번역된 내용이 있다면, 'translated' 속성을 제거하여 원문으로 되돌림
      const updatedNews = news.map((item, i) =>
        i === index ? { ...item, translated: undefined } : item
      );
      setNews(updatedNews);
      setNewsData(updatedNews);
      return; // API 호출 없이 함수 종료
    }

    // 다른 항목이 번역 중이면 실행하지 않음
    if (translatingIndex !== null) {
      return;
    }

    setTranslatingIndex(index);

    try {
      const translatedText = await getTranslation(news[index].summary);

      const updatedNews = news.map((item, i) =>
        i === index ? { ...item, translated: translatedText } : item
      );

      setNews(updatedNews);
      setNewsData(updatedNews);
    } catch (err: any) {
      console.error('Translation failed:', err.message);
      const updatedNews = news.map((item, i) =>
        i === index ? { ...item, translated: `[${err.message}]` } : item
      );
      setNews(updatedNews);
      setNewsData(updatedNews);
    } finally {
      setTranslatingIndex(null);
    }
  };

  return (
    <Card className="rounded-2xl border-2 border-green-400">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe size={20} /> 관련 최신 뉴스
          <span className="ml-4 text-base font-semibold text-gray-700">
            ({symbol})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ... 로딩 및 에러 처리 UI ... */}
        {loading && <Skeleton className="h-20 w-full" />}
        {error && (
          <Alert variant="destructive">
            <AlertTitle>오류</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!loading && !error && news.length > 0 && (
          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
            {news.slice(0, 5).map((item, i) => (
              <Card key={i} className="border-l-4 border-green-600">
                <CardContent className="py-3 px-4 space-y-2">
                  {/* ... 뉴스 제목, 요약, 출처 등 ... */}
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base font-semibold text-blue-700 hover:underline"
                  >
                    {item.title}
                  </a>
                  <p className="text-sm text-gray-600">{item.summary}</p>
                  <div className="flex justify-between items-center text-xs text-gray-400">
                    <span>{item.source}</span>
                    <span>
                      {new Date(item.publishedDate).toLocaleString('ko-KR')}
                    </span>
                  </div>

                  {/* ★ 2. 버튼 로직 수정 */}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleTranslate(i)}
                    // 번역 중일 때만 비활성화
                    disabled={translatingIndex !== null}
                  >
                    {translatingIndex === i
                      ? '번역 중...'
                      : item.translated
                      ? '원문 보기'
                      : '요약 번역 보기'}
                  </Button>

                  {item.translated && (
                    <div className="mt-2 bg-gray-50 rounded p-3 text-sm text-gray-800 whitespace-pre-wrap border">
                      {item.translated}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        {!loading && !error && news.length === 0 && (
          <p className="text-sm text-gray-500 mt-4">관련 뉴스가 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}
