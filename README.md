# TInvest Portfolio Terminal

Приложение разделено на **frontend (Vite + React + Reatom)** и **backend (Go)**.

- Frontend: тонкий BFF-клиент (UI + состояние + форматирование)
- Backend: бизнес-логика, интеграция с T-Invest API, агрегация данных

## Стек

- Frontend: React 19, Vite 7, TypeScript, Mantine, Reatom
- Backend: Go 1.23, net/http

## Запуск

### 1) Установить frontend зависимости

```bash
npm install
```

### 2) Запустить backend

```bash
npm run dev:backend
```

Backend по умолчанию слушает `http://localhost:8080`.

### 3) Запустить frontend

```bash
npm run dev:frontend
```

Frontend: `http://localhost:5173`.

Vite проксирует `/api/*` на backend (`localhost:8080`).

## Проверки

```bash
npm run typecheck
npm run backend:test
```

## Авторизация

1. Откройте страницу `Токен`.
2. Вставьте API токен T-Invest.
3. Нажмите `Сохранить и открыть портфель`.

Токен хранится на backend в in-memory session store (по cookie сессии), а не в `localStorage`.

## Архитектура

### Frontend (тонкий)

- Только UI, роутинг, локальные настройки интерфейса
- Все данные о портфеле/операциях грузятся с backend:
  - `GET /api/v1/portfolios`
  - `GET /api/v1/operations`
  - `POST /api/v1/auth/token`

```text
frontend/
  app/
  public/
  scripts/
  index.html
  vite.config.ts
  tsconfig.json
```

### Backend (DDD + Clean Architecture)

```text
backend/
  cmd/server/
    main.go
  internal/
    domain/
      auth/
      portfolio/
      operations/
    application/
      auth/
      portfolio/
      operations/
    infrastructure/
      memory/          # in-memory token store
      tbank/           # REST adapter to T-Invest API
    interfaces/http/   # handlers + router
    app/               # DI / composition root
```

Слои:

- `domain`: сущности и интерфейсы репозиториев
- `application`: use-cases
- `infrastructure`: внешние адаптеры
- `interfaces/http`: HTTP transport

## Важно

- Backend использует REST endpoint T-Invest API (`invest-public-api.tinkoff.ru/rest/...`).
- Если API вернет ошибку авторизации или формата токена, frontend покажет текст ошибки от backend.
- Все команды frontend выполняются из корня через `cd frontend && ...` (скрыто в npm scripts).
