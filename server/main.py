from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
import os
from datetime import datetime
import pandas as pd
from starlette.concurrency import run_in_threadpool
import openai
from pydantic import BaseModel

from data_manager import YahooFinanceDataManager
from utils import get_today_usd_to_krw_rate, format_currency, classify_unit, translate_to_korean
from constants import INCOME_KR, BALANCE_KR, CASHFLOW_KR

# .env 파일 로드
load_dotenv()

app = FastAPI()

# CORS 설정 (Next.js 프론트엔드에서 접근 허용)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 실제 배포 시에는 Next.js 앱의 도메인으로 제한
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI API 키 설정 (환경 변수에서 불러옴)
openai.api_key = os.getenv("OPENAI_API_KEY")
# New API 키 설정 (환경 변수에서 불러옴)
MARKETAUX_API_KEY = os.getenv("MARKETAUX_API_KEY")  

# 데이터 매니저 초기화 (애플리케이션 시작 시 한 번만)
data_manager = YahooFinanceDataManager()

# --- ★ 번역 요청 본문을 위한 Pydantic 모델 정의 ---
class TranslationRequest(BaseModel):
    text: str

@app.get("/")
async def read_root():
    return {"message": "기업 정보 API에 오신 것을 환영합니다! /docs 에서 사용 가능한 API를 확인하세요."}

# ⭐ 종목 기본 정보
@app.get("/api/stock/info/{symbol}")
async def get_stock_info(symbol: str):
    """
    특정 종목의 기본 정보를 조회합니다.
    """
    # data_manager.get_info()는 blocking I/O이므로 run_in_threadpool 사용
    info = await run_in_threadpool(data_manager.get_info, symbol.upper())
    
    if not info:
        raise HTTPException(status_code=404, detail=f"'{symbol}'에 대한 기업 정보를 찾을 수 없습니다.")
    
    # get_today_usd_to_krw_rate()는 blocking I/O이므로 run_in_threadpool 사용
    rate = await run_in_threadpool(get_today_usd_to_krw_rate)

    # longBusinessSummary 필드만 번역
    long_business_summary = info.get('longBusinessSummary', '')
    translated_long_business_summary = await run_in_threadpool(translate_to_korean, long_business_summary) if long_business_summary else ''

    # industry와 sector는 원본 텍스트 사용
    industry = info.get('industry', '정보 없음')
    sector = info.get('sector', '정보 없음')


    # 필요에 따라 정보 포맷팅 (app.py의 로직을 따름)
    formatted_info = {
        "symbol": symbol.upper(),
        "longName": info.get('longName', '정보 없음'),
        "industry": industry, # 번역하지 않음
        "sector": sector,     # 번역하지 않음
        "longBusinessSummary": translated_long_business_summary, # 번역된 기업 요약
        "city": info.get('city', ''),
        "state": info.get('state', ''),
        "country": info.get('country', ''),
        "website": info.get('website', ''),
        "fullTimeEmployees": f"{info.get('fullTimeEmployees', 0):,}" if isinstance(info.get('fullTimeEmployees'), int) else "정보 없음",
        # 재무 요약 정보
        "totalRevenue": format_currency(info.get('totalRevenue'), "USD", rate),
        "netIncomeToCommon": format_currency(info.get('netIncomeToCommon'), "USD", rate),
        "operatingMargins": f"{info.get('operatingMargins', 0) * 100:.2f}%",
        "dividendYield": f"{info.get('dividendYield', 0) * 100:.2f}%",
        "trailingEps": f"{info.get('trailingEps', 0):.2f}",
        "totalCash": format_currency(info.get('totalCash'), "USD", rate),
        "totalDebt": format_currency(info.get('totalDebt'), "USD", rate),
        "debtToEquity": f"{info.get('debtToEquity', 0):.2f}%",
        # 투자 지표
        "trailingPE": f"{info.get('trailingPE', 0):.2f}",
        "forwardPE": f"{info.get('forwardPE', 0):.2f}",
        "priceToBook": f"{info.get('priceToBook', 0):.2f}",
        "returnOnEquity": f"{info.get('returnOnEquity', 0) * 100:.2f}%",
        "returnOnAssets": f"{info.get('returnOnAssets', 0) * 100:.2f}%",
        "beta": f"{info.get('beta', 0):.2f}",
        # 주가/시장 정보
        "currentPrice": f"${info.get('currentPrice', 0):.2f}",
        "previousClose": f"${info.get('previousClose', 0):.2f}",
        "dayHigh": f"${info.get('dayHigh', 0):.2f}",
        "dayLow": f"${info.get('dayLow', 0):.2f}",
        "fiftyTwoWeekHigh": f"${info.get('fiftyTwoWeekHigh', 0):.2f}",
        "fiftyTwoWeekLow": f"${info.get('fiftyTwoWeekLow', 0):.2f}",
        "marketCap": format_currency(info.get('marketCap'), "USD", rate),
        "sharesOutstanding": f"{info.get('sharesOutstanding', 0):,}주",
        "volume": f"{info.get('volume', 0):,}주",
        # 분석가 의견
        "recommendationMean": info.get('recommendationMean', 'N/A'),
        "recommendationKey": info.get('recommendationKey', 'N/A'),
        "numberOfAnalystOpinions": info.get('numberOfAnalystOpinions', 'N/A'),
        "targetMeanPrice": f"${info.get('targetMeanPrice', 0):.2f}",
        "targetHighPrice": f"${info.get('targetHighPrice', 0):.2f}",
        "targetLowPrice": f"${info.get('targetLowPrice', 0):.2f}",
    }
    return formatted_info

