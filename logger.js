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
 *
 */
const fs = require('fs');
const path = require('path');
const bunyan = require('bunyan');

const defaultLoggerConfig = {
	filename: 'logs/lisk.log',
	level: 'none',
};

const createDirIfNotExists = filename => {
	if (!filename || filename === '') {
		return;
	}
	const dir = path.dirname(filename);
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir);
	}
};

const shouldShowSrc = level => level === 'debug' || level === 'trace';

const createLogger = ({ filename, level } = defaultLoggerConfig) => {
	const fileLevel = level !== 'none' ? level : 'fatal';
	createDirIfNotExists(filename);
	const logger = bunyan.createLogger({
		name: filename,
		level: fileLevel,
		serializers: bunyan.stdSerializers,
		src: shouldShowSrc(level),
		streams: [
			{
				level: fileLevel,
				path: filename,
			},
		],
	});
	return logger;
};

module.exports = createLogger;
