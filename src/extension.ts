import * as vscode from 'vscode'

const STATE_KEY = {
	IS_ON: 'syncScroll.isOn',
	MODE: 'syncScroll.mode',
}
const [toggleCommand, changeModeCommand] = require('../package.json').contributes.commands
const MODE = {
	type: "string",
	description: "Select sync scroll mode",
	default: 'NORMAL',
	enum: [
		'NORMAL',
		'OFFSET',
	],
	enumDescriptions: [
		"aligned by the top of the view range",
		"aligned by the scrolled lines offset"
	]
}

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
	let scrollingEditor: vscode.TextEditor | null
	const scrolledEditorsQueue: Set<vscode.TextEditor> = new Set()
	const offsetByEditors: Map<vscode.TextEditor, number> = new Map()
	const reset = () => {
		offsetByEditors.clear()
		scrolledEditorsQueue.clear()
		scrollingEditor = null
	}

	// Status bar item
	let hasSplitPanels: boolean = checkSplitPanels()
	const statusBarToggle: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 201)
	statusBarToggle.tooltip = toggleCommand.title
	statusBarToggle.command = toggleCommand.command
	const statusBarMode: vscode.StatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 200)
	statusBarMode.tooltip = changeModeCommand.title
	statusBarMode.command = changeModeCommand.command
	const showOrHideStatusBarItems = () => {
		if (hasSplitPanels) {
			statusBarToggle.show()
			statusBarMode.show()
		} else {
			statusBarToggle.hide()
			statusBarMode.hide()
		}
	}

	const updateStatusBarToggle = () => {
		const isOn = context.workspaceState.get(STATE_KEY.IS_ON)
		if (isOn) {
			statusBarToggle.text = 'Sync Scroll: ON'
		} else {
			statusBarToggle.text = 'Sync Scroll: OFF'
		}
	}
	const updateStatusBarMode = () => {
		const mode = context.workspaceState.get(STATE_KEY.MODE)
		if (mode) {
			statusBarMode.text = `Sync Scroll Mode: ${mode}`
		}
	}

	// Switch to turn on/off
	const toggleOn = () => {
		context.workspaceState.update(STATE_KEY.IS_ON, true)
		updateStatusBarToggle()
		reset();
	}
	const toggleOff = () => {
		context.workspaceState.update(STATE_KEY.IS_ON, false)
		updateStatusBarToggle()
	}

	// Register disposables
	context.subscriptions.push(
		vscode.commands.registerCommand(toggleCommand.command, () => {
			if (context.workspaceState.get(STATE_KEY.IS_ON)) {
				toggleOff()
			} else {
				toggleOn()
			}
		}),
		vscode.commands.registerCommand(changeModeCommand.command, () => {
			vscode.window.showQuickPick<vscode.QuickPickItem>(
				MODE.enum.map((mode: string, index: number) => ({
					label: mode,
					description: MODE.enumDescriptions[index],
				})),
				{
					placeHolder: MODE.description,
				},
			).then(selectedMode => {
				context.workspaceState.update(STATE_KEY.MODE, selectedMode?.label)
				updateStatusBarMode()
			})
		}),
		vscode.window.onDidChangeVisibleTextEditors(textEditors => {
			hasSplitPanels = checkSplitPanels(textEditors)
			showOrHideStatusBarItems()
		}),
		vscode.window.onDidChangeTextEditorVisibleRanges(({ textEditor, visibleRanges }) => {
			if (!hasSplitPanels || !context.workspaceState.get(STATE_KEY.IS_ON)) {
				return
			}
			if (scrollingEditor !== textEditor) {
				if (scrolledEditorsQueue.has(textEditor)) {
					scrolledEditorsQueue.delete(textEditor)
					return
				}
				scrollingEditor = textEditor
				if (context.workspaceState.get(STATE_KEY.MODE) === 'OFFSET') {
					vscode.window.visibleTextEditors
						.filter(editor => editor !== textEditor)
						.forEach(scrolledEditor => {
							offsetByEditors.set(scrolledEditor, scrolledEditor.visibleRanges[0].start.line - textEditor.visibleRanges[0].start.line)
						})
				}
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
			}, 0)
		}),
	)

	// Init
	if (context.workspaceState.get(STATE_KEY.IS_ON) === undefined) {
		context.workspaceState.update(STATE_KEY.IS_ON, true)
	}
	if (context.workspaceState.get(STATE_KEY.MODE) === undefined) {
		context.workspaceState.update(STATE_KEY.MODE, MODE.default)
	}
	updateStatusBarToggle()
	updateStatusBarMode()
	showOrHideStatusBarItems()
}

export function deactivate() {}
