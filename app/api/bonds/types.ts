// types/bonds.ts

/**
 * Типы для данных облигаций с dohod.ru
 */

// Основной тип облигации
export interface Bond {
  // Идентификация
  isin: string;
  name: string;
  issuer: string;
  mainBorrower: string | null;
  borrowerCountry: string;

  // Валютные параметры
  currency: string;
  volume: number; // Объем выпуска в обращении, млрд

  // Даты
  maturityDate: string; // Ближайшая дата погашения/оферты
  finalMaturityDate: string; // Дата погашения
  issueDate: string; // Дата выпуска
  yieldCalculationDate: string; // Дата, к которой рассчитывается доходность
  eventAtDate: string; // Событие в дату

  // Временные параметры
  yearsToMaturity: number; // Лет до даты
  duration: number; // Дюрация

  // Доходности
  ytm: number; // Эффективная доходность (YTM), %
  simpleYtm: number; // Примерная доходность без реинвестирования, %
  reinvestmentShare: number; // Доля прибыли от реинвестирования (к погашению)
  simpleYield: number; // Простая доходность, %
  currentYield: number; // Текущая доходность, %

  // Кредитные рейтинги
  creditRating: string; // Кредитное качество (рэнкинг) - например "AAA", "BBB"
  creditScore: number; // Кредитное качество (число, max=10)
  issuerQuality: number; // Качество эмитента (max=10)
  insideQ: number; // Inside Q (max=10)
  outsideQ: number; // Outside Q (max=10)
  netDebtEquity: number; // NetDebt/Equity (рейтинг) (max=10)

  // Ликвидность
  liquidityRatio: number; // Коэф. Ликвидности (max=100)
  dailyTurnover: number; // Медиана дневного оборота (млн в валюте торгов)

  // Характеристики
  complexity: number; // Сложность (max=5)
  size: number; // Размер (max=10)

  // Номинал и цена
  currentNominal: number; // Текущий номинал
  minLot: number; // Минимальный лот
  price: number; // Цена, % от номинала
  accruedInterest: number; // НКД

  // Купоны
  couponAmount: number; // Размер купона
  couponRate: number; // Текущий купон, %
  couponPerYear: number; // Купон (раз/год)
  couponType: string; // Тип купона (фиксированный, плавающий и т.д.)

  // Дополнительные параметры
  subordinated: string; // Субординированная (да/нет)
  guaranteed: string; // С гарантией (да/нет)
  issuerType: string; // Тип эмитента (государственные, корпоративные и т.д.)

  // Для FRN (облигации с плавающей ставкой)
  baseIndex: string | null; // Базовый индекс (для FRN)
  indexPremium: number; // Премия/Дисконт к базовому индексу (для FRN)
}

// Метаданные выгрузки
export interface BondsMeta {
  generated: string; // ISO дата генерации
  generatedReadable: string; // Человеко-читаемая дата
  source: string; // Источник данных
  totalBonds: number; // Всего облигаций
  version: string; // Версия формата
}

// Статистика по облигациям
export interface BondsStats {
  averageYtm: number; // Средняя доходность
  maxYtm: number; // Максимальная доходность
  minYtm: number; // Минимальная доходность
  totalVolume: number; // Общий объем
  byCurrency: Record<string, number>; // Распределение по валютам
  byRating: Record<string, number>; // Распределение по рейтингам
  byIssuerType?: Record<string, number>; // Распределение по типам эмитентов
  byCouponType?: Record<string, number>; // Распределение по типам купонов
}

// Основная структура JSON файла
export interface BondsData {
  meta: BondsMeta;
  stats: BondsStats;
  bonds: Bond[];
}

// Тип для маппинга ISIN -> Bond (для быстрого поиска)
export interface BondsMap {
  [isin: string]: Bond;
}

// Тип для обогащенной позиции в портфеле
export interface EnrichedBondPosition {
  isin: string;
  name: string;
  ticker?: string;
  creditRating: string;
  creditScore: number;
  ytm: number;
  price: number;
  currency: string;
  maturityDate: string;
}

// Тип для фильтрации облигаций
export interface BondFilter {
  minYtm?: number;
  maxYtm?: number;
  minCreditRating?: string;
  currencies?: string[];
  issuerTypes?: string[];
  minVolume?: number;
  maxComplexity?: number;
}

// Константы для рейтингов (для сортировки)
export const CREDIT_RATING_ORDER: Record<string, number> = {
  'AAA': 1,
  'AA': 2,
  'A': 3,
  'BBB': 4,
  'BB': 5,
  'B': 6,
  'CCC': 7,
  'CC': 8,
  'C': 9,
  'D': 10,
};

// Тип для цветов рейтингов
export const CREDIT_RATING_COLORS: Record<string, string> = {
  'AAA': 'green',
  'AA': 'lime',
  'A': 'teal',
  'BBB': 'blue',
  'BB': 'yellow',
  'B': 'orange',
  'CCC': 'red',
  'CC': 'red',
  'C': 'red',
  'D': 'dark',
};

// Вспомогательные функции для работы с рейтингами
export function getRatingColor(rating: string): string {
  if (!rating) return 'gray';

  // Ищем по началу строки (для случаев "AAA", "AA+" и т.д.)
  for (const [key, color] of Object.entries(CREDIT_RATING_COLORS)) {
    if (rating.startsWith(key)) {
      return color;
    }
  }
  return 'gray';
}

export function getRatingOrder(rating: string): number {
  if (!rating) return 999;

  for (const [key, order] of Object.entries(CREDIT_RATING_ORDER)) {
    if (rating.startsWith(key)) {
      return order;
    }
  }
  return 999;
}
