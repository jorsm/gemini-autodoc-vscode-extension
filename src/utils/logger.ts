import * as vscode from "vscode";

export class Logger {
  private readonly outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  log(message: string): void {
    this.outputChannel.appendLine(`[INFO] ${message}`);
  }

  warn(message: string): void {
    this.outputChannel.appendLine(`[WARN] ${message}`);
  }

  error(message: string): void {
    this.outputChannel.appendLine(`[ERROR] ${message}`);
  }
}
