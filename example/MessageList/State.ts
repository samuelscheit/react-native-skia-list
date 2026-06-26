import { makeMutable, runOnJS, runOnUI, useSharedValue } from "react-native-reanimated";
import { useLayoutEffect, useState } from "react";
import { interpolateClamp, useSkiaFlatList, type TapResult } from "react-native-skia-list";
import { appendNode, setNodeProp, SkiaDomApi } from "../../src/Util/DOM";
import { Gesture } from "react-native-gesture-handler";
import { getContextMenu } from "./ContextMenu";
import { getSwipeGesture } from "./Swipe";
import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { replyIconFactory } from "./Assets";
import type { ImageProps, RenderNode, SkImage, SkParagraph } from "@shopify/react-native-skia/lib/typescript/src/";
const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");
import { getRenderMessageItem, type MessageListProps } from "./Render";
import type { getRandomMessageData } from "./randomMessage";
const { SkiaViewApi } =
	require("@shopify/react-native-skia/src/views/api") as typeof import("@shopify/react-native-skia/lib/typescript/src/views/api");

export type MessageItem = {
	text: SkParagraph | undefined;
	author: SkParagraph;
	user_id: string;
	reactions: {
		emoji: string;
		width: number;
		paragraph: SkParagraph;
		count: string;
	}[];
	attachments: (SkImage | null)[];
	avatar: SkImage | null;
	id: string;
};

export interface useMessageListProps {
	my_user_id: string;
	bubble: boolean;
	is_group: boolean;
	initialData?: () => ReturnType<typeof getRandomMessageData>[];
}

const replyIcon = replyIconFactory("#6b6c6f");

export function useMessageListState(props: useMessageListProps & MessageListProps) {
	const avatars = useSharedValue({} as Record<string, RenderNode<ImageProps> | undefined>);
	const contextMenuMessage = useSharedValue<TapResult<MessageItem> | undefined>(undefined);
	const renderItem = getRenderMessageItem({ ...props, avatars });
	const [root] = useState(() => {
		const el = SkiaDomApi.GroupNode({});
		// el.addChild(
		// 	SkiaDomApi.FillNode({
		// 		color: "white",
		// 	})
		// );
		return makeMutable(el);
	});
	const swipePosition = useSharedValue(0);
	const swipeItem = useSharedValue(undefined as string | undefined | number);

	const list = {
		...useSkiaFlatList({
			root,
			...props,
			inverted: true,
			renderItem,
			keyExtractor: (item: any) => {
				"worklet";
				return item.id;
			},
			onTap: (result) => {
				"worklet";

				console.log("onTap", result);
			},
		}),
		contextMenuMessage,
		avatars,
		my_user_id: props.my_user_id,
	};

	const swipeTreshold = 30;
	const { getItemFromTouch, scrollY, _nativeId, elements, rowOffsets, heights, layout, safeArea } = list;

	const [replyIconElement] = useState(() => {
		const swipeGesture = getSwipeGesture({
			onEndSwipe() {
				"worklet";
				// console.log("onEndSwipe");
			},
			onOverSwipe() {
				"worklet";
				runOnJS(impactAsync)("medium" as ImpactFeedbackStyle);
			},
			onStartSwipe(e) {
				"worklet";
				const result = getItemFromTouch(e);
				swipeItem.value = result?.item?.id;
			},
			onSwipe() {
				"worklet";
				console.log("onSwipe");
			},
			swipePosition,
			threshold: swipeTreshold,
		});
		const swipeGestureRef = { current: swipeGesture };
		swipeGesture.withRef(swipeGestureRef);

		const contextMenu = getContextMenu(list);
		const contextMenuRef = { current: contextMenu.gesture };

		list.gesture = Gesture.Simultaneous(
			list.touchGesture,
			Gesture.Race(
				contextMenu.gesture,
				Gesture.Exclusive(list.scrollbarGesture, swipeGesture, list.scrollGesture, list.tapGesture)
			)
		);
		list.simultaneousHandlers.push(swipeGestureRef, contextMenuRef);

		console.log("message list", list.tapGesture);

		const replyIconElement = SkiaDomApi.ImageSVGNode({
			svg: replyIcon,
			width: 30,
			height: 30,
			x: 0,
			y: 0,
		});
		setNodeProp(replyIconElement, "matrix", Skia.Matrix().scale(0, 0).get());
		appendNode(list.content.value, replyIconElement);

		return replyIconElement;
	});

	useState(() => {
		runOnUI(() => {
			"worklet";

			swipePosition.addListener(_nativeId, (value) => {
				console.log("swipePosition", value, !!swipeItem.value);
				if (!swipeItem.value) return;
				const element = elements.value[swipeItem.value];
				if (!element) return;

				const x = value;
				const y = rowOffsets.value[swipeItem.value];
				console.log("swipePosition", value, x, y);
				if (y === undefined) return;

				const itemHeight = heights.value[swipeItem.value] || 0;

				setNodeProp(element, "matrix", Skia.Matrix().translate(x, y).get());
				globalThis.SkiaListViewApi?.requestRedraw(_nativeId);

				const replyIconSize = interpolateClamp(value, -swipeTreshold, 0, 1, 0);

				const spacingRight = layout.value.width - replyIconSize - safeArea.value.right - 5;

				const replyX = spacingRight + value;
				const replyY = y + itemHeight / 2 - replyIconSize * 15;

				setNodeProp(replyIconElement, "origin", {
					x: replyX,
					y: replyY,
				});
				setNodeProp(
					replyIconElement,
					"matrix",
					Skia.Matrix().scale(replyIconSize, replyIconSize).translate(replyX, replyY).get()
				);
			});
		})();
	});

	return list;
}
