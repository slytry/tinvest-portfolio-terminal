
import { Line } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend } from "chart.js"
import { useStore } from "../store/store"

ChartJS.register(CategoryScale,LinearScale,PointElement,LineElement,Tooltip,Legend)

export default function PerformanceChart(){

const positions=useStore(s=>s.positions)

const value=positions.reduce((s,p)=>s+p.value,0)

const history=[value*0.8,value*0.9,value*1.0,value]

return(

<div className="card">

<h3>Portfolio Value</h3>

<Line data={{
labels:["T-3","T-2","T-1","Now"],
datasets:[{label:"Value",data:history}]
}}/>

</div>

)

}
