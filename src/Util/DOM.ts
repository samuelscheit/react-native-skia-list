import type { Node } from "@shopify/react-native-skia/lib/typescript/src/sksg/Node";
import type { NodeType } from "@shopify/react-native-skia/lib/typescript/src/dom/types/NodeType";

type Props = Record<string, unknown>;

const NodeTypes = {
	Layer: "skLayer",
	Shader: "skShader",
	ImageShader: "skImageShader",
	ColorShader: "skColorShader",
	Turbulence: "skTurbulence",
	FractalNoise: "skFractalNoise",
	LinearGradient: "skLinearGradient",
	RadialGradient: "skRadialGradient",
	SweepGradient: "skSweepGradient",
	TwoPointConicalGradient: "skTwoPointConicalGradient",
	BlurMaskFilter: "skBlurMaskFilter",
	DiscretePathEffect: "skDiscretePathEffect",
	DashPathEffect: "skDashPathEffect",
	Path1DPathEffect: "skPath1DPathEffect",
	Path2DPathEffect: "skPath2DPathEffect",
	CornerPathEffect: "skCornerPathEffect",
	SumPathEffect: "skSumPathEffect",
	Line2DPathEffect: "skLine2DPathEffect",
	MatrixColorFilter: "skMatrixColorFilter",
	BlendColorFilter: "skBlendColorFilter",
	LinearToSRGBGammaColorFilter: "skLinearToSRGBGammaColorFilter",
	SRGBToLinearGammaColorFilter: "skSRGBToLinearGammaColorFilter",
	LumaColorFilter: "skLumaColorFilter",
	LerpColorFilter: "skLerpColorFilter",
	OffsetImageFilter: "skOffsetImageFilter",
	DisplacementMapImageFilter: "skDisplacementMapImageFilter",
	BlurImageFilter: "skBlurImageFilter",
	DropShadowImageFilter: "skDropShadowImageFilter",
	MorphologyImageFilter: "skMorphologyImageFilter",
	BlendImageFilter: "skBlendImageFilter",
	RuntimeShaderImageFilter: "skRuntimeShaderImageFilter",
	Blend: "skBlend",
	BackdropFilter: "skBackdropFilter",
	Box: "skBox",
	BoxShadow: "skBoxShadow",
	Group: "skGroup",
	Paint: "skPaint",
	Circle: "skCircle",
	Fill: "skFill",
	Image: "skImage",
	Points: "skPoints",
	Path: "skPath",
	Rect: "skRect",
	RRect: "skRRect",
	Oval: "skOval",
	Line: "skLine",
	Patch: "skPatch",
	Vertices: "skVertices",
	DiffRect: "skDiffRect",
	Text: "skText",
	TextPath: "skTextPath",
	TextBlob: "skTextBlob",
	Glyphs: "skGlyphs",
	Picture: "skPicture",
	ImageSVG: "skImageSVG",
	Atlas: "skAtlas",
	Paragraph: "skParagraph",
	Skottie: "skSkottie",
	ImageFilter: "skImageFilter",
} as const;

type SkiaNodeType = (typeof NodeTypes)[keyof typeof NodeTypes];
type MutableNode<P extends Props = Props> = Node<P> & {
	type: NodeType;
	props: P;
	children: Node[];
	setProps(props: P): void;
	setProp<K extends keyof P>(name: K, value: P[K]): true;
	getProps(): P;
	addChild(child: Node): void;
	removeChild(child: Node): void;
	insertChildBefore(child: Node, before: Node): void;
};

export function appendNode(parent: Node, child: Node) {
	"worklet";
	parent.children.push(child);
}

export function removeNode(parent: Node, child: Node) {
	"worklet";
	const index = parent.children.indexOf(child);
	if (index !== -1) {
		parent.children.splice(index, 1);
	}
}

export function insertNodeBefore(parent: Node, child: Node, before: Node) {
	"worklet";
	removeNode(parent, child);

	const beforeIndex = parent.children.indexOf(before);
	if (beforeIndex === -1) {
		parent.children.push(child);
		return;
	}

	parent.children.splice(beforeIndex, 0, child);
}

export function setNodeProps<P extends Props>(node: Node<P>, props: P) {
	"worklet";
	node.props = props;
}

export function setNodeProp<P extends Props, K extends keyof P>(node: Node<P>, name: K, value: P[K]): true {
	"worklet";
	node.props = { ...node.props, [name]: value };
	return true;
}

export function getNodeProps<P extends Props>(node: Node<P>) {
	"worklet";
	return node.props;
}

const createNode = <P extends Props>(type: SkiaNodeType, props?: P): MutableNode<P> => {
	"worklet";

	return {
		type: type as unknown as NodeType,
		props: props ?? ({} as P),
		children: [],
		setProps(nextProps: P) {
			"worklet";
			setNodeProps(this, nextProps);
		},
		setProp<K extends keyof P>(name: K, value: P[K]) {
			"worklet";
			return setNodeProp(this, name, value);
		},
		getProps() {
			"worklet";
			return getNodeProps(this);
		},
		addChild(child: Node) {
			"worklet";
			appendNode(this, child);
		},
		removeChild(child: Node) {
			"worklet";
			removeNode(this, child);
		},
		insertChildBefore(child: Node, before: Node) {
			"worklet";
			insertNodeBefore(this, child, before);
		},
	};
};

