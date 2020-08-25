import * as vscode from 'vscode'

const countLengthOfLineAt = (lineNumber: number, textEditor: vscode.TextEditor): number =>
	textEditor.document.lineAt(lineNumber).range.end.character

const calculatePosition = (position: vscode.Position, offset: number, scrollingEditor: vscode.TextEditor, scrolledEditor: vscode.TextEditor): vscode.Position =>
	new vscode.Position(
		position.line + offset,
		~~(position.character / countLengthOfLineAt(position.line, scrollingEditor) * countLengthOfLineAt(position.line + offset, scrolledEditor)),
	)

export const calculateRange = (visibleRange: vscode.Range, offset: number, scrollingEditor: vscode.TextEditor, scrolledEditor: vscode.TextEditor): vscode.Range =>
	new vscode.Range(
		calculatePosition(visibleRange.start, offset, scrollingEditor, scrolledEditor),
		new vscode.Position(visibleRange.start.line + offset + 1, 0),
	)

export const checkSplitPanels = (textEditors: vscode.TextEditor[] = vscode.window.visibleTextEditors): boolean => textEditors.length > 1