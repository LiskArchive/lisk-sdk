'use strict';

var expect = require('chai').expect;
var async = require('async');
var sinon = require('sinon');
var rewire = require('rewire');

var slots = require('../../../../helpers/slots');
var modulesLoader = require('../../../common/initModule').modulesLoader;
var BlockLogic = require('../../../../logic/block.js');
var VoteLogic = require('../../../../logic/vote.js');
var genesisBlock = require('../../../../genesisBlock.json');
var clearDatabaseTable = require('../../../common/globalBefore').clearDatabaseTable;
var constants = require('../../../../helpers/constants.js');
var slots = require('../../../../helpers/slots.js');
var Promise = require('bluebird');

describe('blocks/process', function () {
});
