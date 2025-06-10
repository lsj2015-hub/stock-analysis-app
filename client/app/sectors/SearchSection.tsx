'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { getStockInfo, getStockOfficers } from '@/lib/data-manager';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Terminal } from 'lucide-react';
import { StockInfo, Officer } from '@/types/stock';

// SearchSectionProps 인터페이스 추가: symbol과 setSymbol을 prop으로 받음
interface SearchSectionProps {
  symbol: string;
  setSymbol: (newSymbol: string) => void;
}

export default function SearchSection({ symbol, setSymbol }: SearchSectionProps) {
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const [stockInfo, setStockInfo] = useState<StockInfo | null>(null);
  const [officerInfo, setOfficerInfo] = useState<Officer[] | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const resetDataStates = useCallback(() => {
    setStockInfo(null);
    setOfficerInfo(null);
  }, []);

  const fetchData = async (section: string) => {
    // ***************** 토글 로직 추가 *****************
    if (activeSection === section) {
      // 이미 활성화된 섹션을 다시 클릭한 경우, 데이터를 숨깁니다.
      setActiveSection(null); // 현재 섹션 비활성화
      resetDataStates(); // 모든 데이터 초기화
      setLoading(false);
      setError(null);
      return; // 여기서 함수 실행을 중단
    }
    // ***************** 토글 로직 끝 *****************

    resetDataStates();
    setLoading(true);
    setError(null);
    setActiveSection(section);

    if (!symbol) {
      // symbol이 없는 경우 처리
      setError('종목 코드를 입력해주세요.');
      setLoading(false);
      return;
    }

    try {
      const upperSymbol = symbol.toUpperCase();
      let success = false;

      // `financialSummary` 섹션 선택 시, StockInfo만 가져와서 요약 정보에 사용합니다.
      if (section === 'financialSummary') {
        const infoData = await getStockInfo(upperSymbol);
        setStockInfo(infoData);
        success = !!infoData && infoData.totalRevenue !== undefined;
      } else {
        switch (section) {
          case 'companyInfo':
            const infoData = await getStockInfo(upperSymbol);
            setStockInfo(infoData);
            success = !!infoData;
            break;
          case 'officerSummary':
            const officerData = await getStockOfficers(upperSymbol);
            setOfficerInfo(officerData);
            success = !!officerData && officerData.length > 0;
            break;
          case 'investmentIndicators':
          case 'longTermMarketInfo':
          case 'analystOpinion':
            const currentInfo = stockInfo || (await getStockInfo(upperSymbol));
            setStockInfo(currentInfo);
            success = !!currentInfo;
            break;
          default:
            break;
        }
      }

      if (!success) {
        setError(
          `'${upperSymbol}'에 대한 ${getSectionName(
            section
          )} 정보를 찾을 수 없습니다.`
        );
      }
    } catch (err) {
      console.error(`Failed to fetch ${section} data:`, err);
      setError(`데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.`);
    } finally {
      setLoading(false);
    }
  };

  const getSectionName = (sectionKey: string) => {
    switch (sectionKey) {
      case 'companyInfo':
        return '회사 기본 정보';
      case 'financialSummary':
        return '재무 요약';
      case 'officerSummary':
        return '임원 요약';
      case 'investmentIndicators':
        return '투자 지표';
      case 'longTermMarketInfo':
        return '장기 시장 정보';
      case 'analystOpinion':
        return '분석가 의견';
      default:
        return '';
    }
  };

  const getInvestmentIndicators = (info: StockInfo) => {
    return {
      trailingPE: info.trailingPE,
      forwardPE: info.forwardPE,
      priceToBook: info.priceToBook,
      returnOnEquity: info.returnOnEquity,
      returnOnAssets: info.returnOnAssets,
      beta: info.beta,
    };
  };

  const getLongTermMarketInfo = (info: StockInfo) => {
    return {
      fiftyTwoWeekHigh: info.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: info.fiftyTwoWeekLow,
      marketCap: info.marketCap,
      sharesOutstanding: info.sharesOutstanding,
    };
  };

  const getAnalystOpinion = (info: StockInfo) => {
    return {
      recommendationMean: info.recommendationMean,
      recommendationKey: info.recommendationKey,
      numberOfAnalystOpinions: info.numberOfAnalystOpinions,
      targetMeanPrice: info.targetMeanPrice,
      targetHighPrice: info.targetHighPrice,
      targetLowPrice: info.targetLowPrice,
    };
  };

  return (
    <Card className="rounded-2xl border-2 border-red-400">
      <CardContent className="py-6 space-y-6">
        <div>
          <Label htmlFor="ticker" className="mb-2 block">
            종목 코드 검색 (예: AAPL)
          </Label>
          <Input
            id="ticker"
            placeholder="AAPL"
            className="bg-neutral-100"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                fetchData('companyInfo');
              }
            }}
          />
        </div>
        <div className="flex gap-2 items-center justify-between px-5 flex-wrap">
          <Button
            variant="outline"
            className={
              activeSection === 'companyInfo'
                ? 'bg-foreground text-background font-bold'
                : ''
            }
            onClick={() => fetchData('companyInfo')}
            disabled={loading}
          >
            회사 기본 정보
          </Button>
          <Button
            variant="outline"
            className={
              activeSection === 'financialSummary'
                ? 'bg-foreground text-background font-bold'
                : ''
            }
            onClick={() => fetchData('financialSummary')}
            disabled={loading}
          >
            재무 요약
          </Button>
          <Button
            variant="outline"
            className={
              activeSection === 'officerSummary'
                ? 'bg-foreground text-background font-bold'
                : ''
            }
            onClick={() => fetchData('officerSummary')}
            disabled={loading}
          >
            임원 요약
          </Button>
          <Button
            variant="outline"
            className={
              activeSection === 'investmentIndicators'
                ? 'bg-foreground text-background font-bold'
                : ''
            }
            onClick={() => fetchData('investmentIndicators')}
            disabled={loading}
          >
            투자 지표
          </Button>
          <Button
            variant="outline"
            className={
              activeSection === 'longTermMarketInfo'
                ? 'bg-foreground text-background font-bold'
                : ''
            }
            onClick={() => fetchData('longTermMarketInfo')}
            disabled={loading}
          >
            장기시장 정보
          </Button>
          <Button
            variant="destructive"
            className={
              activeSection === 'analystOpinion'
                ? 'bg-destructive-foreground text-destructive border-1 font-bold'
                : ''
            }
            onClick={() => fetchData('analystOpinion')}
            disabled={loading}
          >
            분석가 의견
          </Button>
        </div>

        {/* 데이터 표시 영역 */}
        <div className="mt-6">
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-4 w-[300px]" />
              <Skeleton className="h-4 w-[150px]" />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <Terminal className="h-4 w-4" />
              <AlertTitle>오류 발생</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 회사 기본 정보 */}
          {activeSection === 'companyInfo' &&
            stockInfo &&
            !loading &&
            !error && (
              <Card className="mt-4 border-l-4 border-blue-500">
                <CardHeader>
                  <CardTitle>
                    {stockInfo.longName} ({stockInfo.symbol}) - 회사 기본 정보
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p>
                    <strong>산업:</strong> {stockInfo.industry}
                  </p>
                  <p>
                    <strong>섹터:</strong> {stockInfo.sector}
                  </p>
                  <p>
                    <strong>웹사이트:</strong>{' '}
                    <a
                      href={stockInfo.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      {stockInfo.website}
                    </a>
                  </p>
                  <p>
                    <strong>주소:</strong> {stockInfo.city}, {stockInfo.state},{' '}
                    {stockInfo.country}
                  </p>
                  <p>
                    <strong>총 직원 수:</strong> {stockInfo.fullTimeEmployees}명
                  </p>
                  <h4 className="font-semibold mt-4">기업 요약</h4>
                  <p className="text-neutral-700 whitespace-pre-wrap">
                    {stockInfo.longBusinessSummary}
                  </p>
                </CardContent>
              </Card>
            )}

          {/* 재무 요약 섹션 */}
          {activeSection === 'financialSummary' && !loading && !error ? (
            stockInfo ? (
              <Card className="mt-4 border-l-4 border-purple-500">
                {' '}
                {/* officerSummary와 동일한 형식으로 변경 */}
                <CardHeader>
                  <CardTitle>{stockInfo.symbol} - 재무 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {' '}
                  {/* officerSummary와 동일한 className 적용 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                    <p>
                      <strong>총수익:</strong>{' '}
                      {stockInfo.totalRevenue !== undefined &&
                      stockInfo.totalRevenue !== null
                        ? stockInfo.totalRevenue.toLocaleString()
                        : '-'}{' '}
                    </p>
                    <p>
                      <strong>순이익:</strong>{' '}
                      {stockInfo.netIncomeToCommon !== undefined &&
                      stockInfo.netIncomeToCommon !== null
                        ? stockInfo.netIncomeToCommon.toLocaleString()
                        : '-'}{' '}
                    </p>
                    <p>
                      <strong>영업이익률:</strong>{' '}
                      {stockInfo.operatingMargins !== undefined &&
                      stockInfo.operatingMargins !== null
                        ? `${stockInfo.operatingMargins}`
                        : '-'}
                    </p>
                    <p>
                      <strong>배당률:</strong>{' '}
                      {stockInfo.dividendYield !== undefined &&
                      stockInfo.dividendYield !== null
                        ? `${stockInfo.dividendYield}`
                        : '-'}
                    </p>
                    <p>
                      <strong>EPS:</strong>{' '}
                      {stockInfo.trailingEps !== undefined &&
                      stockInfo.trailingEps !== null
                        ? stockInfo.trailingEps
                        : '-'}
                    </p>
                    <p>
                      <strong>현금 보유:</strong>{' '}
                      {stockInfo.totalCash !== undefined &&
                      stockInfo.totalCash !== null
                        ? stockInfo.totalCash.toLocaleString()
                        : '-'}{' '}
                    </p>
                    <p>
                      <strong>총 부채:</strong>{' '}
                      {stockInfo.totalDebt !== undefined &&
                      stockInfo.totalDebt !== null
                        ? stockInfo.totalDebt.toLocaleString()
                        : '-'}{' '}
                    </p>
                    <p>
                      <strong>부채비율:</strong>{' '}
                      {stockInfo.debtToEquity !== undefined &&
                      stockInfo.debtToEquity !== null
                        ? `${stockInfo.debtToEquity}`
                        : '-'}
                    </p>
                  </div>
                  <p className="text-xs text-right text-gray-600 mt-4">
                    데이터는 Yahoo Finance 기준입니다.
                  </p>
                </CardContent>
              </Card>
            ) : (
              activeSection === 'financialSummary' &&
              !loading &&
              !error && (
                <p className="text-sm text-gray-500 mt-4">
                  선택된 종목의 재무 요약 데이터를 찾을 수 없습니다.
                </p>
              )
            )
          ) : null}
          {/* 임원 요약 */}
          {activeSection === 'officerSummary' &&
            officerInfo &&
            !loading &&
            !error && (
              <Card className="mt-4 border-l-4 border-purple-500">
                <CardHeader>
                  <CardTitle>{symbol.toUpperCase()} - 임원 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {officerInfo.length > 0 ? (
                    <ul className="list-disc pl-5 space-y-1">
                      {officerInfo.map((officer, index) => (
                        <li key={index}>
                          <strong>{officer.name}</strong> - {officer.title} (총
                          보수: {officer.totalPayUSD})
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p>임원 정보를 찾을 수 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}

          {/* 투자 지표 */}
          {activeSection === 'investmentIndicators' &&
            stockInfo &&
            !loading &&
            !error && (
              <Card className="mt-4 border-l-4 border-orange-500">
                <CardHeader>
                  <CardTitle>{symbol.toUpperCase()} - 투자 지표</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {stockInfo ? (
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm"'>
                      <p>
                        <strong>Trailing P/E (후행 PER):</strong>{' '}
                        {getInvestmentIndicators(stockInfo).trailingPE}
                      </p>
                      <p>
                        <strong>Forward P/E (선행 PER):</strong>{' '}
                        {getInvestmentIndicators(stockInfo).forwardPE}
                      </p>
                      <p>
                        <strong>Price to Book (PBR):</strong>{' '}
                        {getInvestmentIndicators(stockInfo).priceToBook}
                      </p>
                      <p>
                        <strong>Return on Equity (ROE):</strong>{' '}
                        {getInvestmentIndicators(stockInfo).returnOnEquity}
                      </p>
                      <p>
                        <strong>Return on Assets (ROA):</strong>{' '}
                        {getInvestmentIndicators(stockInfo).returnOnAssets}
                      </p>
                      <p>
                        <strong>Beta (베타):</strong>{' '}
                        {getInvestmentIndicators(stockInfo).beta}
                      </p>
                      <p>
                        <strong>현재가:</strong> {stockInfo.currentPrice}
                      </p>
                      <p>
                        <strong>이전 종가:</strong> {stockInfo.previousClose}
                      </p>
                      <p>
                        <strong>거래량:</strong> {stockInfo.volume}
                      </p>
                    </div>
                  ) : (
                    <p>투자 지표를 찾을 수 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}

          {/* 장기시장 정보 */}
          {activeSection === 'longTermMarketInfo' &&
            stockInfo &&
            !loading &&
            !error && (
              <Card className="mt-4 border-l-4 border-teal-500">
                <CardHeader>
                  <CardTitle>{symbol.toUpperCase()} - 장기시장 정보</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {stockInfo ? (
                    <>
                      <p>
                        <strong>52주 최고가:</strong>{' '}
                        {getLongTermMarketInfo(stockInfo).fiftyTwoWeekHigh}
                      </p>
                      <p>
                        <strong>52주 최저가:</strong>{' '}
                        {getLongTermMarketInfo(stockInfo).fiftyTwoWeekLow}
                      </p>
                      <p>
                        <strong>시가총액:</strong>{' '}
                        {getLongTermMarketInfo(stockInfo).marketCap}
                      </p>
                      <p>
                        <strong>발행 주식 수:</strong>{' '}
                        {getLongTermMarketInfo(stockInfo).sharesOutstanding}
                      </p>
                    </>
                  ) : (
                    <p>장기시장 정보를 찾을 수 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}

          {/* 분석가 의견 */}
          {activeSection === 'analystOpinion' &&
            stockInfo &&
            !loading &&
            !error && (
              <Card className="mt-4 border-l-4 border-red-500">
                <CardHeader>
                  <CardTitle>{symbol.toUpperCase()} - 분석가 의견</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  {stockInfo ? (
                    <>
                      <p>
                        <strong>추천 평균:</strong>{' '}
                        {getAnalystOpinion(stockInfo).recommendationMean} (
                        {getAnalystOpinion(stockInfo).recommendationKey})
                      </p>
                      <p>
                        <strong>분석가 수:</strong>{' '}
                        {getAnalystOpinion(stockInfo).numberOfAnalystOpinions}명
                      </p>
                      <p>
                        <strong>목표 주가 (평균):</strong>{' '}
                        {getAnalystOpinion(stockInfo).targetMeanPrice}
                      </p>
                      <p>
                        <strong>목표 주가 (최고):</strong>{' '}
                        {getAnalystOpinion(stockInfo).targetHighPrice}
                      </p>
                      <p>
                        <strong>목표 주가 (최저):</strong>{' '}
                        {getAnalystOpinion(stockInfo).targetLowPrice}
                      </p>
                    </>
                  ) : (
                    <p>분석가 의견을 찾을 수 없습니다.</p>
                  )}
                </CardContent>
              </Card>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
