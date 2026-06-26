import { type JSX } from "react";
const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");

const { SkiaViewNativeId } =
	require("@shopify/react-native-skia/src/views/SkiaViewNativeId") as typeof import("@shopify/react-native-skia/lib/typescript/src/views/SkiaViewNativeId");

const { SkiaViewApi } =
	require("@shopify/react-native-skia/src/views/api") as typeof import("@shopify/react-native-skia/lib/typescript/src/views/api");

import type { GroupProps, RenderNode, SkMatrix } from "@shopify/react-native-skia/lib/typescript/src/";
import { cancelAnimation, makeMutable, useDerivedValue, useSharedValue, withSpring } from "react-native-reanimated";
import { getScrollGesture, type ScrollGestureProps, type ScrollGestureState } from "./ScrollGesture";
import { useKeyboardHandler } from "react-native-keyboard-controller";
import { runOnUI, type SharedValue } from "react-native-reanimated";
import { useMemo } from "react";
import type { ReanimatedContext } from "react-native-keyboard-controller";
import { Gesture } from "react-native-gesture-handler";
import { getScrollbar } from "./Scrollbar";
import type { ComposedGesture, GestureType } from "react-native-gesture-handler";
import { callOnUI } from "../Util/callOnUI";
import { appendNode, setNodeProp, SkiaDomApi } from "../Util/DOM";

export interface EdgeInsets {
	top: number;
	right: number;
	bottom: number;
	left: number;
}

/** */
export type InitialScrollViewState = {
	/** @hidden	 */
	_nativeId: number;
	/** @hidden	 */
	mode: SharedValue<"continuous" | "default">;
	/**
	 * The root [group node](https://shopify.github.io/react-native-skia/docs/group) of the skia list view with a fixed position that contains the `content` group node
	 *
	 * You can transform the entire list by setting the `matrix` property.
	 *
	 * ```tsx
	 * root.value.setProp("matrix", Skia.Matrix().skew(1, 0.5).get());
	 * ```
	 */
	root: SharedValue<RenderNode<GroupProps>>;
	/**
	 * The content [group node](https://shopify.github.io/react-native-skia/docs/group) of the skia list view that contains the list items which are translated based on the scroll position.
	 */
	content: SharedValue<RenderNode<GroupProps>>;
	/** @hidden	 */
	layout: SharedValue<{ width: number; height: number }>;
	/**
	 * The Skia Matrix that translates the content node.
	 *
	 * - `matrix.value[0]` is the **X scale**.
	 * - `matrix.value[4]` is the **Y scale**.
	 * - `matrix.value[5]` is the **Y translation**. Use `scrollY` instead
	 * - `matrix.value[2]` is the **X translation**. Use `safeArea.left` instead
	 * - `matrix.value[1]` is the **X skew**.
	 * - `matrix.value[3]` is the **Y skew**.
	 */
	matrix: SharedValue<SkMatrix>;
	/**
	 * Call `redraw()` to request a redraw of the skia canvas, e.g. when adding a fixed element to the root node. \
	 * When using FlatList use `redrawItems()` instead to redraw the list items. \
	 * When animating a property use `startedAnimation()` and `finishedAnimation()` to efficiently rerender the list.
	 */
	redraw: () => void;
	/** @hidden	 */
	safeArea: SharedValue<EdgeInsets>;
	/** @hidden	 */
	invertedFactor: number;
	/** @hidden	 */
	startedAnimation: () => void;
	/** @hidden	 */
	finishedAnimation: () => void;
	/**
	 * Shared value that indicates if the view is currently being pressed.
	 */
	pressing: SharedValue<boolean>;
};

/**
 */
