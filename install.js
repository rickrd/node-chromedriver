'use strict';

var AdmZip = require('adm-zip');
var fs = require('fs');
var helper = require('./lib/chromedriver');
var http = require('http');
var https = require('https');
var kew = require('kew');
var npmconf = require('npmconf');
var mkdirp = require('mkdirp');
var path = require('path');
var rimraf = require('rimraf').sync;
var url = require('url');
var util = require('util');

var libPath = path.join(__dirname, 'chromedriver');

var cdnUrl = process.env.npm_config_chromedriver_cdnurl || process.env.CHROMEDRIVER_CDNURL || 'https://chromedriver.storage.googleapis.com';
// adapt http://chromedriver.storage.googleapis.com/
cdnUrl = cdnUrl.replace(/\/+$/, '');

exports.installFromEnv = function() {
  var versions = Object.keys(process.env).filter(function(key) {
    return key.startsWith('npm_package_chromedriver_versions_');
  }).map(function(key) {
    return process.env[key];
  });
  exports.install(versions);
};

exports.install = async function(requiredVersions) {
  return new Promise((resolve, reject) => {
    console.log("Downloading chromedriver versions", requiredVersions);

    npmconf.load(function(err, conf) {
      if (err) {
        console.log('Error loading npm config');
        console.error(err);
        process.exit(1);
        return;
      }

      var tmpPath = findSuitableTempDirectory(conf);
      var downloadItems = requiredVersions.map(function(version) {
        var platform = getPlatform(version);
        var url = util.format(cdnUrl + '/%s/chromedriver_%s.zip', version, platform);
        var fileName = url.split('/').pop();
        var versionDir = version.replace(/\./g, '_');
        var downloadedFile = path.join(tmpPath, versionDir, fileName);
        var targetPath = helper.getPathForVersion(version);
        return {
          url: url,
          downloadedPath: downloadedFile,
          targetPath: targetPath
        };
      });
      var promise = kew.resolve(true);

      // Start the install.
      promise = promise.then(function () {
        return kew.all(downloadItems.map(function(item) {
          console.log('Downloading', item.url);
          console.log('Saving to', item.downloadedPath);
          var downloadDir = path.dirname(item.downloadedPath);
          rimraf(downloadDir);
          mkdirp.sync(downloadDir);

          return kew.resolve(true)
            .then(function() { return requestBinary(getRequestOptions(conf, item.url), item.downloadedPath); })
            .then(function() { return extractDownload(item.downloadedPath); })
            .then(function() { return copyIntoPlace(downloadDir, path.dirname(item.targetPath)); })
            .then(function() { return fixFilePermissions(item.targetPath); });
        }));
      })
      .then(function () {
        console.log('Done. ChromeDriver binaries available at:');
        downloadItems.forEach(function(item) {
          console.log(' => ' + item.targetPath);
          resolve(item.targetPath)
        });
      })
      .fail(function (err) {
        console.error('ChromeDriver installation failed', err);
        process.exit(1);
        reject(err)
      });
    });
  })
}


function findSuitableTempDirectory(npmConf) {
  var now = Date.now();
  var candidateTmpDirs = [
    process.env.TMPDIR || npmConf.get('tmp'),
    '/tmp',
    path.join(process.cwd(), 'tmp')
  ];

  for (var i = 0; i < candidateTmpDirs.length; i++) {
    var candidatePath = path.join(candidateTmpDirs[i], 'chromedriver');

    try {
      mkdirp.sync(candidatePath, '0777');
      var testFile = path.join(candidatePath, now + '.tmp');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return candidatePath;
    } catch (e) {
      console.log(candidatePath, 'is not writable:', e.message);
    }
  }

  console.error('Can not find a writable tmp directory, please report issue on https://github.com/laszlopandy/chromedriver/issues/ with as much information as possible.');
  process.exit(1);
}


