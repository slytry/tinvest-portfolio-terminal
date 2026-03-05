
import { useState } from "react"
import { createClient } from "../api/investClient"
import { loadPortfolio } from "../api/loadPortfolio"
import { useStore } from "../store/store"

export default function TokenInput(){

const [token,setToken]=useState("")
const setPositions=useStore(s=>s.setPositions)

async function connect(){

try{

const client=createClient(token)
const positions=await loadPortfolio(client)

const mapped=positions.map((p:any)=>{

const qty=Number(p.quantity.units)
const price=Number(p.currentPrice?.units||0)
const avg=Number(p.averagePositionPrice?.units||0)

const value=price*qty
const pnl=(price-avg)*qty

return{
ticker:p.ticker,
name:p.name,
type:p.instrumentType,
quantity:qty,
avgPrice:avg,
currentPrice:price,
value,
pnl,
share:0
}

})

const total=mapped.reduce((s,p)=>s+p.value,0)
mapped.forEach(p=>p.share=(p.value/total)*100)

setPositions(mapped)

}catch(e:any){
alert(e.message)
}

}

return(
<div className="token">

<input
placeholder="T-Invest API Token"
value={token}
onChange={e=>setToken(e.target.value)}
/>

<button onClick={connect}>
Connect
</button>

</div>
)

}
