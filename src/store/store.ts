
import { create } from "zustand"

export interface Position{
ticker:string
name:string
type:string
sector?:string
quantity:number
avgPrice:number
currentPrice:number
value:number
pnl:number
share:number
}

interface State{
positions:Position[]
setPositions:(p:Position[])=>void
}

export const useStore=create<State>((set)=>({
positions:[],
setPositions:(positions)=>set({positions})
}))
