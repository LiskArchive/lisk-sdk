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
			var log = {
				level: name,
				timestamp: strftime('%F %T', new Date()),
			};

			if (message instanceof Error) {
				log.message = message.stack;
			} else {
				log.message = message;
			}

			if (data && util.isObject(data)) {
				log.data = JSON.stringify(snipFragileData(data));
			} else {
				log.data = data;
			}

			log.symbol = config.level_abbr[log.level]
				? config.level_abbr[log.level]
				: '???';

			if (config.levels[config.errorLevel] <= config.levels[log.level]) {
				if (log.data) {
					log_file.write(
						util.format(
							'[%s] %s | %s - %s\n',
							log.symbol,
							log.timestamp,
							log.message,
							log.data
						)
					);
				} else {
					log_file.write(
						util.format(
							'[%s] %s | %s\n',
							log.symbol,
							log.timestamp,
							log.message
						)
					);
				}
			}

			if (
				config.echo &&
				config.levels[config.echo] <= config.levels[log.level]
			) {
				if (log.data) {
					console.info(
						`[${log.symbol.bgYellow.black}]`,
						log.timestamp.grey,
						'|',
						log.message,
						'-',
						log.data
					);
				} else {
					console.info(
						`[${log.symbol.bgYellow.black}]`,
						log.timestamp.grey,
						'|',
						log.message
					);
				}
			}
		}

		exports[name] = log;
	});

	return exports;
};
