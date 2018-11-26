/*
 * Copyright © 2018 Lisk Foundation
 *
 * See the LICENSE file at the top-level directory of this distribution
 * for licensing information.
 *
 * Unless otherwise agreed in a custom licensing agreement with the Lisk Foundation,
 * no part of this software, including this file, may be copied, modified,
 * propagated, or distributed except according to the terms contained in the
 * LICENSE file.
 *
 * Removal or modification of this copyright notice is prohibited.
 */

'use strict';

var fs = require('fs');
var util = require('util');
var child_process = require('child_process');
var path = require('path');
var strftime = require('strftime').utc();

require('colors');

module.exports = function(config) {
	config = config || {};
	var exports = {};

	config.levels = config.levels || {
		none: 99,
		trace: 0,
		debug: 1,
		log: 2,
		info: 3,
		warn: 4,
		error: 5,
		fatal: 6,
	};

	config.level_abbr = config.level_abbr || {
		trace: 'trc',
		debug: 'dbg',
		log: 'log',
		info: 'inf',
		warn: 'WRN',
		error: 'ERR',
		fatal: 'FTL',
	};

	config.filename = `${process.cwd()}/${config.filename || 'logs.log'}`;

	config.errorLevel = config.errorLevel || 'log';

	child_process.execSync(`mkdir -p ${path.dirname(config.filename)}`);
	var log_file = fs.createWriteStream(config.filename, { flags: 'a' });

	exports.setLevel = function(errorLevel) {
		config.errorLevel = errorLevel;
	};

	function snipFragileData(data) {
		for (var key in data) {
			if (key.search(/passphrase|password/i) > -1) {
				data[key] = 'XXXXXXXXXX';
			}
		}
		return data;
	}

	Object.keys(config.levels).forEach(name => {
		function log(message, data) {
			var varLog = {
				level: name,
				timestamp: strftime('%F %T', new Date()),
			};

			if (message instanceof Error) {
				varLog.message = message.stack;
			} else {
				varLog.message = message;
			}

			if (data && util.isObject(data)) {
				varLog.data = JSON.stringify(snipFragileData(data));
			} else {
				varLog.data = data;
			}

			varLog.symbol = config.level_abbr[varLog.level]
				? config.level_abbr[varLog.level]
				: '???';

			if (config.levels[config.errorLevel] <= config.levels[varLog.level]) {
				if (varLog.data) {
					log_file.write(
						util.format(
							'[%s] %s | %s - %s\n',
							varLog.symbol,
							varLog.timestamp,
							varLog.message,
							varLog.data
						)
					);
				} else {
					log_file.write(
						util.format(
							'[%s] %s | %s\n',
							varLog.symbol,
							varLog.timestamp,
							varLog.message
						)
					);
				}
			}

			if (
				config.echo &&
				config.levels[config.echo] <= config.levels[varLog.level]
			) {
				if (varLog.data) {
					console.info(
						`[${varLog.symbol.bgYellow.black}]`,
						varLog.timestamp.grey,
						'|',
						varLog.message,
						'-',
						varLog.data
					);
				} else {
					console.info(
						`[${varLog.symbol.bgYellow.black}]`,
						varLog.timestamp.grey,
						'|',
						varLog.message
					);
				}
			}
		}

		exports[name] = log;
	});

	return exports;
};
