const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the entire monorepo so changes in packages/shared trigger Metro reload.
config.watchFolders = [workspaceRoot];

// 2. Resolve from both the mobile-local node_modules (symlinks) and the
//    workspace root node_modules (where pnpm hoists shared deps with
//    shamefully-hoist=true + node-linker=hoisted from root .npmrc).
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Critical for pnpm: disable hierarchical lookup so Metro doesn't try
//    to climb past nodeModulesPaths and break on phantom dependencies.
config.resolver.disableHierarchicalLookup = true;

// 4. Preserve MMA legacy resolver behaviour.
config.resolver.assetExts.push('svg');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Stub @react-native-community/datetimepicker on web (no native impl).
  if (platform === 'web' && moduleName === '@react-native-community/datetimepicker') {
    return { type: 'empty' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
