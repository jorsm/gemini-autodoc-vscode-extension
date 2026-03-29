import * as vscode from "vscode";

export class Logger {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  private getTimestamp(): string {
    return new Date().toISOString();
  }

  log(message: string): void {
    this.outputChannel.appendLine(`[${this.getTimestamp()}] [INFO] ${message}`);
  }

  warn(message: string): void {
    this.outputChannel.appendLine(`[${this.getTimestamp()}] [WARN] ${message}`);
  }

  error(message: string): void {
    this.outputChannel.appendLine(`[${this.getTimestamp()}] [ERROR] ${message}`);
  }
}
