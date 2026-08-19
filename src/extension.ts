import config from "./config";
import * as vscode from "vscode";
import { Tex2Svg } from "./tex2svg";
import { getMatchableSegments } from "./scope";

let tex2Svg: Tex2Svg;
let timeout: ReturnType<typeof setTimeout> | undefined;

function createTex2Svg(): Tex2Svg {
	return new Tex2Svg(config.cacheSize);
}

async function updateDecorations() {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return;
	}

	const segments = await getMatchableSegments(activeEditor.document);
	const matchRegEx = new RegExp(config.matchReg, config.matchRegFlags);
	const wrongUsage: vscode.DecorationOptions[] = [];
	const correctUsage: vscode.DecorationOptions[] = [];

	for (const segment of segments) {
		let match;
		while ((match = matchRegEx.exec(segment.text))) {
			const latex = match.slice(1).find(g => g !== undefined);
			if (!latex) {
				continue;
			}
			const start = segment.offset + match.index;
			const end = segment.offset + match.index + match[0].length;
			const range = new vscode.Range(
				activeEditor.document.positionAt(start),
				activeEditor.document.positionAt(end)
			);
			const result = tex2Svg.render(latex);
			const decoration = { range, hoverMessage: result.text };

			if (result.error) {
				wrongUsage.push(decoration);
			} else {
				correctUsage.push(decoration);
			}
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

		vscode.window.onDidChangeActiveColorTheme(() => {
			tex2Svg = createTex2Svg();
			scheduleUpdate();
		}),
	);
}
