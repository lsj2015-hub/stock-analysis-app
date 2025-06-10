import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta, timezone
import requests
import time
import xml.etree.ElementTree as ET 

class YahooFinanceDataManager:
    def __init__(self):
        pass

    def get_info(_self, symbol: str) -> dict | None:
        """
        주어진 종목 코드에 대한 기업 정보를 가져옵니다.
        """
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            if not info or not isinstance(info, dict) or not info.get('symbol'):
                return None
            return info
        except Exception as e:
            print(f"기업 정보 가져오기 실패: {e}")
            return None
        
    def get_financials(_self, symbol: str) -> dict | None:
        """
        주어진 종목 코드에 대한 재무제표(손익계산서, 대차대조표, 현금흐름표)를 가져옵니다.
        반환값: {'income': DataFrame, 'balance': DataFrame, 'cashflow': DataFrame} 또는 None
        """
        try:
            ticker = yf.Ticker(symbol)
            income = ticker.financials
            balance = ticker.balance_sheet
            cashflow = ticker.cashflow

            # 제외할 항목 리스트 정의
            items_to_exclude = [
                'Treasury Shares Number',      # 자기주식 수
                'Ordinary Shares Number',        # 보통주식 수 
                'Share Issued'         # 발행주식 수
            ]


            # 빈 데이터 방지
            if (income is None or income.empty) and \
               (balance is None or balance.empty) and \
               (cashflow is None or cashflow.empty):
                return None

            # 연도: 최신 → 오른쪽
            if income is not None and not income.empty:
                income = income[income.columns[::-1]]
            if balance is not None and not balance.empty:
                balance = balance[balance.columns[::-1]]
                # 'balance' DataFrame에서 특정 행(items_to_exclude) 제거
                balance = balance.drop(items_to_exclude, errors='ignore')
            if cashflow is not None and not cashflow.empty:
                cashflow = cashflow[cashflow.columns[::-1]]

            return {
                'income': income,
                'balance': balance,
                'cashflow': cashflow,
            }
        except Exception as e:
            print(f"재무제표 가져오기 실패: {e}")
            return None
        
    def process_price_df(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        다운로드한 주가 데이터를 Streamlit 표시를 위해 포맷팅합니다.
        FastAPI에서는 JSON으로 변환하기 전 Pandas DataFrame 형태로 반환합니다.
        """
        if df is None:
            return pd.DataFrame()
            
        df = df.reset_index()
        # 멀티 인덱스 컬럼 평탄화 처리 (yfinance 최신 버전에서는 필요 없을 수도 있지만 안전하게 유지)
        df.columns = [col[0] if isinstance(col, tuple) else col for col in df.columns]
        
        df["Date"] = pd.to_datetime(df["Date"]).dt.strftime("%Y-%m-%d")
        
        final_cols = ["Date", "Close", "High", "Low", "Open", "Volume"]
        cols = [c for c in final_cols if c in df.columns]
        return df[cols]
    
    def get_price_data_adjusted(_self, symbol: str, start: str, end: str, max_backtrack_days: int = 30):
        """
        주가 데이터를 조회합니다.
        지정된 종료일에 데이터가 없으면 이전 날짜로 이동하며 최대 `max_backtrack_days`까지 조회합니다.
        yfinance의 end 인자는 요청된 날짜를 포함하지 않는 경향이 있으므로,
        실제 데이터를 가져올 때는 하루 뒤를 요청하고, 반환 시에는 실제 데이터를 기준으로 합니다.
        """
        start_dt = datetime.strptime(start, "%Y-%m-%d").date()
        requested_end_dt = datetime.strptime(end, "%Y-%m-%d").date()

        for i in range(max_backtrack_days + 1): # 요청된 end_date 포함, 최대 N일 뒤로 거슬러 올라감
            # yfinance는 end_date "전까지" 데이터를 가져오므로,
            # 우리가 원하는 실제 종료 날짜(requested_end_dt - i)의 데이터를 포함하기 위해
            # 요청 시점의 end_date는 하루 더한 날짜로 설정합니다.
            
            # 실제 데이터를 확인하고 싶은 날짜 (오늘이면 오늘, 어제면 어제)
            target_data_date = requested_end_dt - timedelta(days=i)
            # yfinance에 요청할 end 날짜 (target_data_date의 다음 날)
            yf_request_end_date = target_data_date + timedelta(days=1)
            yf_request_end_str = yf_request_end_date.strftime("%Y-%m-%d")

            try:
                # yfinance.download 호출
                df = yf.download(symbol, start=start, end=yf_request_end_str, progress=False)

                if not df.empty:
                    # 실제 DataFrame의 마지막 날짜 확인
                    actual_last_date_in_df = df.index.max().date()

                    # 만약 요청한 target_data_date가 실제 데이터에 포함되어 있다면
                    # (즉, yfinance가 target_data_date의 데이터를 준다면) 해당 df를 반환
                    # 또는, target_data_date보다 이전 날짜라도 데이터가 있다면 반환
                    if actual_last_date_in_df >= start_dt: # 가져온 데이터가 시작일보다 늦은 경우만 유효
                        return df, actual_last_date_in_df.strftime("%Y-%m-%d")
                    
            except Exception as e:
                # yfinance 오류가 발생할 수 있으므로 콘솔에 로깅
                print(f"yfinance download error for {symbol} requesting end {yf_request_end_str}: {e}")
                    
        return None, None # max_backtrack_days 동안 데이터를 찾지 못하면 None 반환
    
    # ⭐ Yahoo Finance RSS에서 뉴스를 가져오는 함수
    def get_yahoo_finance_rss_news(self, symbol: str, limit: int = 10) -> list:
        cache_key = symbol.upper()
        current_time = datetime.now(timezone.utc)

        rss_url = f"https://finance.yahoo.com/rss/headline?s={symbol.upper()}"

        # 일반적인 웹 브라우저 User-Agent 문자열
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }

        # 429 에러 방지를 위한 sleep은 일단 유지
        time.sleep(1) 

        news_list = []
        try:
            response = requests.get(rss_url, headers=headers, timeout=10)
            response.raise_for_status() 
            print(f"DEBUG: Successfully made request. Status Code: {response.status_code}")

            # --- ⭐ 여기서 받아온 내용을 출력하고 파일로 저장 ⭐ ---
            print(f"DEBUG: Raw RSS content (first 1000 chars):\n{response.content[:1000].decode('utf-8', errors='ignore')}")

            # 파일로 저장 (디버깅용)
            with open(f"yahoo_finance_rss_{symbol.upper()}.xml", "wb") as f:
                f.write(response.content)
            print(f"DEBUG: Raw RSS content saved to yahoo_finance_rss_{symbol.upper()}.xml")
            # ----------------------------------------------------

            root = ET.fromstring(response.content)

            found_items = False
            for item in root.findall('./channel/item'):
                found_items = True # item이 하나라도 발견되면 True
                title = item.find('title').text if item.find('title') is not None else 'No Title'
                link = item.find('link').text if item.find('link') is not None else 'No Link'
                pub_date_str = item.find('pubDate').text if item.find('pubDate') is not None else None
                summary = item.find('description').text if item.find('description') is not None else ''

                published_date_iso = None
                if pub_date_str:
                    try:
                        dt_object = datetime.strptime(pub_date_str, '%a, %d %b %Y %H:%M:%S %z')
                        published_date_iso = dt_object.isoformat()
                    except ValueError as e:
                        print(f"DEBUG: Failed to parse pubDate '{pub_date_str}': {e}")
                        try: # GMT 형식 시도
                            dt_object = datetime.strptime(pub_date_str, '%a, %d %b %Y %H:%M:%S GMT')
                            published_date_iso = dt_object.replace(tzinfo=timezone.utc).isoformat()
                        except ValueError:
                            print(f"DEBUG: Failed alternative pubDate parse for '{pub_date_str}'.")
                            pass

                news_list.append({
                    "title": title,
                    "url": link,
                    "publishedDate": published_date_iso,
                    "source": "Yahoo Finance RSS",
                    "summary": summary
                })
                print(f"DEBUG: Added item: Title='{title}' Date='{published_date_iso}'") # 각 아이템 추가 시 출력

                if limit and len(news_list) >= limit:
                    print(f"DEBUG: Reached limit of {limit} items.")
                    break

            if not found_items:
                print(f"DEBUG: No <item> tags found in RSS feed for {symbol}.")

            # (캐싱 로직은 현재 문제와 무관하므로 잠시 무시하거나 주석 처리)
            # self._news_cache[cache_key] = (news_list, current_time)
            # print(f"DEBUG: Stored news for {symbol} in cache.")

            return news_list[:limit]

        except requests.exceptions.RequestException as e:
            print(f"ERROR: Error fetching Yahoo Finance RSS: {e}")
            return []
        except ET.ParseError as e:
            print(f"ERROR: XML parsing error: {e}")
            try:
                print(f"Problematic content (first 1000 chars): {response.content.decode('utf-8', errors='ignore')[:1000]}")
            except NameError:
                print("Response content not available for debugging.")
            return []
        except Exception as e:
            print(f"ERROR: An unexpected error occurred: {e}")
            import traceback
            traceback.print_exc()
            return []
