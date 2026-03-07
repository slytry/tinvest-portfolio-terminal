import type { Bond, BondsData, BondFilter, EnrichedBondPosition } from './types';

// Кэш для данных
let bondsDataCache: BondsData | null = null;
let bondsMapCache: Record<string, Bond> | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

class BondsApi {
  private basePath = '/data'; // папка public/data

  /**
   * Получить последний файл с облигациями
   */
  async getLatestBonds(): Promise<BondsData | null> {
    try {
      // Проверка кэша
      if (bondsDataCache && lastFetchTime && Date.now() - lastFetchTime < CACHE_DURATION) {
        return bondsDataCache;
      }

      const response = await fetch(`${this.basePath}/bonds_latest.json`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: BondsData = await response.json();

      // Обновляем кэш
      bondsDataCache = data;
      lastFetchTime = Date.now();

      // Создаем маппинг для быстрого поиска
      bondsMapCache = {};
      data.bonds.forEach(bond => {
        bondsMapCache![bond.isin] = bond;
        // Также индексируем по названию для поиска
        if (bond.name) {
          bondsMapCache![bond.name] = bond;
        }
      });

      return data;
    } catch (error) {
      console.error('❌ Ошибка загрузки облигаций:', error);
      return null;
    }
  }

  /**
   * Получить маппинг ISIN -> Bond
   */
  async getBondsMap(): Promise<Record<string, Bond>> {
    if (bondsMapCache) return bondsMapCache;

    const data = await this.getLatestBonds();
    if (!data) return {};

    return bondsMapCache!;
  }

  /**
   * Найти облигацию по ISIN
   */
  async findBondByIsin(isin: string): Promise<Bond | null> {
    const map = await this.getBondsMap();
    return map[isin] || null;
  }

  /**
   * Найти облигацию по тикеру или названию
   */
  async findBondByTicker(ticker: string): Promise<Bond | null> {
    const data = await this.getLatestBonds();
    if (!data) return null;

    // Поиск по частичному совпадению
    const searchLower = ticker.toLowerCase();
    return data.bonds.find(bond =>
      bond.name.toLowerCase().includes(searchLower) ||
      bond.isin.toLowerCase().includes(searchLower) ||
      bond.issuer.toLowerCase().includes(searchLower)
    ) || null;
  }

  /**
   * Обогатить позиции портфеля данными облигаций
   */
  async enrichPortfolioPositions(positions: Array<{
    instrumentType?: string;
    isin?: string;
    ticker?: string;
    instrumentName?: string;
  }>): Promise<Array<any>> {
    const map = await this.getBondsMap();

    return positions.map(position => {
      // Только для облигаций
      if (position.instrumentType !== 'bond') return position;

      // Пробуем найти по ISIN или названию
      const bondData = map[position.isin || ''] ||
                      map[position.instrumentName || ''] ||
                      this.findClosestMatch(position.instrumentName || '', map);

      if (bondData) {
        return {
          ...position,
          bondData,
          bondRating: bondData.creditRating,
          bondYtm: bondData.ytm,
          bondMaturity: bondData.maturityDate,
          bondDuration: bondData.duration,
          bondCoupon: bondData.couponRate,
          bondPrice: bondData.price,
        };
      }

      return position;
    });
  }

  /**
   * Получить рейтинг для конкретного ISIN
   */
  async getRatingByIsin(isin: string): Promise<{
    rating: string;
    color: string;
    ytm: number;
  } | null> {
    const bond = await this.findBondByIsin(isin);
    if (!bond) return null;

    return {
      rating: bond.creditRating,
      color: this.getRatingColor(bond.creditRating),
      ytm: bond.ytm,
    };
  }

  /**
   * Получить статистику по облигациям
   */
  async getBondsStats(): Promise<BondsData['stats'] | null> {
    const data = await this.getLatestBonds();
    return data?.stats || null;
  }

  // Вспомогательные функции
  private getRatingColor(rating: string): string {
    if (!rating) return 'gray';
    if (rating.startsWith('AAA')) return 'green';
    if (rating.startsWith('AA')) return 'lime';
    if (rating.startsWith('A')) return 'teal';
    if (rating.startsWith('BBB')) return 'blue';
    if (rating.startsWith('BB')) return 'yellow';
    if (rating.startsWith('B')) return 'orange';
    if (rating.startsWith('CCC')) return 'red';
    return 'gray';
  }

  private findClosestMatch(name: string, map: Record<string, Bond>): Bond | null {
    const searchName = name.toLowerCase();

    // Ищем по частичному совпадению в названиях
    for (const bond of Object.values(map)) {
      if (bond.name.toLowerCase().includes(searchName) ||
          searchName.includes(bond.name.toLowerCase())) {
        return bond;
      }
    }

    return null;
  }
}

// Создаем и экспортируем единственный экземпляр
export const bondsApi = new BondsApi();
