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

const util = require('util');
const exec = util.promisify(require('child_process').exec);
const Logger = require('../../../logger');

module.exports = {
	http: require('./http'),
	ws: require('./ws'),
	transactions: require('./transactions'),
	logger: new Logger({
		filename: 'test/network/networkTestsLogger.logs',
		echo: 'log',
	}),
	async getListeningConnections(ports) {
		// lsof -i :5000 -i :5001 -P -n -s TCP:LISTEN -t | wc -l
		// tail -n +2 to strip the headers of lsof so we can count the rows
		const { stdout } = await exec(
			`lsof ${ports
				.map(p => `-i :${p}`)
				.join(' ')} -P -n -s TCP:LISTEN | tail -n +2 | wc -l`
		);

		return parseInt(stdout.toString().trim());
	},
	async getEstablishedConnections(ports) {
		// lsof -i :5000 -i :5001 -P -n -s TCP:ESTABLISHED  -t | wc -l
		// tail -n +2 to strip the headers of lsof so we can count the rows
		const { stdout } = await exec(
			`lsof ${ports
				.map(p => `-i :${p}`)
				.join(' ')} -P -n -s TCP:ESTABLISHED | tail -n +2 | wc -l`
		);

		return parseInt(stdout.toString().trim());
	},
};
