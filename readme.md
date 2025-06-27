

* client 실행
npm run dev

* server 실행
- 가상환경 python3.11 
  python3.11 -m venv .venv
  source .venv/bin/activate
- server 실행
  uvicorn app.main:app --reload