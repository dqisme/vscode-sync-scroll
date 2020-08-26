# Sync Scroll README

A Visual Studio Code Extension that make split panels scroll synchronically.

## Features

This extension support synchronizing scrolling between split panels. You can choose your sync mode to make them scrolled together.

![Scroll synchronically when toggle on](./feature_mode.gif)

There're also commands you can use conveniently.

![Scroll synchronically when toggle on](./screenshot-command.png)

## Release Notes

### 1.1.1

Enhancement:

- Persist the toggle state and mode
- Fix back and forth scroll issue in diff(selecting file to compare)/scm(viewing file changes) case.

### 1.1.0

Add features:

- Now you can choose a sync mode when it turns on:
  - NORMAL - aligned by the top of the view range.
  - OFFSET - aligned by the scrolled lines offset.

Enhancement:

- Get rid of the scrolling delay.
- Fix the issue that cannot toggle on/off when not focus on any editor.
  
### 1.0.0

Initial release of Sync Scroll with features:

* Can set all the split panels into scroll synchronized mode.

-----------------------------------------------------------------------------------------------------------

## How to Contribute

This extension is created by VSCode Extension Template (TypeScript) by [Yeoman](https://vscode.readthedocs.io/en/latest/extensions/yocode/).

Basically, you can work with this extension source code as a normal typescript project.
