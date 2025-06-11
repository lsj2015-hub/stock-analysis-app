# app/services/yahoo_finance.py
import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta

class YahooFinanceService:
    def get_stock_info(self, symbol: str) -> dict | None:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            return info if info and info.get('symbol') else None
        except Exception as e:
            print(f"yfinance 정보 조회 실패: {e}")
            return None

    def get_financials(self, symbol: str) -> dict | None:
        try:
            ticker = yf.Ticker(symbol)
            income = ticker.financials
            balance = ticker.balance_sheet
            cashflow = ticker.cashflow

            if all(df is None or df.empty for df in [income, balance, cashflow]):
                return None

            items_to_exclude = ['Treasury Shares Number', 'Ordinary Shares Number', 'Share Issued']
            
            if not income.empty: income = income[income.columns[::-1]]
            if not cashflow.empty: cashflow = cashflow[cashflow.columns[::-1]]
            if not balance.empty:
                balance = balance[balance.columns[::-1]]
                balance = balance.drop(items_to_exclude, errors='ignore')

            return {'income': income, 'balance': balance, 'cashflow': cashflow}
        except Exception as e:
            print(f"yfinance 재무제표 조회 실패: {e}")
            return None
            
    def get_price_history(self, symbol: str, start: str, end: str) -> tuple[pd.DataFrame | None, str | None]:
        end_dt = datetime.strptime(end, "%Y-%m-%d").date()
        for i in range(30): # 최대 30일 이전까지 데이터 조회 시도
            target_date = end_dt - timedelta(days=i)
            request_end = target_date + timedelta(days=1)
            try:
                df = yf.download(symbol, start=start, end=request_end.strftime("%Y-%m-%d"), progress=False)
                if not df.empty:
                    return df, df.index.max().strftime("%Y-%m-%d")
            except Exception as e:
                print(f"yfinance 가격 조회 실패 (end={request_end}): {e}")
        return None, None
        
    def get_officers(self, symbol: str) -> list | None:
        info = self.get_stock_info(symbol)
        return info.get("companyOfficers") if info else None