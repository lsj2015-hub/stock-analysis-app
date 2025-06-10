import platform
import matplotlib.pyplot as plt
from deep_translator import GoogleTranslator
import pandas as pd
import requests
import time

# --- 한글 폰트 설정 ---
def set_korean_font():
    """운영체제에 따라 Matplotlib 한글 폰트를 설정합니다."""
    if platform.system() == "Darwin":  # macOS
        plt.rcParams['font.family'] = 'AppleGothic'
    elif platform.system() == "Windows":
        plt.rcParams['font.family'] = 'Malgun Gothic'
    else:  # Linux
        plt.rcParams['font.family'] = 'NanumGothic'
    plt.rcParams['axes.unicode_minus'] = False

def translate_to_korean(text: str) -> str:
    """영문 텍스트를 한글로 번역합니다. 번역 실패 시 오류 메시지를 반환합니다."""
    try:
        return GoogleTranslator(source='auto', target='ko').translate(text)
    except Exception as e:
        return f"(❌ 번역 실패: {e}) " + text
    
# 환율 정보를 캐싱하기 위해 간단한 전역 변수를 사용할 수 있습니다.
# 실제 프로덕션 환경에서는 Redis 등 외부 캐시를 고려해야 합니다.
_cached_usd_to_krw_rate = None
_last_fetch_time = None
_CACHE_DURATION = 3600 # 1시간 (초)

def get_today_usd_to_krw_rate() -> float:
    global _cached_usd_to_krw_rate, _last_fetch_time
    
    current_time = time.time()
    if _cached_usd_to_krw_rate is not None and \
       _last_fetch_time is not None and \
       (current_time - _last_fetch_time) < _CACHE_DURATION:
        return _cached_usd_to_krw_rate

    try:
        url = "https://api.frankfurter.app/latest"
        params = {"from": "USD", "to": "KRW"}
        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()
        data = response.json()
        rate = float(data["rates"]["KRW"])
        _cached_usd_to_krw_rate = rate
        _last_fetch_time = current_time
        return rate
    except Exception as e:
        print(f"Frankfurter 환율 정보를 가져오는 데 실패했습니다: {e}")
        return 1350.0  # 실패시 기본값
    
def classify_unit(value: float) -> tuple[str, float]:
    if value >= 1_000_000_000_000:
        return "조", value / 1_000_000_000_000
    if value >= 100_000_000:
        return "억", value / 100_000_000
    elif value >= 10_000_000:
        return "천만", value / 10_000_000
    elif value >= 1_000_000:
        return "백만", value / 1_000_000
    else:
        return "", value

def format_currency(amount: float, currency: str = "USD", rate: float | None = None) -> str:
    """
    금액을 읽기 쉬운 형식으로 포맷팅하고, USD의 경우 한화(KRW)로 병기합니다.
    '조', '억', '천만', '백만', '원' 단위로 표시합니다.
    """
    if amount is None or amount == 0:
        return "-"

    if currency == "USD":
        # FastAPI 애플리케이션 시작 시 환율을 한 번만 가져오거나 주기적으로 업데이트하는 방식으로 변경 필요
        # 여기서는 호출될 때마다 함수를 호출하도록 유지하되, 내부 캐싱 로직 추가
        if rate is None:
            rate = get_today_usd_to_krw_rate()
        
        usd_unit, usd_value = classify_unit(amount)
        usd_unit_str = ""
        if usd_unit == "조":
            usd_unit_str = "조"
        elif usd_unit == "억":
            usd_unit_str = "억"
        elif usd_unit == "천만":
            usd_unit_str = "천만"
        elif usd_unit == "백만":
            usd_unit_str = "백만"
        elif usd_unit == "":
            usd_unit_str = ""

        krw_total = amount * rate
        krw_unit, krw_value = classify_unit(krw_total)

        usd_fmt = f"${usd_value:,.2f}{usd_unit_str}"
        krw_fmt = f"₩ {krw_value:,.2f}{krw_unit}"
        return f"{usd_fmt} ({krw_fmt})"

    elif currency == "KRW":
        unit, value = classify_unit(amount)
        return f"₩ {value:,.2f}{unit}"

    else:
        return f"{amount:,.2f} {currency}"
    
# 아래 두 함수는 Streamlit의 테이블 표시를 위한 것이므로 API 응답에서는 직접 사용되지 않습니다.
# main.py에서 JSON 변환 로직으로 대체됩니다.
def display_financial_table(df, trans_map, format_currency):
    """
    재무제표 DataFrame(df)과 항목 한글 번역 맵(trans_map), 금액 포맷 함수(classify_unit)를 받아
    항목별, 연도별 표(DataFrame)를 반환합니다.
    """
    if df is None or df.empty:
        return None
    years = [str(y.year) for y in df.columns]
    rows = []
    for k, v in trans_map.items():
        if k in df.index:
            rows.append([v] + [format_currency(df.loc[k, col]) if not pd.isna(df.loc[k, col]) else '-' for col in df.columns])
    if not rows:
        return None
    return pd.DataFrame(rows, columns=["항목"] + years)

def display_financial_dollar_table(df, trans_map):
    """
    재무제표 DataFrame(df)과 항목 한글 번역 맵(trans_map), 금액 포맷 함수(format_currency)를 받아
    항목별, 연도별 표(DataFrame)를 반환합니다.
    """
    if df is None or df.empty:
        return None
    years = [str(y.year) for y in df.columns]
    rows = []
    for k, v in trans_map.items():
        if k in df.index:
            row = [v]
            for col in df.columns:
                val = df.loc[k, col]
                if pd.notnull(val):
                    unit, value = classify_unit(abs(val))
                    formatted = f"${'-' if val < 0 else ''}{value:,.2f}{unit}"
                    row.append(formatted)
                else:
                    row.append('-')
            rows.append(row)
    if not rows:
        return None
    return pd.DataFrame(rows, columns=["항목"] + years)