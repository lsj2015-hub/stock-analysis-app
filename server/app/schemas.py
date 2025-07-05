# app/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional, Dict, Any

class TranslationRequest(BaseModel):
    text: str

class TranslationResponse(BaseModel):
    translated_text: str = Field(..., description="번역된 텍스트")

class StockInfo(BaseModel):
    symbol: str
    long_name: str = Field(..., alias="longName")
    industry: str
    sector: str
    long_business_summary: str = Field(..., alias="longBusinessSummary")
    website: Optional[HttpUrl]
    full_time_employees: str = Field(..., alias="fullTimeEmployees")
    total_revenue: str = Field(..., alias="totalRevenue")
    net_income_to_common: str = Field(..., alias="netIncomeToCommon")
    market_cap: str = Field(..., alias="marketCap")

class StockProfile(BaseModel):
    symbol: str
    long_name: str = Field(..., alias="longName")
    industry: str
    sector: str
    long_business_summary: str = Field(..., alias="longBusinessSummary")
    city: str
    state: str
    country: str
    website: Optional[HttpUrl]
    full_time_employees: str = Field(..., alias="fullTimeEmployees")

class Officer(BaseModel):
    name: str
    title: str
    totalPay: str

class OfficersResponse(BaseModel):
    officers: List[Officer]

class FinancialSummary(BaseModel):
    total_revenue: str = Field(..., alias="totalRevenue")
    net_income_to_common: str = Field(..., alias="netIncomeToCommon")
    operating_margins: str = Field(..., alias="operatingMargins")
    dividend_yield: str = Field(..., alias="dividendYield")
    trailing_eps: str = Field(..., alias="trailingEps")
    total_cash: str = Field(..., alias="totalCash")
    total_debt: str = Field(..., alias="totalDebt")
    debt_to_equity: str = Field(..., alias="debtToEquity")
    ex_dividend_date: Optional[str] = Field(None, alias="exDividendDate")

class InvestmentMetrics(BaseModel):
    trailing_pe: str = Field(..., alias="trailingPE")
    forward_pe: str = Field(..., alias="forwardPE")
    price_to_book: str = Field(..., alias="priceToBook")
    return_on_equity: str = Field(..., alias="returnOnEquity")
    return_on_assets: str = Field(..., alias="returnOnAssets")
    beta: str

class MarketData(BaseModel):
    current_price: str = Field(..., alias="currentPrice")
    previous_close: str = Field(..., alias="previousClose")
    day_high: str = Field(..., alias="dayHigh")
    day_low: str = Field(..., alias="dayLow")
    fifty_two_week_high: str = Field(..., alias="fiftyTwoWeekHigh")
    fifty_two_week_low: str = Field(..., alias="fiftyTwoWeekLow")
    market_cap: str = Field(..., alias="marketCap")
    shares_outstanding: str = Field(..., alias="sharesOutstanding")
    volume: str

class AnalystRecommendations(BaseModel):
    recommendation_mean: float = Field(..., alias="recommendationMean")
    recommendation_key: str = Field(..., alias="recommendationKey")
    number_of_analyst_opinions: int = Field(..., alias="numberOfAnalystOpinions")
    target_mean_price: str = Field(..., alias="targetMeanPrice")
    target_high_price: str = Field(..., alias="targetHighPrice")
    target_low_price: str = Field(..., alias="targetLowPrice")

class StockOverviewResponse(BaseModel):
    profile: StockProfile
    summary: FinancialSummary
    metrics: InvestmentMetrics
    market_data: MarketData = Field(..., alias="marketData")
    recommendations: AnalystRecommendations
    officers: List[Officer]

class FinancialStatementData(BaseModel):
    item: str
    # 동적 키 (연도)를 허용하기 위해 추가 설정
    class Config:
        extra = "allow"

class FinancialStatementResponse(BaseModel):
    years: List[str]
    data: List[FinancialStatementData]

class PriceHistoryData(BaseModel):
    Date: str
    Close: float
    High: float
    Low: float
    Open: float
    Volume: int

class PriceHistoryResponse(BaseModel):
    symbol: str
    start_date: str = Field(..., alias="startDate")
    end_date: str = Field(..., alias="endDate")
    data: List[PriceHistoryData]

class NewsItem(BaseModel):
    title: str
    url: HttpUrl
    published_date: Optional[str] = Field(None, alias="publishedDate")
    source: str
    summary: str

class NewsResponse(BaseModel):
    news: List[NewsItem]
    
class AIChatRequest(BaseModel):
    symbol: str
    question: str
    financial_data: str = Field(..., alias="financialData")
    history_data: str = Field(..., alias="historyData")
    news_data: List[dict] = Field(..., alias="newsData")

class AIChatResponse(BaseModel):
    response: str

