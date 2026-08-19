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
		this.matchReg = get<string>("matchRegex");
		this.matchRegFlags = get<string>("matchRegexFlags");
		this.wrongReg = get<string>("wrongRegex");
		this.wrongRegFlags = get<string>("wrongRegexFlags");
		this.forwardSkip = get<number>("forwardSkip");
		this.backwardSkip = get<number>("backwardSkip");
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
