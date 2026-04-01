import type { RunStageCommandOptions } from './types'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { LINE_SPLIT_REGEX } from './constants'
import { StageRenderer } from './stage-renderer'

function flushBufferLines(
  buffer: string,
  isEnd: boolean,
  onLine: (line: string) => void
) {
  const parts = buffer.split(LINE_SPLIT_REGEX)
  const completeCount = isEnd ? parts.length : parts.length - 1

  for (let index = 0; index < completeCount; index++) {
    onLine(parts[index] ?? '')
  }

  return isEnd ? '' : (parts.at(-1) ?? '')
}

export async function runStageCommand(
  title: string,
  command: string,
  args: string[] = [],
  options: RunStageCommandOptions = {}
) {
  const renderer = new StageRenderer(title, options)
  renderer.start()

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      shell: options.shell ?? process.platform === 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      ...options.spawnOptions
    })

    let stdoutBuffer = ''
    let stderrBuffer = ''

    child.stdout.on('data', (chunk) => {
      stdoutBuffer += chunk.toString()
      stdoutBuffer = flushBufferLines(stdoutBuffer, false, line => renderer.appendLine(line))
    })

    child.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString()
      stderrBuffer = flushBufferLines(stderrBuffer, false, line => renderer.appendLine(line))
    })

    child.on('error', (error) => {
      renderer.finishFailure()
      rejectPromise(error)
    })

    child.on('close', (code) => {
      stdoutBuffer = flushBufferLines(stdoutBuffer, true, line => renderer.appendLine(line))
      stderrBuffer = flushBufferLines(stderrBuffer, true, line => renderer.appendLine(line))

      if (code === 0) {
        renderer.finishSuccess()
        resolvePromise()
        return
      }

      renderer.finishFailure()
      rejectPromise(new Error(`${command} ${args.join(' ')} failed with exit code ${code ?? 'unknown'}`))
    })
  })
}