# ⭐ 임원 정보 가져오기
@app.get("/api/stock/officers/{symbol}")
async def get_stock_officers(symbol: str):
    """
    특정 종목의 임원 정보를 조회합니다 (상위 5명).
    """
    info = await run_in_threadpool(data_manager.get_info, symbol.upper())
    if not info:
        raise HTTPException(status_code=404, detail=f"'{symbol}'에 대한 기업 정보를 찾을 수 없습니다.")
    
    officers = info.get("companyOfficers", [])
    if not officers:
        return {"message": "임원 정보가 없습니다.", "officers": []}
    
    rate = await run_in_threadpool(get_today_usd_to_krw_rate)
    top_officers = sorted(officers, key=lambda x: x.get('totalPay', 0), reverse=True)[:5]
    
    formatted_officers = []
    for officer in top_officers:
        # 임원 직책은 번역하지 않음
        title = officer.get("title", "")
        # translated_title = await run_in_threadpool(translate_to_korean, title) if title else '' # 번역 제거
        formatted_officers.append({
            "name": officer.get("name", ""),
            "title": title, # 원본 직책
            "totalPayUSD": format_currency(officer.get("totalPay", 0), currency="USD", rate=rate)
        })
    return {"officers": formatted_officers}

# ⭐ Financial Statement
@app.get("/api/stock/financials/{symbol}/{statement_type}")
async def get_financial_statement(symbol: str, statement_type: str):
    """
    특정 종목의 재무제표를 조회합니다 (income, balance, cashflow).
    """
    fin_data = await run_in_threadpool(data_manager.get_financials, symbol.upper())
    if not fin_data:
        raise HTTPException(status_code=404, detail=f"'{symbol}'에 대한 재무제표 데이터를 찾을 수 없습니다.")

    df_raw = None
    trans_map = {}
    if statement_type == "income":
        df_raw = fin_data.get('income')
        trans_map = INCOME_KR
    elif statement_type == "balance":
        df_raw = fin_data.get('balance')
        trans_map = BALANCE_KR
    elif statement_type == "cashflow":
        df_raw = fin_data.get('cashflow')
        trans_map = CASHFLOW_KR
    else:
        raise HTTPException(status_code=400, detail="유효하지 않은 재무제표 유형입니다. (income, balance, cashflow 중 하나)")

    if df_raw is None or df_raw.empty:
        raise HTTPException(status_code=404, detail=f"'{symbol}'의 {statement_type} 데이터를 찾을 수 없습니다.")

    years = [str(y.year) for y in df_raw.columns]
    formatted_rows = []
    for k, v in trans_map.items():
        if k in df_raw.index:
            row_data = {"item": v}
            for col in df_raw.columns:
                val = df_raw.loc[k, col]
                if pd.notnull(val):
                    unit, value = classify_unit(abs(val))
                    formatted = f"${'-' if val < 0 else ''}{value:,.2f}{unit}"
                    row_data[str(col.year)] = formatted
                else:
                    row_data[str(col.year)] = '-'
            formatted_rows.append(row_data)
    
    return {"years": years, "data": formatted_rows}

# ⭐ 주가 히스토리 
@app.get("/api/stock/history/{symbol}")
async def get_stock_history(
    symbol: str,
    start_date: str = Query(..., description="조회 시작일 (YYYY-MM-DD)"),
    end_date: str = Query(..., description="조회 종료일 (YYYY-MM-DD)")
):
    """
    특정 종목의 기간별 주가 히스토리 데이터를 조회합니다.
    """
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date()
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="날짜 형식이 올바르지 않습니다. (YYYY-MM-DD) 형식을 사용해주세요.")

    if start_dt >= end_dt:
        raise HTTPException(status_code=400, detail="시작일은 종료일보다 앞서야 합니다.")

    df_raw, adjusted_end = await run_in_threadpool(
        data_manager.get_price_data_adjusted,
        symbol.upper(),
        start_dt.strftime("%Y-%m-%d"),
        end_dt.strftime("%Y-%m-%d")
    )

    if df_raw is None or df_raw.empty:
        raise HTTPException(status_code=404, detail="지정된 기간 내에 해당 종목의 주가 데이터를 찾을 수 없습니다. 종목 코드 또는 기간을 확인해주세요.")
    
    display_df = data_manager.process_price_df(df_raw.copy())

    return {
        "symbol": symbol.upper(),
        "startDate": start_date,
        "endDate": adjusted_end,
        "data": display_df.to_dict(orient="records")
    }