function getRequestOptions(conf, downloadUrl) {
  var options = url.parse(downloadUrl);
  var proxyUrl = options.protocol === 'https:' ? conf.get('https-proxy') : conf.get('proxy');
  if (proxyUrl) {
    options = url.parse(proxyUrl);
    options.path = downloadUrl;
    options.headers = { Host: url.parse(downloadUrl).host };
    // Turn basic authorization into proxy-authorization.
    if (options.auth) {
      options.headers['Proxy-Authorization'] = 'Basic ' + new Buffer(options.auth).toString('base64');
      delete options.auth;
    }
  } else {
    options = url.parse(downloadUrl);
  }

  options.rejectUnauthorized = !!process.env.npm_config_strict_ssl;

  // Use certificate authority settings from npm
  var ca = process.env.npm_config_ca;
  if (!ca && process.env.npm_config_cafile) {
    try {
      ca = fs.readFileSync(process.env.npm_config_cafile, {encoding: 'utf8'})
        .split(/\n(?=-----BEGIN CERTIFICATE-----)/g);

      // Comments at the beginning of the file result in the first
      // item not containing a certificate - in this case the
      // download will fail
      if (ca.length > 0 && !/-----BEGIN CERTIFICATE-----/.test(ca[0])) {
        ca.shift();
      }

    } catch (e) {
      console.error('Could not read cafile', process.env.npm_config_cafile, e);
    }
  }

  if (ca) {
    console.log('Using npmconf ca');
    options.agentOptions = {
      ca: ca
    };
    options.ca = ca;
  }

  return options;
}


function requestBinary(requestOptions, filePath) {
  var deferred = kew.defer();

  var count = 0;
  var notifiedCount = 0;
  var outFile = fs.openSync(filePath, 'w');

  var protocol = requestOptions.protocol === 'https:' ? https : http;
  var client = protocol.get(requestOptions, function (response) {
    var status = response.statusCode;
    console.log('Receiving...');

    if (status === 200) {
      response.addListener('data',   function (data) {
        fs.writeSync(outFile, data, 0, data.length, null);
        count += data.length;
        if ((count - notifiedCount) > 800000) {
          console.log('Received ' + Math.floor(count / 1024) + 'K...');
          notifiedCount = count;
        }
      });

      response.addListener('end',   function () {
        console.log('Received ' + Math.floor(count / 1024) + 'K total.');
        fs.closeSync(outFile);
        deferred.resolve(true);
      });

    } else {
      console.log(util.inspect(requestOptions));
      client.abort();
      deferred.reject('Error with http request: ' + util.inspect(response.headers));
    }
  });

  return deferred.promise;
}


function extractDownload(filePath) {
  var deferred = kew.defer();

  var dir = path.dirname(filePath);
  console.log('Extracting zip contents into', dir);
  try {
    var zip = new AdmZip(filePath);
    zip.extractAllTo(dir, true);
    deferred.resolve(true);
  } catch (err) {
    deferred.reject('Error extracting archive ' + err.stack);
  }
  return deferred.promise;
}


function copyIntoPlace(tmpPath, targetPath) {
  rimraf(targetPath);
  console.log("Copying to target path", targetPath);
  mkdirp.sync(targetPath);

  // Look for the extracted directory, so we can rename it.
  var files = fs.readdirSync(tmpPath);
  var promises = files.map(function (name) {
    var deferred = kew.defer();

    var file = path.join(tmpPath, name);
    var reader = fs.createReadStream(file);

    var targetFile = path.join(targetPath, name);
    var writer = fs.createWriteStream(targetFile);
    writer.on("close", function() {
      deferred.resolve(true);
    });

    reader.pipe(writer);
    return deferred.promise;
  });

  return kew.all(promises);
}


function fixFilePermissions(filepath) {
  // Check that the binary is user-executable and fix it if it isn't (problems with unzip library)
  if (process.platform != 'win32') {
    var stat = fs.statSync(filepath);
    // 64 == 0100 (no octal literal in strict mode)
    if (!(stat.mode & 64)) {
      console.log('Fixing file permissions');
      fs.chmodSync(filepath, '755');
    }
  }
}


function getRequiredVersions() {
  var versions = Object.keys(process.env).filter(function(key) {
    return key.startsWith('npm_package_chromedriver_versions_');
  }).map(function(key) {
    return process.env[key];
  });
  return versions;
}


function getPlatform(version) {
  var platform = process.platform;
  var versionTuple = version.split('.').map(function(x) { return parseInt(x); });

  if (platform === 'linux') {
    if (process.arch === 'x64') {
      platform += '64';
    } else {
      platform += '32';
    }
  } else if (platform === 'darwin') {
    if (versionTuple >= [2, 23]) {
      if (process.arch === 'x64') {
        platform = 'mac64';
      } else {
        console.log('Only Mac 64 bits supported.');
        process.exit(1);
      }
    }
    else {
      platform = 'mac32';
    }
  } else if (platform !== 'win32') {
    console.log('Unexpected platform or architecture:', process.platform, process.arch);
    process.exit(1);
  }
  return platform;
}

