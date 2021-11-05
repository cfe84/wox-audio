import { IWoxQueryHandler, JsonRPCAction, Logger, Result, ResultItem } from "wox-ts"
import * as fs from "fs"
import { exec } from "child_process"
import { Consts } from "./Consts"

export interface RenameMeHandlerDeps {
  logger: Logger
}

const METHOD_SET = "set"
const METHOD_INVALID = "INVALID"
const COMMAND_SET = "set"

interface ExecResult {
  stdOut: string,
  stdErr: string
}

interface Device {
  Index: number,
  Default: boolean,
  Type: "Recording" | "Playback",
  Name: string,
  ID: string,
  Device: any
}

const execAsync = (command: string): Promise<ExecResult> => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdOut, stdErr) => {
      if (err) {
        reject(err)
      } else {
        resolve({ stdErr, stdOut })
      }
    })
  })
}

export class AudioHandler implements IWoxQueryHandler {
  constructor(private deps: RenameMeHandlerDeps) { }

  private async getOutputDevicesAsync(command: string): Promise<ResultItem[]> {
    let filter = ""
    if (command.indexOf(`out`) >= 0 || command.indexOf(`speak`) >= 0) {
      filter = " | Where-Object Type -EQ 'Playback'"
    } else if (command.indexOf(`in`) >= 0 || command.indexOf(`mic`) >= 0) {
      filter = " | Where-Object Type -EQ 'Recording'"
    }
    const devicesRes = await execAsync(`powershell "Get-AudioDevice -list ${filter} | ConvertTo-Json"`)
    if (devicesRes.stdErr) {
      this.deps.logger.log(`Error getting device: ${devicesRes.stdErr}`)
    }
    const devices = JSON.parse(devicesRes.stdOut) as Device[]
    return devices
      .sort((a, b) => a.Type.localeCompare(b.Type))
      .filter(device => !device.Default).map((device) => {
        const deviceType = device.Type === "Playback"
          ? "speaker"
          : "microphone"
        const deviceLogo = device.Type === "Playback"
          ? Consts.img.speaker
          : Consts.img.microphone
        const deviceResult: ResultItem =
        {
          Title: `Use ${device.Name} as default ${deviceType}`,
          Subtitle: "Set default audio device",
          IcoPath: deviceLogo,
          JsonRPCAction: {
            method: METHOD_SET,
            parameters: [device.ID]
          }
        }
        return deviceResult
      })

  }

  private async setOutputDevice(deviceId: string) {
    const res = await execAsync(`powershell "Set-AudioDevice -ID '${deviceId}'"`)
    if (res.stdErr) {
      this.deps.logger.log(`Error setting device: ${res.stdErr}`)
    }
  }

  async processAsync(rpcAction: JsonRPCAction): Promise<Result> {
    if (rpcAction.method === METHOD_SET) {
      this.setOutputDevice(rpcAction.parameters[0])
    } else if (rpcAction.method !== METHOD_INVALID) {
      if (rpcAction.parameters[0].startsWith(COMMAND_SET)) {
        return {
          result: await this.getOutputDevicesAsync(rpcAction.parameters[0])
        }
      }
    }
    return {
      result: []
    }
  }
}