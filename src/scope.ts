import * as vscode from "vscode";

export interface TextSegment {
	text: string;
	offset: number;
}

const tokenLanguages = new Set<string>();
const noTokenLanguages = new Set<string>();

// Builtin providers register at activation, only third-party extensions are checked
export function expectsSemanticTokens(languageId: string): boolean {
	if (tokenLanguages.has(languageId)) {
		return true;
	}
	if (noTokenLanguages.has(languageId)) {
		return false;
	}
	return vscode.extensions.all.some(ext => {
		const pkg = ext.packageJSON;
		if (ext.id.startsWith("vscode.") || (!pkg.main && !pkg.browser)) {
			return false;
		}
		return pkg.activationEvents?.includes(`onLanguage:${languageId}`)
			|| pkg.contributes?.languages?.some((lang: { id: string }) => lang.id === languageId);
	});
}

export function giveUpSemanticTokens(languageId: string) {
	if (!tokenLanguages.has(languageId)) {
		noTokenLanguages.add(languageId);
	}
}

// Returns undefined when a provider exists (or may exist) but has no tokens yet.
export async function getMatchableSegments(document: vscode.TextDocument): Promise<TextSegment[] | undefined> {
	const wholeDoc: TextSegment[] = [{ text: document.getText(), offset: 0 }];

	try {
		const legend = await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
			"vscode.provideDocumentSemanticTokensLegend",
			document.uri
		);
		if (!legend) {
			return undefined;
		}

		const commentType = legend.tokenTypes.indexOf("comment");
		const stringType = legend.tokenTypes.indexOf("string");

		// Provider that never marks comments (e.g. TypeScript)
		if (commentType === -1) {
			return wholeDoc;
		}

		const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
			"vscode.provideDocumentSemanticTokens",
			document.uri
		);
		if (!tokens || tokens.data.length === 0) {
			return undefined;
		}
		tokenLanguages.add(document.languageId);
		noTokenLanguages.delete(document.languageId);

		const segments: TextSegment[] = [];
		let sawComment = false;
		let line = 0;
		let char = 0;

		for (let i = 0; i < tokens.data.length; i += 5) {
			line += tokens.data[i];
			char = tokens.data[i] > 0 ? tokens.data[i + 1] : char + tokens.data[i + 1];

			const type = tokens.data[i + 3];
			if (type !== commentType && type !== stringType) {
				continue;
			}
			sawComment ||= type === commentType;

			const offset = document.offsetAt(new vscode.Position(line, char));
			const range = new vscode.Range(line, char, line, char + tokens.data[i + 2]);
			const prev = segments.length > 0 ? segments[segments.length - 1] : null;

			if (prev && offset === prev.offset + prev.text.length) {
				prev.text += document.getText(range);
			} else {
				segments.push({ text: document.getText(range), offset });
			}
		}

		// Servers often leave comments to TextMate even when the legend lists them, and may tag
		// only parts of strings (Pylance marks just escape sequences like `\n`).
		// Without comment tokens the scan can't be trusted.
		return sawComment ? segments : wholeDoc;
	} catch {
		return wholeDoc;
	}
}
