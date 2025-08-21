import { Skia, type SkRect } from "@shopify/react-native-skia";
import { SkiaSGRoot } from "@shopify/react-native-skia/src/sksg/Reconciler";
import type { ReactElement } from "react";

const root = new SkiaSGRoot(Skia as any);


export const drawAsPicture = async (element: ReactElement, bounds?: SkRect) => {
	const recorder = Skia.PictureRecorder();
	const canvas = recorder.beginRecording(bounds);
	await root.render(element);
	root.drawOnCanvas(canvas);
	const picture = recorder.finishRecordingAsPicture();
	// root.unmount();
	return picture;
};
