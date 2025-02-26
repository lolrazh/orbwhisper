// settings.js
// Stores application settings in a simple, directly-editable format

const fs = require('fs');
const path = require('path');

// Path to the settings file in the root directory
const SETTINGS_FILE_PATH = path.join(__dirname, '..', 'settings.json');

// Default settings
const defaultSettings = {
  hotkey: 'CommandOrControl+Shift+H',
  appearance: {
    theme: 'dark'
  },
  audio: {
    sensitivity: 'medium'
  }
};

// Load settings from file
const loadSettings = () => {
  try {
    // Check if settings file exists
    if (!fs.existsSync(SETTINGS_FILE_PATH)) {
      // Create settings file with defaults if it doesn't exist
      fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(defaultSettings, null, 2));
      return { ...defaultSettings };
    }
    
    // Read and parse settings file
    const settings = JSON.parse(fs.readFileSync(SETTINGS_FILE_PATH, 'utf8'));
    
    // Merge with defaults to ensure all properties exist
    return { ...defaultSettings, ...settings };
  } catch (error) {
    console.error('Error loading settings:', error);
    return { ...defaultSettings };
  }
};

// Save settings to file
const saveSettings = (settings) => {
  try {
    fs.writeFileSync(SETTINGS_FILE_PATH, JSON.stringify(settings, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving settings:', error);
    return false;
  }
};

// Update a single setting
const updateSetting = (key, value) => {
  const settings = loadSettings();
  settings[key] = value;
  return saveSettings(settings);
};

// Get a single setting
const getSetting = (key) => {
  const settings = loadSettings();
  return settings[key];
};

module.exports = {
  loadSettings,
  saveSettings,
  updateSetting,
  getSetting,
  defaultSettings
}; 