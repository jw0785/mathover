import * as vscode from "vscode";

export interface TextSegment {
	text: string;
	offset: number;
}

export async function getMatchableSegments(document: vscode.TextDocument): Promise<TextSegment[]> {
	const wholeDoc: TextSegment[] = [{ text: document.getText(), offset: 0 }];

	try {
		const legend = await vscode.commands.executeCommand<vscode.SemanticTokensLegend>(
			"vscode.provideDocumentSemanticTokensLegend",
			document.uri
		);
		const tokens = await vscode.commands.executeCommand<vscode.SemanticTokens>(
			"vscode.provideDocumentSemanticTokens",
			document.uri
		);

		if (!legend || !tokens || tokens.data.length === 0) {
			return wholeDoc;
		}

		const filtered_tokens = new Set<number>();
		for (let i = 0; i < legend.tokenTypes.length; i++) {
			if (legend.tokenTypes[i] === "comment" || legend.tokenTypes[i] === "string") {
				filtered_tokens.add(i);
			}
		}

		if (filtered_tokens.size === 0) {
			return wholeDoc;
		}

		const segments: TextSegment[] = [];
		let line = 0;
		let char = 0;

		for (let i = 0; i < tokens.data.length; i += 5) {
			line += tokens.data[i];
			char = tokens.data[i] > 0 ? tokens.data[i + 1] : char + tokens.data[i + 1];

			if (!filtered_tokens.has(tokens.data[i + 3])) {
				continue;
			}

			const offset = document.offsetAt(new vscode.Position(line, char));
			const range = new vscode.Range(line, char, line, char + tokens.data[i + 2]);
			const prev = segments.length > 0 ? segments[segments.length - 1] : null;

			if (prev && offset === prev.offset + prev.text.length) {
				prev.text += document.getText(range);
			} else {
				segments.push({ text: document.getText(range), offset });
			}
		}

		return segments.length > 0 ? segments : wholeDoc;
	} catch {
		return wholeDoc;
	}
}
