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

const pm2Axon = jest.genMockFromModule('pm2-axon');

pm2Axon.socket = jest.fn().mockReturnValue({
	connect: jest.fn(),
	close: jest.fn(),
	on: jest.fn(),
	once: jest.fn((event, callback) => {
		callback();
	}),
	bind: jest.fn(),
	emit: jest.fn(),
	removeAllListeners: jest.fn(),
	sock: {
		once: jest.fn((event, callback) => {
			callback('#MOCKED_ONCE');
		}),
		on: jest.fn((event, callback) => {
			callback('#MOCKED_ON');
		}),
		removeAllListeners: jest.fn(),
	},
});

module.exports = pm2Axon;
