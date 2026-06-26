import { Link } from "expo-router";
import type { ComponentProps } from "react";
import { ScrollView, Text, TouchableOpacity } from "react-native";

type LinkProps = ComponentProps<typeof Link>;

function Button(props: LinkProps) {
	return (
		<Link {...props} asChild>
			<TouchableOpacity
				style={{
					padding: 20,
					borderBottomWidth: 1,
					borderColor: "#a6a6a6",
					backgroundColor: "#fff",
				}}
			>
				<Text>{props.children}</Text>
			</TouchableOpacity>
		</Link>
	);
}

export default function App() {
	return (
		<ScrollView contentInsetAdjustmentBehavior="automatic" style={{ flex: 1 }}>
			<Button href="/SkiaScrollView">SkiaScrollView</Button>
			<Button href="/SkiaFlatList">SkiaFlatList</Button>
			<Button href="/SkiaMessageList">SkiaMessageList</Button>
			<Button href="/SkiaVideoList">SkiaVideoList</Button>
			<Button href="/FlashList">FlashList</Button>
			<Button href="/FlatList">FlatList</Button>
			<Button href="/Test">Test</Button>
			<Button href="/GettingStarted">GettingStarted</Button>
		</ScrollView>
	);
}
