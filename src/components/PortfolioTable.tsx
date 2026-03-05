
import { useStore } from "../store/store"

export default function PortfolioTable(){

const positions=useStore(s=>s.positions)

return(

<table>

<thead>
<tr>
<th>Ticker</th>
<th>Name</th>
<th>Type</th>
<th>Qty</th>
<th>Avg</th>
<th>Price</th>
<th>Value</th>
<th>Share</th>
<th>PnL</th>
</tr>
</thead>

<tbody>

{positions.map(p=>(
<tr key={p.ticker}>
<td>{p.ticker}</td>
<td>{p.name}</td>
<td>{p.type}</td>
<td>{p.quantity}</td>
<td>{p.avgPrice.toFixed(2)}</td>
<td>{p.currentPrice.toFixed(2)}</td>
<td>{p.value.toFixed(2)}</td>
<td>{p.share.toFixed(2)}%</td>
<td className={p.pnl>=0?"green":"red"}>{p.pnl.toFixed(2)}</td>
</tr>
))}

</tbody>

</table>

)
}
