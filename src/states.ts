import * as vscode from 'vscode'
const [changeModeCommand] = require('../package.json').contributes.commands

export enum MODE {
    NORMAL = 'NORMAL',
    OFFSET = 'OFFSET',
    OFF = 'OFF'
}

interface ModeMenuOption {
    label: MODE
    description: string
}

abstract class State<T = any> {
    private vscodeCommand: vscode.Command
    protected abstract key: string
    protected abstract defaultValue: T
    protected abstract executeCommand(callback: () => void): void
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
            this.executeCommand.call(this, callback)
        })
}

export class ModeState extends State<MODE> {
    protected key = 'syncScroll.mode'
    protected defaultValue = MODE.OFF
    protected toText = (value: string) => `Sync Scroll: ${value}`
    protected executeCommand(callback: () => void) {
        vscode.window.showQuickPick<ModeMenuOption>(
            [{
                label: MODE.NORMAL,
                description: 'Sync scroll to the same line',
            },{
                label: MODE.OFFSET,
                description: 'Sync scroll with the same scrolling distance',
            },{
                label: MODE.OFF,
                description: 'Turn off sync scroll',
            }],
            { placeHolder: 'Select Sync Scroll mode' },
        ).then(selectedOption => {
            this.set(selectedOption?.label)
        }).then(() => {
            callback()
        })
    }
    public setMode(value: MODE){
        this.set(value)
    }
    public constructor(context: vscode.ExtensionContext) {
        super(context, 200, changeModeCommand)
    }
    public isOffsetMode = () => this.get() === MODE.OFFSET
    public isNormalMode = () => this.get() === MODE.NORMAL
    public isOff = () => this.get() === MODE.OFF
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