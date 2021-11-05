import { IWoxQueryHandler, JsonRPCAction, Logger, Result, ResultItem } from "wox-ts"
import * as fs from "fs"
import { exec } from "child_process"

export interface RenameMeHandlerDeps {
  logger: Logger
}

const METHOD_SET_OUT = "set out"
const METHOD_INVALID = "INVALID"
const COMMAND_SET_OUT = "out"

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
    const devicesRes = await execAsync('Get-AudioDevice -list | Where-Object Type -EQ "Playback" | ConvertTo-Json')
    const devices = JSON.parse(devicesRes.stdOut) as Device[]
    return devices.filter(device => !device.Default).map((device) => {
      const deviceResult =
      {
        Title: `Set ${device.Name} as default`,
        Subtitle: command,
        IcoPath: "img/logo.jpg",
        JsonRPCAction: {
          method: METHOD_SET_OUT,
          parameters: [device.ID]
        }
      }
      return deviceResult
    })

  }

  private setOutputDevice(deviceId: string) {

  }

  async processAsync(rpcAction: JsonRPCAction): Promise<Result> {
    if (rpcAction.method === METHOD_SET_OUT) {
      this.setOutputDevice(rpcAction.parameters[0])
    } else if (rpcAction.method !== METHOD_INVALID) {
      this.deps.logger.log(rpcAction.parameters[0])
      if (rpcAction.parameters[0].startsWith(COMMAND_SET_OUT)) {
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