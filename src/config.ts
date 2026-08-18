import { workspace, TextEditorDecorationType } from "vscode";
import { correctDecorationType, wrongDecorationType } from "./decorations-types";

class Config {
	format!: string;
	matchReg!: string;
	matchRegFlags!: string;
	wrongReg!: string;
	wrongRegFlags!: string;
	forwardSkip!: number;
	backwardSkip!: number;
	cacheSize!: number;
	updateInterval!: number;
	svgTextColor!: string;
	svgBackgroundColor!: string;
	correctDecorationType: TextEditorDecorationType = correctDecorationType;
	wrongDecorationType: TextEditorDecorationType = wrongDecorationType;

	constructor() {
		this.reload();
	}

	reload() {
		const get = <T>(key: string): T => workspace.getConfiguration().get(`mathover.${key}`) as T;
		this.format = get<string>("format");
		this.matchReg = get<string>("matchRegex");
		this.matchRegFlags = get<string>("matchRegexFlags");
		this.wrongReg = get<string>("wrongRegex");
		this.wrongRegFlags = get<string>("wrongRegexFlags");
		this.forwardSkip = get<number>("forwardSkip");
		this.backwardSkip = get<number>("backwardSkip");
		this.cacheSize = get<number>("cacheSize");
		this.updateInterval = get<number>("updateInterval");
		this.svgTextColor = get<string>("svgTextColor");
		this.svgBackgroundColor = get<string>("svgBackgroundColor");
	}
}

const config = new Config();
export default config;
