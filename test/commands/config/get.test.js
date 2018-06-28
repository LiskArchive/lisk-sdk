/*
 * LiskHQ/lisk-commander
 * Copyright © 2017–2018 Lisk Foundation
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
import { expect, test } from '../../test';
// Requried for stubbing
const config = require('../../../src/utils/config');
const print = require('../../../src/utils/print');

describe('config get command', () => {
	const defaultConfig = {
		api: {
			network: 'main',
			nodes: ['http://localhost:4000'],
		},
	};
	let printMethodStub;
	let printStub;
	beforeEach(() => {
		printMethodStub = sandbox.stub();
		printStub = sandbox.stub(print, 'default').returns(printMethodStub);
		return sandbox.stub(config, 'getConfig').returns(defaultConfig);
	});

	describe('config:get', () => {
		test
			.stdout()
			.command(['config:get'])
			.it('should call print with the user config', () => {
				expect(printStub).to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(defaultConfig);
			});

		test
			.stdout()
			.command(['config:get', '--json', '--pretty'])
			.it('should call print with json', () => {
				expect(printStub).to.be.calledWith({ json: true, pretty: true });
				return expect(printMethodStub).to.be.calledWithExactly(defaultConfig);
			});
	});
});
