
export async function loadPortfolio(client:any){

const accounts=await client.users.getAccounts({})

const accountId=accounts.accounts[0].id

const portfolio=await client.operations.getPortfolio({accountId})

return portfolio.positions

}
