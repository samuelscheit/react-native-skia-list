import type {
	SkTextStyle,
	RenderNode,
	GroupProps,
	ChildrenProps,
} from "@shopify/react-native-skia/lib/typescript/src/";
const { FontSlant, FontWeight, FontWidth, TextAlign, Skia, Paragraph, RoundedRect, Line, ImageSVG } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");
const { SkiaViewApi } =
	require("@shopify/react-native-skia/src/views/api") as typeof import("@shopify/react-native-skia/lib/typescript/src/views/api");

import { copyIconFactory, deleteIconFactory, emojiFontFamily, replyIconFactory } from "./Assets";
import type { MessageItem } from "./State";
import {
	makeMutable,
	runOnJS,
	runOnUI,
	type SharedValue,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { Gesture, MouseButton, type TouchData } from "react-native-gesture-handler";
import { type PointProp, PixelRatio } from "react-native";
import React, { type ReactNode, useLayoutEffect } from "react";
import { isInBound, useSkiaFlatList, type TapResult } from "react-native-skia-list";
import { appendNode, removeNode, setNodeProp, SkiaDomApi } from "../../src/Util/DOM";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import type { SkMatrix } from "@shopify/react-native-skia/lib/typescript/src/";
import { SkiaRoot } from "../../src/Util/Reconciler";

export const dpi = 1;
export const scale = PixelRatio.getFontScale() * 1 * dpi;

export const blackPaint = Skia.Paint();
export const black = Skia.Color("black");
blackPaint.setColor(black);

export const white = Skia.Color("#fff");
export const whitePaint = Skia.Paint();
whitePaint.setColor(white);

const paragraphStyle: SkTextStyle = {
	fontSize: 17 * scale,
	color: black,
	fontStyle: {
		slant: FontSlant.Upright,
		weight: FontWeight.Normal,
		width: FontWidth.Normal,
	},
	heightMultiplier: 1.1,
	fontFamilies: ["Roboto"],
};

if (!globalThis.fontManager) globalThis.fontManager = Skia.TypefaceFontProvider.Make();

const actionBuilder = Skia.ParagraphBuilder.Make(
	{
		textAlign: TextAlign.Left,
		textStyle: { ...paragraphStyle, color: black },
	},
	globalThis.fontManager
);

const emojiSize = 25 * scale;

export const emojiBuilder = Skia.ParagraphBuilder.Make(
	{
		textAlign: TextAlign.Left,
		textStyle: { ...paragraphStyle, fontSize: emojiSize, fontFamilies: ["Roboto", "Noto"], color: white },
	},
	globalThis.fontManager
);

const actionColor = Skia.Color("#f4f4f6");
const actionPaint = Skia.Paint();
actionPaint.setColor(actionColor);

const actionHighlightColor = Skia.Color("#e5e5ea");
const actionHighlightPaint = Skia.Paint();
actionHighlightPaint.setColor(actionHighlightColor);

const emojisPaddingY = 12 * scale;
const emojisPaddingX = 15 * scale;
const actionsPaddingY = 12 * scale;
const actionsPaddingX = 15 * scale;
const actionsSpacing = 10 * scale;
const actionRadius = 10 * scale;
const emojiRadius = 15 * scale;

const actionRadius0 = { x: 0, y: 0 };
const emojiRadius0 = { x: 0, y: 0 };
const actionRadiusFull = { x: actionRadius, y: actionRadius };
const emojiRadiusFull = { x: emojiRadius, y: emojiRadius };

export const opacityPaint = Skia.Paint();
opacityPaint.setColor(white);

let actionsHeight = 0;
const actionsWidth = 200 * scale;
const actionsIconSize = 25 * scale;
const actions = [
	{
		label: "Reply",
		icon: replyIconFactory("#6b6c6f"),
	},
	{
		label: "Copy",
		icon: copyIconFactory("#6b6c6f"),
	},
	{
		label: "Delete",
		icon: deleteIconFactory("#ff3b30"),
	},
].map((x) => {
	actionBuilder.reset();
	if (x.label === "Delete") actionBuilder.pushStyle({ ...paragraphStyle, color: Skia.Color("#ff3b30") });

	const paragraph = actionBuilder.addText(x.label).build();
	paragraph.layout(actionsWidth);
	const actionHeight = paragraph.getHeight() + actionsPaddingY * 2;
	actionsHeight += actionHeight;

	return {
		...x,
		paragraph,
		height: actionHeight,
	};
});
let emojisWidth = 0;
let emojisHeight = 0;
const emojis = [{ label: "❤️" }, { label: "👍" }, { label: "👎" }, { label: "😂" }].map((x) => {
	emojiBuilder.reset();
	const paragraph = emojiBuilder.addText(x.label).build();
	paragraph.layout(emojiSize + 10);
	emojisHeight = paragraph.getHeight() + emojisPaddingY * 2;
	const emojiWidth = paragraph.getMaxIntrinsicWidth() + emojisPaddingX * 2;
	emojisWidth += emojiWidth;

	return {
		...x,
		paragraph,
		height: emojisHeight,
		width: emojiWidth,
	};
});

function ReactSkiaRender(children: ReactNode, redraw: () => void) {
	const root = new SkiaRoot(Skia, true, redraw, () => -1);

	// root.render(children);

	return root;
}

export interface ContextMenuProps extends ReturnType<typeof useSkiaFlatList> {
	contextMenuMessage: SharedValue<TapResult<any> | undefined>;
	my_user_id: any;
}

export function getContextMenu(state: ContextMenuProps) {
	const {
		getItemFromTouch,
		renderItem,
		unmountElement,
		contextMenuMessage,
		scrollY,
		layout,
		safeArea,
		root: list,
		_nativeId,
		my_user_id: user_id,
		redrawItems,
		getTransformed,
		keyExtractor,
	} = state;

	const scrollListenerId = 4;
	const actionsScale = makeMutable(0);
	const actionsOpacity = makeMutable(0);
	const contextMenuActivated = makeMutable(false);
	const contextMenuFailed = makeMutable(false);
	const contextMenuStartX = makeMutable(0);
	const contextMenuBlur = makeMutable(0);
	const contextMenuStartY = makeMutable(0);
	const contextMenuX = makeMutable(0);
	const contextMenuY = makeMutable(0);
	const contextMenuOffsetY = makeMutable(0);
	let startScrollY = makeMutable(0);
	let contextMenuOpen = makeMutable(false);

	let actionLastSelected = makeMutable(null as number | null);
	let emojiLastSelected = makeMutable(null as number | null);

	var backdropFilter = makeMutable(null as RenderNode<ChildrenProps> | null);
	var item = makeMutable(null as RenderNode<GroupProps> | null);
	var actionRoot = makeMutable(null as { dom: RenderNode<GroupProps>; unmount: () => void } | null);

	function Emoji({
		x,
		y,
		emoji,
		i,
		absoluteY,
	}: {
		emoji: (typeof emojis)[0];
		x: number;
		y: number;
		i: number;
		absoluteY: number;
	}) {
		const paint = useSharedValue(actionPaint);
		const lastemoji = i === emojis.length - 1;
		const firstemoji = i === 0;

		useLayoutEffect(() => {
			runOnUI(() => {
				function onMove() {
					const previousPaint = paint.value;
					let newPaint = previousPaint;

					if (
						isInBound(
							contextMenuX.value,
							contextMenuY.value,
							x,
							absoluteY + contextMenuOffsetY.value,
							emoji.width,
							emoji.height,
							0
						)
					) {
						newPaint = actionHighlightPaint;
					} else {
						newPaint = actionPaint;
					}

					if (newPaint !== previousPaint) {
						paint.value = newPaint;
						globalThis.SkiaListViewApi?.requestRedraw(_nativeId);

						if (newPaint === actionHighlightPaint) {
							runOnJS(impactAsync)("light" as ImpactFeedbackStyle);
							emojiLastSelected.value = i;
						} else {
							emojiLastSelected.value = null;
						}
					}
				}

				contextMenuX.addListener(_nativeId + i + 100, onMove);
				contextMenuY.addListener(_nativeId + i + 100, onMove);
			})();

			return runOnUI(() => {
				contextMenuX.removeListener(_nativeId + i + 100);
				contextMenuY.removeListener(_nativeId + i + 100);
			});
		}, []);

		return (
			<React.Fragment key={emoji.label}>
				<RoundedRect
					rect={{
						rect: {
							x,
							y,
							width: emoji.width,
							height: emoji.height,
						},
						bottomLeft: firstemoji ? emojiRadiusFull : emojiRadius0,
						topLeft: firstemoji ? emojiRadiusFull : emojiRadius0,
						bottomRight: lastemoji ? emojiRadiusFull : emojiRadius0,
						topRight: lastemoji ? emojiRadiusFull : emojiRadius0,
					}}
					paint={paint}
				/>
				<Paragraph
					paragraph={emoji.paragraph}
					x={x + emojisPaddingX}
					y={y + emojisPaddingY}
					width={emoji.width}
				/>
			</React.Fragment>
		);
	}

	function Action({
		x,
		y,
		action,
		i,
		absoluteY,
	}: {
		action: (typeof actions)[0];
		x: number;
		y: number;
		i: number;
		absoluteY: number;
	}) {
		const paint = useSharedValue(actionPaint);
		const lastAction = i === actions.length - 1;
		const firstAction = i === 0;

		useLayoutEffect(() => {
			runOnUI(() => {
				function onMove() {
					const previousPaint = paint.value;
					let newPaint = previousPaint;

					if (
						isInBound(
							contextMenuX.value,
							contextMenuY.value,
							x,
							absoluteY + contextMenuOffsetY.value,
							actionsWidth,
							action.height,
							0
						)
					) {
						newPaint = actionHighlightPaint;
					} else {
						newPaint = actionPaint;
					}

					if (newPaint !== previousPaint) {
						paint.value = newPaint;
						globalThis.SkiaListViewApi?.requestRedraw(_nativeId);

						if (newPaint === actionHighlightPaint) {
							runOnJS(impactAsync)("light" as ImpactFeedbackStyle);
							actionLastSelected.value = i;
						} else {
							actionLastSelected.value = null;
						}
					}
				}

				contextMenuX.addListener(_nativeId + i, onMove);
				contextMenuY.addListener(_nativeId + i, onMove);
			})();

			return runOnUI(() => {
				contextMenuX.removeListener(_nativeId + i);
				contextMenuY.removeListener(_nativeId + i);
			});
		}, []);

		return (
			<React.Fragment key={action.label}>
				<RoundedRect
					rect={{
						rect: {
							x,
							y,
							width: actionsWidth,
							height: action.height,
						},
						bottomLeft: lastAction ? actionRadiusFull : actionRadius0,
						topLeft: firstAction ? actionRadiusFull : actionRadius0,
						bottomRight: lastAction ? actionRadiusFull : actionRadius0,
						topRight: firstAction ? actionRadiusFull : actionRadius0,
					}}
					paint={paint}
				/>
				<Paragraph paragraph={action.paragraph} x={x + actionsPaddingX} y={y + actionsPaddingY} width={300} />
				{!lastAction && (
					<Line
						p1={{ x, y: y + action.height }}
						p2={{ x: x + actionsWidth, y: y + action.height }}
						paint={blackPaint}
					/>
				)}
				<ImageSVG
					svg={action.icon}
					x={x + actionsWidth - actionsIconSize - actionsPaddingX}
					y={y + actionsPaddingY - 5}
					width={actionsIconSize}
					height={actionsIconSize}
				/>
			</React.Fragment>
		);
	}

	function Emojis(tap: TapResult<MessageItem>) {
		let inverted = 1;

		if (
			tap.absoluteY + contextMenuOffsetY.value + tap.height + safeArea.value.bottom + actionsHeight >=
			layout.value.height
		) {
			inverted = -1;
		}

		let alignRight = tap.item.user_id === user_id;
		let rowY =
			inverted === -1 ? -emojisHeight - actionsSpacing * 2 - actionsHeight : -emojisHeight - actionsSpacing;

		let x = (safeArea.value.left || 15) + 40 + 7;
		if (alignRight) {
			x = layout.value.width - emojisWidth - (safeArea.value.right || 15);
		}

		return emojis.map((emoji, i) => {
			const result = (
				<Emoji absoluteY={tap.absoluteY + rowY} key={emoji.label} emoji={emoji} x={x} y={rowY} i={i} />
			);
			x += emoji.width;
			return result;
		});
	}

	function Actions(tap: TapResult<MessageItem>) {
		let inverted = 1;

		if (
			tap.absoluteY + contextMenuOffsetY.value + tap.height + safeArea.value.bottom + actionsHeight >=
			layout.value.height
		) {
			inverted = -1;
		}

		let alignRight = tap.item.user_id === user_id;
		let rowY = inverted === -1 ? -actionsHeight - actionsSpacing : tap.height + actionsSpacing;

		let x = (safeArea.value.left || 15) + 40 + 7;
		if (alignRight) {
			x = layout.value.width - actionsWidth - (safeArea.value.right || 15);
		}

		return actions.map((action, i) => {
			const result = (
				<Action absoluteY={tap.absoluteY + rowY} key={action.label} action={action} x={x} y={rowY} i={i} />
			);
			rowY += action.height;
			return result;
		});
	}

	function RenderActions(matrix: SkMatrix, tap: TapResult<MessageItem>) {
		const root = ReactSkiaRender([Actions(tap), Emojis(tap)], () => {
			globalThis.SkiaListViewApi?.requestRedraw(_nativeId);
		});
		const result = root.dom as any;
		appendNode(list.value, result);

		actionRoot.value = {
			dom: result,
			unmount: () => root.unmount(),
		};
		setNodeProp(result, "matrix", matrix);
		opacityPaint.setAlphaf(0);
		setNodeProp(result, "layer", opacityPaint);
	}

	const shareableState = {
		layout: state.layout,
		scrollY: state.scrollY,
		elements: state.elements,
		heights: state.heights,
		rowOffsets: state.rowOffsets,
		firstRenderIndex: state.firstRenderIndex,
		firstRenderHeight: state.firstRenderHeight,
		lastRenderIndex: state.lastRenderIndex,
		lastRenderHeight: state.lastRenderHeight,
		maintainVisibleContentPosition: state.maintainVisibleContentPosition,
		keyExtractor: state.keyExtractor,
		renderItem: state.renderItem,
		data: state.data,
		transformedData: state.transformedData,
		renderTime: state.renderTime,
		maxHeight: state.maxHeight,
		safeArea: state.safeArea,
		content: state.content,
		invertedFactor: state.invertedFactor,
		scrollToIndex: state.scrollToIndex,
		startY: state.startY,
		redraw: state.redraw,
		pressing: state.pressing,
		// @ts-ignore
		avatars: state.avatars,
		redrawItem: () => {},
	};

	function createBackdropFilter(result: TapResult<any>) {
		"worklet";

		// filter
		const filter = SkiaDomApi.BackdropFilterNode({});
		const blurFilter = SkiaDomApi.BlurImageFilterNode({
			blur: 0,
			mode: "clamp",
		});
		appendNode(filter, blurFilter);
		appendNode(list.value, filter);
		backdropFilter.value = filter;
		// item
		const translation = Skia.Matrix().translate(0, result.absoluteY);
		const element = SkiaDomApi.GroupNode({
			matrix: translation,
		});
		item.value = element;
		appendNode(list.value, element);

		unmountElement(result.index, result.item);
		const id = keyExtractor(result.item, result.index);
		const transformed = getTransformed(result.item, result.index, id, shareableState);
		renderItem.value.function!(transformed, result.index, shareableState, element);

		runOnJS(RenderActions)(translation, result);

		contextMenuBlur.addListener(_nativeId, (value) => {
			setNodeProp(blurFilter, "blur", value);
			globalThis.SkiaListViewApi?.requestRedraw(_nativeId);
		});

		function onUpdateY() {
			const offsetY = scrollY.value - startScrollY.value + contextMenuOffsetY.value;
			translation.identity().translate(0, result.absoluteY + offsetY);
		}

		scrollY.addListener(scrollListenerId, onUpdateY);
		contextMenuOffsetY.addListener(_nativeId, onUpdateY);
		actionsOpacity.addListener(_nativeId, (value) => {
			opacityPaint.setAlphaf(value);
		});
	}

	function onCloseContextMenu(e: { x: number; y: number }) {
		"worklet";

		contextMenuX.value = e.x;
		contextMenuY.value = e.y;
		contextMenuOpen.value = false;
		contextMenuBlur.value = withTiming(0, { duration: 300 }, () => {
			if (backdropFilter.value) removeNode(list.value, backdropFilter.value);
			if (item.value) removeNode(list.value, item.value);
			if (actionRoot.value) {
				removeNode(list.value, actionRoot.value.dom);
				runOnJS(actionRoot.value.unmount)();
			}

			redrawItems();
		});
		contextMenuOffsetY.value = withTiming(0, { duration: 300 });
		actionsScale.value = withSpring(0, { mass: 1, damping: 40, stiffness: 306 });
		// actionsOpacity.value = withSpring(0, { mass: 1, damping: 40, stiffness: 306 });
		actionsOpacity.value = withTiming(0, { duration: 300 });
	}

	function onContextMenuAction(index: number | null) {
		"worklet";

		if (index === null) return;
		if (!contextMenuActivated.value) return; // prevent from calling action twice
		const action = actions[index];
		if (!action) return;

		contextMenuActivated.value = false;
	}

	function onContextMenuEmoji(index: number | null) {
		"worklet";
		if (index === null) return;
		if (!contextMenuActivated.value) return; // prevent from calling action twice
		const emoji = emojis[index];
		if (!emoji) return;

		contextMenuActivated.value = false;
	}

	function onLongPressIn(e: TouchData) {
		"worklet";
		const result = getItemFromTouch(e);
		if (!result) return;

		contextMenuMessage.value = result;
		startScrollY.value = scrollY.value;

		contextMenuOpen.value = true;
		contextMenuBlur.value = withTiming(6, { duration: 300 });
		actionsScale.value = withSpring(1, { mass: 1, damping: 28, stiffness: 306 });
		actionsOpacity.value = withTiming(1, { duration: 300 });
		actionLastSelected.value = null;
		emojiLastSelected.value = null;

		const height = layout.value.height;

		if (!height) return;
		let offsetY = 0;
		const topSpace = 0;
		const bottomSpace = 0;

		offsetY = -Math.max(0, result.absoluteY + result.height - height + safeArea.value.bottom + bottomSpace);
		if (offsetY === 0) offsetY = -Math.min(0, result.absoluteY - safeArea.value.top - topSpace);
		if (offsetY !== 0) contextMenuOffsetY.value = withTiming(offsetY, { duration: 300 });

		createBackdropFilter(result);

		runOnJS(impactAsync)("medium" as ImpactFeedbackStyle);
		// TODO: stop animation
	}

	function onLongPress(e: PointProp) {
		"worklet";

		const result = getItemFromTouch(e);
		if (!result) return;

		if (actionLastSelected.value === null && emojiLastSelected.value === null) return;

		onContextMenuAction(actionLastSelected.value);
		onContextMenuEmoji(emojiLastSelected.value);

		onCloseContextMenu({
			x: result.touchX,
			y: result.touchY,
		});

		return true;
	}

	function onLongPressOut(_: PointProp) {
		"worklet";
		// pressedAvatars.clear();
	}

	const gesture = Gesture.Manual()
		.onTouchesDown((e, manager) => {
			const [touch] = e.allTouches;
			if (!touch) return manager.fail();
			if (contextMenuOpen.value) {
				contextMenuX.value = touch.x;
				contextMenuY.value = touch.y;

				if (!onLongPress(touch)) {
					onCloseContextMenu(touch);
				}

				manager.fail();

				return;
			}
			contextMenuActivated.value = false;
			contextMenuFailed.value = false;
			contextMenuStartX.value = touch.x;
			contextMenuStartY.value = touch.y;
			contextMenuX.value = touch.x;
			contextMenuY.value = touch.y;

			let start = performance.now();
			function onWait() {
				if (contextMenuFailed.value) return;

				if (performance.now() - start > 300) {
					manager.begin();
					manager.activate();
					contextMenuActivated.value = true;
					onLongPressIn(touch!);
					return;
				}

				requestAnimationFrame(() => onWait());
			}

			onWait();
		})
		.onTouchesMove((e, manager) => {
			const [touch] = e.allTouches;
			if (!touch) return manager.fail();
			if (contextMenuFailed.value) return;

			const diffX = touch.x - contextMenuStartX.value;
			const diffY = touch.y - contextMenuStartY.value;

			if (contextMenuActivated.value) {
				contextMenuX.value = touch.x;
				contextMenuY.value = touch.y;

				return;
			}

			if (Math.abs(diffX) > 10 || Math.abs(diffY) > 10) {
				contextMenuFailed.value = true;
				manager.fail();
			}
		})
		.onTouchesUp((e, manager) => {
			if (!contextMenuActivated.value || e.allTouches.length !== 1 || contextMenuFailed.value) {
				contextMenuFailed.value = true;
				return manager.fail();
			}
			const [touch] = e.allTouches;
			if (!touch) return;

			manager.end();
			contextMenuStartX.value = touch.x;
			contextMenuStartY.value = touch.y;
		})
		.onTouchesCancelled((_, manager) => {
			contextMenuFailed.value = true;
			manager.fail();
		})
		.onEnd(() => {
			onLongPress({
				x: contextMenuStartX.value,
				y: contextMenuStartY.value,
			});
		})
		.onFinalize(() => {
			contextMenuFailed.value = true;
			onLongPressOut({
				x: contextMenuStartX.value,
				y: contextMenuStartY.value,
			});
		});

	return {
		gesture,
	};
}
