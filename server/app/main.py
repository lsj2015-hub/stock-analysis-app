from fastapi import FastAPI, HTTPException, Query, Depends, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.concurrency import run_in_threadpool
from cachetools import TTLCache
import openai
import httpx
import logging

# --- 내부 모듈 임포트 ---
from .config import Settings
from .schemas import (
    TranslationRequest, TranslationResponse, OfficersResponse,
    FinancialStatementResponse, PriceHistoryResponse, NewsResponse,
    AIChatRequest, AIChatResponse, StockProfile, FinancialSummary, 
    InvestmentMetrics, MarketData, AnalystRecommendations
)
from .services.yahoo_finance import YahooFinanceService
from .services.news import NewsService
from .services.translation import TranslationService
from .services.llm import LLMService
from .core import formatting

# 로거 설정 (print 대신 사용하면 더 체계적인 로깅이 가능합니다)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# --- ✅ 애플리케이션 및 서비스 인스턴스 생성 ---
# 앱이 시작될 때 단 한 번만 실행되어 객체들이 생성됩니다.
settings = Settings()
app = FastAPI(
    title="My Stock App API",
    version="2.0.0",
    description="기업 정보 조회, 재무제표, AI 분석 기능을 제공하는 API입니다."
)

yfs_service = YahooFinanceService()
news_service = NewsService()
translation_service = TranslationService()
llm_service = LLMService(settings) # 설정 객체를 주입하여 생성

