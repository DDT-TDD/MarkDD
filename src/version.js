/**
 * Version Module - Single source of truth for app version
 * Reads version from package.json to ensure consistency everywhere
 * No more hardcoded version strings!
 */

const path = require('path');
const fs = require('fs');

let cachedVersion = null;

/**
 * Get the application version from package.json
 * @returns {string} - Application version (e.g., "1.1.1")
 */
function getVersion() {
    // Return cached version if already loaded
    if (cachedVersion) {
        return cachedVersion;
    }

    try {
        // Try to read package.json from project root
        const packagePath = path.join(__dirname, '..', 'package.json');
        const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        cachedVersion = packageJson.version || '1.0.0';
        return cachedVersion;
    } catch (error) {
        console.error('Failed to read version from package.json:', error);
        // Fallback version if package.json cannot be read
        return '1.0.0';
    }
}

module.exports = {
    getVersion
};
