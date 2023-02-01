#!/usr/bin/env node
import yargs from "yargs"
import { hideBin } from "yargs/helpers"
import ProcessWatchdog from "."

async function main() {
    const argv = await yargs(hideBin(process.argv))
        .parse()
    
    const commands = argv._.map(x => x.toString())

    const pw = new ProcessWatchdog(commands)
    await pw.run()
}

main()
