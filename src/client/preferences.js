import components from './morphic/component-loader.js';

/*
 * Stores page-specific preferences in the body, so it gets saved/loaded with other content
 */

export default class Preferences {

  static get prefsNode() {
    let node = document.querySelector('lively-preferences');
    if (!node) {
      node = document.createElement('lively-preferences')
      node.classList.add("lively-content")
      components.openInBody(node)
    }
    return node
  }
  
  static  read(preferenceKey) {
    return this.prefsNode.dataset[preferenceKey];
  }
  
  static write(preferenceKey, preferenceValue) {
    this.prefsNode.dataset[preferenceKey] = preferenceValue;
  }
  
  static isEnabled(preferenceKey) {
    return this.read(preferenceKey) == "true"
  }

  static enable(preferenceKey) {
    Preferences.write(preferenceKey, "true")
    this.applyPreference(preferenceKey)
  }

  static disable(preferenceKey) {
    Preferences.write(preferenceKey, "false")
    this.applyPreference(preferenceKey)
  }
  
  static applyPreference(preferenceKey) {
    var msg = "on" +  preferenceKey[0].toUpperCase() + preferenceKey.slice(1) + "Preference"
    if (lively[msg]) {
      try {
        var json = this.read(preferenceKey)
        var config = JSON.parse(json)
        lively[msg](config)
      } catch(e) {
        console.log("[preference] could not parse json: " + json)
      }
    } else {
      console.log("[preference] lively does not understand: " + msg)
    }
  }
  
  static loadPreferences() {
    Object.keys(this.prefsNode.dataset).forEach(preferenceKey => {
      this.applyPreference(preferenceKey)
    })
  }

  static getURLParameter(theParameter) {
    var params = window.location.search.substr(1).split('&');
  
    for (var i = 0; i < params.length; i++) {
      var p=params[i].split('=');
      if (p[0] == theParameter) {
        return decodeURIComponent(p[1]);
      }
    }
    return false;
  }
}


