import pandas as pd
import yfinance as yf
from pykrx import stock
import logging
from typing import List, Dict, Tuple
from datetime import datetime, timedelta
import time

logger = logging.getLogger(__name__)

class FluctuationService:
    def _get_tickers_by_market(self, market: str) -> List[Tuple[str, str]]:
        try:
            if market in ["KOSPI", "KOSDAQ"]:
                today_str = datetime.now().strftime('%Y%m%d')
                tickers = stock.get_market_ticker_list(market=market, date=today_str)
                return [(t, stock.get_market_ticker_name(t)) for t in tickers if len(t) == 6 and t.isdigit()]
            elif market in ['NASDAQ', 'NYSE', 'S&P500']:
                import FinanceDataReader as fdr
                df = fdr.StockListing(market)
                return list(df[['Symbol', 'Name']].itertuples(index=False, name=None))
            return []
        except Exception as e:
            logger.error(f"'{market}' 티커 목록 조회 실패: {e}")
            return []

    def _process_and_aggregate_results(self, all_events: List[Dict]) -> List[Dict]:
        if not all_events: return []
        df = pd.DataFrame(all_events)
        df['trough_date'] = pd.to_datetime(df['trough_date'])
        aggregated_results = []
        for (ticker, name), group in df.groupby(['ticker', 'name']):
            sorted_group = group.sort_values(by='trough_date', ascending=False)
            events_list = sorted_group.to_dict('records')
            for event in events_list:
                event['trough_date'] = event['trough_date'].strftime('%Y-%m-%d')
            latest_event = events_list[0]
            aggregated_results.append({
                "ticker": ticker, "name": name,
                "occurrence_count": len(group),
                "recent_trough_date": latest_event['trough_date'],
                "recent_trough_price": latest_event['trough_price'],
                "recent_rebound_date": latest_event['rebound_date'],
                "recent_rebound_performance": latest_event['rebound_performance'],
                "events": events_list
            })
        return sorted(aggregated_results, key=lambda x: x['occurrence_count'], reverse=True)

    def _find_fluctuation_stocks_kr(self, tickers: List[Tuple[str, str]], start_date: str, end_date: str, decline_period: int, decline_rate: float, rebound_period: int, rebound_rate: float) -> List[Dict]:
        all_found_events = []
        for i, (ticker, name) in enumerate(tickers):
            try:
                df = stock.get_market_ohlcv(start_date.replace('-', ''), end_date.replace('-', ''), ticker)
                if df.empty or len(df) < decline_period: continue
                df['decline'] = (df['종가'] / df['종가'].shift(decline_period) - 1) * 100
                potential_troughs = df[df['decline'] <= decline_rate]
                for trough_date, row in potential_troughs.iterrows():
                    rebound_end_date = trough_date + timedelta(days=rebound_period)
                    rebound_df = df[(df.index > trough_date) & (df.index <= rebound_end_date)]
                    if not rebound_df.empty and rebound_df['종가'].max() > 0:
                        max_rebound_price = rebound_df['종가'].max()
                        rebound_performance = (max_rebound_price / row['종가'] - 1) * 100 if row['종가'] > 0 else 0
                        if rebound_performance >= rebound_rate:
                            all_found_events.append({
                                "ticker": ticker, "name": name, "trough_date": trough_date,
                                "trough_price": row['종가'], "rebound_date": rebound_df['종가'].idxmax().strftime('%Y-%m-%d'),
                                "rebound_price": max_rebound_price, "rebound_performance": rebound_performance,
                            })
                logger.info(f"KR 분석 진행: {i+1}/{len(tickers)} ({((i+1)/len(tickers))*100:.1f}%)")
            except Exception: continue
        return self._process_and_aggregate_results(all_found_events)

    def _find_fluctuation_stocks_us(self, tickers: List[Tuple[str, str]], start_date: str, end_date: str, decline_period: int, decline_rate: float, rebound_period: int, rebound_rate: float) -> List[Dict]:
        all_found_events = []
        ticker_list = [t[0] for t in tickers]
        name_map = {t[0]: t[1] for t in tickers}
        try:
            data = yf.download(ticker_list, start=start_date, end=end_date, progress=False, auto_adjust=True)
            if data.empty or 'Close' not in data.columns: return []
            close_prices = data['Close']
            for i, ticker in enumerate(close_prices.columns):
                df_ticker = close_prices[[ticker]].dropna()
                if len(df_ticker) < decline_period: continue
                df_ticker['decline'] = (df_ticker[ticker] / df_ticker[ticker].shift(decline_period) - 1) * 100
                potential_troughs = df_ticker[df_ticker['decline'] <= decline_rate]
                for trough_date, row in potential_troughs.iterrows():
                    rebound_end_date = trough_date + timedelta(days=rebound_period)
                    rebound_df = df_ticker[(df_ticker.index > trough_date) & (df_ticker.index <= rebound_end_date)]
                    if not rebound_df.empty and rebound_df[ticker].max() > 0:
                        max_rebound_price = rebound_df[ticker].max()
                        rebound_performance = (max_rebound_price / row[ticker] - 1) * 100 if row[ticker] > 0 else 0
                        if rebound_performance >= rebound_rate:
                            all_found_events.append({
                                "ticker": ticker, "name": name_map.get(ticker, ticker), "trough_date": trough_date,
                                "trough_price": row[ticker], "rebound_date": rebound_df[ticker].idxmax().strftime('%Y-%m-%d'),
                                "rebound_price": max_rebound_price, "rebound_performance": rebound_performance,
                            })
                logger.info(f"US 분석 진행: {i+1}/{len(close_prices.columns)} ({((i+1)/len(close_prices.columns))*100:.1f}%)")
        except Exception as e:
            logger.error(f"US 주식 분석 중 오류 발생: {e}")
        return self._process_and_aggregate_results(all_found_events)

    def find_fluctuation_stocks(self, country: str, market: str, start_date: str, end_date: str, decline_period: int, decline_rate: float, rebound_period: int, rebound_rate: float) -> List[Dict]:
        tickers = self._get_tickers_by_market(market)
        if not tickers: return []
        if country == 'KR':
            return self._find_fluctuation_stocks_kr(tickers, start_date, end_date, decline_period, decline_rate, rebound_period, rebound_rate)
        elif country == 'US':
            return self._find_fluctuation_stocks_us(tickers, start_date, end_date, decline_period, decline_rate, rebound_period, rebound_rate)
        return []