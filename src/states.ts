import * as vscode from 'vscode'
const [toggleCommand, changeModeCommand] = require('../package.json').contributes.commands

enum ON_OFF {
    ON = 'ON',
    OFF = 'OFF',
}
enum MODE {
    NORMAL = 'NORMAL',
    OFFSET = 'OFFSET',
} 

interface ModeMenuOption {
    label: MODE
    description: string
}

abstract class State<T = any> {
    private vscodeCommand: vscode.Command
    protected abstract key: string
    protected abstract defaultValue: T
    protected abstract executeCommand(): void
    protected abstract toText(value: T): string
    protected context: vscode.ExtensionContext
    protected constructor(context: vscode.ExtensionContext, statusBarItemPriority: number, vscodeCommand: vscode.Command) {
        this.context = context
        this.vscodeCommand = vscodeCommand
        this.statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, statusBarItemPriority)
        this.statusBarItem.command = vscodeCommand.command
        this.statusBarItem.tooltip = vscodeCommand.title
        AllStates.states.push(this)
    }
    protected get(): T | undefined {
        return this.context.workspaceState.get(this.key)
    }
    protected set(value: T | undefined) {
        if (value === undefined) return
        this.context.workspaceState.update(this.key, value)
        this.statusBarItem.text = this.toText(value)
    }
    public statusBarItem: vscode.StatusBarItem
    public init = () => this.set(this.get() ?? this.defaultValue)
    public registerCommand = (callback: () => void = () => {}) =>
        vscode.commands.registerCommand(this.vscodeCommand.command, () => {
            this.executeCommand.call(this)
            callback()
        })
}

export class OnOffState extends State<ON_OFF> {
    private callback: () => void
    protected defaultValue = ON_OFF.ON
    protected key = 'syncScroll.onOff'
    protected toText = (value: string) => `Sync Scroll: ${value}`
    protected executeCommand() {
        this.set(this.isOff() ? ON_OFF.ON : ON_OFF.OFF)
        this.callback()
    }
    public constructor(context: vscode.ExtensionContext, callback: () => void) {
        super(context, 201, toggleCommand)
        this.callback = callback
    }
    public isOff = () => this.get() === ON_OFF.OFF
}

export class ModeState extends State<MODE> {
    protected key = 'syncScroll.mode'
    protected defaultValue = MODE.NORMAL
    protected toText = (value: string) => `Sync Scroll Mode: ${value}`
    protected executeCommand() {
        vscode.window.showQuickPick<ModeMenuOption>(
            [{
                label: MODE.NORMAL,
                description: 'aligned by the top of the view range',
            },{
                label: MODE.OFFSET,
                description: 'aligned by the scrolled lines offset',
            }],
            { placeHolder: 'Select sync scroll mode' },
        ).then(selectedOption => {
            this.set(selectedOption?.label)
        })
    }
    public constructor(context: vscode.ExtensionContext) {
        super(context, 200, changeModeCommand)
    }
    public isOffsetMode = () => this.get() === MODE.OFFSET
}

export class AllStates {
    private static visibility: boolean
    public static states: State[] = []
    public static get areVisible() : boolean {
        return AllStates.visibility
    }
    public static set areVisible(visibility: boolean) {
        AllStates.states.forEach((state) => {
            if (visibility) {
                state.statusBarItem.show()
            } else {
                state.statusBarItem.hide()
            }
        })
        AllStates.visibility = visibility
    }
    public static init(visibility: boolean) {
        AllStates.states.forEach(state => state.init())
        AllStates.areVisible = visibility
    }
}