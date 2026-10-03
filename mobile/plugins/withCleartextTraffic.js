const { withAndroidManifest } = require('@expo/config-plugins')

/**
 * The API endpoint can be configured from the hidden connection settings.
 * Allow HTTP endpoints in the standalone Android build so LAN/development
 * URLs do not fail before the request reaches the backend.
 */
module.exports = function withCleartextTraffic(config) {
  return withAndroidManifest(config, (manifestConfig) => {
    const application = manifestConfig.modResults.manifest.application?.[0]
    if (!application) throw new Error('DentaHub Android application manifest is missing.')

    application.$ = application.$ || {}
    application.$['android:usesCleartextTraffic'] = 'true'
    return manifestConfig
  })
}
