
import PortfolioTable from "../components/PortfolioTable"
import AllocationChart from "../charts/AllocationChart"
import TopChart from "../charts/TopChart"
import PerformanceChart from "../charts/PerformanceChart"
import Stats from "../components/Stats"

export default function Dashboard(){

return(

<>

<Stats/>

<div className="grid">

<AllocationChart/>
<TopChart/>
<PerformanceChart/>

</div>

<PortfolioTable/>

</>

)

}
