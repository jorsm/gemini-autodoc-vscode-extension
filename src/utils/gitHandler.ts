import * as vscode from "vscode";
import { Logger } from "./logger";

export interface GitContext {
  hash: string;
  message: string;
  author: string;
  author_email: string;
  date: string;
}

export class GitHandler {
  private readonly gitApi: any;
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
    const gitExtension = vscode.extensions.getExtension("vscode.git");
    if (gitExtension?.isActive) {
      this.gitApi = gitExtension.exports.getAPI(1);
    }
  }

  getChangedFiles(repoIndex: number = 0): string[] {
    if (!this.gitApi?.repositories[repoIndex]) {
      return [];
    }

    const repo = this.gitApi.repositories[repoIndex];
    try {
      const changes = repo.state.workingTreeChanges || [];
      return changes.filter((change: any) => change.status !== 4).map((change: any) => change.uri.fsPath);
    } catch (error) {
      this.logger.error(`Error getting changed files: ${error}`);
      return [];
    }
  }

  async getCommitChanges(repoIndex: number = 0, hash?: string): Promise<string[]> {
    if (!this.gitApi?.repositories[repoIndex]) {
      return [];
    }

    const repo = this.gitApi.repositories[repoIndex];
    try {
      // If no hash provided, use HEAD
      const ref = hash || "HEAD";
      // Diff HEAD with its parent to get changes in the latest commit
      const changes = await repo.diffBetween(`${ref}~1`, ref);
      return changes.map((change: any) => change.uri.fsPath);
    } catch (error) {
      this.logger.error(`Error getting commit changes: ${error}`);
      return [];
    }
  }

  getCommitContext(repoIndex: number = 0): GitContext | undefined {
    if (!this.gitApi?.repositories[repoIndex]) {
      return undefined;
    }

    const repo = this.gitApi.repositories[repoIndex];
    try {
      const head = repo.state.HEAD;
      if (!head) return undefined;

      return {
        hash: head.commit || "",
        message: head.message || "",
        author: head.authorName || "",
        author_email: head.authorEmail || "",
        date: head.date?.toISOString() || "",
      };
    } catch (error) {
      this.logger.error(`Error getting commit context: ${error}`);
      return undefined;
    }
  }

  getRepositoryCount(): number {
    return this.gitApi?.repositories.length ?? 0;
  }

  getRepositoryRoot(repoIndex: number): string | undefined {
    if (!this.gitApi?.repositories[repoIndex]) {
      return undefined;
    }
    return this.gitApi.repositories[repoIndex].rootUri.fsPath;
  }
}
