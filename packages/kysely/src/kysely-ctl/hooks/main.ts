import type { DefineConfigInput, KyselyCTLConfig } from "kysely-ctl"
import { join } from "path"



const a= await import (join(process.cwd(),".config/kysely.config.ts")).then(r=>r.default as KyselyCTLConfig)





console.log("hooks",a)



export const runBeforeHooks = async ():Promise<void>=>{
console.log("runBeforeHooks")
}

export const runAfterHooks = async (code: number | null):Promise<void>=>{
console.log("runAfterHooks")
}



