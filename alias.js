'use strict';
/**
 * This file is for convinience in setting up dynamic objects (config.json,
 * genesisBlock.json). If the NODE_ENV.toLowerCase() === 'test', then we change-case
 * the bootstraping of the config files to the test folder.
 *
 * In order to retrieve the config:
 * var config = alias.config;
 *
 * In order to get the genesisblock:
 * var genesisblock = alias.genesisblock;
 *
 * Additionally this class provides a function called require. This allows developers
 * to access files from the root rather than from their current location.
 *
 * As a result, when calling a class somewhere outside of your directory, you
 * can call it as if it where the root.
 * For example, you are in test/a/package/somewhere/deep/aspec.js and would like
 * to 'require' src/awesome.js in it.
 *
 * Traditionally, you would write the following:
 * var awesome = require('../../../../../src/awesome');
 *
 * With alias, you will instead be able to do the following:
 * var awesome = alias.require('src/awesome');
 */
var program = require('commander');

program
   .option('-c, --config <path>', 'config file path')
   .parse(process.argv);

var prefix = '';
if (process.env.NODE_ENV && ( process.env.NODE_ENV.toLowerCase() === 'test')) {
  prefix = 'test/'
}

// You can override the configuration from the command line.
var config;
if (program.config) {
  if (!program.config.startsWith('/')) {
    program.config = '/' +program.config;
  }
  config = require(process.env.PWD + program.config);
} else {
  config = require(process.env.PWD + '/' +prefix + 'config.json');
}

var genesisblock  = require(process.env.PWD + '/' + prefix + 'genesisBlock.json');

/**
 * Export alias as a global for now. If we need to refactor it to export should
 * not be a big deal.
 */
global.alias = {
  config: config,
  genesisblock: genesisblock,
  require: function(path) {
      return require(process.env.PWD + '/' + path);
  }
}
