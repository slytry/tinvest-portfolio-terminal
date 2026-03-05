
import TokenInput from "./components/TokenInput"
import Dashboard from "./layout/Dashboard"
import { useStore } from "./store/store"

export default function App(){

const positions = useStore(s=>s.positions)

return(
<div className="container">

<h1>Investment Portfolio Terminal</h1>

<TokenInput/>

{positions.length>0 && <Dashboard/>}

</div>
)
}
