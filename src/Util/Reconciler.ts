import type { Skia } from "@shopify/react-native-skia/lib/typescript/src/skia/types";
import type { Node } from "@shopify/react-native-skia/lib/typescript/src/sksg/Node";
import type { ReactNode } from "react";
import type { OpaqueRoot } from "react-reconciler";
import ReactReconciler from "react-reconciler";

const { debug, sksgHostConfig } =
	require("@shopify/react-native-skia/src/sksg/HostConfig") as typeof import("@shopify/react-native-skia/lib/typescript/src/sksg/HostConfig");

class SkiaListContainer {
	root: Node[] = [];
	private mounted = true;

	constructor(private redrawCallback: () => void) {}

	mount() {
		this.mounted = true;
	}

	unmount() {
		this.mounted = false;
	}

	redraw() {
		if (this.mounted) {
			this.redrawCallback();
		}
	}
}

const skiaReconciler = ReactReconciler(sksgHostConfig);

skiaReconciler.injectIntoDevTools({
	bundleType: 1,
	version: "0.0.1",
	rendererPackageName: "react-native-skia",
});

export class SkiaRoot {
	private root: OpaqueRoot;
	private container: SkiaListContainer;
	private groupNode: Node;

	constructor(_Skia: Skia, _native = false, redraw: () => void = () => {}, _getNativeId: () => number = () => 0) {
		this.container = new SkiaListContainer(redraw);
		this.groupNode = {
			type: "skGroup" as never,
			props: {},
			children: this.container.root,
		};
		this.root = skiaReconciler.createContainer(this.container as never, 0, null, false, null, "", console.error, null);
	}

	render(element: ReactNode) {
		this.container.mount();
		skiaReconciler.updateContainer(element as never, this.root, null, () => {
			this.groupNode.children = this.container.root;
			debug("updateContainer");
			this.container.redraw();
		});
	}

	unmount() {
		this.container.unmount();
		skiaReconciler.updateContainer(null, this.root, null, () => {
			this.groupNode.children = [];
			debug("unmountContainer");
		});
	}

	get dom() {
		return this.groupNode as never;
	}
}