export type SkiaScrollViewProps = Partial<Omit<SkiaScrollViewState, "safeArea" | "mode">> &
	ScrollGestureProps & {
		/**
		 * Specify a custom scroll gesture.
		 */
		customScrollGesture?: typeof getScrollGesture;
		/**
		 * Specify a custom gesture handler.
		 * E.g. to implement scrolling and swiping list items horizontally.
		 */
		customGesture?: (
			props: ScrollGestureState &
				InitialScrollViewState & {
					scrollbar: ReturnType<typeof getScrollbar>;
				}
		) => ComposedGesture;
		/**
		 * Specify offsets for the content of the scroll view.
		 *
		 * e.g. `{ top: 30, bottom: 20, left: 15, right: 15 }`
		 */
		safeArea?: EdgeInsets;
		/**
		 * Set to `false` to disable the automatic keyboard adjustment.
		 */
		automaticallyAdjustKeyboardInsets?: boolean;
		/**
		 * Specify a custom keyboard handler
		 */
		keyboard?: ReanimatedContext;
		/**
		 * SkiaScrollView so that the elements start rendering from the bottom screen to the top.
		 */
		inverted?: boolean;
		/**
		 * manually overwrite the rendering mode. The default value is undefined meaning it only rerenders when needed
		 */
		mode?: "default" | "continuous";
	};

export type SkiaScrollViewState = InitialScrollViewState &
	Omit<ScrollGestureState, "gesture"> & {
		touchGesture: GestureType;
		scrollGesture: GestureType | ComposedGesture;
		scrollbarGesture: GestureType | ComposedGesture;
		Scrollbar: () => JSX.Element;
		gesture: ComposedGesture;
		simultaneousHandlers: React.RefObject<GestureType>[];
	};

/**
 * Use this hook to manage and access the state of SkiaScrollView.
 *
 * ```tsx
 * const state = useSkiaScrollView({ height: 1000 });
 *
 * state.content.value.addChild(SkiaDomApi.RectNode({ width: 100, height: 100, x: 0, y: 0 }));
 *
 * <SkiaScrollView list={state} style={{ flex: 1 }} />
 * ```
 */
