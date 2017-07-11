'use strict';

const config = require('../../config.json');
const lisk = require('lisk-js').api(config.liskJS);

module.exports = lisk;
