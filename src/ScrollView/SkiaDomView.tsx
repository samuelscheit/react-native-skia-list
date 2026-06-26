import React from "react";
import type { NativeMethods, ViewProps } from "react-native";
import type { SkPicture, SkRect } from "@shopify/react-native-skia/lib/typescript/src";
import type { Node } from "@shopify/react-native-skia/lib/typescript/src/sksg/Node";

const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");
const { SkiaViewApi } =
	require("@shopify/react-native-skia/src/views/api") as typeof import("@shopify/react-native-skia/lib/typescript/src/views/api");
const { SkiaPictureView } =
	require("@shopify/react-native-skia/src/views/SkiaPictureView") as typeof import("@shopify/react-native-skia/lib/typescript/src/views/SkiaPictureView");
const { Recorder } =
	require("@shopify/react-native-skia/src/sksg/Recorder/Recorder") as typeof import("@shopify/react-native-skia/lib/typescript/src/sksg/Recorder/Recorder");
const { visit } =
	require("@shopify/react-native-skia/src/sksg/Recorder/Visitor") as typeof import("@shopify/react-native-skia/lib/typescript/src/sksg/Recorder/Visitor");
const { createDrawingContext } =
	require("@shopify/react-native-skia/src/sksg/Recorder/DrawingContext") as typeof import("@shopify/react-native-skia/lib/typescript/src/sksg/Recorder/DrawingContext");
const { replay } =
	require("@shopify/react-native-skia/src/sksg/Recorder/Player") as typeof import("@shopify/react-native-skia/lib/typescript/src/sksg/Recorder/Player");

export type NativeProps = ViewProps & {
	mode?: "default" | "continuous" | string;
	debug?: boolean;
	nativeID?: string;
	root?: Node;
};

const redrawCallbacks = new Map<string, () => void>();

globalThis.SkiaListViewApi = {
	requestRedraw(nativeId: number) {
		redrawCallbacks.get(String(nativeId))?.();
	},
};

export default class SkiaDomView extends React.Component<NativeProps> {
	private pictureView = React.createRef<React.Component<any> & { nativeId: number; redraw(): void } & NativeMethods>();
	private requestId: number | null = null;
	private picture: SkPicture | undefined;
	private mode: NativeProps["mode"];

	componentDidMount() {
		this.mode = this.props.mode;
		this.registerRedrawCallback();
		this.redraw();
		this.scheduleContinuousRedraw();
	}

	componentDidUpdate(prevProps: NativeProps) {
		if (prevProps.nativeID !== this.props.nativeID) {
			this.unregisterRedrawCallback(prevProps.nativeID);
			this.registerRedrawCallback();
		}
		if (prevProps.root !== this.props.root) {
			this.redraw();
		}
		this.scheduleContinuousRedraw();
	}

	componentWillUnmount() {
		this.unregisterRedrawCallback(this.props.nativeID);
		if (this.requestId !== null) {
			cancelAnimationFrame(this.requestId);
		}
		this.picture?.dispose?.();
	}

	setNativeProps(props: Partial<NativeProps>) {
		if (props.mode !== undefined) {
			this.mode = props.mode;
			this.scheduleContinuousRedraw();
		}
	}

	makeImageSnapshot(rect?: SkRect) {
		const nativeId = this.pictureView.current?.nativeId;
		if (nativeId === undefined) {
			return undefined;
		}
		return SkiaViewApi.makeImageSnapshot(nativeId, rect);
	}

	redraw() {
		const root = this.props.root;
		if (!root) {
			return;
		}

		const recorder = new Recorder();
		visit(recorder, [root]);
		const recording = recorder.getRecording();
		const pictureRecorder = Skia.PictureRecorder();
		const canvas = pictureRecorder.beginRecording();
		const context = createDrawingContext(Skia, recording.paintPool, canvas);
		replay(context, recording.commands);

		const nextPicture = pictureRecorder.finishRecordingAsPicture();
		pictureRecorder.dispose();
		this.picture?.dispose?.();
		this.picture = nextPicture;

		const nativeId = this.pictureView.current?.nativeId;
		if (nativeId !== undefined) {
			SkiaViewApi.setJsiProperty(nativeId, "picture", nextPicture);
			SkiaViewApi.requestRedraw(nativeId);
		}
	}

	private scheduleContinuousRedraw() {
		if (this.requestId !== null) {
			cancelAnimationFrame(this.requestId);
			this.requestId = null;
		}

		if ((this.mode ?? this.props.mode) !== "continuous") {
			return;
		}

		const loop = () => {
			this.redraw();
			this.requestId = requestAnimationFrame(loop);
		};
		this.requestId = requestAnimationFrame(loop);
	}

	private registerRedrawCallback() {
		if (this.props.nativeID) {
			redrawCallbacks.set(this.props.nativeID, () => this.redraw());
		}
	}

	private unregisterRedrawCallback(nativeID: string | undefined) {
		if (nativeID) {
			redrawCallbacks.delete(nativeID);
		}
	}

	render() {
		const { mode: _mode, root: _root, ...props } = this.props;
		return <SkiaPictureView ref={this.pictureView as never} picture={this.picture} {...props} />;
	}
}