export function useSkiaScrollView<A>(props: SkiaScrollViewProps = {} as any): SkiaScrollViewState {
	const keyboardHeight = useSharedValue(0);
	const scrollingInteractive = useSharedValue(false);
	const scrollingDisabled = useSharedValue(false);
	const scrollY = useSharedValue(0);
	const startY = useSharedValue(0);
	const safeAreaBottom = props.safeArea?.bottom || 0;

	useKeyboardHandler(
		{
			onStart: (e) => {
				"worklet";
				// will show
				if (e.progress === 1) {
					scrollingInteractive.value = false;
					scrollingDisabled.value = false;
				}
				// will hide
				if (e.duration !== 0 && e.progress === 0 && scrollingInteractive.value) {
					scrollingDisabled.value = false;
					cancelAnimation(scrollY);
					scrollY.value = withSpring(startY.value, {
						damping: 500,
						stiffness: 1000,
						mass: 3,
					});
					// on Interactive closed keyboard
				}
			},
			onMove: (e) => {
				"worklet";
				keyboardHeight.value = -e.height + safeAreaBottom * e.progress;
			},
			onInteractive: (e) => {
				"worklet";
				keyboardHeight.value = -e.height + safeAreaBottom * e.progress;
				if (e.progress !== 1) {
					scrollingInteractive.value = true;
					if (!scrollingDisabled.value) {
						scrollingDisabled.value = true;
					}
				}
			},
			onEnd: () => {
				"worklet";
			},
		},
		[]
	);

	const offsetY = useDerivedValue(() => keyboardHeight.value);
	// const offsetY = keyboardHeight.value;

	const list = useMemo(() => {
		const _nativeId = SkiaViewNativeId.current++;
		const invertedFactor = props.inverted ? -1 : 1;
		let animations = makeMutable(0);
		const mode = makeMutable("default" as "continuous" | "default");
		const root = props.root?.value || SkiaDomApi.GroupNode({});
		const pressing = makeMutable(false);
		const layout = makeMutable({ width: 0, height: 0 });

		const state = {
			_nativeId,
			pressing,
			matrix: makeMutable(Skia.Matrix().translate(0, 0)),
			redraw() {
				"worklet";

				globalThis.SkiaListViewApi?.requestRedraw(_nativeId);
			},
			layout,
			scrollY,
			startY,
			...props,
			mode,
			root: props.root || makeMutable(root),
			content: props.content || makeMutable(SkiaDomApi.GroupNode({})),
			safeArea: makeMutable({
				top: props.safeArea?.top || 0,
				bottom: props.safeArea?.bottom || 0,
				left: props.safeArea?.left || 0,
				right: props.safeArea?.right || 0,
			}),
			invertedFactor,
			startedAnimation() {
				"worklet";

				animations.value++;
				mode.value = "continuous";

				// if (animations.value === 1) {
				// 	function loop() {
				// 		"worklet";

				// 		if (animations.value <= 0) return;

				// 		SkiaViewApi.requestRedraw(_nativeId);
				// 		requestAnimationFrame(loop);
				// 	}

				// 	callOnUI(loop)();
				// }
			},
			finishedAnimation() {
				"worklet";

				animations.value--;
				if (animations.value <= 0) {
					mode.value = "default";
					animations.value = 0;
				}
			},
		};

		const scrollState = (props.customScrollGesture || getScrollGesture)({
			scrollY,
			startY,
			...props,
			startedAnimation: state.startedAnimation,
			finishedAnimation: state.finishedAnimation,
			layout,
			offsetY,
		});
		const scrollGestureRef = { current: scrollState.gesture };
		scrollState.gesture.withRef(scrollGestureRef);

		const { matrix, content, redraw, safeArea } = state;

		const scrollbar = getScrollbar({ ...scrollState, ...state } as any);
		const scrollbarRef = { current: scrollbar.gesture };
		scrollbar.gesture.withRef(scrollbarRef);

		const touchGestureRef = { current: null };
		const touchGesture = Gesture.Manual()
			.onTouchesDown(() => {
				pressing.value = true;
			})
			.onTouchesUp(() => {
				pressing.value = false;
			})
			.onTouchesCancelled(() => {
				pressing.value = false;
			})
			.withRef(touchGestureRef);

		const customGesture =
			props.customGesture ||
			(({ scrollbar, gesture }) =>
				Gesture.Simultaneous(touchGesture, Gesture.Exclusive(scrollbar.gesture, gesture)));

		const gesture = customGesture({ scrollbar, ...scrollState, ...state } as any);

		appendNode(root, content.value);

		runOnUI(() => {
			"worklet";
			const { scrollY } = scrollState;
			let height = invertedFactor === -1 ? layout.value.height - safeArea.value.bottom : safeArea.value.top;

			layout.addListener(1, (value) => {
				height = invertedFactor === -1 ? value.height - safeArea.value.bottom : safeArea.value.top;
				onScroll(scrollY.value);
			});
			setNodeProp(content.value, "matrix", matrix.value);

			function onScroll(value: number) {
				const matrixValue = matrix.value;
				matrixValue.identity().translate(0, value * -1 * invertedFactor + height + offsetY.value);

				redraw();
			}

			scrollY.addListener(1, onScroll);
			offsetY.addListener(1, () => onScroll(scrollY.value));
		})();

		return {
			...(scrollState as Omit<typeof scrollState, "gesture">),
			...state,
			Scrollbar: scrollbar.Scrollbar,
			gesture,
			scrollGesture: scrollState.gesture,
			scrollbarGesture: scrollbar.gesture,
			touchGesture: touchGesture,
			simultaneousHandlers: [touchGestureRef, scrollGestureRef, scrollbarRef],
		};
	}, []);

	if (props.height) {
		const { safeArea, maxHeight, layout } = list;
		maxHeight.value = Math.max(props.height - layout.value.height + safeArea.value.top + safeArea.value.bottom, 1);
	}

	return list as any;
}
