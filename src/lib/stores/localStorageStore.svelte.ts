import { browser } from '$app/environment';

export function localStorageStore<T>(key: string, initialValue: T) {
	let value = $state<T>(
		browser && localStorage.getItem(key)
			? (JSON.parse(localStorage.getItem(key)!) as T)
			: initialValue
	);

	if (browser) {
		$effect(() => {
			localStorage.setItem(key, JSON.stringify(value));
		});
	}

	return {
		get value() {
			return value;
		},
		set value(newValue: T) {
			value = newValue;
		}
	};
}
