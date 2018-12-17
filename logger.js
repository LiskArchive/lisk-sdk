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

const fs = require('fs');
const util = require('util');
const child_process = require('child_process');
const path = require('path');
const strftime = require('strftime').utc();

require('colors');

module.exports = function(config) {
	config = config || {};
	const exports = {};

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
	const log_file = fs.createWriteStream(config.filename, { flags: 'a' });

	exports.setLevel = function(errorLevel) {
		config.errorLevel = errorLevel;
	};

	function snipFragileData(data) {
		Object.keys(data).forEach(key => {
			if (key.search(/passphrase|password/i) > -1) {
				data[key] = 'XXXXXXXXXX';
			}
		});
		return data;
	}

	Object.keys(config.levels).forEach(name => {
		function log(message, data) {
			const logContext = {
				level: name,
				timestamp: strftime('%F %T', new Date()),
			};

			if (message instanceof Error) {
				logContext.message = message.stack;
			} else {
				logContext.message = message;
			}

			if (data && util.isObject(data)) {
				logContext.data = JSON.stringify(snipFragileData(data));
			} else {
				logContext.data = data;
			}

			logContext.symbol = config.level_abbr[logContext.level]
				? config.level_abbr[logContext.level]
				: '???';

			if (config.levels[config.errorLevel] <= config.levels[logContext.level]) {
				if (logContext.data) {
					log_file.write(
						util.format(
							'[%s] %s | %s - %s\n',
							logContext.symbol,
							logContext.timestamp,
							logContext.message,
							logContext.data
						)
					);
				} else {
					log_file.write(
						util.format(
							'[%s] %s | %s\n',
							logContext.symbol,
							logContext.timestamp,
							logContext.message
						)
					);
				}
			}

			if (
				config.echo &&
				config.levels[config.echo] <= config.levels[logContext.level]
			) {
				if (logContext.data) {
					console.info(
						`[${logContext.symbol.bgYellow.black}]`,
						logContext.timestamp.grey,
						'|',
						logContext.message,
						'-',
						logContext.data
					);
				} else {
					console.info(
						`[${logContext.symbol.bgYellow.black}]`,
						logContext.timestamp.grey,
						'|',
						logContext.message
					);
				}
			}
		}

		exports[name] = log;
	});

	return exports;
};
