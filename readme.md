<pre>```
client/
├── app/
│   ├── (main)/
│   │   └── page.tsx
│   ├── favicon.ico
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── shared/
│   │   └── ScrollToTopButton.tsx
│   ├── skeletons/
│   │   ├── GridSkeleton.tsx
│   │   ├── OfficersSkeleton.tsx
│   │   └── ProfileSkeleton.tsx
│   └── ui/
├── features/
│   ├── displays/
│   │   ├── MarketDataDisplay.tsx
│   │   ├── MetricsDisplay.tsx
│   │   ├── OfficersDisplay.tsx
│   │   ├── ProfileDisplay.tsx
│   │   ├── RecommendationsDisplay.tsx
│   │   └── SummaryDisplay.tsx
│   ├── AiQuestionSection.tsx
│   ├── FinancialSection.tsx
│   ├── HistorySection.tsx
│   ├── NewsSection.tsx
│   └── SearchSection.tsx
├── lib/
│   ├── api.ts
│   └── utils.ts
├── node_modules/
├── public/
├── types/
│   ├── common.d.ts
│   └── stock.d.ts
├── .env

server/
├── .venv/
├── app/
│   ├── core/
│   │   ├── constants.py
│   │   └── formatting.py
│   ├── services/
│   │   ├── llm.py
│   │   ├── news.py
│   │   ├── translation.py
│   │   └── yahoo_finance.py
│   ├── config.py
│   ├── main.py
│   └── schemas.py
├── .env
├── requirements.txt
├── yahoo_finance_rss_AAPL.xml
```</pre>

* client 실행
npm run dev

* server 실행
- 가상환경 python3.11 
  python3.11 -m venv .venv
  source .venv/bin/activate
- server 실행
  uvicorn app.main:app --reload