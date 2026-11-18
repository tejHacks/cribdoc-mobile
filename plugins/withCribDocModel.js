/**
 * Expo config plugin: links ONNX Runtime and bundles CribDoc's eye model.
 *
 * - Android: registers the onnxruntime-react-native module and copies the model
 *   into app/src/main/assets so it ships inside the APK.
 * - iOS: adds the ONNX Runtime pod and adds the model to the app bundle.
 *
 * If assets/ml/cribdoc-eye.onnx doesn't exist yet (the model is still being
 * trained), the build still succeeds and the app shows "model not installed".
 */
const fs = require('fs');
const path = require('path');
const {
  createRunOncePlugin,
  withGradleProperties,
  withDangerousMod,
  withXcodeProject,
  withMainApplication,
  withSettingsGradle,
  IOSConfig,
} = require('expo/config-plugins');

const NAME = 'cribdoc-model';
const MODEL_FILE = 'cribdoc-eye.onnx';

function modelSource(projectRoot, modelPath) {
  const source = path.resolve(projectRoot, modelPath);
  if (fs.existsSync(source)) return source;
  console.warn(`[${NAME}] ${modelPath} not found: building without the screening model.`);
  return null;
}

function withAndroid(config, modelPath) {
  // Ship only the ABIs we need (smaller APK). Override with CRIBDOC_ANDROID_ARCHS.
  config = withGradleProperties(config, (mod) => {
    const archs = process.env.CRIBDOC_ANDROID_ARCHS || 'arm64-v8a,x86_64';
    const item = mod.modResults.find((i) => i.type === 'property' && i.key === 'reactNativeArchitectures');
    if (item) item.value = archs;
    else mod.modResults.push({ type: 'property', key: 'reactNativeArchitectures', value: archs });
    return mod;
  });
  config = withSettingsGradle(config, (mod) => {
    const include = "include ':onnxruntime-react-native'";
    const dir = "project(':onnxruntime-react-native').projectDir = new File(settingsDir, '../node_modules/onnxruntime-react-native/android')";
    if (!mod.modResults.contents.includes(include)) {
      mod.modResults.contents = mod.modResults.contents.replace(/include ':app'/, `${include}\n${dir}\n\ninclude ':app'`);
    }
    return mod;
  });
  config = withMainApplication(config, (mod) => {
    const imp = 'import ai.onnxruntime.reactnative.OnnxruntimePackage';
    const reg = 'if (none { it is OnnxruntimePackage }) add(OnnxruntimePackage())';
    let src = mod.modResults.contents;
    if (!src.includes(imp)) src = src.replace(/(package [^\n]+\n)/, `$1\n${imp}\n`);
    if (!src.includes(reg)) src = src.replace(/(PackageList\(this\)\.packages\.apply\s*\{)/, `$1\n          ${reg}`);
    mod.modResults.contents = src;
    return mod;
  });
  return withDangerousMod(config, [
    'android',
    async (mod) => {
      const source = modelSource(mod.modRequest.projectRoot, modelPath);
      if (!source) return mod;
      const dir = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'assets');
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.copyFile(source, path.join(dir, MODEL_FILE));
      return mod;
    },
  ]);
}

function withIos(config, modelPath) {
  return withXcodeProject(config, (mod) => {
    const source = modelSource(mod.modRequest.projectRoot, modelPath);
    if (!source) return mod;
    const rel = path.relative(mod.modRequest.platformProjectRoot, source).split(path.sep).join('/');
    IOSConfig.XcodeUtils.ensureGroupRecursively(mod.modResults, 'Resources');
    IOSConfig.XcodeUtils.addResourceFileToGroup({ filepath: rel, groupName: 'Resources', project: mod.modResults, isBuildFile: true });
    return mod;
  });
}

function withCribDocModel(config, { modelPath = `./assets/ml/${MODEL_FILE}` } = {}) {
  // onnxruntime-react-native's own plugin adds the Gradle dependency and the iOS pod.
  config = require('onnxruntime-react-native/app.plugin.js').default(config);
  config = withAndroid(config, modelPath);
  config = withIos(config, modelPath);
  return config;
}

module.exports = createRunOncePlugin(withCribDocModel, NAME, '1.0.0');
