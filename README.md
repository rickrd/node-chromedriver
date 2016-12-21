ChromeDriver
=======

An NPM wrapper for simultaneously using multiple versions of Selenium [ChromeDriver](https://sites.google.com/a/chromium.org/chromedriver/).

Add to Your Package.json
------------------------

The easiest way to have multiple versions of chromedriver is to add the
configuration to your package.json. Here's what it should look like:

```json
{
    "name": "test-project",
    "version": "0.0.1",
    "description": "project to test chromedriver-multi",
    "dependencies": {
        "chromedriver-multi": "1.0.0",
    },
    "chromedriver": {
        "versions": ["2.21", "2.25"]
    },
    "scripts": {
        "install": "node -e \"require('chromedriver-multi/install').installFromEnv()\""
    }
}
```

The `scripts` section allows you to run the chromedriver-multi install 
during `npm install`:
```json
    "scripts": {
        "install": "node -e \"require('chromedriver-multi/install').installFromEnv()\""
    }
```

The `chromedriver` section allows you to configure which versions to download.
These values will be passed as environment variables to `installFromEnv()`:
```json
    "chromedriver": {
        "versions": ["2.21", "2.25"]
    }
```

Then when you run `npm install` in your project, you should see it download:
```
> test-project@0.0.1 install /Users/test/workspace/test-project
> node -e "require('chromedriver-multi/install').installFromEnv()"

Downloading chromedriver versions [ '2.21', '2.25' ]
Downloading https://chromedriver.storage.googleapis.com/2.21/chromedriver_mac32.zip
Saving to /var/folders/tg/zvy3l4b55cz3w2mn1pwm8vmw0000gp/T/chromedriver/2_21/chromedriver_mac32.zip
Downloading https://chromedriver.storage.googleapis.com/2.25/chromedriver_mac64.zip
Saving to /var/folders/tg/zvy3l4b55cz3w2mn1pwm8vmw0000gp/T/chromedriver/2_25/chromedriver_mac64.zip
Receiving...
Receiving...
Received 781K...
Received 782K...
Received 1570K...
Received 1564K...
Received 2354K...
Received 3138K...
Received 2348K...
Received 3639K total.
Extracting zip contents into /var/folders/tg/zvy3l4b55cz3w2mn1pwm8vmw0000gp/T/chromedriver/2_21
Copying to target path /Users/laszlopandy/dev/boxfish/editor-loader/e2e-test/src/test/node_modules/chromedriver/lib/chromedriver/2_21
Received 3132K...
Received 3916K...
Fixing file permissions
Received 4456K total.
Extracting zip contents into /var/folders/tg/zvy3l4b55cz3w2mn1pwm8vmw0000gp/T/chromedriver/2_25
Copying to target path /Users/laszlopandy/dev/boxfish/editor-loader/e2e-test/src/test/node_modules/chromedriver/lib/chromedriver/2_25
Fixing file permissions
Done. ChromeDriver binaries available at:
 => /Users/laszlopandy/dev/boxfish/editor-loader/e2e-test/src/test/node_modules/chromedriver/lib/chromedriver/2_21/chromedriver
 => /Users/laszlopandy/dev/boxfish/editor-loader/e2e-test/src/test/node_modules/chromedriver/lib/chromedriver/2_25/chromedriver
```

Building and Installing Manually
--------------------------------

If you don't have a package.json you can do it manually.
For example, to install chromedriver versions `2.21` and `2.25`:

```shell
npm install chromedriver-multi
node -e "require('chromedriver-multi/install').install(['2.21', '2.25'])"
```

What this is really doing is just downloading particular releases
from chromedriver's CDN.

The package has been set up to fetch and run ChromeDriver for MacOS (darwin),
Linux based platforms (as identified by nodejs), and Windows.  If you
spot any platform weirdnesses, let us know or send a patch.

### Custom binaries url

To use a mirror of the ChromeDriver binaries use npm config property `chromedriver_cdnurl`.
Default is `http://chromedriver.storage.googleapis.com`.

Add property into your [`.npmrc`](https://docs.npmjs.com/files/npmrc) file.

```
chromedriver_cdnurl=http://npm.taobao.org/mirrors/chromedriver
```

Another option is to use PATH variable `CHROMEDRIVER_CDNURL`.

```shell
CHROMEDRIVER_CDNURL=http://npm.taobao.org/mirrors/chromedriver npm install
```

Running with Selenium WebDriver
-------------------------------

```javascript
var chrome = require('selenium-webdriver/chrome');
var chromedriverHelper = require('chromedriver-multi');
var binary = chromedriverHelper.getPathForVersion('2.21');
var driver = new chrome.Driver(
	new chrome.Options(),
	new chrome.ServiceBuilder(binary).build(),
	null);
```

(Tested for selenium-webdriver version `2.53.3`)

Running via node
----------------

The package exports a `getPathForVersion` function that returns
the path to the chromdriver binary/executable.

Below is an example of using this package via node.

```javascript
var childProcess = require('child_process');
var chromedriver = require('chromedriver-multi');
var binPath = chromedriver.getPathForVersion('2.21');

var childArgs = [
  'some argument'
];

childProcess.execFile(binPath, childArgs, function(err, stdout, stderr) {
  // handle results
});

```

You can also use the start and stop methods:

```javascript
var chromedriver = require('chromedriver-multi');

args = [
	// optional arguments
];
chromedriver.start('2.21', args);
// run your tests
chromedriver.stop();

```
Note: if your tests are ran asynchronously, chromedriver.stop() will have to be
executed as a callback at the end of your tests

A Note on chromedriver
-------------------

Chromedriver is not a library for NodeJS.

This is an _NPM wrapper_ and can be used to conveniently make ChromeDriver available
It is not a Node JS wrapper.

Contributing
------------

Questions, comments, bug reports, and pull requests are all welcome.  Submit them at
[the project on GitHub](https://github.com/laszlopandy/node-chromedriver/).

Bug reports that include steps-to-reproduce (including code) are the
best. Even better, make them in the form of pull requests.

Author
------

[Laszlo Pandy](https://github.com/laszlopandy)

Slightly adapted from [Giovanni Bassi](https://github.com/giggio)'s chromedriver (wrapper for a single version of chromedriver): https://github.com/giggio/node-chromedriver/

Thanks for Obvious and their PhantomJS project for heavy inspiration! Check their project on [Github](https://github.com/Obvious/phantomjs/tree/master/bin).

License
-------

Licensed under the Apache License, Version 2.0.
