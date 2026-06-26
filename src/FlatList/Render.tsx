import React from "react";
import { useSkiaFlatList, type SkiaFlatListProps, type SkiaFlatListState } from "./State";
import { SkiaScrollView, type SkiaScrollViewElementProps } from "../ScrollView";

export type SkiaFlatListElementProps<T = any, B = T> = SkiaScrollViewElementProps & SkiaFlatListProps<T, B>;

/**
 * Use `<SkiaFlatList />` as a replacement for `<FlatList />` to render a list of items.
 *
 * :::info
 * This component uses the `<SkiaScrollView />` and inherits all props from it. \
 * Also it uses the Skia Rendering Engine so you can't use React Native components inside it.
 * :::
 *
 * :::note
 * You must know or calculate the layout and dimensions of the list items to use this list. \
 * For text content you can use the [`measureText()`](https://github.com/Shopify/react-native-skia/blob/569d071f3187b436fc1b2bdb38c74b73d962bfc8/packages/skia/src/skia/types/Font/Font.ts#L22) method or the Paragraph [`getHeight()`](https://github.com/Shopify/react-native-skia/blob/569d071f3187b436fc1b2bdb38c74b73d962bfc8/packages/skia/src/skia/types/Font/Font.ts#L22) API.
 * :::
 *
 * ### Example
 *
 * 
 * ```tsx
 * // needed for SkiaDomApi type
import { Skia } from "@shopify/react-native-skia";
import { SkiaFlatList } from "react-native-skia-list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Create a Skia ParagraphBuilder that will be used to build the paragraph for each item
const paragraphBuilder = Skia.ParagraphBuilder.Make({
  textStyle: {
    color: Skia.Color("black"),
    fontSize: 20,
  },
});

export default function Test2() {
  const safeArea = useSafeAreaInsets();

  return (
    <SkiaFlatList
	  safeArea={safeArea}
      // Provide an initialData array that can be serialized and passed to the worklet thread
      initialData={() => [0, 1, 2, 3, 4, 5, 6, 7, 8]}
      // To optimize performance for the initial mount you can provide a transformItem function
      // It will be called once for each item when it is mounted the first time
      transformItem={(item, index, id, state) => {
        "worklet";

        paragraphBuilder.reset(); // reuses the paragraphBuilder for each item

        return paragraphBuilder.addText(`Item ${item}`).build();
      }}
      // renderItem will be called whenever an item visibility changes
      renderItem={(item, index, state, element) => {
        "worklet";

        const { width } = state.layout.value;

        item.layout(width); // calculates the paragraph layout

        const height = item.getHeight(); // gets the height of the paragraph

        // element is a Skia.GroupNode or will be undefined if only the height of the element is needed
        if (!element) return height;

        element.addChild(
          // see the following link for all element types
          // https://github.com/Shopify/react-native-skia/blob/5c38b27d72cea9c158290adb7d23c6109369ac2f/packages/skia/src/renderer/HostComponents.ts#L72-L191
          SkiaDomApi.ParagraphNode({
            paragraph: item,
            x: 0,
            y: 0,
            width,
          }),
        );

        return height;
      }}
    />
  );
}

 * ```
 */
export function SkiaFlatList<T, B = T>(props: SkiaFlatListElementProps<T, B>) {
	var { list, ...p } = props;
	if (!list) {
		list = useSkiaFlatList(p) as any;
	}

	return <SkiaScrollView {...p} list={list} />;
}
