import { workspace, TextEditorDecorationType } from "vscode";
import { correctDecorationType, wrongDecorationType } from "./decorations-types";

const PRESETS: Record<string, { pattern: string; flags: string }> = {
	markdown: { pattern: "\\$\\$(.+?)\\$\\$|\\$(?!\\$)(.+?)\\$(?!\\$)", flags: "gms" },
	legacy: { pattern: "#\\s*Math:\\s*(.+)", flags: "gm" },
};

class Config {
	format!: string;
	matchReg!: string;
	matchRegFlags!: string;
	cacheSize!: number;
	updateInterval!: number;
	svgTextColorLight!: string;
	svgTextColorDark!: string;
	svgBackgroundColorLight!: string;
	svgBackgroundColorDark!: string;
	correctDecorationType: TextEditorDecorationType = correctDecorationType;
	wrongDecorationType: TextEditorDecorationType = wrongDecorationType;

	constructor() {
		this.reload();
	}

	reload() {
		const get = <T>(key: string): T => workspace.getConfiguration().get(`mathover.${key}`) as T;
		this.format = get<string>("format");
		const preset = get<string>("matchPreset");
		if (preset in PRESETS) {
			this.matchReg = PRESETS[preset].pattern;
			this.matchRegFlags = PRESETS[preset].flags;
		} else {
			this.matchReg = get<string>("matchRegex");
			this.matchRegFlags = get<string>("matchRegexFlags");
		}
		this.cacheSize = get<number>("cacheSize");
		this.updateInterval = get<number>("updateInterval");
		this.svgTextColorLight = get<string>("svgTextColorLight");
		this.svgTextColorDark = get<string>("svgTextColorDark");
		this.svgBackgroundColorLight = get<string>("svgBackgroundColorLight");
		this.svgBackgroundColorDark = get<string>("svgBackgroundColorDark");
	}
}

const config = new Config();
export default config;
