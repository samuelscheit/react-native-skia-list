#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import {
	cpSync,
	existsSync,
	mkdtempSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs"
import os from "node:os"
import path from "node:path"

const rootDir = path.resolve(import.meta.dirname, "..")
const skiaPackageDir = path.join(rootDir, "node_modules", "@shopify", "react-native-skia")
const catalystLibraryIdentifier = "ios-arm64_x86_64-maccatalyst"
const frameworkNames = [
	"libskia",
	"libsvg",
	"libskshaper",
	"libskparagraph",
	"libskunicode_core",
	"libskunicode_libgrapheme",
	"libskottie",
	"libsksg",
]

if (!existsSync(skiaPackageDir)) {
	throw new Error(`Install dependencies first: ${skiaPackageDir} is missing`)
}

if (hasAllCatalystSlices(skiaPackageDir)) {
	console.log("React Native Skia already has Mac Catalyst XCFramework slices")
	process.exit(0)
}

const skiaVersion = JSON.parse(readFileSync(path.join(skiaPackageDir, "package.json"), "utf8")).version
const catalystLibsDir = process.env.RNSKIA_CATALYST_LIBS_DIR
	? path.resolve(process.env.RNSKIA_CATALYST_LIBS_DIR)
	: buildCatalystLibraries(skiaVersion)

patchReactNativeSkiaCatalystLibraries(skiaPackageDir, catalystLibsDir)

function buildCatalystLibraries(version) {
	const sourceDir = process.env.RNSKIA_SOURCE_DIR
		? path.resolve(process.env.RNSKIA_SOURCE_DIR)
		: path.join(os.tmpdir(), `react-native-skia-catalyst-v${version}`)

	ensureSkiaSource(sourceDir, version)
	patchSkiaCatalystBuild(sourceDir)
	bootstrapDepotTools(sourceDir)
	run("bunx", ["tsx", "./scripts/build-skia.ts", "apple-maccatalyst"], {
		cwd: path.join(sourceDir, "packages", "skia"),
	})

	return path.join(sourceDir, "packages", "skia", "libs", "maccatalyst")
}

function hasAllCatalystSlices(packageDir) {
	const iosLibsDir = path.join(packageDir, "libs", "ios")
	return frameworkNames.every((frameworkName) => {
		const plistPath = path.join(iosLibsDir, `${frameworkName}.xcframework`, "Info.plist")
		if (!existsSync(plistPath)) {
			return false
		}

		const plist = readPlist(plistPath)
		return plist.AvailableLibraries?.some((library) => library.LibraryIdentifier === catalystLibraryIdentifier)
	})
}

function ensureSkiaSource(sourceDir, version) {
	if (existsSync(path.join(sourceDir, ".git"))) {
		return
	}

	rmSync(sourceDir, { recursive: true, force: true })
	mkdirSync(path.dirname(sourceDir), { recursive: true })
	run("git", [
		"clone",
		"--branch",
		`v${version}`,
		"--depth",
		"1",
		"https://github.com/Shopify/react-native-skia.git",
		sourceDir,
	])
	run("git", [
		"-C",
		sourceDir,
		"submodule",
		"update",
		"--init",
		"--depth",
		"1",
		"externals/skia",
		"externals/depot_tools",
	])
}

function patchSkiaCatalystBuild(sourceDir) {
	const configPath = path.join(sourceDir, "packages", "skia", "scripts", "skia-configuration.ts")
	let source = readFileSync(configPath, "utf8")
	source = replaceOnce(source, "export const MACCATALYST = false;", "export const MACCATALYST = true;")
	source = patchCatalystTargetFlags(source)
	writeFileSync(configPath, source)
}

function bootstrapDepotTools(sourceDir) {
	run("./update_depot_tools", [], {
		cwd: path.join(sourceDir, "externals", "depot_tools"),
	})
}