# --- ✅ 섹터 분석 기능에 필요한 스키마 ---
class SectorTicker(BaseModel):
    ticker: str
    name: str

class SectorTickerResponse(BaseModel):
    tickers: List[SectorTicker]

class SectorAnalysisRequest(BaseModel):
    start_date: str
    end_date: str
    tickers: List[str]

class SectorAnalysisDataPoint(BaseModel):
    date: str
    # 동적 키 (섹터 이름)를 허용
    class Config:
        extra = "allow"

class SectorAnalysisResponse(BaseModel):
    data: List[SectorAnalysisDataPoint]

# --- ✅ 성능 분석 기능에 필요한 스키마 ---
class PerformanceAnalysisRequest(BaseModel):
    market: str = Field(..., description="시장 (예: 'NASDAQ', 'KOSPI')")
    start_date: str = Field(..., description="분석 시작일 (YYYY-MM-DD)")
    end_date: str = Field(..., description="분석 종료일 (YYYY-MM-DD)")
    top_n: int = Field(5, ge=1, le=20, description="상위/하위 N개 종목 수")

class StockPerformance(BaseModel):
    ticker: str
    name: str
    performance: float

class PerformanceAnalysisResponse(BaseModel):
    top_performers: List[StockPerformance]
    bottom_performers: List[StockPerformance]

# --- ✅ 주가 비교 분석 기능에 필요한 스키마 ---
class StockComparisonRequest(BaseModel):
    tickers: List[str] = Field(..., description="비교할 주식 티커 리스트")
    start_date: str = Field(..., description="분석 시작일 (YYYY-MM-DD)")
    end_date: str = Field(..., description="분석 종료일 (YYYY-MM-DD)")

class StockComparisonDataPoint(BaseModel):
    date: str
    # 동적 키 (티커 이름)를 허용
    class Config:
        extra = "allow"

class StockComparisonSeries(BaseModel):
    dataKey: str
    name: str
    
class StockComparisonResponse(BaseModel):
    data: List[StockComparisonDataPoint]
    series: List[StockComparisonSeries]

# --- ✅ 투자자별 매매동향 분석 기능에 필요한 스키마 ---
class TradingVolumeRequest(BaseModel):
    start_date: str = Field(..., description="분석 시작일 (YYYYMMDD)")
    end_date: str = Field(..., description="분석 종료일 (YYYYMMDD)")
    ticker: str = Field("KOSPI", description="시장(KOSPI, KOSDAQ) 또는 종목코드")
    detail: bool = Field(False, description="일자별 상세 현황 조회 여부")
    institution_only: bool = Field(False, description="기관 투자자 세부 항목만 조회 여부")

class TradingVolumeData(BaseModel):
    # 동적 키 (날짜 또는 투자자구분)를 허용
    class Config:
        extra = "allow"

class TradingVolumeResponse(BaseModel):
    index_name: str
    data: List[Dict[str, Any]] # ✅ 'any'를 'Any'로 수정

class NetPurchaseRequest(BaseModel):
    start_date: str = Field(..., description="분석 시작일 (YYYYMMDD)")
    end_date: str = Field(..., description="분석 종료일 (YYYYMMDD)")
    market: str = Field(..., description="시장 (KOSPI, KOSDAQ)")
    investor: str = Field(..., description="투자자 구분")

class NetPurchaseData(BaseModel):
    ticker: str
    name: str
    volume: int
    value: int

class NetPurchaseResponse(BaseModel):
    data: List[NetPurchaseData]

# --- 변동성 종목 분석 기능에 필요한 스키마 ---
class FluctuationAnalysisRequest(BaseModel):
    country: str = Field(..., description="분석할 국가 ('KR' 또는 'US')")
    market: str = Field(..., description="분석할 시장 (예: 'KOSPI', 'NASDAQ')")
    start_date: str = Field(..., description="분석 시작일 (YYYY-MM-DD)")
    end_date: str = Field(..., description="분석 종료일 (YYYY-MM-DD)")
    decline_period: int = Field(5, description="하락 기간 (일)")
    decline_rate: float = Field(-20.0, description="하락률 (%)")
    rebound_period: int = Field(20, description="반등 기간 (일)")
    rebound_rate: float = Field(20.0, description="반등률 (%)")

class EventInfo(BaseModel):
    ticker: str
    name: str
    trough_date: str
    trough_price: float
    rebound_date: str
    rebound_price: float
    rebound_performance: float

class FluctuationStockInfo(BaseModel):
    ticker: str
    name: str
    occurrence_count: int
    recent_trough_date: str
    recent_trough_price: float
    recent_rebound_date: str
    recent_rebound_performance: float
    events: List[EventInfo]

class FluctuationAnalysisResponse(BaseModel):
    found_stocks: List[FluctuationStockInfo]