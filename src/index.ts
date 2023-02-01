import { splitSpacesExcludeQuotes } from "quoted-string-space-split"
import { ChildProcessByStdio, spawn } from "child_process"

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

class Process {
    static readonly restartSuffix = ':restart'
    readonly restartable: boolean
    readonly cmd: string[]
    child?: ChildProcessByStdio<null, null, null>

    constructor(command: string) {
        this.restartable = command.endsWith(Process.restartSuffix)
        this.cmd = splitSpacesExcludeQuotes(command.split(Process.restartSuffix)[0])
    }

    async start() {
        const [command, ...args] = this.cmd
        this.child = spawn(command, args, {
            stdio: [process.stdin, process.stdout, process.stderr],
        })
        console.log(`${this.cmd} started`)
    }

    async probe() {
        if (!this.child) {
            await this.start()
        }

        if (this.child?.exitCode) {
            console.log(`${this.cmd} killed`)

            await sleep(1000)

            if (!this.restartable) {
                throw new Error("X")
            }
            
            await this.start()
        }
    }

    async signal(signal: number) {
        this.child?.kill(signal)
    }

    async cleanup() {
        if (!this.child) {
            return
        }

        this.child.kill()
    }
}

export default class ProcessWatchdog {
    readonly processes: Process[]

    constructor(commands: string[]) {
        this.processes = commands.map(cmd => new Process(cmd))
    }

    handleSignal = async (signal: number) => {
        console.log(`handle ${signal}`)
        await Promise.all(this.processes.map(_ => _.signal(signal)))
    }

    async run() {
        for (const signal of [
            'SIGINT',
            'SIGTERM',
        ]) {
            process.on(signal, this.handleSignal)
        }

        try {
            while (true) {
                console.log('loop')
                await Promise.all(this.processes.map(_ => _.probe()))
                await sleep(100)
            }
        } catch (err) {
            console.log(err)
            await Promise.all(this.processes.map(_ => _.cleanup()))
        }
    }
}
