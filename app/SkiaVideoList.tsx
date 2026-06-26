import type { Video, RenderNode, SkImage, ImageProps } from "@shopify/react-native-skia/lib/typescript/src/";
import { useEffect } from "react";
import { Platform } from "react-native";
import {
	makeMutable,
	runOnJS,
	runOnUI,
	useFrameCallback,
	useSharedValue,
	type SharedValue,
} from "react-native-reanimated";
import { SkiaFlatList, useSkiaFlatList } from "react-native-skia-list";
import { appendNode, setNodeProp, SkiaDomApi } from "../src/Util/DOM";
const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");

const urls = [
	`https://hls.universal-music.de/get?id=261860`, // take on me
	`https://hls.universal-music.de/get?id=258473`, // changed the way you kissed me
	`https://hls.universal-music.de/get?id=88496`, // the real slim shady
	`https://hls.universal-music.de/get?id=339565`, // gimme gimme gimme
	`https://hls.universal-music.de/get?id=481085`, // bad guy
	`https://hls.universal-music.de/get?id=282954`, // gangnam style
];

const isAndroid = Platform.OS === "android";

const copyFrameOnAndroid = (frame: SkImage) => {
	"worklet";
	// on android we need to copy the texture before it's invalidated
	if (isAndroid) {
		const newFrame = frame.makeNonTextureImage();
		frame.dispose();
		return newFrame;
	}
	return frame;
};

export default function SkiaVideoList() {
	const imageNodes = makeMutable({} as Record<string, RenderNode<ImageProps>>);
	const currentVideo = useSharedValue<Video | null>(null);
	const previousFrame = useSharedValue<SkImage | null>(null);
	const currentImageNode = useSharedValue<RenderNode<ImageProps> | null>(null);

	function loadVideo(url: string) {
		// manually
		const video = Skia.Video(url) as Video;
		video.setVolume(1);
		currentVideo.value = video;

		runOnUI(() => {
			const { transformedData } = globalThis.state;
			const item = transformedData.value[url];
			if (!item) return;

			item.video = video;
			globalThis.state.redrawItems();
		})();

		console.log("loadVideo", url, video instanceof Promise);
	}

	const list = useSkiaFlatList({
		initialData() {
			"worklet";

			return urls.map((video, i) => ({
				url: video,
				video: null as Video | null,
			}));
		},
		keyExtractor(item, index) {
			"worklet";
			return item.url;
		},
		transformItem(item, index, id, state) {
			"worklet";
			globalThis.state = state;
			return item;
		},
		renderItem(item, index, state, element) {
			"worklet";

			const { height, width } = state.layout.value;

			const id = state.keyExtractor(item, index);

			const image = item.video?.nextImage();

			const imageNode = SkiaDomApi.ImageNode({
				image,
				x: 0,
				y: 0,
				width: width,
				height: height,
				fit: "cover",
			});
			imageNodes.value[id] = imageNode;

			if (!element) return height;

			appendNode(element, imageNode);

			return height;
		},
		onViewableItemsChanged(changed, viewableItems) {
			"worklet";

			let current = viewableItems[0]?.item;
			if (!current) return;

			if (current.video === null) {
				currentImageNode.value = imageNodes.value[current.url];
				current.video = undefined;
				runOnJS(loadVideo)(current.url);
			}

			if (current.video) {
				currentVideo.value = current.video;
				currentImageNode.value = imageNodes.value[current.url];

				current.video.play();
				current.video.setVolume(1);
			}

			for (const { item, isViewable } of changed) {
				if (item !== current) {
					item.video?.pause();
				}

				if (!isViewable) {
					// current.video.dispose();
					// current.video = null;
				}
			}

			console.log("onViewableItemsChanged", viewableItems);
		},
	});

	useFrameCallback(() => {
		const video = currentVideo.value;
		if (!video) return;

		const imageNode = currentImageNode.value;
		if (!imageNode) return;

		previousFrame.value?.dispose();

		let img = video.nextImage();
		previousFrame.value = img;
		if (!img) return;

		img = copyFrameOnAndroid(img);

		setNodeProp(imageNode, "image", img);
	}, true);

	useEffect(() => {
		const { data } = list;
		return runOnUI(() => {
			data.value.forEach(({ video }) => {
				video?.dispose();
			});
		});
	}, []);

	return <SkiaFlatList mode={"continuous"} list={list} />;
}
