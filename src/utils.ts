import * as vscode from 'vscode'

const countLengthOfLineAt = (lineNumber: number, textEditor: vscode.TextEditor): number =>
	textEditor.document.lineAt(lineNumber).range.end.character

const calculateCharacterNumber = (position: vscode.Position, offset: number, scrollingEditor?: vscode.TextEditor, scrolledEditor?: vscode.TextEditor): number =>
	(scrollingEditor && scrolledEditor ?
		~~(position.character / countLengthOfLineAt(position.line, scrollingEditor) * countLengthOfLineAt(position.line + offset, scrolledEditor))
		: 0)

const calculatePosition = (position: vscode.Position, offset: number, scrollingEditor?: vscode.TextEditor, scrolledEditor?: vscode.TextEditor): vscode.Position =>
	new vscode.Position(
		position.line + offset,
		calculateCharacterNumber(position, offset, scrollingEditor, scrolledEditor))

export const calculateRange = (range: vscode.Range, offset: number = 0, scrollingEditor?: vscode.TextEditor, scrolledEditor?: vscode.TextEditor): vscode.Range =>
	new vscode.Range(
		calculatePosition(range.start, offset, scrollingEditor, scrolledEditor),
		new vscode.Position(range.end.line + offset + 1, 0))

export const checkSplitPanels = (textEditors: vscode.TextEditor[] = vscode.window.visibleTextEditors): boolean => textEditors.length > 1

export const updateOffsetByEditors = (offsetByEditors: Map<vscode.TextEditor, number>, scrollingEditor: vscode.TextEditor | undefined = vscode.window.activeTextEditor) => {
	if (scrollingEditor) {
		vscode.window.visibleTextEditors
		.filter(editor => editor !== scrollingEditor)
		.forEach(scrolledEditor => {
			offsetByEditors.set(scrolledEditor, scrolledEditor.visibleRanges[0].start.line - scrollingEditor.visibleRanges[0].start.line)
		})	
	}
}