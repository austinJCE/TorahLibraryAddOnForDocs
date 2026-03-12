/*
Pure attribution helper that works in both Google Apps Script and Node.
*/
(function (globalScope) {
  function getEnglishAttribution(data) {
    if (!data || !data.versionTitle) {
      return "";
    }

    let source = data.versionSource;

    if (!source && data.versions && Array.isArray(data.versions)) {
      const selectedVersion = data.versions.find(
        (version) => version.language === "en" && version.versionTitle === data.versionTitle
      );
      if (selectedVersion) {
        source = selectedVersion.versionSource;
      }
    }

    if (source) {
      return `Translation: ${data.versionTitle} | Source: ${source}`;
    }

    return `Translation: ${data.versionTitle}`;
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      getEnglishAttribution,
    };
  }

  globalScope.getEnglishAttribution = getEnglishAttribution;
})(typeof globalThis !== "undefined" ? globalThis : this);
