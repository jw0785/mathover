import config from "./config";
import * as vscode from "vscode";
import { Tex2Svg } from "./tex2svg";

let tex2Svg: Tex2Svg;
let timeout: NodeJS.Timer | undefined;

function createTex2Svg(): Tex2Svg {
	return new Tex2Svg(config.cacheSize);
}

async function updateDecorations() {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return;
	}

	const text = activeEditor.document.getText();
	const matchRegEx = new RegExp(config.matchReg, config.matchRegFlags);
	const wrongRegEx = new RegExp(config.wrongReg, config.wrongRegFlags);
	const wrongUsage: vscode.DecorationOptions[] = [];
	const correctUsage: vscode.DecorationOptions[] = [];

	let match;
	while ((match = matchRegEx.exec(text))) {
		const start = match.index + config.forwardSkip;
		const end = match.index + match[0].length - config.backwardSkip;
		const startPos = activeEditor.document.positionAt(start);
		const endPos = activeEditor.document.positionAt(end);
		const range = new vscode.Range(startPos, endPos);
		const latex = match[0].substring(config.forwardSkip, match[0].length - config.backwardSkip);
		const hoverUri = await tex2Svg.render(latex);
		const decoration = { range, hoverMessage: hoverUri.text };

		if (hoverUri.error || wrongRegEx.test(match[0])) {
			wrongUsage.push(decoration);
		} else {
			correctUsage.push(decoration);
		}
	}

	activeEditor.setDecorations(config.wrongDecorationType, wrongUsage);
	activeEditor.setDecorations(config.correctDecorationType, correctUsage);
}

function scheduleUpdate() {
	if (timeout) {
		clearTimeout(timeout);
		timeout = undefined;
	}
	timeout = setTimeout(updateDecorations, config.updateInterval);
}

export function activate(context: vscode.ExtensionContext) {
	tex2Svg = createTex2Svg();

	scheduleUpdate();

	context.subscriptions.push(
		vscode.window.onDidChangeActiveTextEditor(editor => {
			if (editor) {
				scheduleUpdate();
			}
		}),

		vscode.workspace.onDidChangeTextDocument(event => {
			const activeEditor = vscode.window.activeTextEditor;
			if (activeEditor && event.document === activeEditor.document) {
				scheduleUpdate();
			}
		}),

		vscode.workspace.onDidChangeConfiguration(event => {
			if (event.affectsConfiguration("mathover")) {
				config.reload();
				tex2Svg = createTex2Svg();
				scheduleUpdate();
			}
		}),
	);
}
