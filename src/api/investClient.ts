
import { createSdk } from "@tinkoff/invest-js"

export function createClient(token:string){
return createSdk(token)
}
