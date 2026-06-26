export {};

declare global {
	var SkiaDomApi: Record<string, (...args: any[]) => any>;

	var SkiaListViewApi:
		| {
				requestRedraw(nativeId: number): void;
			}
		| undefined;
}
