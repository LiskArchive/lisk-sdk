/*
 * Copyright © 2019 Lisk Foundation
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

const path = require('path');
const fs = require('fs');
const bunyan = require('bunyan');
const util = require('util');

const createDirIfNotExist = filePath => {
	const dir = path.dirname(filePath);
	if (fs.existsSync(dir)) {
		return;
	}
	fs.mkdirSync(dir, { recursive: true });
};

// Levels
const colors = {
	reset: '\x1b[0m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	meganta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
};

const setColor = (color, str) => `${colors[color]}${str}${colors.reset}`;

const levelToName = {
	10: setColor('yellow', 'TRACE'),
	20: setColor('meganta', 'DEBUG'),
	30: setColor('cyan', 'INFO'),
	40: setColor('yellow', 'WARN'),
	50: setColor('red', 'ERROR'),
	60: setColor('red', 'FATAL'),
};

class ConsoleLog {
	// eslint-disable-next-line
	write(rec) {
		try {
			const {
				time,
				level,
				name,
				msg,
				module,
				err,
				hostname,
				pid,
				src,
				v,
				...others
			} = rec;
			let log = util.format(
				'%s %s %s: %s (module=%s)\n',
				new Date(time).toLocaleTimeString('en-US', { hour12: false }),
				levelToName[level],
				name,
				msg,
				module || 'unknown',
			);
			if (err) {
				log += util.format(
					'Message: %s \n Trace: %s \n',
					err.message,
					err.stack,
				);
			}
			if (Object.keys(others).length > 0) {
				log += util.format('%s \n', JSON.stringify(others, undefined, ' '));
			}
			process.stdout.write(log);
		} catch (err) {
			console.error('Failed on logging', rec.err);
		}
	}
}

const createLogger = ({
	fileLogLevel,
	consoleLogLevel,
	logFileName,
	module,
}) => {
	const consoleSrc = consoleLogLevel === 'debug' || consoleLogLevel === 'trace';
	const consoleStream =
		consoleLogLevel !== 'none'
			? [
					{
						type: 'raw',
						level: consoleLogLevel,
						stream: new ConsoleLog(),
					},
			  ]
			: [];
	const filePath = path.join(process.cwd(), logFileName);
	createDirIfNotExist(filePath);
	const fileSrc = fileLogLevel === 'debug' || fileLogLevel === 'trace';
	const fileStream =
		fileLogLevel !== 'none'
			? [
					{
						level: fileLogLevel,
						path: filePath,
					},
			  ]
			: [];
	const streams = [...consoleStream, ...fileStream];
	return bunyan.createLogger({
		name: 'lisk-framework',
		streams,
		src: consoleSrc || fileSrc,
		serializers: { err: bunyan.stdSerializers.err },
		module,
	});
};

module.exports = {
	createDirIfNotExist,
	createLogger,
};
