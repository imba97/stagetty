import type { SpawnOptionsWithoutStdio } from 'node:child_process'
import type { Writable } from 'node:stream'
import type { InspectColor } from 'node:util'

export type StageColor = InspectColor | readonly InspectColor[]

export interface StageTheme {
  titleColor: StageColor
  outputColor: StageColor
  successSymbol: string
  successColor: StageColor
  failureSymbol: string
  failureColor: StageColor
  branchSymbol: string
  closeSymbol: string
}

export interface StageRendererOptions {
  maxLines?: number
  spinnerFrames?: readonly string[]
  spinnerInterval?: number
  stdout?: Writable
  isTTY?: boolean
  theme?: Partial<StageTheme>
}

export interface RunStageCommandOptions extends StageRendererOptions {
  cwd?: string
  env?: NodeJS.ProcessEnv
  shell?: boolean
  spawnOptions?: Omit<SpawnOptionsWithoutStdio, 'cwd' | 'env' | 'shell' | 'stdio'>
}
