
import { useStore } from "../store/store"

export default function Stats(){

const positions=useStore(s=>s.positions)

const value=positions.reduce((s,p)=>s+p.value,0)
const pnl=positions.reduce((s,p)=>s+p.pnl,0)

return(

<div className="stats">

<div className="card">
<h3>Total Value</h3>
<p>{value.toFixed(2)}</p>
</div>

<div className="card">
<h3>Total PnL</h3>
<p className={pnl>=0?"green":"red"}>{pnl.toFixed(2)}</p>
</div>

</div>

)

}
