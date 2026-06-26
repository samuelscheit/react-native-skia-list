const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");
import { SkiaFlatList, useSkiaFlatList } from "react-native-skia-list";
import { appendNode, SkiaDomApi } from "../src/Util/DOM";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCallback, useMemo } from "react";

export default function FlatList() {
	const safeArea = useSafeAreaInsets();

	const blue = Skia.Paint();
	blue.setColor(Skia.Color("rgb(124, 165, 230)"));

	const white = Skia.Color("#fff");

	const paragraphBuilder = useMemo(() => {
		return Skia.ParagraphBuilder.Make(
			{
				textStyle: {
					fontSize: 24,
					fontFamilies: ["Roboto", "Noto"],
					color: Skia.Color("#fff"),
				},
			},
			globalThis.fontManager
		);
	}, []);

	const initialData = useCallback(() => {
		return Array.from({ length: 10000 }, (_, i) => {
			paragraphBuilder.reset();

			return {
				id: `${i}`,
				text: paragraphBuilder.addText(`Item ${i}`).build(),
			};
		});
	}, []);

	type Entry = ReturnType<typeof initialData>[number];

	const keyExtractor = useCallback((item: Entry) => {
		"worklet";
		return item.id;
	}, []);

	const rectPadding = 10;
	const rectMargin = 10;

	const list = useSkiaFlatList({
		safeArea: {
			bottom: safeArea.bottom,
			top: safeArea.top,
			left: 15,
			right: 15,
		},
		keyExtractor,
		initialData,
		estimatedItemHeight: 58,
		inverted: false,
		renderItem: (item, _index, state, element) => {
			"worklet";

			const width = state.layout.value.width - state.safeArea.value.left - state.safeArea.value.right;

			let maxTextWidth = width - rectPadding * 2;

			item.text.layout(maxTextWidth);

			const textHeight = item.text.getHeight();
			const rectHeight = textHeight + rectPadding * 2;

			const itemHeight = rectHeight + rectMargin;

			if (!element) return itemHeight;

			appendNode(
				element,
				SkiaDomApi.RectNode({
					x: 0,
					y: 0,
					width,
					height: rectHeight,
					paint: blue,
				})
			);

			appendNode(
				element,
				SkiaDomApi.ParagraphNode({
					paragraph: item.text,
					x: rectPadding,
					y: rectPadding,
					width: maxTextWidth,
					color: white,
				})
			);

			return itemHeight;
		},
	});

	return <SkiaFlatList list={list} style={{ flex: 1 }} />;
}
