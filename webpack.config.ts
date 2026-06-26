const createExpoWebpackConfigAsync =
	require("@expo/webpack-config") as typeof import("@expo/webpack-config/webpack").default;
import app from "./app.json";
import path from "path";
import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin";
import fs from "fs";
import { sources } from "webpack";
import NodePolyfillPlugin from "node-polyfill-webpack-plugin";
import type { Environment } from "@expo/webpack-config/webpack/types";

const isDevelopment = true;

module.exports = async function (env, argv) {
	const config = await createExpoWebpackConfigAsync(
		{
			mode: isDevelopment ? "development" : "production",
			platform: "web",
			projectRoot: __dirname,
			https: false,
			locations: {
				appJsConfig: path.resolve(__dirname, "app.json"),
				appMain: path.resolve(__dirname, "src/LoadSkia.tsx"),
				appTsConfig: path.resolve(__dirname, "tsconfig.json"),
				appWebpackCache: path.resolve(__dirname, ".cache"),
				modules: path.resolve(__dirname, "node_modules"),
				packageJson: path.resolve(__dirname, "package.json"),
				root: __dirname,
				servedPath: "/",
				template: {
					folder: path.resolve(__dirname, "public"),
					indexHtml: path.resolve(__dirname, "public/index.html"),
					manifest: path.resolve(__dirname, "public/manifest.json"),
					favicon: path.resolve(__dirname, "public/favicon.ico"),
					serveJson: path.resolve(__dirname, "public/serve.json"),
					get(...input) {
						return path.resolve(this.folder, ...input);
					},
				},
				production: {
					folder: path.resolve(__dirname, "dist"),
					indexHtml: path.resolve(__dirname, "dist/index.html"),
					manifest: path.resolve(__dirname, "dist/manifest.json"),
					favicon: path.resolve(__dirname, "dist/favicon.ico"),
					serveJson: path.resolve(__dirname, "dist/serve.json"),
					get(...input) {
						return path.resolve(this.folder, ...input);
					},
				},
				absolute(...input) {
					return path.resolve(__dirname, ...input);
				},
				includeModule(...input) {
					return path.resolve(__dirname, "node_modules", ...input);
				},
			},
			config: {
				...app,
				web: {
					...app.expo.web,
					bundler: "webpack",
					build: {
						babel: {
							verbose: true,
							include: [
								path.resolve(__dirname, "src"),
								path.resolve(__dirname, "app"),
								path.resolve(__dirname, "..", "src"),
								path.resolve(__dirname, "node_modules", "@shopify", "react-native-skia"),
								path.resolve(__dirname, "node_modules", "react-native"),
								path.resolve(__dirname, "node_modules", "react-native-reanimated"),
							],
							use: {
								loader: "babel-loader",
								options: {
									cacheDirectory: true,
									babelrc: false,
									configFile: false,
									presets: [
										"babel-preset-expo",
										// "module:metro-react-native-babel-preset",
										// [
										// 	"@babel/preset-env",
										// 	{ targets: { browsers: ["last 1 chrome version"] }, loose: false },
										// ],
										// ["@babel/preset-react", { runtime: "automatic" }],
										// "@babel/preset-typescript",
										// ["@babel/preset-flow", { allowDeclareFields: true }],
									],
									plugins: [
										["@babel/plugin-transform-flow-strip-types", { allowDeclareFields: true }],
										[
											"module-resolver",
											{
												root: ["./"],
												alias: {
													"@": "./src/index.tsx",
												},
											},
										],
										"react-native-web",
										// isDevelopment && require.resolve("react-refresh/babel"),
										"@babel/plugin-transform-runtime",
										"react-native-worklets/plugin",
									].filter(Boolean),
								},
							},
						},
					},
				},
			},
		} as unknown as Environment,
		argv
	);

	config.module.rules.push({
		test: /\.ttf$/,
		type: "asset/resource",
	});

	config.externals = {
		"crypto": "crypto",
		"fs": "fs",
		"path": "path",
		"react-native-haptic-feedback": `throw new Error("react-native-haptic-feedback is not supported in web")`,
	};

	config.plugins.push(
		new (class CopySkiaPlugin {
			apply(compiler) {
				compiler.hooks.thisCompilation.tap("AddSkiaPlugin", (compilation) => {
					compilation.hooks.processAssets.tapPromise(
						{
							name: "copy-skia",
							stage: compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL,
						},
						async () => {
							const src = require.resolve("canvaskit-wasm/bin/full/canvaskit.wasm");
							if (!compilation.getAsset(src)) {
								compilation.emitAsset(
									"/canvaskit.wasm",
									new sources.RawSource(await fs.promises.readFile(src))
								);
							}
						}
					);
				});
			}
		})()
	);
	// config.plugins.push(new NodePolyfillPlugin());

	config.resolve = {
		// modules: ['node_modules'],
		mainFields: ["react-native", "module", "main"],
		aliasFields: ["react-native", "module", "main"],
		extensions: [
			".browser.tsx",
			".browser.ts",
			".browser.js",
			".web.tsx",
			".web.ts",
			".web.js",
			".tsx",
			".ts",
			".jsx",
			".js",
			".json",
		],
		symlinks: false,
		modules: [path.join(__dirname, "node_modules")],
		alias: {
			"expo-haptics$": path.resolve(__dirname, "src", "Util", "HapticsPolyfill"),
			"react-native$": "react-native-web",
			"react-native-skia-list": path.resolve(__dirname, "..", "src"),
			"react-native/Libraries/Components/View/ViewStylePropTypes$":
				"react-native-web/dist/exports/View/ViewStylePropTypes",
			"react-native/Libraries/EventEmitter/RCTDeviceEventEmitter$":
				"react-native-web/dist/vendor/react-native/NativeEventEmitter/RCTDeviceEventEmitter",
			"react-native/Libraries/vendor/emitter/EventEmitter$":
				"react-native-web/dist/vendor/react-native/emitter/EventEmitter",
			"react-native/Libraries/vendor/emitter/EventSubscriptionVendor$":
				"react-native-web/dist/vendor/react-native/emitter/EventSubscriptionVendor",
			"react-native/Libraries/EventEmitter/NativeEventEmitter$":
				"react-native-web/dist/vendor/react-native/NativeEventEmitter",
			"react-native-reanimated/package.json": require.resolve("react-native-reanimated/package.json"),
			"react-native-reanimated": require.resolve("react-native-reanimated"),
			"react-native/Libraries/Image/AssetRegistry": false,
		},
	};

	delete config.devServer.https;
	config.devServer.port = 8081;
	config.devServer.hot = true;
	if (isDevelopment) {
		config.plugins.push(new ReactRefreshWebpackPlugin());
	}
	config.cache = false;

	console.log(config);

	return config;
};
