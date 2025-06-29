import yfinance as yf
import pandas as pd
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

class YahooFinanceService:
    def get_stock_info(self, symbol: str) -> dict | None:
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info
            # 정보가 없거나, 심볼이 일치하지 않는 비정상적인 경우를 명시적으로 처리
            if not info or info.get('symbol', '').upper() != symbol.upper():
                 logger.warning(f"yfinance: '{symbol}'에 대한 정보를 찾을 수 없거나 Ticker가 일치하지 않습니다.")
                 return None
            return info
        except Exception as e:
            logger.error(f"yfinance: '{symbol}' 정보 조회 중 예외 발생: {e}", exc_info=True)
            return None

    def get_financials(self, symbol: str) -> dict | None:
        try:
            ticker = yf.Ticker(symbol)
            income = ticker.financials
            balance = ticker.balance_sheet
            cashflow = ticker.cashflow

            if all(df is None or df.empty for df in [income, balance, cashflow]):
                logger.warning(f"yfinance: '{symbol}'에 대한 재무제표(income, balance, cashflow) 데이터가 모두 비어있습니다.")
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
            end_dt = datetime.strptime(end, "%Y-%m-%d").date()
        except ValueError:
            logger.error(f"yfinance: 날짜 형식이 잘못되었습니다. (end: {end})")
            return None, None
            
        for i in range(30): # 최대 30일 이전까지 데이터 조회 시도
            target_date = end_dt - timedelta(days=i)
            request_end = target_date + timedelta(days=1)
            try:
                df = yf.download(symbol, start=start, end=request_end.strftime("%Y-%m-%d"), progress=False)
                if not df.empty:
                    logger.info(f"yfinance: '{symbol}' 가격 조회 성공 (기간: {start}~{request_end}, 실제 마지막 날짜: {df.index.max().strftime('%Y-%m-%d')})")
                    return df, df.index.max().strftime("%Y-%m-%d")
            except Exception as e:
                # 개별 다운로드 실패는 에러보다는 경고로 처리하고 다음 날짜 시도
                logger.warning(f"yfinance: '{symbol}' 가격 조회 시도 실패 (end={request_end}): {e}")
        
        logger.error(f"yfinance: '{symbol}' 가격 조회 최종 실패 (기간: {start}~{end})")
        return None, None
        
    def get_officers(self, symbol: str) -> list | None:
        info = self.get_stock_info(symbol)
        if info:
            officers = info.get("companyOfficers")
            if officers is None:
                logger.warning(f"yfinance: '{symbol}' get_stock_info 결과에 'companyOfficers' 필드가 없습니다. (존재하는 키: {info.keys()})")
            elif not officers:
                logger.info(f"yfinance: '{symbol}'의 'companyOfficers' 필드가 비어있습니다.")
            else:
                logger.info(f"yfinance: '{symbol}'의 임원 정보 {len(officers)}명을 찾았습니다.")
            return officers
        
        logger.warning(f"yfinance: '{symbol}'의 임원 정보를 가져오지 못했습니다 (get_stock_info 실패).")
        return None
    
    def get_comparison_data(self, tickers: list, start: str, end: str) -> pd.DataFrame | None:
        """
        여러 티커의 종가 데이터를 다운로드하고 첫날 기준으로 정규화합니다.
        """
        try:
            data = yf.download(tickers, start=start, end=end, progress=False, auto_adjust=True)
            if data.empty or 'Close' not in data:
                logger.warning(f"yfinance: 티커 {tickers}에 대한 종가 데이터를 가져오지 못했습니다.")
                return None

            close_prices = data['Close']
            
            # 단일 티커일 경우 Series로 반환되므로 DataFrame으로 변환
            if isinstance(close_prices, pd.Series):
                close_prices = close_prices.to_frame(name=tickers[0])

            # 모든 데이터가 NaN인 열(티커) 제거
            close_prices.dropna(axis=1, how='all', inplace=True)
            if close_prices.empty:
                 logger.warning(f"yfinance: {tickers}에 대한 유효한 종가 데이터가 없습니다.")
                 return None

            # 각 종목의 유효한 첫 거래일 가격으로 정규화
            first_valid_prices = close_prices.bfill().iloc[0]
            normalized_prices = (close_prices / first_valid_prices) * 100
            
            logger.info(f"yfinance: {tickers} 비교 데이터 정규화 완료")
            return normalized_prices

        except Exception as e:
            logger.error(f"yfinance: 비교 데이터 처리 중 예외 발생: {e}", exc_info=True)
            return None