# 환율 정보 캐시 (1시간 TTL)
exchange_rate_cache = TTLCache(maxsize=1, ttl=settings.CACHE_TTL_SECONDS)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 예외 핸들러
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    HTTPException 외의 처리되지 않은 모든 예외를 처리합니다.
    서버가 죽는 것을 방지하고 일관된 오류 응답을 반환합니다.
    """
    logger.error(f"처리되지 않은 예외 발생: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "서버 내부에서 예상치 못한 오류가 발생했습니다."},
    )

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """
    HTTPException이 발생했을 때 로그를 남깁니다.
    """
    logger.warning(f"HTTP 예외 발생 (클라이언트 오류): Status Code={exc.status_code}, Detail='{exc.detail}'")
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=exc.headers,
    )

# --- ✅ 의존성 주입 함수 ---
def get_settings() -> Settings:
    return settings

def get_yahoo_finance_service() -> YahooFinanceService:
    return yfs_service

def get_news_service() -> NewsService:
    return news_service

def get_translation_service() -> TranslationService:
    return translation_service

def get_llm_service() -> LLMService:
    return llm_service

# --- 환율 조회 의존성 함수 ---
async def get_exchange_rate(settings: Settings = Depends(get_settings)) -> float:
    if 'rate' in exchange_rate_cache:
        return exchange_rate_cache['rate']
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(settings.EXCHANGE_RATE_API_URL, params={"from": "USD", "to": "KRW"})
            response.raise_for_status()
            rate = float(response.json()["rates"]["KRW"])
            exchange_rate_cache['rate'] = rate
            return rate
    except Exception as e:
        logger.error(f"환율 정보 조회 실패: {e}", exc_info=True)
        return settings.DEFAULT_KRW_RATE

# --- 공통 의존성: yfinance 정보 조회 ---
async def get_yfinance_info(
    symbol: str,
    yfs: YahooFinanceService = Depends(get_yahoo_finance_service)
) -> dict:
    info = await run_in_threadpool(yfs.get_stock_info, symbol.upper())
    if not info:
        raise HTTPException(status_code=404, detail=f"'{symbol.upper()}'에 대한 기업 정보를 찾을 수 없습니다.")
    return info

# --- ‼️ API 엔드포인트 코드는 변경할 필요 없습니다. ---
@app.get("/", tags=["Root"])
def read_root():
    return {"message": "Stock App API v2.0.0"}

# ✨ 회사 기본 정보 조회
@app.get("/api/stock/{symbol}/profile", response_model=StockProfile, tags=["Stock Info"])
async def get_stock_profile(
    info: dict = Depends(get_yfinance_info),
    ts: TranslationService = Depends(get_translation_service)
):
    summary = info.get('longBusinessSummary', '')
    summary_kr = await run_in_threadpool(ts.translate_to_korean, summary)
    return formatting.format_stock_profile(info, summary_kr)

# ✨ 재무 요약 정보 조회
@app.get("/api/stock/{symbol}/financial-summary", response_model=FinancialSummary, tags=["Stock Info"])
async def get_financial_summary(
    info: dict = Depends(get_yfinance_info),
    rate: float = Depends(get_exchange_rate)
):
    return formatting.format_financial_summary(info, rate)

# ✨ 투자 지표 조회 
@app.get("/api/stock/{symbol}/metrics", response_model=InvestmentMetrics, tags=["Stock Info"])
async def get_investment_metrics(info: dict = Depends(get_yfinance_info)):
    return formatting.format_investment_metrics(info)

# ✨ 주가/시장 정보 조회
@app.get("/api/stock/{symbol}/market-data", response_model=MarketData, tags=["Stock Info"])
async def get_market_data(
    info: dict = Depends(get_yfinance_info),
    rate: float = Depends(get_exchange_rate)
):
    return formatting.format_market_data(info, rate)

# ✨ 분석가 의견 조회
@app.get("/api/stock/{symbol}/recommendations", response_model=AnalystRecommendations, tags=["Stock Info"])
async def get_analyst_recommendations(info: dict = Depends(get_yfinance_info)):
    return formatting.format_analyst_recommendations(info)

@app.get("/api/stock/{symbol}/officers", response_model=OfficersResponse, tags=["Stock Details"])
async def get_stock_officers(
    symbol: str,
    yfs: YahooFinanceService = Depends(get_yahoo_finance_service),
    rate: float = Depends(get_exchange_rate)
):
    officers_raw = await run_in_threadpool(yfs.get_officers, symbol.upper())
    
    if officers_raw is None:
         # 서비스 단에서 None을 반환하는 경우는 이미 로깅되었으므로 여기선 바로 반환
        return {"officers": []}
    if not officers_raw:
        logger.info(f"'{symbol.upper()}'에 대한 임원 정보가 비어있습니다.")
        return {"officers": []}

    top_officers = sorted(officers_raw, key=lambda x: x.get('totalPay', 0), reverse=True)[:5]
    
    formatted_officers = [
        {"name": o.get("name", ""), "title": o.get("title", ""), "totalPayUSD": formatting.format_currency(o.get("totalPay"), rate)}
        for o in top_officers
    ]
    return {"officers": formatted_officers}

# ✨ 재무제표 조회 (income, balance, cashflow)
@app.get("/api/stock/{symbol}/financials/{statement_type}", response_model=FinancialStatementResponse, tags=["Stock Details"])
async def get_financial_statement(
    symbol: str, statement_type: str,
    yfs: YahooFinanceService = Depends(get_yahoo_finance_service)
):

    if statement_type not in ["income", "balance", "cashflow"]:
        raise HTTPException(status_code=400, detail="잘못된 재무제표 유형입니다. 'income', 'balance', 'cashflow' 중 하나여야 합니다.")

    fin_data = await run_in_threadpool(yfs.get_financials, symbol.upper())
    if not fin_data:
        raise HTTPException(status_code=404, detail=f"'{symbol.upper()}'에 대한 재무 데이터를 가져오지 못했습니다.")
    
    df_raw = fin_data.get(statement_type)

    if df_raw is None or df_raw.empty:
        raise HTTPException(status_code=404, detail=f"'{symbol.upper()}'에 대한 {statement_type} 데이터를 찾을 수 없습니다.")
        
    return formatting.format_financial_statement_response(df_raw, statement_type)

# ✨ 기간별 주가 히스토리 조회
@app.get("/api/stock/{symbol}/history", response_model=PriceHistoryResponse, tags=["Stock Details"])
async def get_stock_history(
    symbol: str, 
    start_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"), 
    end_date: str = Query(..., pattern=r"^\d{4}-\d{2}-\d{2}$"),
    yfs: YahooFinanceService = Depends(get_yahoo_finance_service)
):

    df_raw, adjusted_end = await run_in_threadpool(yfs.get_price_history, symbol.upper(), start_date, end_date)
    if df_raw is None or df_raw.empty:
        raise HTTPException(status_code=404, detail=f"해당 기간의 주가 데이터를 찾을 수 없습니다.")
    
    display_df = formatting.process_price_dataframe(df_raw)
    
    return {
        "symbol": symbol.upper(),
        "startDate": start_date,
        "endDate": adjusted_end,
        "data": display_df.to_dict("records")
    }

@app.get("/api/stock/{symbol}/news", response_model=NewsResponse, tags=["Stock Details"])
async def get_yahoo_rss_news(
    symbol: str, limit: int = Query(10, ge=1, le=50),
    ns: NewsService = Depends(get_news_service)
):
    """Yahoo Finance RSS 뉴스 조회"""
    news_list = await ns.get_yahoo_rss_news(symbol.upper(), limit)
    if not news_list:
        logger.warning(f"'{symbol.upper()}'에 대한 뉴스를 가져오지 못했습니다.")
    return {"news": news_list}

# --- 유틸리티 및 AI 엔드포인트 ---
@app.post("/api/util/translate", response_model=TranslationResponse, tags=["Utilities"])
async def translate_text(
    req: TranslationRequest,
    ts: TranslationService = Depends(get_translation_service)
):
    """텍스트 번역"""
    translated_text = await run_in_threadpool(ts.translate_to_korean, req.text)
    return {"translated_text": translated_text}

@app.post("/api/ai/chat", response_model=AIChatResponse, tags=["AI"])
async def chat_with_ai(
    req: AIChatRequest,
    llm: LLMService = Depends(get_llm_service)
):
    """LLM 기반 주식 분석 Q&A"""
    try:
        response = await llm.get_qa_response(
            symbol=req.symbol,
            user_question=req.question,
            financial_data=req.financial_data,
            history_data=req.history_data,
            news_data=req.news_data
        )
        return {"response": response}
    except openai.APIError as e:
        logger.error(f"OpenAI API 오류 발생: {e.status_code} - {e.message}", exc_info=True)
        # APIError에서 받은 상태 코드와 메시지를 그대로 클라이언트에게 전달
        raise HTTPException(
            status_code=e.status_code or 503, 
            detail=f"AI 서비스에 문제가 발생했습니다: {e.message}"
        )