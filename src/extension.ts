import * as vscode from 'vscode'
const [toggleCommand] = require('../package.json').contributes.commands

const countLengthOfLineAt = (lineNumber: number, textEditor: vscode.TextEditor): number =>
	textEditor.document.lineAt(lineNumber).range.end.character

const calculatePosition = (position: vscode.Position, offset: number, scrollingEditor: vscode.TextEditor, scrolledEditor: vscode.TextEditor): vscode.Position =>
	new vscode.Position(
		position.line + offset,
		~~(position.character / countLengthOfLineAt(position.line, scrollingEditor) * countLengthOfLineAt(position.line + offset, scrolledEditor)),
	)

const calculateRange = (visibleRange: vscode.Range, offset: number, scrollingEditor: vscode.TextEditor, scrolledEditor: vscode.TextEditor): vscode.Range =>
	new vscode.Range(
		calculatePosition(visibleRange.start, offset, scrollingEditor, scrolledEditor),
		new vscode.Position(visibleRange.start.line + offset + 1, 0),
	)

const checkSplitPanels = (textEditors: vscode.TextEditor[] = vscode.window.visibleTextEditors): boolean => textEditors.length > 1

export function activate(context: vscode.ExtensionContext) {
	let scrollingTask: NodeJS.Timeout
	let scrollingEditor: vscode.TextEditor
	const scrolledEditorsQueue: Set<vscode.TextEditor> = new Set()
	const offsetByEditors: Map<vscode.TextEditor, number> = new Map()

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
					.forEach(scrolledEditor => {
						scrolledEditorsQueue.add(scrolledEditor)
						scrolledEditor.revealRange(
							calculateRange(visibleRanges[0], offsetByEditors.get(scrolledEditor) ?? 0, textEditor, scrolledEditor),
							vscode.TextEditorRevealType.AtTop,
						)
					})
			}, 10)
		}),
	)

	// Init
	toggleOn()
	refreshStatusBarItem()
}

export function deactivate() {}
