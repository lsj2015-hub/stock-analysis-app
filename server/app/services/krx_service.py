# app/services/krx_service.py
import pandas as pd
import time
from pykrx import stock
import logging
from typing import List, Dict, Set
from ..core.sector_data import SECTOR_GROUPS

logger = logging.getLogger(__name__)

class PyKRXService:
    """
    pykrx 라이브러리를 사용하여 한국 주식 시장 데이터를 가져오고 분석하는 서비스 클래스
    """
    def get_sector_groups(self) -> Dict:
        """섹터 그룹 정보를 반환합니다."""
        return SECTOR_GROUPS

    def get_tickers_by_group(self, market: str, group: str) -> List[tuple[str, str]]:
        """선택된 시장과 그룹에 속한 모든 섹터 티커와 이름을 반환합니다."""
        if group == '전체 보기':
            tickers = stock.get_index_ticker_list(market=market)
        else:
            tickers = SECTOR_GROUPS.get(market, {}).get(group, [])

        ticker_names = []
        for ticker in tickers:
            try:
                name = stock.get_index_ticker_name(ticker)
                ticker_names.append((ticker, name))
            except Exception as e:
                logger.warning(f"티커 이름 조회 실패 ({ticker}): {e}")
                continue # 문제가 있는 티커는 건너뜁니다.
        return ticker_names

    def analyze_sector_performance(self, start_date: str, end_date: str, tickers: List[str]) -> List[Dict]:
        """선택된 섹터들의 기간별 누적 수익률을 분석합니다."""
        
        all_constituent_stocks: Dict[str, List[str]] = {}
        unique_stock_tickers: Set[str] = set()

        # 1. 각 섹터의 구성 종목 취합
        for sector_ticker in tickers:
            try:
                sector_name = stock.get_index_ticker_name(sector_ticker)
                constituent_stocks = stock.get_index_portfolio_deposit_file(sector_ticker, end_date)
                all_constituent_stocks[sector_name] = constituent_stocks
                unique_stock_tickers.update(constituent_stocks)
                time.sleep(0.1)
            except Exception as e:
                logger.warning(f"구성 종목 조회 실패 ({sector_ticker}): {e}")
                continue
        
        if not unique_stock_tickers:
            logger.warning("분석할 구성 종목이 없습니다.")
            return []

        # 2. 고유 종목들의 주가 데이터 조회
        all_stock_data: Dict[str, pd.Series] = {}
        for stock_ticker in list(unique_stock_tickers):
            try:
                df = stock.get_market_ohlcv(start_date, end_date, stock_ticker)
                if not df.empty:
                    all_stock_data[stock_ticker] = df['종가']
                time.sleep(0.1)
            except Exception:
                continue
        
        # 3. 섹터별 누적 수익률 지수 계산
        try:
            # 기준 거래일 설정 (삼성전자)
            all_dates = stock.get_market_ohlcv(start_date, end_date, "005930").index
            sector_indexed_returns_df = pd.DataFrame(index=all_dates)
        except Exception:
            logger.error("기준 거래일(삼성전자) 조회에 실패하여 분석을 진행할 수 없습니다.")
            return []


        for sector_name, stock_list in all_constituent_stocks.items():
            sector_prices = [all_stock_data[ticker] for ticker in stock_list if ticker in all_stock_data and not all_stock_data[ticker].empty]
            
            if sector_prices:
                temp_df = pd.concat(sector_prices, axis=1)
                daily_avg_price = temp_df.mean(axis=1)
                
                first_valid_price = daily_avg_price.dropna().iloc[0] if not daily_avg_price.dropna().empty else 0
                if first_valid_price > 0:
                    indexed_series = (daily_avg_price / first_valid_price) * 100
                    sector_indexed_returns_df[sector_name] = indexed_series

        # 4. 결과 포맷팅
        if sector_indexed_returns_df.empty:
            return []
            
        sector_indexed_returns_df.ffill(inplace=True) # 이전 값으로 NaN 채우기
        sector_indexed_returns_df.index = sector_indexed_returns_df.index.strftime('%Y-%m-%d')
        result_json = sector_indexed_returns_df.where(pd.notnull(sector_indexed_returns_df), None).to_dict(orient='index')
        
        # 날짜를 키로, 섹터 데이터를 값으로 갖는 리스트 형태로 변환
        formatted_result = [{"date": date, **data} for date, data in result_json.items()]
        
        return formatted_result