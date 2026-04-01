import type { StageColor, StageRendererOptions, StageTheme } from './types'
import process from 'node:process'
import readline from 'node:readline'
import { styleText } from 'node:util'
import { DEFAULT_MAX_LINES, DEFAULT_SPINNER_FRAMES, DEFAULT_SPINNER_INTERVAL } from './constants'

const DEFAULT_THEME: StageTheme = {
  titleColor: 'blue',
  outputColor: 'gray',
  successSymbol: '✔',
  successColor: 'green',
  failureSymbol: '✖',
  failureColor: 'red',
  branchSymbol: '│',
  closeSymbol: '└'
}

export class StageRenderer {
  private readonly title: string
  private readonly maxLines: number
  private readonly spinnerFrames: readonly string[]
  private readonly spinnerInterval: number
  private readonly stdout: NodeJS.WriteStream
  private readonly isTTY: boolean
  private readonly theme: StageTheme
  private readonly lines: string[] = []
  private frameIndex = 0
  private interval: NodeJS.Timeout | undefined
  private renderedLineCount = 0

  constructor(title: string, options: StageRendererOptions = {}) {
    this.title = title
    this.maxLines = options.maxLines ?? DEFAULT_MAX_LINES
    this.spinnerFrames = options.spinnerFrames?.length ? options.spinnerFrames : DEFAULT_SPINNER_FRAMES
    this.spinnerInterval = options.spinnerInterval ?? DEFAULT_SPINNER_INTERVAL
    this.stdout = (options.stdout ?? process.stdout) as NodeJS.WriteStream
    this.isTTY = options.isTTY ?? Boolean(this.stdout.isTTY)
    this.theme = {
      ...DEFAULT_THEME,
      ...options.theme
    }
  }

  start() {
    if (!this.isTTY) {
      this.stdout.write(`... ${this.title}\n`)
      return
    }

    this.render()
    this.interval = setInterval(() => {
      this.frameIndex = (this.frameIndex + 1) % this.spinnerFrames.length
      this.render()
    }, this.spinnerInterval)
  }

  appendLine(content: string) {
    const line = content.trimEnd()
    if (!line) {
      return
    }

    this.lines.push(line)
    if (this.lines.length > this.maxLines) {
      this.lines.splice(0, this.lines.length - this.maxLines)
    }

    if (!this.isTTY) {
      this.stdout.write(`${styleText(this.theme.outputColor, `${this.theme.branchSymbol} ${line}`)}\n`)
      return
    }

    this.render()
  }

  finishSuccess() {
    this.finish(this.theme.successSymbol, this.theme.successColor)
  }

  finishFailure() {
    this.finish(this.theme.failureSymbol, this.theme.failureColor)
  }

  private finish(symbol: string, color?: StageColor) {
    this.stopSpinner()

    const coloredSymbol = color ? styleText(color, symbol) : symbol

    if (!this.isTTY) {
      this.stdout.write(`${coloredSymbol} ${this.title}\n`)
      return
    }

    this.clearPreviousRender()
    this.stdout.write(`${coloredSymbol} ${this.title}\n`)
  }

  private stopSpinner() {
    if (!this.interval) {
      return
    }

    clearInterval(this.interval)
    this.interval = undefined
  }

  private render() {
    this.clearPreviousRender()

    const spinner = this.spinnerFrames[this.frameIndex] ?? this.spinnerFrames[0] ?? ''
    this.stdout.write(`${styleText(this.theme.titleColor, `${spinner} ${this.title}`)}\n`)

    for (const line of this.lines) {
      this.stdout.write(`${styleText(this.theme.outputColor, `${this.theme.branchSymbol} ${line}`)}\n`)
    }

    if (this.lines.length > 0) {
      this.stdout.write(`${styleText(this.theme.outputColor, this.theme.closeSymbol)}\n`)
    }

    this.renderedLineCount = 1 + this.lines.length + (this.lines.length > 0 ? 1 : 0)
  }

  private clearPreviousRender() {
    if (!this.isTTY || this.renderedLineCount === 0) {
      return
    }

    readline.moveCursor(this.stdout, 0, -this.renderedLineCount)
    readline.clearScreenDown(this.stdout)
    this.renderedLineCount = 0
  }
}

export { DEFAULT_THEME }
