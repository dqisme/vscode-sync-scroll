import * as vscode from 'vscode'
const [toggleCommand] = require('../package.json').contributes.commands

const countLengthOfLineAt = (lineNumber: number, textEditor: vscode.TextEditor): number =>
	textEditor.document.lineAt(lineNumber).range.end.character

const calculatePosition = (position: vscode.Position, scrollingEditor: vscode.TextEditor, scrolledEditor: vscode.TextEditor): vscode.Position =>
	new vscode.Position(
		position.line,
		~~(position.character / countLengthOfLineAt(position.line, scrollingEditor) * countLengthOfLineAt(position.line, scrolledEditor)),
	)

const calculateRange = (visibleRange: vscode.Range, scrollingEditor: vscode.TextEditor, scrolledEditor: vscode.TextEditor): vscode.Range =>
	new vscode.Range(
		calculatePosition(visibleRange.start, scrollingEditor, scrolledEditor),
		new vscode.Position(visibleRange.start.line + 1, 0),
	)

const checkSplitPanels = (textEditors: vscode.TextEditor[] = vscode.window.visibleTextEditors): boolean => textEditors.length > 1

export function activate(context: vscode.ExtensionContext) {
	let scrollingTask: NodeJS.Timeout
	let scrollingEditor: vscode.TextEditor
	const scrolledEditorsQueue: Set<vscode.TextEditor> = new Set()

	// Status bar item
	let hasSplitPanels: boolean = checkSplitPanels()
	const statusBatSwitch: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200)
	statusBatSwitch.tooltip = toggleCommand.title
	statusBatSwitch.command = toggleCommand.command
	const refreshStatusBarItem = () => {
		if (hasSplitPanels) {
			statusBatSwitch.show()
		} else {
			statusBatSwitch.hide()
		}
	}

	// Switch to turn on/off
	let isOn: boolean;
	const toggleOn = () => {
		isOn = true;
		statusBatSwitch.text = 'Sync Scroll: ON'
	}
	const toggleOff = () => {
		isOn = false;
		statusBatSwitch.text = 'Sync Scroll: OFF'
	}

	// Register disposables
	context.subscriptions.push(
		vscode.commands.registerTextEditorCommand(toggleCommand.command, () => {
			if (isOn) {
				toggleOff()
			} else {
				toggleOn()
			}
		}),
		vscode.window.onDidChangeVisibleTextEditors(textEditors => {
			hasSplitPanels = checkSplitPanels(textEditors)
			refreshStatusBarItem()
		}),
		vscode.window.onDidChangeTextEditorVisibleRanges(({ textEditor, visibleRanges }) => {
			if (!hasSplitPanels || !isOn) {
				return
			}
			if (scrollingEditor !== textEditor) {
				if (scrolledEditorsQueue.has(textEditor)) {
					scrolledEditorsQueue.delete(textEditor)
					return	
				}
				scrollingEditor = textEditor
			}
			if (scrollingTask) {
				clearTimeout(scrollingTask)
			}
			scrollingTask = setTimeout(() => {
				vscode.window.visibleTextEditors
					.filter(editor => editor !== textEditor)
					.forEach(editor => {
						scrolledEditorsQueue.add(editor)
						editor.revealRange(calculateRange(visibleRanges[0], textEditor, editor), vscode.TextEditorRevealType.AtTop)
					})
			}, 10)
		}),
	)

	// Init
	toggleOn()
	refreshStatusBarItem()
}

export function deactivate() {}
