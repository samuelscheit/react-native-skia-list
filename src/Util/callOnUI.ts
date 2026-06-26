import { Platform } from "react-native";
// const { executeOnUIRuntimeSync } =
// 	require("react-native-worklets/src/threads") as typeof import("react-native-worklets/src/threads");
import { runOnUI } from "react-native-reanimated";

const isWeb = Platform.OS === "web";

export function callOnUI<Args extends unknown[], ReturnValue>(
	worklet: (...args: Args) => ReturnValue
): (...args: Args) => ReturnValue {
	"worklet";

	if (isWeb) return worklet;

	return (...args) => {
		"worklet";

		if (_WORKLET) return worklet(...args);

		return runOnUI(worklet)(...args) as any;
	};
}
