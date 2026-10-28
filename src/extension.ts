import config from "./config";
import * as vscode from "vscode";
import { Tex2Svg } from "./tex2svg";
import { expectsSemanticTokens, getMatchableSegments, giveUpSemanticTokens } from "./scope";

// wait and poll for semantic tokens to update for slow starting language server
const TOKEN_POLL_INTERVAL = 1000;
const TOKEN_HOLD_MS = 10_000;
const TOKEN_POLL_MS = 60_000;

let tex2Svg: Tex2Svg;
let timeout: ReturnType<typeof setTimeout> | undefined;
let tokenWait: { uri: string; since: number } | undefined;

function createTex2Svg(): Tex2Svg {
	return new Tex2Svg(config.cacheSize);
}

function clearDecorations(editor: vscode.TextEditor) {
	editor.setDecorations(config.wrongDecorationType, []);
	editor.setDecorations(config.correctDecorationType, []);
}

// TODO: experimental
function inlineRenderOptions(hoverMarkdown: string, endCol: number): vscode.DecorationInstanceRenderOptions | undefined {
	const dataUri = hoverMarkdown.match(/!\[\]\((.+)\)/)?.[1];
	if (!dataUri) {
		return undefined;
	}
	const padCols = Math.max(2, 30 - endCol);
	return {
		after: {
			contentIconPath: vscode.Uri.parse(dataUri),
			margin: `0 0 0 ${padCols}ch`,
			// only way is as css string
			textDecoration: "none; padding: 0 0 1ex 0",
		},
	};
}

async function updateDecorations() {
	const activeEditor = vscode.window.activeTextEditor;
	if (!activeEditor) {
		return;
	}
	const document = activeEditor.document;

	if (config.disabledLanguages.includes(document.languageId)) {
		clearDecorations(activeEditor);
		return;
	}

	let segments = await getMatchableSegments(document);
	if (segments) {
		tokenWait = undefined;
	} else {
		const uri = document.uri.toString();
		if (tokenWait?.uri !== uri) {
			tokenWait = { uri, since: Date.now() };
		}
		const elapsed = Date.now() - tokenWait.since;
		if (elapsed < TOKEN_POLL_MS) {
			scheduleUpdate(TOKEN_POLL_INTERVAL);
		}
		if (elapsed >= TOKEN_HOLD_MS) {
			giveUpSemanticTokens(document.languageId);
		} else if (expectsSemanticTokens(document.languageId)) {
			clearDecorations(activeEditor);
			return;
		}
		segments = [{ text: document.getText(), offset: 0 }];
	}

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
				document.positionAt(start),
				document.positionAt(end)
			);
			const result = tex2Svg.render(latex);
			const decoration: vscode.DecorationOptions = { range, hoverMessage: result.text };
			if (config.inlineDisplay) {
				decoration.renderOptions = inlineRenderOptions(result.text, range.end.character);
			}

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

function scheduleUpdate(delay = config.updateInterval) {
	if (timeout) {
		clearTimeout(timeout);
		timeout = undefined;
	}
	timeout = setTimeout(updateDecorations, delay);
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