# ⭐ OpenAI 챗봇
@app.post("/api/chat-with-ai")
async def chat_with_ai(request: Request):
    data = await request.json()
    symbol = data.get('symbol', '')
    user_question = data.get('question')
    financial_data = data.get('financialData', '재무 데이터 없음')
    history_data = data.get('historyData', '주가 히스토리 데이터 없음')
    # newsData를 받을 때, 기본값을 빈 리스트로 설정
    # 만약 newsData가 리스트가 아니라면, 빈 리스트로 강제 변환
    news_data = data.get('newsData', [])

    # 프롬프트 구성
    # 프론트엔드에서 이미 JSON.stringify로 문자열화하여 보냈으므로, 별도의 json.dumps 필요 없음.
    # 만약 AI가 파싱하기 어려운 형식이라면 여기서 다시 한번 json.loads 후 예쁘게 포맷팅 가능.
    # 현재는 프론트에서 받은 그대로 사용
    system_message_content = f"""
    당신은 사용자에게 기업의 재무 데이터와 주가 히스토리 데이터를 기반으로 질문에 답변하는 금융 분석 AI입니다.
    사용자의 질문에 정확하고 간결하게 답변하세요.
    제공된 데이터 범위 내에서만 답변하고, 없는 정보는 없다고 명확히 언급하세요.
    주어진 데이터를 참고하여 분석적이고 통찰력 있는 답변을 제공하세요.
    날짜는 YYYY-MM-DD 형식으로 언급합니다.

    --- 제공된 데이터 ---
    현재 분석 대상 종목 코드: {symbol}

    재무 데이터 (Financial Data):
    {financial_data}
    -------------------

    주가 히스토리 데이터 (Stock History Data):
    {history_data}
    -------------------

    뉴스 데이터 (News Data):
    {news_data}
    -------------------
    
    """

    messages = [
        {"role": "system", "content": system_message_content},
        {"role": "user", "content": user_question}
    ]

    try:
        response = await run_in_threadpool(
            openai.chat.completions.create, # 비동기로 호출하기 위해 run_in_threadpool 사용
            model="gpt-4o", # 또는 gpt-3.5-turbo, gpt-4 등
            messages=messages,
            max_tokens=500, # 응답 최대 토큰 수
            temperature=0.7 # 창의성 조절 (0.0~1.0)
        )
        ai_response = response.choices[0].message.content
        return JSONResponse(content={"response": ai_response}, status_code=200)

    except openai.APIError as e:
        print(f"OpenAI API Error: {e}")
        raise HTTPException(status_code=e.status_code if hasattr(e, 'status_code') else 500, detail=f"OpenAI API 오류: {str(e)}")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"서버 오류가 발생했습니다: {str(e)}")
    
# ⭐ Yahoo Finance RSS 뉴스 헤드라인
@app.get("/api/stock/yahoo-rss-news/{symbol}")
async def get_yahoo_finance_rss_news(symbol: str, limit: int = Query(10, ge=1, le=50)):
    """
    Yahoo Finance RSS 피드에서 특정 종목의 최신 뉴스를 조회합니다.
    이 엔드포인트는 Yahoo Finance RSS가 제공하는 최신 뉴스를 가져오며,
    별도의 날짜 필터링(예: 최근 N일)은 서버에서 수행하지 않습니다.
    """
    try:
        news_list = await run_in_threadpool(
            data_manager.get_yahoo_finance_rss_news, # 수정된 함수 호출
            symbol.upper(),
            limit=limit
        )
        return {"news": news_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Yahoo Finance RSS 뉴스를 가져오는 중 오류 발생: {str(e)}")
    
# ⭐ News 헤드라인 번역
@app.post("/api/translate")
async def translate_text(request: TranslationRequest):
    """
    요청 본문으로 받은 텍스트를 한국어로 번역합니다.
    """
    try:
        # utils.py에 있는 번역 함수를 비동기로 실행
        translated_text = await run_in_threadpool(translate_to_korean, request.text)
        return {"translatedText": translated_text}
    except Exception as e:
        # 번역 중 예상치 못한 오류 발생 시
        raise HTTPException(status_code=500, detail=f"번역 서버 오류: {str(e)}")
    
