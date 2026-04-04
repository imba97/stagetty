import type { RunStageCommandOptions } from './types'
import { spawn } from 'node:child_process'
import process from 'node:process'
import { LINE_SPLIT_REGEX } from './constants'
import { StageRenderer } from './stage-renderer'

function quoteShellArg(arg: string) {
  if (!arg) {
    return '""'
  }

  // Quote and escape for common shell parsing rules.
  return `"${arg.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
}

function buildShellCommand(command: string, args: string[]) {
  if (args.length === 0) {
    return command
  }

  return `${command} ${args.map(quoteShellArg).join(' ')}`
}

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
  const useShell = options.shell ?? process.platform === 'win32'

  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = useShell
      ? spawn(buildShellCommand(command, args), {
          cwd: options.cwd,
          env: options.env,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
          ...options.spawnOptions
        })
      : spawn(command, args, {
          cwd: options.cwd,
          env: options.env,
          shell: false,
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
