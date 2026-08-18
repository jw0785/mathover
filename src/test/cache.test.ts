import * as assert from "assert";
import { LRUCache } from "../cache";

suite("LRUCache", () => {
	test("get returns undefined for missing key", () => {
		const cache = new LRUCache();
		assert.strictEqual(cache.get("missing"), undefined);
	});

	test("set and get round-trip", () => {
		const cache = new LRUCache();
		cache.set("a", "1");
		assert.strictEqual(cache.get("a"), "1");
	});

	test("evicts least recently used when at capacity", () => {
		const cache = new LRUCache(2);
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("c", "3");
		assert.strictEqual(cache.get("a"), undefined);
		assert.strictEqual(cache.get("b"), "2");
		assert.strictEqual(cache.get("c"), "3");
	});

	test("get promotes entry so it is not evicted", () => {
		const cache = new LRUCache(2);
		cache.set("a", "1");
		cache.set("b", "2");
		cache.get("a");
		cache.set("c", "3");
		assert.strictEqual(cache.get("a"), "1");
		assert.strictEqual(cache.get("b"), undefined);
	});

	test("set updates existing key without eviction", () => {
		const cache = new LRUCache(2);
		cache.set("a", "1");
		cache.set("b", "2");
		cache.set("a", "updated");
		assert.strictEqual(cache.get("a"), "updated");
		assert.strictEqual(cache.get("b"), "2");
	});
});
