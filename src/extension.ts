import * as vscode from 'vscode'
import { checkSplitPanels, calculateRange } from './utils'
import { OnOffState, ModeState, AllStates } from './states'

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

	const onOffState = new OnOffState(context, reset)
	const modeState = new ModeState(context)

	// Register disposables
	context.subscriptions.push(
		onOffState.registerCommand(),
		modeState.registerCommand(),
		vscode.window.onDidChangeVisibleTextEditors(textEditors => {
			AllStates.areVisible = checkSplitPanels(textEditors)
		}),
		vscode.window.onDidChangeTextEditorVisibleRanges(({ textEditor, visibleRanges }) => {
			if (!AllStates.areVisible || onOffState.isOff()) {
				return
			}
			if (scrollingEditor !== textEditor) {
				if (scrolledEditorsQueue.has(textEditor)) {
					scrolledEditorsQueue.delete(textEditor)
					return
				}
				scrollingEditor = textEditor
				if (modeState.isOffsetMode()) {
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

	AllStates.init(checkSplitPanels())
}

export function deactivate() {}
