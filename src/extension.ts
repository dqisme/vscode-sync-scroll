import * as vscode from 'vscode'

const enum ConfigurationKey {
	mode = 'syncScroll.mode',
	saveRecentToggleState = 'syncScroll.saveRecentToggleState',
	workapaceToggleState = 'syncScroll.workapaceToggleState',
}

enum ToggleState {
	OFF,
	ON,
}

const contributionPoints = require('../package.json').contributes

const [toggleCommand, changeModeCommand] = contributionPoints.commands

const { [ConfigurationKey.mode]: modeConfiguration } = contributionPoints.configuration.properties

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

const saveRecentToggleState = (context: vscode.ExtensionContext, isOn: boolean) => {
	const selection = ConfigurationKey.saveRecentToggleState
	const isSave = vscode.workspace.getConfiguration().get(selection)

	const toggleState = isSave ? +isOn : undefined

	const key = ConfigurationKey.workapaceToggleState
	context.workspaceState.update(key, toggleState)
}

const getRecentToggleStateConfiguration = (context: vscode.ExtensionContext) => {
	const key = ConfigurationKey.workapaceToggleState
	const defaultValue = ToggleState.OFF
	return context.workspaceState.get(key, defaultValue)
}

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
	const updateStatusBarMode = () => {
		const mode = vscode.workspace.getConfiguration().get(ConfigurationKey.mode)
		if (mode) {
			statusBarMode.text = `Sync Scroll Mode: ${mode}`
		}
	}

	// Switch to turn on/off
	let isOn: boolean
	const toggleOn = () => {
		isOn = true
		statusBarToggle.text = 'Sync Scroll: ON'
		saveRecentToggleState(context, isOn)
		reset()
	}
	const toggleOff = () => {
		isOn = false
		statusBarToggle.text = 'Sync Scroll: OFF'
		saveRecentToggleState(context, isOn)
	}

	// Register disposables
	context.subscriptions.push(
		vscode.commands.registerCommand(toggleCommand.command, () => {
			if (isOn) {
				toggleOff()
			} else {
				toggleOn()
			}
		}),
		vscode.commands.registerCommand(changeModeCommand.command, () => {
			vscode.window.showQuickPick<vscode.QuickPickItem>(
				modeConfiguration.enum.map((mode: string, index: number) => ({
					label: mode,
					description: modeConfiguration.enumDescriptions[index],
				})),
				{
					placeHolder: modeConfiguration.description,
				},
			).then(selectedMode => vscode.workspace.getConfiguration().update(ConfigurationKey.mode, selectedMode?.label))
		}),
		vscode.window.onDidChangeVisibleTextEditors(textEditors => {
			hasSplitPanels = checkSplitPanels(textEditors)
			showOrHideStatusBarItems()
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
				if (vscode.workspace.getConfiguration().get(ConfigurationKey.mode) === 'OFFSET') {
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
		vscode.workspace.onDidChangeConfiguration(({ affectsConfiguration }) => {
			if (affectsConfiguration(ConfigurationKey.mode)) {
				reset()
				updateStatusBarMode()
			}
			if (affectsConfiguration(ConfigurationKey.saveRecentToggleState)) {
				saveRecentToggleState(context, isOn)
			}
		}),
	)

	// Init
	const recentToggleState = getRecentToggleStateConfiguration(context)
	recentToggleState === ToggleState.ON
		? toggleOn()
		: toggleOff()

	showOrHideStatusBarItems()
	updateStatusBarMode()
}

export function deactivate() {}
