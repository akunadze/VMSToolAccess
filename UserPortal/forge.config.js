const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

module.exports = {
  packagerConfig: {
    asar: true,
    // Flutter web files are served by Express at runtime, so they must live
    // outside the asar archive (Express reads them as plain filesystem files).
    // Forge copies this directory to <app>/resources/web/ in the final package.
    extraResource: ['flutter_ui/build/web'],
  },
  rebuildConfig: {},
  makers: [
    // ZIP is cross-platform — works when building on Windows targeting Linux.
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux', 'darwin', 'win32'],
    },
    // DEB requires dpkg-deb. Works on Linux or Windows with WSL2.
    {
      name: '@electron-forge/maker-deb',
      platforms: ['linux'],
      config: {
        options: {
          maintainer: 'Tool Access Admin',
        },
      },
    },
    // RPM requires rpmbuild. Works on Linux only.
    {
      name: '@electron-forge/maker-rpm',
      platforms: ['linux'],
    },
    // Squirrel installer for Windows.
    {
      name: '@electron-forge/maker-squirrel',
      platforms: ['win32'],
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
