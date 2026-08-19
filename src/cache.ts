export class LRUCache {

	private capacity: number;
	private cache: Map<string, string>;

	constructor(capacity = 4096) {
		this.capacity = capacity;
		this.cache = new Map();
	}

	get(key: string): (string | undefined) {
		const item = this.cache.get(key);
		if (item) {
			this.cache.delete(key);
			this.cache.set(key, item);
		} else {
			return undefined;
		}
		return item;
	}

	set(key: string, value: string) {
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}
		else if (this.cache.size === this.capacity) {
			this.cache.delete(this.first());
		}
		this.cache.set(key, value);
	}

	first(): string {
		return this.cache.keys().next().value!;
	}
}
