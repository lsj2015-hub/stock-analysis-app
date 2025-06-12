# app/schemas.py
from pydantic import BaseModel, Field, HttpUrl
from typing import List, Optional

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
    total_pay_usd: str = Field(..., alias="totalPayUSD")

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
