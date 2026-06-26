const { Skia } =
	require("@shopify/react-native-skia/src/") as typeof import("@shopify/react-native-skia/lib/typescript/src/");
import type { GroupProps, ImageProps, RenderNode } from "@shopify/react-native-skia/lib/typescript/src/";
import { type MessageItem } from "./State";
import { makeMutable, type SharedValue } from "react-native-reanimated";
import { type ShareableState, type SkiaFlatListProps } from "react-native-skia-list";
import { appendNode, SkiaDomApi } from "../../src/Util/DOM";
import type { getRandomMessageData } from "./randomMessage";
import { Platform } from "react-native";

const rectRadius = 20;

const rectRadius0 = { x: 0, y: 0 };
const rectRadiusFull = { x: rectRadius, y: rectRadius };
const rectShared = makeMutable({ x: 0, y: 0, width: 0, height: 0 });
const rectShared2 = makeMutable({ x: 0, y: 0, width: 0, height: 0 });
const rrectFullShared = makeMutable({
	rect: rectShared.value,
	bottomLeft: rectRadiusFull,
	topLeft: rectRadiusFull,
	bottomRight: rectRadiusFull,
	topRight: rectRadiusFull,
});

const reactionBubble = Skia.Color("#f4f4f6");
const reactionBubblePaint = Skia.Paint();
reactionBubblePaint.setColor(reactionBubble);

const bubbleOther = Skia.Color("#dfdfe0");
const bubbleOtherPaint = Skia.Paint();
bubbleOtherPaint.setColor(bubbleOther);

const bubbleMe = Skia.Color("#397AFF");
const bubbleMePaint = Skia.Paint();
bubbleMePaint.setColor(bubbleMe);

const overlayPaint = Skia.Paint();
const overlay = Skia.Color("rgba(0,0,0,0.2)");
overlayPaint.setColor(overlay);

