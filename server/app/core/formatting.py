# app/core/formatting.py
import pandas as pd
from typing import Dict, List, Any

from .constants import INCOME_KR, BALANCE_KR, CASHFLOW_KR

def _classify_unit(value: float) -> tuple[str, float]:
    """금액 단위를 조, 억 등으로 분류"""
    if value >= 1_000_000_000_000:
        return "조", value / 1_000_000_000_000
    if value >= 100_000_000:
        return "억", value / 100_000_000
    elif value >= 1_000_000:
        return "백만", value / 1_000_000
    else:
        return "", value

def format_currency(amount: float, rate: float) -> str:
    """USD 금액을 원화와 병기하여 포맷팅"""
    if amount is None or amount == 0:
        return "-"
    
    usd_unit, usd_value = _classify_unit(amount)
    usd_fmt = f"${usd_value:,.2f}{usd_unit}"
    
    krw_total = amount * rate
    krw_unit, krw_value = _classify_unit(krw_total)
    krw_fmt = f"₩{krw_value:,.2f}{krw_unit}"
    
    return f"{usd_fmt} ({krw_fmt})"

def format_stock_info_response(info: dict, rate: float, summary_kr: str) -> dict:
    """주식 기본 정보를 API 응답 포맷으로 변환"""
    return {
        "symbol": info.get('symbol', 'N/A').upper(),
        "longName": info.get('longName', '정보 없음'),
        "industry": info.get('industry', '정보 없음'),
        "sector": info.get('sector', '정보 없음'),
        "longBusinessSummary": summary_kr,
        "website": info.get('website'),
        "fullTimeEmployees": f"{info.get('fullTimeEmployees', 0):,}",
        "totalRevenue": format_currency(info.get('totalRevenue'), rate),
        "netIncomeToCommon": format_currency(info.get('netIncomeToCommon'), rate),
        "marketCap": format_currency(info.get('marketCap'), rate),
    }

def format_stock_profile(info: dict, summary_kr: str) -> dict:
    """회사 기본 정보를 API 응답 포맷으로 변환"""
    return {
        "symbol": info.get('symbol', 'N/A').upper(),
        "longName": info.get('longName', '정보 없음'),
        "industry": info.get('industry', '정보 없음'),
        "sector": info.get('sector', '정보 없음'),
        "longBusinessSummary": summary_kr,
        "city": info.get('city', ''),
        "state": info.get('state', ''),
        "country": info.get('country', ''),
        "website": info.get('website'),
        "fullTimeEmployees": f"{info.get('fullTimeEmployees', 0):,}" if info.get('fullTimeEmployees') else "정보 없음",
    }

def format_financial_summary(info: dict, rate: float) -> dict:
    """재무 요약 정보를 API 응답 포맷으로 변환"""
    return {
        "totalRevenue": format_currency(info.get('totalRevenue'), rate),
        "netIncomeToCommon": format_currency(info.get('netIncomeToCommon'), rate),
        "operatingMargins": f"{info.get('operatingMargins', 0) * 100:.2f}%",
        "dividendYield": f"{info.get('dividendYield', 0) * 100:.2f}%",
        "trailingEps": f"{info.get('trailingEps', 0):.2f}",
        "totalCash": format_currency(info.get('totalCash'), rate),
        "totalDebt": format_currency(info.get('totalDebt'), rate),
        "debtToEquity": f"{info.get('debtToEquity', 0):.2f}%" if info.get('debtToEquity') else "N/A",
    }
    
def format_investment_metrics(info: dict) -> dict:
    """투자 지표를 API 응답 포맷으로 변환"""
    return {
        "trailingPE": f"{info.get('trailingPE', 0):.2f}",
        "forwardPE": f"{info.get('forwardPE', 0):.2f}",
        "priceToBook": f"{info.get('priceToBook', 0):.2f}",
        "returnOnEquity": f"{info.get('returnOnEquity', 0) * 100:.2f}%",
        "returnOnAssets": f"{info.get('returnOnAssets', 0) * 100:.2f}%",
        "beta": f"{info.get('beta', 0):.2f}",
    }

def format_market_data(info: dict, rate: float) -> dict:
    """주가/시장 정보를 API 응답 포맷으로 변환"""
    return {
        "currentPrice": f"${info.get('currentPrice', 0):.2f}",
        "previousClose": f"${info.get('previousClose', 0):.2f}",
        "dayHigh": f"${info.get('dayHigh', 0):.2f}",
        "dayLow": f"${info.get('dayLow', 0):.2f}",
        "fiftyTwoWeekHigh": f"${info.get('fiftyTwoWeekHigh', 0):.2f}",
        "fiftyTwoWeekLow": f"${info.get('fiftyTwoWeekLow', 0):.2f}",
        "marketCap": format_currency(info.get('marketCap'), rate),
        "sharesOutstanding": f"{info.get('sharesOutstanding', 0):,}주",
        "volume": f"{info.get('volume', 0):,}주",
    }
    
def format_analyst_recommendations(info: dict) -> dict:
    """분석가 의견을 API 응답 포맷으로 변환"""
    return {
        "recommendationMean": info.get('recommendationMean', 0),
        "recommendationKey": info.get('recommendationKey', 'N/A'),
        "numberOfAnalystOpinions": info.get('numberOfAnalystOpinions', 0),
        "targetMeanPrice": f"${info.get('targetMeanPrice', 0):.2f}",
        "targetHighPrice": f"${info.get('targetHighPrice', 0):.2f}",
        "targetLowPrice": f"${info.get('targetLowPrice', 0):.2f}",
    }

def format_financial_statement_response(df_raw: pd.DataFrame, statement_type: str) -> dict:
    """재무제표를 API 응답 포맷으로 변환"""
    trans_map = {"income": INCOME_KR, "balance": BALANCE_KR, "cashflow": CASHFLOW_KR}.get(statement_type, {})
    
    years = [str(y.year) for y in df_raw.columns]
    formatted_rows = []
    
    for k, v in trans_map.items():
        if k in df_raw.index:
            row_data = {"item": v}
            for col in df_raw.columns:
                val = df_raw.loc[k, col]
                if pd.notnull(val):
                    unit, value = _classify_unit(abs(val))
                    formatted = f"${'-' if val < 0 else ''}{value:,.2f}{unit}"
                    row_data[str(col.year)] = formatted
                else:
                    row_data[str(col.year)] = '-'
            formatted_rows.append(row_data)
            
    return {"years": years, "data": formatted_rows}

def process_price_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """주가 데이터프레임을 API 응답에 맞게 처리"""
    if df.empty:
        return pd.DataFrame()
    
    df = df.reset_index()
    df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
    df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
    
    final_cols = ["Date", "Close", "High", "Low", "Open", "Volume"]
    return df[[c for c in final_cols if c in df.columns]]