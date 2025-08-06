import pandas as pd
import yfinance as yf
from pykrx import stock
import logging
from typing import Dict, List
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class PerformanceService:
    def _get_tickers_by_market(self, market: str) -> pd.DataFrame:
        """시장의 티커와 이름 목록을 가져옵니다."""
        try:
            if market in ["KOSPI", "KOSDAQ"]:
                today_str = datetime.now().strftime('%Y%m%d')
                tickers = stock.get_market_ticker_list(market=market, date=today_str)
                valid_tickers = [t for t in tickers if len(t) == 6 and t.isdigit()]
                names = [stock.get_market_ticker_name(t) for t in valid_tickers]
                df = pd.DataFrame({'ticker': valid_tickers, 'name': names})
            elif market in ['NASDAQ', 'NYSE', 'S&P500']:
                import FinanceDataReader as fdr
                df = fdr.StockListing(market)
                df = df[['Symbol', 'Name']].rename(columns={'Symbol': 'ticker', 'Name': 'name'})
            else:
                df = pd.DataFrame()
            return df
        except Exception as e:
            logger.error(f"'{market}' 티커 목록 조회 실패: {e}")
            return pd.DataFrame()

    def _get_performance_kr(self, tickers: List[str], name_map: Dict[str, str], start_date: str, end_date: str) -> pd.DataFrame:
        """한국 주식의 수익률을 계산합니다."""
        performance_data = []
        # 한국 주식은 개별 조회가 더 안정적이므로 기존 로직 유지
        for ticker in tickers:
            try:
                df = stock.get_market_ohlcv(start_date.replace('-', ''), end_date.replace('-', ''), ticker)
                if not df.empty and len(df) > 1:
                    start_price = df['종가'].iloc[0]
                    end_price = df['종가'].iloc[-1]
                    if start_price > 0:
                        performance = ((end_price - start_price) / start_price) * 100
                        performance_data.append({
                            "ticker": ticker,
                            "name": name_map.get(ticker, ticker),
                            "performance": performance
                        })
            except Exception:
                continue
        return pd.DataFrame(performance_data)

    def _get_performance_us(self, tickers: List[str], name_map: Dict[str, str], start_date: str, end_date: str) -> pd.DataFrame:
        """미국 주식의 수익률을 계산합니다."""
        all_performance_data = []
        # ✅ [성능 개선] API Rate Limit을 피하기 위해 200개씩 나누어 요청 (배치 처리)
        chunk_size = 200
        for i in range(0, len(tickers), chunk_size):
            chunk = tickers[i:i + chunk_size]
            try:
                data = yf.download(chunk, start=start_date, end=end_date, progress=False, auto_adjust=True)
                
                if data.empty or 'Close' not in data.columns:
                    continue

                close_prices = data['Close'].dropna(axis=1, how='all')
                if close_prices.empty or len(close_prices) < 2:
                    continue

                start_prices = close_prices.bfill().iloc[0]
                end_prices = close_prices.ffill().iloc[-1]
                
                perf_series = ((end_prices - start_prices) / start_prices) * 100
                
                for ticker, performance in perf_series.items():
                    if pd.notna(performance):
                         all_performance_data.append({
                            "ticker": ticker,
                            "name": name_map.get(ticker, ticker),
                            "performance": performance
                        })

                time.sleep(0.5) # 요청 사이에 약간의 딜레이를 줌
            except Exception as e:
                logger.warning(f"Ticker chunk {i}-{i+chunk_size} 다운로드 중 오류: {e}")
                continue
        
        return pd.DataFrame(all_performance_data)


    def get_market_performance(self, market: str, start_date: str, end_date: str, top_n: int) -> Dict:
        logger.info(f"성능 분석 시작: Market={market}, Period={start_date}~{end_date}")
        
        listing = self._get_tickers_by_market(market)
        if listing.empty:
            logger.warning(f"'{market}'에 대한 티커 목록을 찾을 수 없습니다.")
            return {"top_performers": [], "bottom_performers": []}

        tickers = listing['ticker'].tolist()
        name_map = listing.set_index('ticker')['name'].to_dict()

        if market in ["KOSPI", "KOSDAQ"]:
            performance_df = self._get_performance_kr(tickers, name_map, start_date, end_date)
        else:
            performance_df = self._get_performance_us(tickers, name_map, start_date, end_date)
        
        if performance_df.empty:
            return {"top_performers": [], "bottom_performers": []}

        performance_df = performance_df.sort_values(by='performance', ascending=False)
        
        top_performers = performance_df.head(top_n).to_dict('records')
        bottom_performers = performance_df.tail(top_n).sort_values(by='performance', ascending=True).to_dict('records')
        
        return {"top_performers": top_performers, "bottom_performers": bottom_performers}