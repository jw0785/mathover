import config from "./config";
import * as vscode from "vscode";
import { LRUCache } from "./cache";
import { mathjax } from "mathjax-full/js/mathjax";
import { TeX } from "mathjax-full/js/input/tex";
import { SVG } from "mathjax-full/js/output/svg";
import { MathML } from "mathjax-full/js/input/mathml";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages";

type renderResult = {
	text: string;
	error: boolean;
};

const adaptor = liteAdaptor();
RegisterHTMLHandler(adaptor);

const svgOutput = new SVG({ fontCache: "local" });
const texDoc = mathjax.document("", { InputJax: new TeX({ packages: AllPackages }), OutputJax: svgOutput });
const mathmlDoc = mathjax.document("", { InputJax: new MathML(), OutputJax: svgOutput });

const AUTO_COLORS: Record<number, string> = {
	[vscode.ColorThemeKind.Light]: "#1e1e1e",
	[vscode.ColorThemeKind.Dark]: "#d4d4d4",
	[vscode.ColorThemeKind.HighContrast]: "#ffffff",
	[vscode.ColorThemeKind.HighContrastLight]: "#000000",
};

function resolveColor(colorValue: string): string {
	if (colorValue !== "auto") {
		return colorValue;
	}
	return AUTO_COLORS[vscode.window.activeColorTheme.kind] ?? "#d4d4d4";
}

export class Tex2Svg {

	private cache: LRUCache;
	private svgTextColor: string;
	private svgBackgroundColor: string;

	constructor(cacheLimit = 1024) {
		const light = vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.Light
			|| vscode.window.activeColorTheme.kind === vscode.ColorThemeKind.HighContrastLight;
		this.svgTextColor = resolveColor(light ? config.svgTextColorLight : config.svgTextColorDark);
		this.svgBackgroundColor = light ? config.svgBackgroundColorLight : config.svgBackgroundColorDark;
		this.cache = new LRUCache(cacheLimit);
	}

	public render(tex: string): renderResult {
		const found = this.cache.get(tex);
		if (found) {
			return { text: found, error: false };
		}

		let svg: string;
		try {
			const format = config.format;
			const node = format === "MathML"
				? mathmlDoc.convert(tex, { display: true })
				: texDoc.convert(tex, { display: format === "TeX" });
			svg = adaptor.innerHTML(node);
		} catch (err) {
			return { text: String(err), error: true };
		}

		const styles: string[] = [];
		if (this.svgTextColor !== "auto") {
			styles.push(`color:${this.svgTextColor}`);
		}
		if (this.svgBackgroundColor !== "auto") {
			styles.push(`background-color:${this.svgBackgroundColor}`);
		}
		if (styles.length > 0) {
			svg = svg.replace("style=\"", `style="${styles.join(";")};`);
		}

		const base64 = Buffer.from(svg).toString("base64");
		const dataUri = `data:image/svg+xml;base64,${base64}`;
		if (dataUri.length === 0) {
			vscode.window.showWarningMessage(`cannot parse svg: ${svg}`);
		}
		const uri = `![](${dataUri})`;
		this.cache.set(tex, uri);
		return { text: uri, error: false };
	}

}
