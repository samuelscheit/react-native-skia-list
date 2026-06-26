import {
	useSkiaScrollView,
	type EdgeInsets,
	type SkiaScrollViewElementProps,
	type SkiaScrollViewState,
} from "../ScrollView";
import { useState } from "react";
import { makeMutable, cancelAnimation, withTiming, runOnUI, runOnJS, type SharedValue } from "react-native-reanimated";
const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");
import { type GroupProps, type RenderNode } from "@shopify/react-native-skia/lib/typescript/src/";
import type { PointProp } from "react-native";
import { callOnUI } from "../Util/callOnUI";
import { Gesture, HoverEffect, type GestureType } from "react-native-gesture-handler";
import { appendNode, removeNode, setNodeProp, SkiaDomApi } from "../Util/DOM";

export interface Dimensions {
	width: number;
	height: number;
}

export interface ViewToken<T> {
	item: T;
	index: number;
	isViewable: boolean;
	key: string;
}

/** */
export type SkiaFlatListProps<T = any, B = T> = Partial<
	Omit<SkiaFlatListState<T, B>, "safeArea" | "mode" | "renderItem" | "transformItem">
> &
	SkiaScrollViewElementProps & {
		initialData?: () => T[];
		initialTransformed?: () => Record<string, B>;
		/**
		 * Rough estimate of the height of each item in the list.
		 * Used to calculate the maximum scroll height.
		 * Set a higher value than average to ensure the user can easily scroll to the end of the list.
		 * Default is 100.
		 *  */
		estimatedItemHeight?: number;
		keyExtractor?: (item: T, index: number) => string;
		renderItem?: RenderItem<T, B>;
		transformItem?: TransformItem<T, B>;
		/** Called once when scrolling within threshold of the end; resets when scrolling away */
		onEndReached?: () => void;
		/** Called once when scrolling within threshold of the start; resets when scrolling away */
		onStartReached?: () => void;
		/** Distance in pixels from end at which to call onEndReached */
		onEndReachedThreshold?: number;
		/** Distance in pixels from start at which to call onStartReached */
		onStartReachedThreshold?: number;
	};

export type RenderItem<T, B> = (
	item: B,
	index: number,
	state: ShareableState<T>,
	element?: RenderNode<GroupProps>,
	touch?: TapResult<T>,
	hover?: TapResult<T>
) => number;

export type TransformItem<T, B> = (item: T, index: number, id: any, state: ShareableState<T>) => B;

export type ShareableState<T = any> = {
	layout: SharedValue<Dimensions>;
	scrollY: SharedValue<number>;
	elements: SharedValue<Record<string, RenderNode<GroupProps> | undefined>>;
	heights: SharedValue<Record<string, number>>;
	rowOffsets: SharedValue<Record<string, number>>;
	firstRenderIndex: SharedValue<number>;
	firstRenderHeight: SharedValue<number>;
	lastRenderIndex: SharedValue<number>;
	lastRenderHeight: SharedValue<number>;
	maintainVisibleContentPosition: boolean;
	keyExtractor: (item: T, index: number) => string;
	data: SharedValue<T[]>;
	transformedData: SharedValue<Record<string, any>>;
	renderTime: SharedValue<number>;
	maxHeight: SharedValue<number>;
	safeArea: SharedValue<EdgeInsets>;
	content: SharedValue<RenderNode<GroupProps>>;
	startY: SharedValue<number>;
	pressing: SharedValue<boolean>;
	invertedFactor: number;
	redrawItem: SkiaFlatListState<T>["redrawItem"];
	hasReachedEnd: SharedValue<boolean>;
	hasReachedStart: SharedValue<boolean>;
};