export function getRenderMessageItem({
	bubble,
	is_group,
	my_user_id,
	avatars,
}: {
	my_user_id: string;
	is_group: boolean;
	bubble: boolean;
	avatars: SharedValue<Record<string, RenderNode<ImageProps> | undefined>>;
}) {
	const reactionFontSize = 15;
	const bubblePercentageWidth = 0.9;
	const avatarSize = bubble ? 40 : 35;

	const reactionMargin = 5;
	const reactionPaddingY = 5;
	const reactionPaddingX = 7;
	const authorSpacing = 3;

	const isWeb = Platform.OS === "web";

	const rects = {} as Record<string, any>;

	function renderItem(item: MessageItem, index: number, state: ShareableState, element?: RenderNode<GroupProps>) {
		"worklet";

		const { text, attachments, user_id, avatar, reactions, author } = item;
		const { layout, safeArea, data } = state as ShareableState & {
			avatars: Record<string, RenderNode<GroupProps> | undefined>;
		};

		const { width } = layout.value;

		const below = data.value[index - 1] as MessageItem | undefined;
		const above = data.value[index + 1] as MessageItem | undefined;

		const id = item.id;
		const isMe = user_id === my_user_id;
		const isOther = !isMe;
		const below_same = below?.user_id === user_id;
		const above_same = above?.user_id === user_id;

		const displayAuthor = !above_same && is_group && !isMe;
		const displayAvatar = is_group && !isMe;

		const spacingLeft = safeArea.value.left || 15;
		const spacingRight = safeArea.value.right || 15;

		let spacingAbove = 10;
		let spacingBelow = 0;

		if (above_same) {
			spacingAbove = bubble ? 1 : 5;
		} else if (isMe) {
			spacingAbove = 15;
		}

		if (!below_same && isMe) {
			spacingBelow = 10;
		}

		if (reactions.length) {
			spacingBelow += reactionFontSize - 3;
		}

		let listSize = width - spacingLeft - spacingRight;

		const avatarSpace = avatarSize + 7;

		const bubblePaddingTop = bubble ? 10 : 0;
		const bubblePaddingBottom = reactions.length && !attachments.length ? bubblePaddingTop + 5 : bubblePaddingTop;

		const bubblePaddingX = 15;
		const maxTextWidth = listSize * bubblePercentageWidth - bubblePaddingX * 2 - avatarSpace;

		text?.layout(maxTextWidth);
		if (displayAuthor) author.layout(maxTextWidth);

		const textWidth = text ? Math.min(text.getMaxWidth(), text.getLongestLine()) : 0;

		let bubbleWidth = text ? textWidth + bubblePaddingX * 2 : 0;
		if (attachments.length && text) bubbleWidth = Math.min(Math.max(bubbleWidth, 200), 400); // 300 max image width

		const textHeight = text?.getHeight() || 0;
		const bubbleHeight = text ? textHeight + bubblePaddingTop + bubblePaddingBottom : 0;
		const authorTextHeight = author.getHeight();
		const authorHeight = displayAuthor ? authorTextHeight + authorSpacing : 0;
		const reactionHeight = reactions.length ? reactionFontSize - 3 : 0;

		const attachmentsWidth = Math.min(bubbleWidth || 200, attachments[0]?.width() || 200);

		let reactionWidth = 0;
		for (const reaction of reactions) {
			if (reactionWidth >= attachmentsWidth) break;
			reactionWidth += reaction.width + reactionMargin + reactionPaddingX * 2;
		}

		let attachmentsHeight = 0;
		for (const img of attachments) {
			if (!img) {
				attachmentsHeight += attachmentsWidth;
				continue;
			}
			const imgHeight = img.height();
			const imgWidth = img.width();
			const aspect = imgWidth / imgHeight;
			const attachmentWidth = Math.min(imgWidth, attachmentsWidth);
			const attachmentHeight = attachmentWidth / aspect;

			attachmentsHeight += attachmentHeight;
			// attachmentsHeight += attachmentWidth;
		}

		const height = spacingAbove + authorHeight + bubbleHeight + attachmentsHeight + spacingBelow;
		if (!element) return height;

		let y = spacingAbove;
		let x = spacingLeft;

		let reactionX = isMe ? width - reactionWidth - reactionPaddingX * 2 : x + avatarSpace;

		if (isMe) {
			x += listSize - bubbleWidth;
		}

		author.layout(maxTextWidth);

		y += authorHeight;

		const userAvatar = avatar;

		if (userAvatar && displayAvatar) {
			if (!below_same) {
				let avatarX = x;
				let avatarY = y + bubbleHeight - avatarSize + attachmentsHeight + reactionHeight;

				const imageNode = SkiaDomApi.ImageNode({
					image: userAvatar,
					x: avatarX,
					y: avatarY,
					width: avatarSize,
					height: avatarSize,
					clip: {
						rect: {
							x: avatarX,
							y: avatarY,
							width: avatarSize,
							height: avatarSize,
						},
						rx: avatarSize / 2,
						ry: avatarSize / 2,
					},
				});
				avatars.value[item.id] = imageNode;

				appendNode(element, imageNode);
			}
		}

		if (!isMe) x += avatarSpace;

		if (displayAuthor) {
			// author.paint(canvas, x, y - authorHeight);
			appendNode(
				element,
				SkiaDomApi.ParagraphNode({
					paragraph: author,
					width: maxTextWidth,
					x: x + bubblePaddingX,
					y: y - authorHeight,
				})
			);
		}

		if (text) {
			const bubblePaint = isMe ? bubbleMePaint : bubbleOtherPaint;

			if (bubble) {
				let rrectFull = (isWeb ? rects[id] : null) || rrectFullShared.value;
				rrectFull.bottomLeft = below_same && isOther ? rectRadius0 : rectRadiusFull;
				rrectFull.topLeft = above_same && isOther ? rectRadius0 : rectRadiusFull;
				rrectFull.bottomRight = below_same && isMe ? rectRadius0 : rectRadiusFull;
				rrectFull.topRight = above_same && isMe ? rectRadius0 : rectRadiusFull;

				if (attachments.length) {
					rrectFull.bottomLeft = rectRadius0;
					rrectFull.bottomRight = rectRadius0;
				}

				rrectFull.rect.x = x;
				rrectFull.rect.y = y;
				rrectFull.rect.width = bubbleWidth;
				rrectFull.rect.height = bubbleHeight;

				if (isWeb) {
					rrectFull = rects[id] = { ...rrectFull, rect: { ...rrectFull.rect } };
				}

				appendNode(element, SkiaDomApi.RRectNode({ rect: rrectFull, paint: bubblePaint }));
			}

			appendNode(
				element,
				SkiaDomApi.ParagraphNode({
					paragraph: text,
					width: maxTextWidth,
					x: x + bubblePaddingX,
					y: y + bubblePaddingTop,
				})
			);
		}

		x += bubblePaddingX;

		y += bubbleHeight;

		if (attachments.length) {
			let attachmentY = y;

			let bottomLeft = below_same && isOther ? rectRadius0 : rectRadiusFull;
			let bottomRight = below_same && isMe ? rectRadius0 : rectRadiusFull;
			const topLeft = (above_same && isOther) || text ? rectRadius0 : rectRadiusFull;
			const topRight = (above_same && isMe) || text ? rectRadius0 : rectRadiusFull;

			for (let i = 0; i < attachments.length; i++) {
				let img = attachments[i];
				if (!img) continue;

				const imgHeight = img.height();
				const imgWidth = img.width();
				const aspect = imgWidth / imgHeight;
				const attachmentWidth = Math.min(imgWidth, attachmentsWidth);
				const attachmentHeight = attachmentWidth / aspect;

				const attachmentX = (isMe ? (text ? x : x - attachmentWidth) : x) - bubblePaddingX;
				const rect = rectShared.value;

				rect.x = attachmentX;
				rect.y = attachmentY;
				rect.width = attachmentWidth;
				rect.height = attachmentHeight;

				const rrectFull = rrectFullShared.value;
				rectShared2.value.x = attachmentX;
				rectShared2.value.y = attachmentY;
				rectShared2.value.width = attachmentWidth;
				rectShared2.value.height = attachmentHeight;
				rrectFull.rect = rectShared2.value;
				rrectFull.bottomLeft = bottomLeft;
				rrectFull.topLeft = topLeft;
				rrectFull.bottomRight = bottomRight;
				rrectFull.topRight = topRight;

				appendNode(
					element,
					SkiaDomApi.ImageNode({
						clip: Skia.Path.Make().addRRect(rrectFull),
						image: img,
						height: attachmentHeight,
						width: attachmentWidth,
						x: attachmentX,
						y: attachmentY,
					})
				);

				attachmentY += attachmentHeight;
			}
		}

		y += attachmentsHeight;

		if (reactions.length) {
			const reactionY = y + reactionPaddingY + 2;
			const startReactionX = reactionX;

			for (let i = 0; i < reactions.length; i++) {
				const reaction = reactions[i];
				if (!reaction) continue;
				const reactionW = reaction.width;

				appendNode(
					element,
					SkiaDomApi.RRectNode({
						x: reactionX,
						y: reactionY - reactionFontSize - reactionPaddingY,
						width: reactionW + reactionPaddingX * 2,
						height: reactionFontSize + reactionPaddingY * 2,
						r: 10,
						paint: reactionBubblePaint,
					})
				);

				reactionX += reactionPaddingX;

				appendNode(
					element,
					SkiaDomApi.ParagraphNode({
						paragraph: reaction.paragraph,
						width: 40,
						x: reactionX,
						y: reactionY - reaction.paragraph.getHeight() + 3,
					})
				);

				reactionX += reaction.width;
				reactionX += reactionPaddingX + reactionMargin;

				if (reactionX - startReactionX > reactionWidth - 40) break;
			}
		}

		return height;
	}

	return renderItem;
}

export type MessageListProps = Partial<SkiaFlatListProps<ReturnType<typeof getRandomMessageData>, MessageItem>>;
