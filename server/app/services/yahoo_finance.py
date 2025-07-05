import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging
from pykrx import stock

logger = logging.getLogger(__name__)

class YahooFinanceService:

    def _get_yfinance_ticker_with_suffix(self, symbol: str) -> yf.Ticker | None:
        try:
            ticker_ks = yf.Ticker(f"{symbol}.KS")
            if ticker_ks.info.get('regularMarketPrice') is not None: return ticker_ks
            ticker_kq = yf.Ticker(f"{symbol}.KQ")
            if ticker_kq.info.get('regularMarketPrice') is not None: return ticker_kq
        except Exception: return None
        return None

    def get_kr_stock_info_combined(self, symbol: str) -> dict | None:
        try:
            krx_info = {"symbol": symbol, "longName": stock.get_market_ticker_name(symbol), "marketCap": stock.get_market_cap(symbol).iloc[-1]['시가총액']}
            yfs_ticker = self._get_yfinance_ticker_with_suffix(symbol)
            if yfs_ticker and yfs_ticker.info: krx_info.update(yfs_ticker.info)
            return krx_info
        except Exception as e:
            logger.error(f"한국 주식 정보 조합 중 오류 발생 ('{symbol}'): {e}", exc_info=True)
            return None

    def get_stock_info(self, symbol: str) -> dict | None:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            if not info or info.get('symbol', '').upper() != symbol.upper():
                 logger.warning(f"yfinance: '{symbol}'에 대한 정보를 찾을 수 없거나 Ticker가 일치하지 않습니다.")
                 return None
            return info
        except Exception as e:
            logger.error(f"yfinance: '{symbol}' 정보 조회 중 예외 발생: {e}", exc_info=True)
            return None

    def get_financials(self, symbol: str) -> dict | None:
        yfs_ticker = self._get_yfinance_ticker_with_suffix(symbol) if (len(symbol) == 6 and symbol.isdigit()) else yf.Ticker(symbol)
        if not yfs_ticker: return None
        
        try:
            income = yfs_ticker.financials
            balance = yfs_ticker.balance_sheet
            cashflow = yfs_ticker.cashflow

            if all(df is None or df.empty for df in [income, balance, cashflow]):
                logger.warning(f"yfinance: '{symbol}'에 대한 재무제표 데이터가 모두 비어있습니다.")
                return None

            items_to_exclude = ['Treasury Shares Number', 'Ordinary Shares Number', 'Share Issued']
            
            if not income.empty: income = income[income.columns[::-1]]
            if not cashflow.empty: cashflow = cashflow[cashflow.columns[::-1]]
            if not balance.empty:
                balance = balance[balance.columns[::-1]]
                balance = balance.drop(items_to_exclude, errors='ignore')

            return {'income': income, 'balance': balance, 'cashflow': cashflow}
        except Exception as e:
            logger.error(f"yfinance: '{symbol}' 재무제표 조회 중 예외 발생: {e}", exc_info=True)
            return None
            
    def get_price_history(self, symbol: str, start: str, end: str) -> tuple[pd.DataFrame | None, str | None]:
        try:
            df = yf.download(symbol, start=start, end=end, progress=False, auto_adjust=True)
            if df.empty: return None, None
            df.reset_index(inplace=True)
            df.rename(columns={'Date': 'Date', 'Open': 'Open', 'High': 'High', 'Low': 'Low', 'Close': 'Close', 'Volume': 'Volume'}, inplace=True)
            return df, df['Date'].max().strftime("%Y-%m-%d")
        except Exception as e:
            logger.error(f"yfinance: '{symbol}' 가격 조회 중 예외 발생: {e}", exc_info=True)
            return None, None
    
    def get_officers(self, symbol: str) -> list | None:
        info = self.get_stock_info(symbol)
        if info:
            officers = info.get("companyOfficers")
            return officers
        return None
    
    def get_comparison_data(self, tickers: list, start: str, end: str) -> pd.DataFrame | None:
        try:
            data = yf.download(tickers, start=start, end=end, progress=False, auto_adjust=True)
            if data.empty or 'Close' not in data:
                return None
            close_prices = data['Close']
            if isinstance(close_prices, pd.Series):
                close_prices = close_prices.to_frame(name=tickers[0])
            close_prices.dropna(axis=1, how='all', inplace=True)
            if close_prices.empty:
                 return None
            first_valid_prices = close_prices.bfill().iloc[0]
            normalized_prices = (close_prices / first_valid_prices) * 100
            return normalized_prices
        except Exception as e:
            logger.error(f"yfinance: 비교 데이터 처리 중 예외 발생: {e}", exc_info=True)
            return None