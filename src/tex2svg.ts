import config from "./config";
import * as vscode from "vscode";
import MathJax from "mathjax-node";
import DataURIParser from "datauri/parser";
import { LRUCache } from "./cache";

type renderResult = {
	text: string;
	error: boolean;
};

export class Tex2Svg {

	private cache: LRUCache;
	private parser: DataURIParser;

	private mathJax: {
		start: () => void; typeset: (options: {
			math: string; format: string; // [ "TeX" | "inline-TeX" | "MathML" ]
			svg: boolean; // [ svg:true | html:true ]
		}) => any;
	};

	private svgTextColor: string;
	private svgBackgroundColor: string;

	constructor(cacheLimit = 1024, color = "white") {
		this.svgTextColor = config.svgTextColor || color;
		this.svgBackgroundColor = config.svgBackgroundColor || "auto";
		this.cache = new LRUCache(cacheLimit);
		this.mathJax = MathJax;
		this.mathJax.start();
		this.parser = new DataURIParser();
	}

	public async render(tex: string): Promise<renderResult> {
		const found = this.cache.get(tex);
		if (found) {
			return { text: found, error: false };
		}
		let data;

		try {
			data = await this.mathJax.typeset({
				math: tex,
				format: config.format, // [ "TeX" | "inline-TeX" | "MathML" ]
				svg: true // [ svg:true | html:true ]
			});
		} catch (err) {
			return { text: String(err), error: true };
		}

		let svg = data?.svg;
		if (this.svgTextColor !== "auto") {
			svg = svg.replace(/"currentColor"/g, `"${this.svgTextColor}"`);
		}
		if (this.svgBackgroundColor !== "auto") {
			svg = svg.replace("style=\"", `style="background-color:${this.svgBackgroundColor};`);
		}
		const dataUri = this.parser.format(".svg", svg).content || "";
		if (dataUri.length === 0) {
			// throw Error(`cannot parse svg: ${svg}`);
			vscode.window.showWarningMessage(`cannot parse svg: ${svg}`);
		}
		const uri = `![](${dataUri})`; // as markdown image
		this.cache.set(tex, uri);
		return { text: uri, error: false };
	}

}

