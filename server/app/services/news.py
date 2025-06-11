# app/services/news.py

import httpx
import xml.etree.ElementTree as ET
from datetime import datetime, timezone

class NewsService:
    async def get_yahoo_rss_news(self, symbol: str, limit: int = 10) -> list:
        url = f"https://finance.yahoo.com/rss/headline?s={symbol.upper()}"
        # ✅ 실제 브라우저처럼 보이도록 User-Agent 헤더를 더 구체적으로 설정
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        news_list = []

        print(f"--- [뉴스 서비스 디버그 시작]: {symbol} ---")
        print(f"[DEBUG] 요청 URL: {url}")

        try:
            async with httpx.AsyncClient() as client:
                # ✅ Follow redirects and set a reasonable timeout
                response = await client.get(url, headers=headers, timeout=15, follow_redirects=True)
            
            print(f"[DEBUG] 응답 상태 코드: {response.status_code}")
            print(f"[DEBUG] 응답 헤더 일부: {dict(response.headers)}")

            # ✅ 요청이 성공했는지 확인
            response.raise_for_status()

            # ✅ 응답 내용을 디코딩하여 출력 (어떤 데이터가 왔는지 확인)
            response_text = response.text
            print(f"[DEBUG] 수신된 원본 데이터 (앞 500자): \n{response_text[:500]}")

            root = ET.fromstring(response.content)
            
            item_count = 0
            for item in root.findall('./channel/item'):
                item_count += 1
                title = item.findtext('title', 'N/A')
                pub_date_str = item.findtext('pubDate', None)
                
                print(f"[DEBUG] 파싱된 아이템 {item_count}: {title}")

                published_date_iso = None
                if pub_date_str:
                    try:
                        # RFC 822 형식을 파싱
                        dt_object = datetime.strptime(pub_date_str, '%a, %d %b %Y %H:%M:%S %z')
                        published_date_iso = dt_object.isoformat()
                    except (ValueError, TypeError):
                        published_date_iso = None

                news_list.append({
                    "title": title,
                    "url": item.findtext('link', '#'),
                    "publishedDate": published_date_iso,
                    "source": "Yahoo Finance RSS",
                    "summary": item.findtext('description', '')
                })

                if len(news_list) >= limit:
                    break
            
            print(f"[DEBUG] 총 {item_count}개의 아이템을 찾았고, {len(news_list)}개를 리스트에 추가했습니다.")
            
            if item_count == 0:
                print("[WARN] XML 데이터에서 <item> 태그를 찾지 못했습니다. 야후 파이낸스의 응답 구조가 변경되었거나 내용이 비어있을 수 있습니다.")

            return news_list

        except httpx.RequestError as e:
            print(f"[ERROR] HTTP 요청 중 에러 발생: {e.__class__.__name__} - {e}")
            return []
        except httpx.HTTPStatusError as e:
            print(f"[ERROR] 야후 파이낸스에서 에러 응답: 상태 코드 {e.response.status_code}")
            return []
        except ET.ParseError as e:
            print(f"[ERROR] XML 파싱 에러: {e}")
            return []
        except Exception as e:
            print(f"[ERROR] 예상치 못한 에러 발생: {e.__class__.__name__} - {e}")
            return []
        finally:
            print(f"--- [뉴스 서비스 디버그 종료]: {symbol} ---")