const createNodeFactory = (type: SkiaNodeType) => {
	return <P extends Props>(props?: P) => {
		"worklet";
		return createNode(type, props);
	};
};

export const SkiaDomApi = {
	LayerNode: createNodeFactory(NodeTypes.Layer),
	GroupNode: createNodeFactory(NodeTypes.Group),
	PaintNode: createNodeFactory(NodeTypes.Paint),
	FillNode: createNodeFactory(NodeTypes.Fill),
	ImageNode: createNodeFactory(NodeTypes.Image),
	CircleNode: createNodeFactory(NodeTypes.Circle),
	PathNode: createNodeFactory(NodeTypes.Path),
	LineNode: createNodeFactory(NodeTypes.Line),
	OvalNode: createNodeFactory(NodeTypes.Oval),
	PatchNode: createNodeFactory(NodeTypes.Patch),
	PointsNode: createNodeFactory(NodeTypes.Points),
	RectNode: createNodeFactory(NodeTypes.Rect),
	RRectNode: createNodeFactory(NodeTypes.RRect),
	VerticesNode: createNodeFactory(NodeTypes.Vertices),
	TextNode: createNodeFactory(NodeTypes.Text),
	TextPathNode: createNodeFactory(NodeTypes.TextPath),
	TextBlobNode: createNodeFactory(NodeTypes.TextBlob),
	GlyphsNode: createNodeFactory(NodeTypes.Glyphs),
	DiffRectNode: createNodeFactory(NodeTypes.DiffRect),
	PictureNode: createNodeFactory(NodeTypes.Picture),
	ImageSVGNode: createNodeFactory(NodeTypes.ImageSVG),
	AtlasNode: createNodeFactory(NodeTypes.Atlas),
	BlurMaskFilterNode: createNodeFactory(NodeTypes.BlurMaskFilter),
	BlendImageFilterNode: createNodeFactory(NodeTypes.BlendImageFilter),
	BlurImageFilterNode: createNodeFactory(NodeTypes.BlurImageFilter),
	OffsetImageFilterNode: createNodeFactory(NodeTypes.OffsetImageFilter),
	DropShadowImageFilterNode: createNodeFactory(NodeTypes.DropShadowImageFilter),
	MorphologyImageFilterNode: createNodeFactory(NodeTypes.MorphologyImageFilter),
	DisplacementMapImageFilterNode: createNodeFactory(NodeTypes.DisplacementMapImageFilter),
	RuntimeShaderImageFilterNode: createNodeFactory(NodeTypes.RuntimeShaderImageFilter),
	MatrixColorFilterNode: createNodeFactory(NodeTypes.MatrixColorFilter),
	BlendColorFilterNode: createNodeFactory(NodeTypes.BlendColorFilter),
	LumaColorFilterNode: createNodeFactory(NodeTypes.LumaColorFilter),
	LinearToSRGBGammaColorFilterNode: createNodeFactory(NodeTypes.LinearToSRGBGammaColorFilter),
	SRGBToLinearGammaColorFilterNode: createNodeFactory(NodeTypes.SRGBToLinearGammaColorFilter),
	LerpColorFilterNode: createNodeFactory(NodeTypes.LerpColorFilter),
	ShaderNode: createNodeFactory(NodeTypes.Shader),
	ImageShaderNode: createNodeFactory(NodeTypes.ImageShader),
	ColorShaderNode: createNodeFactory(NodeTypes.ColorShader),
	TurbulenceNode: createNodeFactory(NodeTypes.Turbulence),
	FractalNoiseNode: createNodeFactory(NodeTypes.FractalNoise),
	LinearGradientNode: createNodeFactory(NodeTypes.LinearGradient),
	RadialGradientNode: createNodeFactory(NodeTypes.RadialGradient),
	SweepGradientNode: createNodeFactory(NodeTypes.SweepGradient),
	TwoPointConicalGradientNode: createNodeFactory(NodeTypes.TwoPointConicalGradient),
	CornerPathEffectNode: createNodeFactory(NodeTypes.CornerPathEffect),
	DiscretePathEffectNode: createNodeFactory(NodeTypes.DiscretePathEffect),
	DashPathEffectNode: createNodeFactory(NodeTypes.DashPathEffect),
	Path1DPathEffectNode: createNodeFactory(NodeTypes.Path1DPathEffect),
	Path2DPathEffectNode: createNodeFactory(NodeTypes.Path2DPathEffect),
	SumPathEffectNode: createNodeFactory(NodeTypes.SumPathEffect),
	Line2DPathEffectNode: createNodeFactory(NodeTypes.Line2DPathEffect),
	BlendNode: createNodeFactory(NodeTypes.Blend),
	BackdropFilterNode: createNodeFactory(NodeTypes.BackdropFilter),
	BoxNode: createNodeFactory(NodeTypes.Box),
	BoxShadowNode: createNodeFactory(NodeTypes.BoxShadow),
	ParagraphNode: createNodeFactory(NodeTypes.Paragraph),
} as any;

globalThis.SkiaDomApi = SkiaDomApi;
