import pandas as pd
import FinanceDataReader as fdr
from pykrx import stock
import logging
from typing import List, Dict
from datetime import datetime
import time

logger = logging.getLogger(__name__)

class PerformanceService:
    """
    주식 시장의 기간별 수익률 상위/하위 종목을 분석하는 서비스
    - 미국 주식: FinanceDataReader 사용
    - 한국 주식: pykrx 사용
    - 안정성을 위해 개별 종목 조회 후 취합하는 방식으로 변경
    """

    def _get_tickers_by_market(self, market: str) -> pd.DataFrame:
        """마켓별 티커와 이름이 담긴 데이터프레임을 반환합니다."""
        try:
            today_str = datetime.now().strftime('%Y%m%d')
            if market in ["KOSPI", "KOSDAQ"]:
                tickers = stock.get_market_ticker_list(market=market, date=today_str)
                names = [stock.get_market_ticker_name(t) for t in tickers]
                return pd.DataFrame({'Symbol': tickers, 'Name': names})
            elif market in ['NASDAQ', 'NYSE', 'S&P500', 'SP500']:
                market_name = 'S&P500' if market == 'SP500' else market
                return fdr.StockListing(market_name)[['Symbol', 'Name']]
            return pd.DataFrame()
        except Exception as e:
            logger.error(f"'{market}' 티커 목록 조회 실패: {e}")
            return pd.DataFrame()

    def get_market_performance(self, market: str, start_date: str, end_date: str, top_n: int) -> Dict:
        """
        지정된 기간 동안의 시장별 상위/하위 N개 종목의 수익률을 계산합니다.
        """
        listing_df = self._get_tickers_by_market(market)
        if listing_df.empty:
            logger.warning(f"'{market}'에 대한 티커를 찾을 수 없습니다.")
            return {"top_performers": [], "bottom_performers": []}

        tickers = listing_df['Symbol'].tolist()
        name_map = pd.Series(listing_df.Name.values, index=listing_df.Symbol).to_dict()

        # if len(tickers) > 200:
        #     logger.info(f"'{market}' 티커 수가 많아 200개로 제한하여 분석합니다.")
        #     tickers = tickers[:200]

        is_kr_market = market in ["KOSPI", "KOSDAQ"]
        performance_data = []

        for i, ticker in enumerate(tickers):
            try:
                # API 과부하 방지를 위한 약간의 지연 시간 (미국 주식 조회 시)
                if not is_kr_market and i > 0 and i % 50 == 0:
                    time.sleep(0.5)

                if is_kr_market:
                    kr_start = start_date.replace('-', '')
                    kr_end = end_date.replace('-', '')
                    df = stock.get_market_ohlcv(kr_start, kr_end, ticker)
                    price_col = '종가'
                else:
                    df = fdr.DataReader(ticker, start_date, end_date)
                    price_col = 'Close'

                if not df.empty and len(df) > 1:
                    df = df.dropna(subset=[price_col])
                    if len(df) > 1:
                        start_price = df[price_col].iloc[0]
                        end_price = df[price_col].iloc[-1]
                        
                        if start_price > 0:
                            performance = ((end_price - start_price) / start_price) * 100
                            performance_data.append({
                                "ticker": ticker,
                                "name": name_map.get(ticker, ticker),
                                "performance": performance
                            })
            except Exception as e:
                # 개별 종목 조회 실패 시 로그만 남기고 계속 진행
                logger.debug(f"'{ticker}' 데이터 처리 중 오류 발생: {e}")
                continue

        if not performance_data:
            logger.warning(f"'{market}'에서 유효한 성능 데이터를 계산할 수 없었습니다.")
            return {"top_performers": [], "bottom_performers": []}

        sorted_performers = sorted(performance_data, key=lambda x: x['performance'], reverse=True)
        
        top_performers = sorted_performers[:top_n]
        bottom_performers = sorted_performers[-top_n:]
        bottom_performers.reverse()

        return {"top_performers": top_performers, "bottom_performers": bottom_performers}