/** */
export type SkiaFlatListState<T = any, B = T> = {
	/** Contains currently mounted elements */
	elements: SharedValue<Record<string, RenderNode<GroupProps> | undefined>>;
	/** Contains the height of each element */
	heights: SharedValue<Record<string, number>>;
	/** Contains the y position of each element */
	rowOffsets: SharedValue<Record<string, number>>;
	/** The index of the first visible element on the screen */
	firstRenderIndex: SharedValue<number>;
	/** The y position of the first visible element on the screen */
	firstRenderHeight: SharedValue<number>;
	/** The index of the last rendered element */
	lastRenderIndex: SharedValue<number>;
	/** The y position of the last rendered element */
	lastRenderHeight: SharedValue<number>;
	/** Whether to maintain the visible content position when adding new items. Defaults to true. */
	maintainVisibleContentPosition: boolean;
	/** Specify this function to return a unique key for each item */
	keyExtractor: (item: T, index: number) => string;
	/** Renders an item */
	renderItem: SharedValue<{ function: RenderItem<T, B> }>;
	/** Transforms the item data */
	transformItem?: SharedValue<{ function: TransformItem<T, B> }>;
	/** Returns the transformed item */
	getTransformed: (item: T, index: number, id: any, state: ShareableState<T>) => B;
	/** Resets the transformed data */
	resetTransformedItems: () => void;
	/** The data array */
	data: SharedValue<T[]>;
	/** The transformed data array */
	transformedData: SharedValue<Record<string, B>>;
	/** @hidden Time spent on rendering */
	renderTime: SharedValue<number>;
	tapGesture: GestureType;
	hoverGesture: GestureType;

	/** Scrolls to a specific index */
	scrollToIndex: (index: number, animated?: boolean) => void;

	/** Scrolls to a specific item */
	scrollToItem: (item: T, animated?: boolean) => void;

	/** Scrolls to the start of the list */
	scrollToStart: (animated?: boolean) => void;

	/** Scrolls to the end of the list */
	scrollToEnd: (animated?: boolean) => void;

	/** Sets a new data array and resets the list position and cache */
	resetData: (newData?: T[]) => void;

	/** Inserts new data at a specific index */
	insertAt: (data: T | T[], index: number, animated?: boolean, changedHeight?: number) => void;

	/** Appends new data to the end of the list */
	append: (data: T | T[], animated?: boolean) => void;

	/** Prepends new data to the start of the list */
	prepend: (data: T | T[], animated?: boolean) => void;

	/** Removes data at a specific index */
	removeAt: (index: number, animated?: boolean) => void;

	/** Removes a specific item from the list */
	removeItem: (item: T, animated?: boolean) => void;

	/** Removes a specific item by id from the list */
	removeItemId: (id: string, animated?: boolean) => void;

	/** Updates a data item in the list. Must have the same id as the previous item. Use `redrawItem` to force a redraw without data changes. */
	updateItem: (updatedData: T, id?: string) => void;

	/** Unmounts an element at a specific index or by item */
	unmountElement: (index: number | undefined, item?: T | undefined) => void;

	/** Force redraws a specific element */
	redrawItem(index: number | undefined, item?: T | undefined, touch?: TapResult<T>, hover?: TapResult<T>): void;

	/** Recalculates the items in the list and (un)mounts elements as needed.
	 * Is automatically called on scroll or when the data changes.
	 */
	redrawItems: () => void;

	/** Called when the visible items change */
	onViewableItemsChanged: (changed: ViewToken<T>[], viewableItems: ViewToken<T>[]) => void;

	onTap?: (event: TapResult<T>, state: ShareableState<T>) => void;
	onHover?: (event: TapResult<T> | undefined, state: ShareableState<T>) => void;

	/**
	 * Determines the maximum number of items rendered outside of the visible area in screen heights.
	 * So if your list fills the screen, then windowSize={10} will render the visible screen area plus up to 10 screens above and 10 below the viewport.
	 * Default is 0, which renders only visible items and is more than fast enough to not reveal any blank areas when scrolling.
	 */
	windowSize?: number;

	/**
	 * Returns the item at a specific touch position. \
	 * Receives the touch event as `{ x: number, y: number }`
	 */
	getItemFromTouch: (e: PointProp) => TapResult<T> | undefined;

	shareableState: ShareableState<T>;
} & SkiaScrollViewState &
	ShareableState<T>;

/**
 * Result returned by `getItemFromTouch({ x: number, y: number })`
 *
 * :::note
 * `getItemFromTouch` returns `undefined` if no item is found at the touch position.
 * :::
 * */
export type TapResult<T> = {
	/** The item at the touch position */
	item: T;
	/** The unique key of the item */
	id: number | string;
	/** The index of the item in the data array */
	index: number;
	/** The left x position of the list item relative to the screen */
	x: number;
	/** The top y position of the list item relative to the screen */
	y: number;
	/** The top y position of the list row relative to content start of the list */
	rowY: number;
	/** The x position of the touch event */
	touchX: number;
	/** The y position of the touch event */
	touchY: number;
	/** @hidden TODO */
	absoluteY: number;
	/** The height of the list item */
	height: number;
};

