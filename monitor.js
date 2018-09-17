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
const Util = require('util');
const v8 = require('v8');
const profiler = require('v8-profiler');
const Memwatch = require('memwatch-next');
const Logger = require('./logger.js');

let memoryCount = 0;
let firstRound = null;

let nextMBThreshold = 100;
let hd = null;

module.exports.init = snapShotInterval => {
	const logger = new Logger({
		errorLevel: 'debug',
		filename: 'logs/monitor.log',
	});

	logger.info('Monitoring initialized');
	Memwatch.on('leak', info => {
		logger.info('memwatch::leak');
		logger.info(info);
		if (!hd) {
			hd = new Memwatch.HeapDiff();
		} else {
			const diff = hd.end();
			logger.error(Util.inspect(diff, true, null));
			hd = null;
		}
	});
	startMonitoringMemory(logger, snapShotInterval);
};

const convertToMbs = bytes => (bytes / 1024 / 1024).toFixed();

const startMonitoringMemory = (logger, miliSecondsInterval) => {
	setInterval(() => {
		const spaces = v8.getHeapSpaceStatistics();
		const rss = process.memoryUsage().rss;
		spaces.push({ space_name: 'RSS', space_used_size: rss });
		if (memoryCount === 0) {
			logger.debug(spaces.map(s => s.space_name).join('\t'));
			firstRound = spaces.map(s => convertToMbs(s.space_used_size));
		}
		const currentRound = spaces.map(s => convertToMbs(s.space_used_size));

		logger.debug(
			currentRound
				.map((value, index) => {
					const diff = value - firstRound[index];
					if (diff >= 0) {
						return `${value}+${diff}`;
					}
					return `${value}${diff}`;
				})
				.join('\t\t')
		);
		memoryCount++;
		heapDump(logger);
	}, miliSecondsInterval);
};

const heapDump = logger => {
	const used = process.memoryUsage();
	const heapUsedMB = convertToMbs(used.heapUsed);
	const threshold = Number(nextMBThreshold + 50);

	if (heapUsedMB > threshold) {
		logger.debug(
			`Heap usage is ${heapUsedMB} MB, increased from the threshold ${threshold}MB`
		);
		nextMBThreshold = heapUsedMB;
		var snap = profiler.takeSnapshot('profile');
		const dumpPath = process.env.HEAP_DUMP_PATH || 'logs';
		saveHeapSnapshot(logger, snap, dumpPath);
	}
};

const saveHeapSnapshot = (logger, snapshot, datadir) => {
	var buffer = '';
	var stamp = Date.now();
	snapshot.serialize(
		data => {
			buffer += data;
		},
		() => {
			var name = `${stamp}.heapsnapshot`;
			fs.writeFile(`${datadir}/${name}`, buffer, () => {
				logger.info(`Heap snapshot written to ${name}`);
			});
		}
	);
};
