
import { Pie } from "react-chartjs-2"
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js"
import { useStore } from "../store/store"

ChartJS.register(ArcElement,Tooltip,Legend)

export default function AllocationChart(){

const positions=useStore(s=>s.positions)

const map:any={}

positions.forEach(p=>{
map[p.type]=(map[p.type]||0)+p.value
})

return(

<div className="card">

<h3>Allocation</h3>

<Pie data={{
labels:Object.keys(map),
datasets:[{data:Object.values(map)}]
}}/>

</div>

)

}
