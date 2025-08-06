import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
import logging

logger = logging.getLogger(__name__)


class NewsService:
    async def get_yahoo_rss_news(self, symbol: str, limit: int = 10) -> list:
        url = f"https://finance.yahoo.com/rss/headline?s={symbol.upper()}"
        # ✅ 실제 브라우저처럼 보이도록 User-Agent 헤더를 더 구체적으로 설정
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        news_list = []

        logger.info(f"뉴스 서비스 시작: '{symbol}', URL: {url}")

        try:
            async with httpx.AsyncClient() as client:
                # ✅ Follow redirects and set a reasonable timeout
                response = await client.get(url, headers=headers, timeout=15, follow_redirects=True)
            
            logger.info(f"뉴스 서비스 '{symbol}': 응답 상태 코드 {response.status_code}")

            # ✅ 요청이 성공했는지 확인
            response.raise_for_status()

            root = ET.fromstring(response.content)
            
            item_count = 0
            for item in root.findall('./channel/item'):
                if len(news_list) >= limit:
                    break
                
                item_count += 1
                title = item.findtext('title', 'N/A')
                pub_date_str = item.findtext('pubDate', None)

                published_date_iso = None
                if pub_date_str:
                    try:
                        # RFC 822 형식을 파싱
                        dt_object = datetime.strptime(pub_date_str, '%a, %d %b %Y %H:%M:%S %z')
                        published_date_iso = dt_object.isoformat()
                    except (ValueError, TypeError) as e:
                        logger.warning(f"뉴스 날짜 파싱 오류: '{pub_date_str}', 에러: {e}")
                        published_date_iso = None # 파싱 실패 시 None으로 설정

                news_list.append({
                    "title": title,
                    "url": item.findtext('link', '#'),
                    "publishedDate": published_date_iso,
                    "source": "Yahoo Finance RSS",
                    "summary": item.findtext('description', '')
                })

            logger.info(f"뉴스 서비스 '{symbol}': 총 {item_count}개 아이템 발견, {len(news_list)}개 처리 완료.")
            
            if item_count == 0:
                logger.warning(f"뉴스 서비스 '{symbol}': XML 데이터에서 <item> 태그를 찾지 못했습니다. 응답 구조가 변경되었거나 내용이 비어있을 수 있습니다.")

            return news_list

        except httpx.RequestError as e:
            logger.error(f"뉴스 서비스 '{symbol}': HTTP 요청 중 에러 발생: {e.__class__.__name__} - {e}", exc_info=True)
            return []
        except httpx.HTTPStatusError as e:
            logger.error(f"뉴스 서비스 '{symbol}': 야후 파이낸스에서 에러 응답: 상태 코드 {e.response.status_code}", exc_info=True)
            return []
        except ET.ParseError as e:
            logger.error(f"뉴스 서비스 '{symbol}': XML 파싱 에러: {e}", exc_info=True)
            return []
        except Exception as e:
            logger.error(f"뉴스 서비스 '{symbol}': 예상치 못한 에러 발생: {e.__class__.__name__} - {e}", exc_info=True)
            return []