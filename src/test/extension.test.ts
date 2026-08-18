import * as assert from "assert";
import * as vscode from "vscode";

suite("Extension", () => {
	test("extension is present", () => {
		const ext = vscode.extensions.getExtension("Remisa.mathover");
		assert.ok(ext);
	});

	test("extension activates", async () => {
		const ext = vscode.extensions.getExtension("Remisa.mathover")!;
		await ext.activate();
		assert.strictEqual(ext.isActive, true);
	});
});
