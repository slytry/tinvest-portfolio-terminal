
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js"
import { useStore } from "../store/store"

ChartJS.register(CategoryScale,LinearScale,BarElement,Tooltip,Legend)

export default function TopChart(){

const positions=useStore(s=>s.positions)

const top=[...positions].sort((a,b)=>b.value-a.value).slice(0,10)

return(

<div className="card">

<h3>Top Positions</h3>

<Bar data={{
labels:top.map(p=>p.ticker),
datasets:[{label:"Value",data:top.map(p=>p.value)}]
}}/>

</div>

)

}
