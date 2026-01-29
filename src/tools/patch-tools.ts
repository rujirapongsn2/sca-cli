import * as fs from 'fs';

export interface Hunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: string[];
}

export interface UnifiedDiff {
  originalPath: string;
  patchedPath: string;
  hunks: Hunk[];
}

export class DiffGenerator {
  generate(original: string, patched: string, context = 3): string {
    const originalLines = original.split('\n');
    const patchedLines = patched.split('\n');

    const hunks = this.computeHunks(originalLines, patchedLines, context);
    return this.formatHunks(hunks);
  }

  fromFiles(originalPath: string, patchedPath: string, context = 3): string {
    const original = fs.readFileSync(originalPath, 'utf-8');
    const patched = fs.readFileSync(patchedPath, 'utf-8');
    return this.generate(original, patched, context);
  }

  private computeHunks(originalLines: string[], patchedLines: string[], context: number): Hunk[] {
    const hunks: Hunk[] = [];
    let i = 0;
    let j = 0;

    while (i < originalLines.length || j < patchedLines.length) {
      if (i >= originalLines.length) {
        j++;
        continue;
      }
      if (j >= patchedLines.length) {
        i++;
        continue;
      }
      if (originalLines[i] !== patchedLines[j]) {
        const hunk = this.findHunk(originalLines, patchedLines, i, j, context);
        if (hunk) {
          hunks.push(hunk);
          i = hunk.oldStart + hunk.oldLines;
          j = hunk.newStart + hunk.newLines.length;
          continue;
        }
      }
      i++;
      j++;
    }

    return hunks;
  }

  private findHunk(
    originalLines: string[],
    patchedLines: string[],
    i: number,
    j: number,
    context: number
  ): Hunk | null {
    let delStart = i;
    let addStart = j;
    let delEnd = i;
    let addEnd = j;

    while (
      delStart > 0 &&
      delStart >= i - context &&
      originalLines[delStart - 1] === patchedLines[addStart - 1]
    ) {
      delStart--;
      addStart--;
    }

    while (
      delEnd < originalLines.length &&
      delEnd < i + context &&
      addEnd < patchedLines.length &&
      addEnd < j + context
    ) {
      if (originalLines[delEnd] !== patchedLines[addEnd]) {
        delEnd++;
        addEnd++;
      } else {
        break;
      }
    }

    if (delStart >= delEnd && addStart >= addEnd) {
      return null;
    }

    return {
      oldStart: delStart + 1,
      oldLines: delEnd - delStart,
      newStart: addStart + 1,
      newLines: patchedLines
        .slice(addStart, addEnd)
        .map((line) => (line.startsWith('+') || line.startsWith('-') ? ' ' + line : line)),
    };
  }

  private formatHunks(hunks: Hunk[]): string {
    const lines: string[] = [];

    for (const hunk of hunks) {
      const header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines.length} @@`;
      lines.push(header);
      lines.push(...hunk.newLines);
    }

    return lines.join('\n');
  }
}

export class PatchApplier {
  apply(
    filePath: string,
    patchContent: string,
    dryRun = false
  ): { success: boolean; message: string } {
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    try {
      const patchedLines = this.parseAndApplyPatch(lines, patchContent);
      const patchedContent = patchedLines.join('\n');

      if (!dryRun) {
        fs.writeFileSync(filePath, patchedContent);
        return { success: true, message: `Patch applied to ${filePath}` };
      }

      return { success: true, message: `Dry run: Would apply patch to ${filePath}` };
    } catch (error) {
      return {
        success: false,
        message: `Patch failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  private parseAndApplyPatch(_lines: string[], patchContent: string): string[] {
    const patchLines = patchContent.split('\n');
    const result: string[] = [];
    let i = 0;

    for (const line of patchLines) {
      if (line.startsWith('@@')) {
        continue;
      }
      if (line.startsWith('-')) {
        i++;
      } else if (line.startsWith('+')) {
        result.push(line.slice(1));
      } else if (line.startsWith(' ')) {
        result.push(line.slice(1));
        i++;
      }
    }

    return result;
  }

  validate(filePath: string, patchContent: string): { valid: boolean; message: string } {
    if (!fs.existsSync(filePath)) {
      return { valid: false, message: `File not found: ${filePath}` };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const patchLines = patchContent.split('\n');
    for (const line of patchLines) {
      if (line.startsWith('-')) {
        const target = line.slice(1);
        if (!lines.includes(target)) {
          return { valid: false, message: `Invalid deletion: "${target}" not found` };
        }
      }
    }

    return { valid: true, message: 'Patch is valid' };
  }
}

export class SafeEditor {
  edit(
    filePath: string,
    startLine: number,
    endLine: number,
    newContent: string
  ): { success: boolean; message: string; diff?: string } {
    if (!fs.existsSync(filePath)) {
      return { success: false, message: `File not found: ${filePath}` };
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    if (startLine < 1 || endLine > lines.length || startLine > endLine) {
      return {
        success: false,
        message: `Invalid line range: ${startLine}-${endLine} (file has ${lines.length} lines)`,
      };
    }

    const originalContent = content;
    const newLines = newContent.split('\n');
    const modifiedLines = [...lines];
    modifiedLines.splice(startLine - 1, endLine - startLine + 1, ...newLines);
    const patchedContent = modifiedLines.join('\n');

    const diffGenerator = new DiffGenerator();
    const diff = diffGenerator.generate(originalContent, patchedContent);

    fs.writeFileSync(filePath, patchedContent);

    return { success: true, message: `Edited ${filePath} lines ${startLine}-${endLine}`, diff };
  }

  insertAfter(
    filePath: string,
    afterLine: number,
    newContent: string
  ): { success: boolean; message: string } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    if (afterLine < 0 || afterLine >= lines.length) {
      return { success: false, message: `Invalid line: ${afterLine}` };
    }

    const newLines = newContent.split('\n');
    const modifiedLines = [...lines];
    modifiedLines.splice(afterLine + 1, 0, ...newLines);

    fs.writeFileSync(filePath, modifiedLines.join('\n'));

    return { success: true, message: `Inserted after line ${afterLine + 1}` };
  }

  append(filePath: string, newContent: string): { success: boolean; message: string } {
    const content = fs.readFileSync(filePath, 'utf-8');
    const newLines = newContent.split('\n');
    const patchedContent =
      content + (content.endsWith('\n') ? '' : '\n') + newLines.join('\n') + '\n';

    fs.writeFileSync(filePath, patchedContent);

    return { success: true, message: `Appended to ${filePath}` };
  }
}
