var path = require('path');

exports.getPathForVersion = function(version) {
	var filename = process.platform === 'win32' ? 'chromedriver.exe' : 'chromedriver';
	var versionDir = version.replace(/\./g, '_')
	return path.join(__dirname, 'chromedriver', versionDir, filename)
};
exports.start = function(version, args) {
  exports.defaultInstance = require('child_process').execFile(exports.getPathForVersion(version), args);
  return exports.defaultInstance;
};
exports.stop = function () {
  if (exports.defaultInstance != null){
    exports.defaultInstance.kill();
  }
};