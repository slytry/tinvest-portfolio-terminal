import { create } from "zustand";
import type { AccountPortfolio } from "../api/client";

interface State {
	positions: AccountPortfolio[];
	setPositions: (p: AccountPortfolio[]) => void;
}

export const useStore = create<State>((set) => ({
	positions: [],
	setPositions: (positions) => set({ positions }),
}));
