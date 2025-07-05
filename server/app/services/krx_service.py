# server/app/services/krx_service.py
import pandas as pd
import time
from pykrx import stock
import logging
from typing import List, Dict, Set
from datetime import datetime, timedelta
from ..core.sector_data import SECTOR_GROUPS

logger = logging.getLogger(__name__)

class PyKRXService:
    def get_sector_groups(self) -> Dict:
        return SECTOR_GROUPS

    def get_tickers_by_group(self, market: str, group: str) -> List[tuple[str, str]]:
        if group == '전체 보기':
            tickers = stock.get_index_ticker_list(market=market)
        else:
            tickers = SECTOR_GROUPS.get(market, {}).get(group, [])

        ticker_names = []
        for ticker in tickers:
            try:
                name = stock.get_index_ticker_name(ticker)
                ticker_names.append((ticker, name))
            except Exception:
                continue
        return ticker_names

    def analyze_sector_performance(self, start_date: str, end_date: str, tickers: List[str]) -> List[Dict]:
        latest_business_day = None
        end_date_dt = datetime.strptime(end_date, "%Y%m%d")
        for i in range(7):
            check_date_str = (end_date_dt - timedelta(days=i)).strftime("%Y%m%d")
            try:
                if tickers and stock.get_index_portfolio_deposit_file(tickers[0], check_date_str):
                    latest_business_day = check_date_str
                    break
            except (ValueError, TypeError, KeyError):
                continue
        
        if not latest_business_day: return []
        
        all_constituent_stocks: Dict[str, List[str]] = {}
        unique_stock_tickers: Set[str] = set()

        for sector_ticker in tickers:
            try:
                sector_name = stock.get_index_ticker_name(sector_ticker)
                constituent_stocks = stock.get_index_portfolio_deposit_file(sector_ticker, latest_business_day)
                all_constituent_stocks[sector_name] = constituent_stocks
                unique_stock_tickers.update(constituent_stocks)
                time.sleep(0.1)
            except Exception: continue
        
        if not unique_stock_tickers: return []

        all_stock_data: Dict[str, pd.Series] = {}
        for stock_ticker in list(unique_stock_tickers):
            try:
                df = stock.get_market_ohlcv(start_date, end_date, stock_ticker)
                if not df.empty: all_stock_data[stock_ticker] = df['종가']
                time.sleep(0.1)
            except Exception: continue
        
        try:
            all_dates = stock.get_market_ohlcv(start_date, end_date, "005930").index
            sector_indexed_returns_df = pd.DataFrame(index=all_dates)
        except Exception: return []

        for sector_name, stock_list in all_constituent_stocks.items():
            sector_prices = [all_stock_data[ticker] for ticker in stock_list if ticker in all_stock_data and not all_stock_data[ticker].empty]
            
            if sector_prices:
                temp_df = pd.concat(sector_prices, axis=1)
                daily_avg_price = temp_df.mean(axis=1)
                
                first_valid_price = daily_avg_price.dropna().iloc[0] if not daily_avg_price.dropna().empty else 0
                if first_valid_price > 0:
                    indexed_series = (daily_avg_price / first_valid_price) * 100
                    sector_indexed_returns_df[sector_name] = indexed_series

        if sector_indexed_returns_df.empty: return []
            
        sector_indexed_returns_df.ffill(inplace=True)
        sector_indexed_returns_df.index = sector_indexed_returns_df.index.strftime('%Y-%m-%d')
        result_json = sector_indexed_returns_df.where(pd.notnull(sector_indexed_returns_df), None).to_dict(orient='index')
        return [{"date": date, **data} for date, data in result_json.items()]
        
    def get_trading_performance_by_investor(self, start_date: str, end_date: str, ticker: str, detail: bool, institution_only: bool) -> pd.DataFrame:
        logger.info(f"거래 실적 조회: {start_date}~{end_date}, Ticker: {ticker}, Detail: {detail}, InstitutionOnly: {institution_only}")
        
        institutional_investors = ['금융투자', '보험', '투신', '사모', '은행', '기타금융', '연기금', '연기금 등']

        if detail:
            df = stock.get_market_trading_value_by_date(start_date, end_date, ticker)
            df.index.name = '날짜'
            # ✅ '기관합계' 컬럼 추가 (존재하는 기관 컬럼들의 합)
            existing_inst_cols = [col for col in institutional_investors if col in df.columns]
            if existing_inst_cols:
                df['기관합계'] = df[existing_inst_cols].sum(axis=1)
        else:
            df = stock.get_market_trading_value_by_investor(start_date, end_date, ticker)
            df.index.name = '투자자구분'
            net_col = [col for col in df.columns if '순매수' in str(col)][0]
            df.rename(columns={net_col: '순매수'}, inplace=True)
            
            if institution_only:
                df = df[df.index.isin(institutional_investors)]
            # ✅ '기관계' 수동 계산 로직 삭제 (pykrx의 '기관합계'를 그대로 사용)
                    
        return df.reset_index()

    def get_net_purchase_ranking_by_investor(self, start_date: str, end_date: str, market: str, investor: str) -> pd.DataFrame:
        logger.info(f"순매수 상위 종목 조회 시작: {start_date}~{end_date}, Market: {market}, Investor: {investor}")
        
        if investor == '기관합계':
            institutional_investors = ['금융투자', '보험', '투신', '사모', '은행', '기타금융', '연기금']
            all_df = pd.DataFrame()
            for inv in institutional_investors:
                try:
                    df_inv = stock.get_market_net_purchases_of_equities(start_date, end_date, market, inv)
                    if not df_inv.empty:
                        all_df = pd.concat([all_df, df_inv])
                    time.sleep(0.1)
                except Exception as e:
                    logger.warning(f"'{inv}' 투자자 순매수 데이터 조회 실패: {e}")
                    continue
            
            if all_df.empty:
                return pd.DataFrame()

            df = all_df.groupby(['티커', '종목명']).sum()
        else:
            try:
                df = stock.get_market_net_purchases_of_equities(start_date, end_date, market, investor)
            except KeyError:
                return pd.DataFrame()

        df = df.sort_values(by='순매수거래대금', ascending=False).head(15)
        df = df.reset_index()
        df = df.rename(columns={"티커": "ticker", "종목명": "name", "순매수거래량": "volume", "순매수거래대금": "value"})
        return df