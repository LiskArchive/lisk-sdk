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

const createDirIfNotExist = filePath => {
	const dir = path.dirname(filePath);
	if (fs.existsSync(dir)) {
		return;
	}
	fs.mkdirSync(dir, { recursive: true });
};

/**
 *
 * @param {Object} config
 * @param {string} config.logFileName
 * @param {string} config.fileLogLevel
 * @param {string} config.consoleLogLevel
 */
const createLogger = ({ fileLogLevel, consoleLogLevel, logFileName }) => {
	const consoleSrc = consoleLogLevel === 'debug' || consoleLogLevel === 'trace';
	const consoleStream =
		consoleLogLevel !== 'none'
			? [
					{
						level: consoleLogLevel,
						stream: process.stdout,
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
	});
};

module.exports = {
	createDirIfNotExist,
	createLogger,
};
