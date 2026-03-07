import { create } from 'zustand';
import type { Bond, BondsData } from './types';
import { bondsApi } from './bonds';

interface BondsState {
  bondsData: BondsData | null;
  bondsMap: Record<string, Bond> | null;
  isLoading: boolean;
  error: string | null;
  lastFetchTime: number | null;
}

interface BondsActions {
  fetchBonds: (force?: boolean) => Promise<void>;
  getBondByIsin: (isin: string) => Bond | null;
  getBondByName: (name: string) => Bond | null;
  enrichPosition: (position: any) => any;
  enrichPositions: (positions: any[]) => any[];
}

type BondsStore = BondsState & BondsActions;

export const useBondsStore = create<BondsStore>((set, get) => ({
  bondsData: null,
  bondsMap: null,
  isLoading: false,
  error: null,
  lastFetchTime: null,

  fetchBonds: async (force = false) => {
    const { lastFetchTime, bondsData } = get();
    const now = Date.now();
    const CACHE_DURATION = 5 * 60 * 1000; // 5 минут

    // Используем кэш, если он свежий и не force
    if (!force && bondsData && lastFetchTime && (now - lastFetchTime < CACHE_DURATION)) {
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const data = await bondsApi.getLatestBonds();

      if (data) {
        // Создаем маппинг для быстрого поиска
        const map: Record<string, Bond> = {};
        data.bonds.forEach(bond => {
          map[bond.isin] = bond;
          if (bond.name) map[bond.name] = bond;
        });

        set({
          bondsData: data,
          bondsMap: map,
          isLoading: false,
          lastFetchTime: now,
        });
      } else {
        set({ error: 'Failed to fetch bonds data', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false,
      });
    }
  },

  getBondByIsin: (isin: string) => {
    const { bondsMap } = get();
    return bondsMap?.[isin] || null;
  },

  getBondByName: (name: string) => {
    const { bondsMap } = get();
    return bondsMap?.[name] || null;
  },

  enrichPosition: (position: any) => {
    const { bondsMap } = get();

    if (position.instrumentType !== 'bond') return position;

    const bondData = bondsMap?.[position.isin || ''] ||
                     bondsMap?.[position.instrumentName || ''];

    if (bondData) {
      return {
        ...position,
        bondData,
        bondRating: bondData.creditRating,
        bondYtm: bondData.ytm,
        bondMaturity: bondData.maturityDate,
      };
    }

    return position;
  },

  enrichPositions: (positions: any[]) => {
    const { bondsMap } = get();

    return positions.map(position => {
      if (position.instrumentType !== 'bond') return position;

      const bondData = bondsMap?.[position.isin || ''] ||
                       bondsMap?.[position.instrumentName || ''];

      if (bondData) {
        return {
          ...position,
          bondData,
          bondRating: bondData.creditRating,
          bondYtm: bondData.ytm,
          bondMaturity: bondData.maturityDate,
        };
      }

      return position;
    });
  },
}));