/**
 *
 * Use this hook to manage and access the state of SkiaFlatList.
 * ```tsx
 * const state = useSkiaFlatList({ ... });
 *
 * <SkiaFlatList list={state} style={{ flex: 1 }} />
 * ```
 */
export function useSkiaFlatList<T, B = T>(props: SkiaFlatListProps<T, B> = {} as any): SkiaFlatListState<T, B> {
	const scrollView = useSkiaScrollView(props);
	// scroll threshold callbacks
	const [list] = useState(() => {
		const onEndReached = props.onEndReached;
		const onStartReached = props.onStartReached;
		const onEndReachedThreshold = props.onEndReachedThreshold ?? 0;
		const onStartReachedThreshold = props.onStartReachedThreshold ?? 0;
		const hasReachedEnd = makeMutable(false);
		const hasReachedStart = makeMutable(false);
		const renderTime = props.renderTime || makeMutable(0);
		const renderMutex = makeMutable(false);
		const elements = makeMutable({} as Record<string, RenderNode<GroupProps> | undefined>);
		const heights = makeMutable({} as Record<string, number>);
		const rowOffsets = makeMutable({} as Record<string, number>);
		const firstRenderIndex = makeMutable(0);
		const firstRenderHeight = makeMutable(0);
		const lastRenderIndex = makeMutable(0);
		const lastRenderHeight = makeMutable(0);
		const initialData = props.initialData?.() ?? [];
		const data = makeMutable(initialData);
		const idIndexMap = makeMutable({} as Record<string, number>);
		const transformedData = makeMutable(props.initialTransformed?.() ?? {});
		const keyExtractor =
			props.keyExtractor ??
			((_item, index) => {
				"worklet";
				return `${index}`;
			});
		const renderItem = makeMutable({
			function:
				props.renderItem ??
				(() => {
					"worklet";
					return 100;
				}),
		});
		const onViewableItemsChanged = props.onViewableItemsChanged;
		const viewableItemsArray = makeMutable([] as ViewToken<T>[]);
		const viewableItems = makeMutable({} as Record<string, ViewToken<T>>);
		const changedItems = makeMutable([] as ViewToken<T>[]);
		const transformItem = makeMutable({
			function:
				props.transformItem ||
				((item: T) => {
					"worklet";
					return item;
				}),
		});

		const getTransformed = (item: T, index: number, id: any, state: ShareableState<T>) => {
			"worklet";
			const transformed = transformedData.value[id];
			if (transformed) return transformed;
			return (transformedData.value[id] = transformItem.value.function(item, index, id, state) as any as B);
		};

		const { onTap, onHover } = props;

		const maintainVisibleContentPosition = props.maintainVisibleContentPosition ?? true;
		const estimatedItemHeight = props.estimatedItemHeight ?? 100;
		const windowSize = props.windowSize ?? 0;

		const { maxHeight, scrollY, startY, redraw, pressing, layout, safeArea, content, invertedFactor, root } =
			scrollView;

		const redrawItemShareable = makeMutable({
			function: (index: number | undefined, item?: T | undefined, touch?: TapResult<T>, hover?: TapResult<T>) => {
				"worklet";
			},
		});

		const redrawItemsShareable = makeMutable({
			function: (index: number | undefined, item?: T | undefined) => {
				"worklet";
			},
		});

		const shareableState = {
			layout,
			scrollY,
			elements,
			heights,
			rowOffsets,
			firstRenderIndex,
			firstRenderHeight,
			lastRenderIndex,
			lastRenderHeight,
			maintainVisibleContentPosition,
			keyExtractor,
			data,
			transformedData,
			renderTime,
			maxHeight,
			safeArea,
			content,
			invertedFactor,
			startY,
			pressing, // @ts-ignore
			avatars: props.avatars,
			redrawItem: (
				index: number | undefined,
				item?: T | undefined,
				touch?: TapResult<T>,
				hover?: TapResult<T>
			) => {
				"worklet";
				return redrawItemShareable.value.function(index, item, touch, hover);
			},
			redrawItems: (index: number | undefined, item?: T | undefined) => {
				"worklet";
				return redrawItemsShareable.value.function(index, item);
			},
			renderItem,
			transformItem,
			hasReachedEnd,
			hasReachedStart,
		};

		const state = {
			...props,
			...scrollView,
			...shareableState,
		};

		function getItemFromTouch(e: PointProp): TapResult<T> | undefined {
			"worklet";

			// const y = matrix.value[5]!;

			const y = scrollY.value + layout.value.height - e.y - safeArea.value.bottom;
			let rowY = firstRenderHeight.value;
			let index = 0;

			const dataValue = data.value;
			var itemHeight = 0;
			var id = "";
			var item: T | undefined;

			for (index = firstRenderIndex.value; index < dataValue.length; index++) {
				item = dataValue[index]!;
				if (!item) continue;
				id = keyExtractor(item, index);
				itemHeight = heights.value[id]!;

				if (!itemHeight) return; // not rendered yet

				rowY += itemHeight;

				if (rowY > y) break;
			}

			if (!item || !itemHeight || !id) return;

			const topY = rowY - y;

			const absoluteY = (topY - e.y) * invertedFactor;

			return {
				item,
				id,
				index,
				x: 0,
				y: topY,
				rowY,
				touchY: e.y,
				touchX: e.x,
				absoluteY,
				height: itemHeight,
			};
		}

		/**
		 * Scrolls to a specific index
		 */
		function scrollToIndex(index: number, animated = true) {
			"worklet";
			if (index < 0 || index >= data.value.length) throw new Error("Index out of bounds");

			let rowY = 0;
			const dataValue = data.value;
			const heightsValue = heights.value;

			for (let i = 0; i < index; i++) {
				const item = dataValue[i];
				if (!item) continue;

				const id = keyExtractor(item, i);
				let itemHeight = heightsValue[id] || 0;

				if (itemHeight === undefined) {
					const transformed = getTransformed(item, i, id, shareableState as any);
					itemHeight = renderItem.value.function(transformed, i, shareableState as any);
					heightsValue[id] = itemHeight;
				}

				rowY += itemHeight;
			}

			const newY = Math.min(rowY, maxHeight.value);

			if (animated) {
				scrollY.value = withTiming(newY, { duration: 350 });
			} else {
				scrollY.value = newY;
				redraw();
			}
		}

		/**
		 * Scrolls to a specific item
		 */
		function scrollToItem(item: T, animated = true) {
			"worklet";
			const index = data.value.indexOf(item);
			if (index === -1) throw new Error("Item not found");

			scrollToIndex(index, animated);
		}

		/**
		 * Scrolls to the start of the list
		 */
		function scrollToStart(animated = true) {
			"worklet";
			scrollToIndex(0, animated);
		}

		/**
		 * Scrolls to the end of the list
		 */
		function scrollToEnd(animated = true) {
			"worklet";
			scrollToIndex(data.value.length - 1, animated);
		}

		function getItemsHeight(data: T[], indexOffset = 0) {
			"worklet";

			let rowY = 0;

			for (let i = 0; i < data.length; i++) {
				let index = i + indexOffset;
				const item = data[i];
				if (!item) continue;
				const id = keyExtractor(item, index);
				let height = heights.value[id];

				const transformed = getTransformed(item, i, id, shareableState as any);
				let itemHeight = renderItem.value.function(transformed, index, shareableState);

				if (itemHeight !== height && height) {
					const diff = itemHeight - height;

					scrollY.value += diff;
					startY.value += diff;
				}

				heights.value[id] = height = itemHeight;

				rowY += height;
			}

			return rowY;
		}

		function isBeforeStart(rowY: number, itemHeight: number, threshold = 0) {
			"worklet";
			// item is below the start
			// when inverted it is below the bottom of the screen
			return rowY + itemHeight < scrollY.value - threshold - safeArea.value.top;
		}

		function isAfterEnd(rowY: number, threshold = 0) {
			"worklet";
			// item is above the end
			// when inverted it is above the top of the screen
			return rowY - threshold >= scrollY.value + layout.value.height;
		}

		function unmountElement(index: number | undefined, item?: T | undefined) {
			"worklet";
			if (item === undefined && index !== undefined) item = data.value[index];
			if (index === undefined && item !== undefined) index = data.value.indexOf(item);
			if (index < 0 || index >= data.value.length) return;
			if (!item) return;

			const id = keyExtractor(item, index!);

			const element = elements.value[id];
			if (!element) return;

			removeNode(content.value, element);
			delete elements.value[id];
		}

		/**
		 * Mounts an element at a specific y position
		 */
		function mountElement(rowY: number, item: T, index: number, touch?: TapResult<T>, hover?: TapResult<T>) {
			"worklet";
			if (rowY === undefined) return;

			let offset = rowY;
			const translation = Skia.Matrix().translate(safeArea.value.left, rowY);
			const element = SkiaDomApi.GroupNode({
				matrix: translation,
			});
			const id = keyExtractor(item, index);
			const transformed = getTransformed(item, index, id, shareableState as any);

			let itemHeight = renderItem.value.function(transformed, index, shareableState, element, touch, hover);

			if (invertedFactor === -1 && rowY > 0) {
				offset = rowY * invertedFactor - itemHeight;
				translation.identity().translate(safeArea.value.left, offset);
				setNodeProp(element, "matrix", translation);
			}

			heights.value[id] = itemHeight;
			elements.value[id] = element;
			rowOffsets.value[id] = offset;
			appendNode(content.value, element);

			return itemHeight;
		}

		function redrawItem(
			index: number | undefined,
			item?: T | undefined,
			touch?: TapResult<T>,
			hover?: TapResult<T>
		) {
			"worklet";
			if (item === undefined && index !== undefined) item = data.value[index];
			if (index === undefined && item !== undefined) index = data.value.indexOf(item);
			if (index < 0 || index >= data.value.length) return;
			if (!item) return;

			const id = keyExtractor(item, index!);

			const element = elements.value[id];
			if (element) removeNode(content.value, element);

			mountElement(rowOffsets.value[id], item, index, touch, hover);
			redraw();
		}

		redrawItemShareable.value = { function: redrawItem };

		/**
		 * Recalculates the items in the list and (un)mounts elements as needed.
		 * Automatically called when the list is scrolled or when the data changes.
		 */
		function redrawItems() {
			"worklet";

			let start = performance.now();

			const { width, height } = layout.value;

			if (width === 0 || height === 0) return;
			if (renderMutex.value) return;

			renderMutex.value = true;

			const dataValue = data.value;
			const elementsValue = elements.value;
			const heightsValue = heights.value;
			const rowOffsetsValue = rowOffsets.value;

			let rowY = firstRenderHeight.value;
			let firstWasSet = false;

			const mountThreshold = height * windowSize;

			for (var index = firstRenderIndex.value; index >= 0; index--) {
				let item = dataValue[index - 1];

				if (item === undefined) {
					firstRenderIndex.value = 0;
					firstRenderHeight.value = 0;
					continue;
				}

				let id = keyExtractor(item, index);
				let itemHeight = heightsValue[id];
				if (itemHeight === undefined) {
					const transformed = getTransformed(item, index, id, shareableState as any);

					itemHeight = renderItem.value.function(transformed, index, shareableState);
					heightsValue[id] = itemHeight;

					const diff = itemHeight - estimatedItemHeight;
					maxHeight.value += diff;
				}

				const beforeStart = isBeforeStart(rowY, itemHeight, mountThreshold);
				if (beforeStart) {
					item = dataValue[index];
					if (!item) break;
					id = keyExtractor(item, index);

					const itemHeight2 = heightsValue[id] || 0;

					if (!isBeforeStart(rowY + itemHeight, itemHeight2, mountThreshold)) {
						// prevent item from not being rendered if scrolling back to start
						firstRenderIndex.value = index;
						firstRenderHeight.value = rowY;
						firstWasSet = true;
					}

					break; // skip to forward loop
				}

				firstRenderIndex.value = index;
				firstRenderHeight.value = rowY;

				rowY -= itemHeight;
				firstWasSet = true;
			}

			rowY = firstRenderHeight.value;

			const changedItemsValue = changedItems.value;
			const viewableItemsArr = viewableItemsArray.value;
			if (changedItemsValue.length > 0) {
				changedItemsValue.splice(0, changedItemsValue.length);
			}

			for (var index = firstRenderIndex.value; index < dataValue.length; index++) {
				const item = dataValue[index];
				if (!item) continue;

				let id = keyExtractor(item, index);

				let element = elementsValue[id];
				let itemHeight = heightsValue[id];
				let viewableItem = viewableItems.value[id];

				if (!viewableItem && onViewableItemsChanged) {
					viewableItem = viewableItems.value[id] = {
						index,
						isViewable: false,
						item,
						key: id,
					};
				}

				const beforeStart = isBeforeStart(rowY, itemHeight || 0, mountThreshold);
				const afterEnd = isAfterEnd(rowY, mountThreshold);

				if (beforeStart || afterEnd) {
					if (element) {
						// console.log("removing", id, { beforeStart, afterEnd });
						unmountElement(index, item);

						if (onViewableItemsChanged) {
							viewableItems.value[id].isViewable = false;

							const indexViewable = viewableItemsArr.indexOf(viewableItem);
							if (indexViewable !== -1) viewableItemsArr.splice(indexViewable, 1);
							changedItems.value.push(viewableItem);
						}
					}
					if (!itemHeight) {
						const transformed = getTransformed(item, index, id, shareableState as any);
						itemHeight = renderItem.value.function(transformed, index, shareableState);
						heightsValue[id] = itemHeight;

						// const diff = itemHeight - estimatedItemHeight;
						// maxHeight.value += diff;
					}

					rowY += itemHeight;

					if (afterEnd) {
						// continue if next element also needs to be unmounted
						const nextItem = dataValue[index + 1];
						if (!nextItem) break;

						id = keyExtractor(nextItem, index + 1);
						const nextElement = elementsValue[id];
						if (nextElement) continue;
						else break;
					} else if (beforeStart) continue;
				}

				if (viewableItem && onViewableItemsChanged) {
					viewableItem.isViewable = true;
				}

				if (!firstWasSet) {
					firstRenderIndex.value = index;
					firstRenderHeight.value = rowY;
					firstWasSet = true;
				}

				const previousHeight = itemHeight;

				if (!element || itemHeight === undefined) {
					itemHeight = mountElement(rowY, item, index)!;
					element = elementsValue[id];
					changedItemsValue.push(viewableItem);
					viewableItemsArr.push(viewableItem);
					// console.log("adding", id, rowY);
				}

				let actualY = rowY;
				if (invertedFactor === -1) actualY = rowY * invertedFactor - itemHeight;

				if (previousHeight === undefined) {
					// element mounted first time
					const diff = itemHeight - estimatedItemHeight;
					maxHeight.value += diff;
				} else if (previousHeight !== itemHeight) {
					// heights changed
				}

				const previousRowY = rowOffsetsValue[id];

				if (previousRowY !== actualY && previousRowY !== undefined) {
					// element position changed
					const translation = Skia.Matrix().translate(0, actualY).get();
					setNodeProp(element, "matrix", translation);
					rowOffsetsValue[id] = actualY;
				}

				rowY += itemHeight;
			}

			lastRenderIndex.value = index;
			lastRenderHeight.value = rowY;

			if (changedItemsValue.length > 0 && onViewableItemsChanged) {
				onViewableItemsChanged(changedItemsValue, viewableItemsArray.value);
			}

			if (index === dataValue.length) {
				maxHeight.value = Math.max(rowY - layout.value.height + safeArea.value.bottom + safeArea.value.top, 1);
			}

			const diff = performance.now() - start;
			if (diff > 2) {
				// console.log("Draw time", performance.now() - start, content.value.children().length);
			}
			renderTime.value += diff;

			renderMutex.value = false;
		}

		redrawItemsShareable.value = { function: redrawItem };

		/**
		 * Sets a new data array and resets the list position and cache
		 */
		function resetData(newData: T[] = []) {
			"worklet";
			data.value = newData;
			transformedData.value = {};
			idIndexMap.value = {};
			maxHeight.value = estimatedItemHeight * newData.length + 1;
			heights.value = {};
			elements.value = {};
			firstRenderIndex.value = 0;
			firstRenderHeight.value = 0;
			cancelAnimation(scrollY);
			scrollY.value = 0;
			startY.value = 0;
			const rootNode = root.value;
			const children = (rootNode as any).children as RenderNode<GroupProps>[];
			for (const child of children) {
				removeNode(rootNode, child);
			}
			// root.value.removeChild(content.value);
			// content.value = SkiaDomApi.GroupNode({});
			// root.value.addChild(content.value);
			redrawItems();
		}

		function resetTransformedItems() {
			"worklet";
			transformedData.value = {};

			Object.keys(elements.value).forEach((id) => {
				const element = elements.value[id];
				if (element) {
					removeNode(content.value, element);
				}
				delete elements.value[id];
			});

			redrawItems();
			redraw();
		}

		function updateItem(newItem: T, id?: string) {
			"worklet";

			if (!id) id = keyExtractor(newItem, 0);
			const index = idIndexMap.value[id];

			if (!index) throw new Error("Item not found");
			if (index < 0 || index >= data.value.length) throw new Error("Index out of bounds");

			const element = elements.value[id];
			if (element) {
				removeNode(content.value, element);
				delete elements.value[id];
			}
			delete transformedData.value[id];
			data.value[index] = newItem;

			// will automatically recalculate the height of the previous and next elements and adjust the y position accordingly
			getItemsHeight([newItem], index);

			redrawItems();
		}

		/**
		 * Inserts new data at a specific index
		 */
		function insertAt(d: T | T[], index: number, animated?: boolean, changedHeight = 0) {
			"worklet";
			if (index < 0 || index > data.value.length) throw new Error("Index out of bounds");

			if (animated === undefined) {
				animated = Math.abs(scrollY.value) < 500;
			}

			const newData = Array.isArray(d) ? d : [d];

			data.value.splice(index, 0, ...newData);

			for (let i = 0; i < newData.length; i++) {
				const dataIndex = index + i;
				const item = newData[i];
				const id = keyExtractor(item, dataIndex);
				idIndexMap.value[id] = dataIndex;
			}

			// will recalculate the height of the previous and next elements and adjust the y position accordingly

			let oldY = scrollY.value;

			const height = getItemsHeight(newData, index);
			if (!height) return;

			if (firstRenderIndex.value >= index && maintainVisibleContentPosition) {
				firstRenderIndex.value += newData.length;
				firstRenderHeight.value += height;
				const newY = oldY + height - changedHeight;
				scrollY.value = newY;
				// startY.value += height;
				// do not scroll to new item, if finger is down
				// console.log("scroll to item", pressing.value, newY, oldY);
				if (animated && !pressing.value) {
					scrollY.value = withTiming(oldY, { duration: 350 });
				}
			}

			maxHeight.value += height;
			redrawItems();
		}

		/**
		 * Appends new data to the end of the list
		 */
		function append(d: T | T[], animated?: boolean) {
			"worklet";
			insertAt(d, data.value.length, animated);
		}

		/**
		 * Prepends new data to the start of the list
		 */
		function prepend(d: T | T[], animated?: boolean) {
			"worklet";
			insertAt(d, 0, animated);
		}

		/**
		 * Removes data at a specific index
		 */
		function removeAt(index: number, animated?: boolean) {
			"worklet";
			if (index < 0 || index >= data.value.length) throw new Error("Index out of bounds");

			if (animated === undefined) {
				animated = Math.abs(scrollY.value) < 500;
			}

			const removedData = data.value.splice(index, 1);

			if (removedData.length === 0) {
				return;
			}

			let height = 0;

			for (let i = 0; i < removedData.length; i++) {
				const item = removedData[i];
				const id = keyExtractor(item, index + i);
				delete idIndexMap.value[id];
				const element = elements.value[id];
				if (element) {
					removeNode(content.value, element);
					delete elements.value[id];
				}
				delete idIndexMap.value[id];
				delete transformedData.value[id];
				height += heights.value[id] || 0;
				delete heights.value[id];
				delete rowOffsets.value[id];
			}

			if (firstRenderIndex.value >= index && maintainVisibleContentPosition) {
				const newY = Math.max(0, scrollY.value - height);

				firstRenderIndex.value = Math.max(0, firstRenderIndex.value - 1);
				firstRenderHeight.value = Math.max(0, firstRenderHeight.value - height);
				scrollY.value = newY;
				if (animated && !pressing.value) {
					scrollY.value = withTiming(newY, { duration: 350 });
				}
			}

			maxHeight.value -= height;
			redrawItems();
		}

		function removeItem(item: T, animated?: boolean) {
			"worklet";
			const index = data.value.indexOf(item);
			if (index !== -1) removeAt(index, animated);
		}

		function removeItemId(id: string, animated?: boolean) {
			"worklet";
			const index = idIndexMap.value[id];
			if (index !== undefined) return removeAt(index, animated);

			// fallback if user manually inserted data and didn't update idIndexMap
			for (let i = 0; i < data.value.length; i++) {
				const item = data.value[i];
				const itemId = keyExtractor(item, i);
				if (itemId === id) return removeAt(i, animated);
			}

			throw new Error("Item not found");
		}

		runOnUI(() => {
			"worklet";

			const dataValue = data.value;

			for (let index = 0; index < dataValue.length; index++) {
				const item = dataValue[index];
				const id = keyExtractor(item, index);
				idIndexMap.value[id] = index;
			}

			scrollY.addListener(2, (value) => {
				"worklet";

				redrawItems();
				// start threshold
				if (value <= onStartReachedThreshold) {
					if (!hasReachedStart.value && onStartReached) {
						hasReachedStart.value = true;
						runOnJS(onStartReached)?.();
					}
				} else {
					hasReachedStart.value = false;
				}
				// end threshold
				const distanceToEnd = maxHeight.value - value;
				if (distanceToEnd <= onEndReachedThreshold) {
					if (!hasReachedEnd.value && onEndReached) {
						hasReachedEnd.value = true;
						runOnJS(onEndReached)?.();
					}
				} else {
					hasReachedEnd.value = false;
				}
			});
			layout.addListener(2, (value) => {
				maxHeight.value = Math.max(
					estimatedItemHeight * initialData.length -
						value.height +
						safeArea.value.bottom +
						safeArea.value.top,
					1
				);

				Object.keys(elements.value).forEach((id) => {
					const element = elements.value[id];
					if (element) {
						removeNode(content.value, element);
					}
					delete elements.value[id];
				});

				redrawItems();
			});
		})();

		const tapGestureRef = { current: null };
		const tapGesture = Gesture.Tap()
			.onEnd((e) => {
				const result = getItemFromTouch(e);
				if (!result) return;

				if (onTap) onTap(result, shareableState);
			})
			.withRef(tapGestureRef);

		const hoverGestureRef = { current: null };
		const hoverGesture = Gesture.Hover()
			.enabled(!!onHover)
			.withRef(hoverGestureRef)
			.onUpdate((e) => {
				const result = getItemFromTouch(e);
				if (!result) return;

				if (onHover) onHover(result, shareableState);
			});

		state.hoverGesture = hoverGesture;
		state.tapGesture = tapGesture;

		scrollView.simultaneousHandlers.push(hoverGestureRef);
		scrollView.simultaneousHandlers.push(tapGestureRef);

		scrollView.gesture = Gesture.Simultaneous(
			scrollView.touchGesture,
			hoverGesture,
			Gesture.Exclusive(scrollView.scrollbarGesture, scrollView.scrollGesture, tapGesture)
		);

		redrawItems();

		return {
			...state,
			shareableState,
			resetData: callOnUI(resetData),
			insertAt: callOnUI(insertAt),
			append: callOnUI(append),
			prepend: callOnUI(prepend),
			removeAt: callOnUI(removeAt),
			removeItem: callOnUI(removeItem),
			removeItemId: callOnUI(removeItemId),
			updateItem: callOnUI(updateItem),
			getItemFromTouch: callOnUI(getItemFromTouch),
			unmountElement: callOnUI(unmountElement),
			redrawItems: callOnUI(redrawItems),
			redrawItem: callOnUI(redrawItem),
			scrollToIndex: callOnUI(scrollToIndex),
			scrollToStart: callOnUI(scrollToStart),
			scrollToEnd: callOnUI(scrollToEnd),
			scrollToItem: callOnUI(scrollToItem),
			getTransformed: callOnUI(getTransformed),
			resetTransformedItems: callOnUI(resetTransformedItems),
		};
	});

	const { safeArea } = list;
	const safeAreaProps = props.safeArea;
	const { renderItem, transformItem, resetTransformedItems } = list;
	const { renderItem: renderItemProps, transformItem: transformItemProps } = props;

	runOnUI(() => {
		if (renderItemProps !== renderItem.value.function) {
			renderItem.value = { function: renderItemProps };
		}

		if (transformItemProps !== transformItem.value.function) {
			transformItem.value = { function: transformItemProps };
			resetTransformedItems();
		}

		let { bottom, left, right, top } = safeArea.value;

		if (safeAreaProps) {
			if (safeAreaProps.bottom !== bottom) bottom = safeAreaProps.bottom;
			if (safeAreaProps.left !== left) left = safeAreaProps.left;
			if (safeAreaProps.right !== right) right = safeAreaProps.right;
			if (safeAreaProps.top !== top) top = safeAreaProps.top;
		}

		if (
			bottom !== safeArea.value.bottom ||
			left !== safeArea.value.left ||
			right !== safeArea.value.right ||
			top !== safeArea.value.top
		) {
			safeArea.value = { bottom, left, right, top };
		}
	})();

	return list as SkiaFlatListState<T, B>;
}
