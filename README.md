# TInvest Portfolio Terminal

Веб-приложение для анализа портфеля Тинькофф Инвестиций.

## Что умеет

- Загрузка портфелей по всем счетам через Tinkoff Invest API.
- Обогащение облигаций данными (рейтинг, YTM, дюрация, купон, срок).
- Аналитика по портфелю:
  - общая стоимость,
  - доли позиций,
  - аллокация по классам активов.
- Гибкие колонки таблицы (с подсказками по каждому показателю).
- Экспорт текущего портфеля в CSV (`ISIN`, `Название`, `Доля`, `Текущая цена`, `Количество`).
- Генерация промпта для AI-анализа портфеля (в модальном окне, с копированием).
- Переключение темы: `Светлая` / `Тёмная` / `Авто`.

## Стек

- React 19
- Vite 7
- TypeScript
- Mantine UI
- Reatom (`@reatom/core`, `@reatom/react`)

## Требования

- Node.js `25.8.0` (см. `package.json`)
- npm

Рекомендуется `nvm`:

```bash
nvm install 25.8.0
nvm use 25.8.0
```

## Установка

```bash
npm install
```

## Запуск

```bash
npm run dev
```

Обычно приложение доступно на [http://localhost:5173](http://localhost:5173).

## Сборка

```bash
npm run build
npm start
```

`start` запускает `vite preview`.

## Скрипты

- `npm run dev` — dev-сервер Vite
- `npm run build` — production build
- `npm start` — preview production build
- `npm run typecheck` — проверка TypeScript
- `npm run check` — линт/проверки (`ultracite`)
- `npm run fix` — автофикс
- `npm run dohod:update` — обновление данных по облигациям из `scripts/bonds-dohod`

## Настройка токена

1. Откройте экран `Токен` в шапке.
2. Вставьте API токен Tinkoff Invest.
3. Нажмите `Сохранить и открыть портфель`.

Токен сохраняется в `localStorage`.

## Архитектура

```text
app/
  api/                       # API-клиент и state-модели
  features/
    auth/
      ui/
    routing/
      model.ts               # Reatom routes
      app-router.tsx
      theme-switcher.tsx
    portfolio/
      model/                 # доменные константы и шаблоны
      lib/                   # форматирование/экспорт
      ui/                    # страницы и компоненты
  app-theme.tsx
  app.css
  main.tsx
  setup.ts
```

### Ключевые модули

- `app/features/routing/model.ts` — маршрутизация на Reatom Router.
- `app/features/routing/theme-switcher.tsx` — переключение темы.
- `app/features/portfolio/ui/positions-table.tsx` — таблица портфеля.
- `app/features/portfolio/ui/analysis-modal.tsx` — модалка промптов.
- `app/features/portfolio/lib/export.ts` — CSV и генерация текста для AI-анализа.

## Обновление данных по облигациям

```bash
npm run dohod:update
```

Команда выполняет:

- `npm run dohod:load`
- `npm run dohod:convert`

Результат попадает в `public/data`.

## Известные проблемы

Если Vite пишет про версию Node (`Vite requires Node.js 20.19+ or 22.12+`) — используйте версию из `package.json` (`25.8.0`).