function patchCatalystTargetFlags(source) {
	const patchTarget = (text, arch, cpu) => {
		const target = `${arch}-apple-ios14.0-macabi`
		const before = `[
            "extra_cflags_cc",
            ` +
			'`["-fexceptions","-frtti","-target","' +
			target +
			'",` +' +
			`
              ` +
			'`"-isysroot","${appleSdkRoot}",` +' +
			`
              ` +
			'`"-isystem","${appleSdkRoot}/System/iOSSupport/usr/include",` +' +
			`
              ` +
			'`"-iframework","${appleSdkRoot}/System/iOSSupport/System/Library/Frameworks"]`' +
			`,
          ],
          [
            "extra_ldflags",
            ` +
			'`["-isysroot","${appleSdkRoot}",` +' +
			`
              ` +
			'`"-iframework","${appleSdkRoot}/System/iOSSupport/System/Library/Frameworks"]`' +
			`,
          ],`
		const after = `[
            "extra_cflags",
            ` +
			'`["-target","' +
			target +
			'",` +' +
			`
              ` +
			'`"-isysroot","${appleSdkRoot}",` +' +
			`
              ` +
			'`"-isystem","${appleSdkRoot}/System/iOSSupport/usr/include",` +' +
			`
              ` +
			'`"-iframework","${appleSdkRoot}/System/iOSSupport/System/Library/Frameworks"]`' +
			`,
          ],
          [
            "extra_cflags_cc",
            ` +
			'`["-fexceptions","-frtti"]`' +
			`,
          ],
          [
            "extra_asmflags",
            ` +
			'`["-target","' +
			target +
			'",` +' +
			`
              ` +
			'`"-isysroot","${appleSdkRoot}"]`' +
			`,
          ],
          [
            "extra_ldflags",
            ` +
			'`["-target","' +
			target +
			'",` +' +
			`
              ` +
			'`"-isysroot","${appleSdkRoot}",` +' +
			`
              ` +
			'`"-iframework","${appleSdkRoot}/System/iOSSupport/System/Library/Frameworks"]`' +
			`,
          ],`

		const patched = replaceOnce(text, before, after)
		return replaceOnce(patched, `["target_cpu", \`"${cpu}"\`]`, `["target_cpu", \`"${cpu}"\`]`)
	}

	return patchTarget(patchTarget(source, "arm64", "arm64"), "x86_64", "x64")
}

function patchReactNativeSkiaCatalystLibraries(packageDir, catalystLibsDir) {
	if (!existsSync(catalystLibsDir)) {
		throw new Error(`Mac Catalyst Skia libraries directory is missing: ${catalystLibsDir}`)
	}

	const iosLibsDir = path.join(packageDir, "libs", "ios")
	for (const frameworkName of frameworkNames) {
		mergeCatalystXCFrameworkSlice({
			frameworkName,
			sourceFrameworkDir: path.join(catalystLibsDir, `${frameworkName}.xcframework`),
			targetFrameworkDir: path.join(iosLibsDir, `${frameworkName}.xcframework`),
		})
	}
}

function mergeCatalystXCFrameworkSlice({ frameworkName, sourceFrameworkDir, targetFrameworkDir }) {
	if (!existsSync(sourceFrameworkDir)) {
		throw new Error(`Missing source XCFramework: ${sourceFrameworkDir}`)
	}
	if (!existsSync(targetFrameworkDir)) {
		throw new Error(`Missing target XCFramework: ${targetFrameworkDir}`)
	}

	const sourcePlistPath = path.join(sourceFrameworkDir, "Info.plist")
	const targetPlistPath = path.join(targetFrameworkDir, "Info.plist")
	const sourcePlist = readPlist(sourcePlistPath)
	const targetPlist = readPlist(targetPlistPath)
	const sourceLibrary = sourcePlist.AvailableLibraries?.find(
		(library) => library.LibraryIdentifier === catalystLibraryIdentifier
	)

	if (!sourceLibrary) {
		throw new Error(`Missing Mac Catalyst slice in ${sourcePlistPath}`)
	}

	const sourceSliceDir = path.join(sourceFrameworkDir, catalystLibraryIdentifier)
	const targetSliceDir = path.join(targetFrameworkDir, catalystLibraryIdentifier)
	if (!existsSync(sourceSliceDir)) {
		throw new Error(`Missing Mac Catalyst library directory: ${sourceSliceDir}`)
	}

	rmSync(targetSliceDir, { recursive: true, force: true })
	cpSync(sourceSliceDir, targetSliceDir, { recursive: true })

	targetPlist.AvailableLibraries = [
		...(targetPlist.AvailableLibraries ?? []).filter(
			(library) => library.LibraryIdentifier !== catalystLibraryIdentifier
		),
		sourceLibrary,
	]
	writePlist(targetPlistPath, targetPlist)
	console.log(`Patched ${frameworkName}.xcframework with Mac Catalyst slice`)
}

function replaceOnce(source, search, replacement) {
	if (!source.includes(search)) {
		if (source.includes(replacement)) {
			return source
		}
		throw new Error("Could not patch React Native Skia Catalyst build configuration")
	}
	return source.replace(search, replacement)
}

function readPlist(filePath) {
	return JSON.parse(execFileSync("plutil", ["-convert", "json", "-o", "-", filePath], { encoding: "utf8" }))
}

function writePlist(filePath, plist) {
	const tempDir = mkdtempSync(path.join(os.tmpdir(), "rnskia-plist-"))
	try {
		const jsonPath = path.join(tempDir, "Info.json")
		writeFileSync(jsonPath, `${JSON.stringify(plist, null, 2)}\n`)
		execFileSync("plutil", ["-convert", "xml1", "-o", filePath, jsonPath])
	} finally {
		rmSync(tempDir, { recursive: true, force: true })
	}
}

function run(command, args, options = {}) {
	execFileSync(command, args, {
		cwd: options.cwd ?? rootDir,
		env: options.env ?? process.env,
		stdio: "inherit",
	})
}
