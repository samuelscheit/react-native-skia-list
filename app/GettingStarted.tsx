// needed for SkiaDomApi type
import { Skia } from "@shopify/react-native-skia";
import { SkiaFlatList } from "react-native-skia-list";
import { appendNode, SkiaDomApi } from "../src/Util/DOM";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Create a Skia ParagraphBuilder that will be used to build the text for each item
const paragraphBuilder = Skia.ParagraphBuilder.Make({
	textStyle: {
		color: Skia.Color("black"),
		fontSize: 20,
	},
});

export default function Test() {
	const safeArea = useSafeAreaInsets();

	return (
		<KeyboardProvider>
			<GestureHandlerRootView style={{ flex: 1 }}>
				<SkiaFlatList
					safeArea={safeArea}
					// Provide an initialData array that can be serialized and passed to the worklet thread
					initialData={() => [0, 1, 2, 3, 4, 5, 6, 7, 8]}
					// To optimize performance for the initial mount you can provide a transformItem function
					// It will be called once for each item when it is mounted the first time
					transformItem={(item, index, id, state) => {
						"worklet";

						paragraphBuilder.reset(); // reuses the paragraphBuilder for each item
						const text = `Item ${item}`;

						return paragraphBuilder.addText(text).build();
					}}
					// renderItem will be called whenever an item visibility changes
					renderItem={(item, index, state, element) => {
						"worklet";

						const { width } = state.layout.value;

						item.layout(width); // calculates the paragraph layout

						const height = item.getHeight(); // gets the height of the paragraph

						// element is a Skia.GroupNode or will be undefined if only the height of the element is needed
						if (!element) return height;

						appendNode(
							element,
							// see the following link for all element types
							// https://github.com/Shopify/react-native-skia/blob/5c38b27d72cea9c158290adb7d23c6109369ac2f/packages/skia/src/renderer/HostComponents.ts#L72-L191
							SkiaDomApi.ParagraphNode({
								paragraph: item,
								x: 0,
								y: 0,
								width,
							})
						);

						return height;
					}}
				/>
			</GestureHandlerRootView>
		</KeyboardProvider>
	);
}
