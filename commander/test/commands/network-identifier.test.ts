/*
 * LiskHQ/lisk-commander
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
 *
 */
import { expect, test } from '@oclif/test';
import * as config from '../../src/utils/config';
import * as printUtils from '../../src/utils/print';
import NetworkIdentifierCommand from '../../src/commands/network-identifier';

describe('network-identifier command', () => {
	const networkIdentifier = {
		networkIdentifier:
			'7c21683ea0ec8aaaf7e26e00e09fa17c4d79e0b0c28f7269d6455321ed4502b4',
	};

	const networkIdentifierStub = sandbox.stub();
	const printMethodStub = sandbox.stub();

	const setupTest = () =>
		test.stub(config, 'getConfig', sandbox.stub().returns({}));
	test.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub));
	test.stub(
		NetworkIdentifierCommand,
		sandbox.stub().returns(networkIdentifierStub),
	);

	describe('network-identifier', () => {
		setupTest()
			.command(['network-identifier'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error');
	});

	describe('network-identifier --nethash=Lisk', () => {
		setupTest()
			.command(['network-identifier', '--nethash=Lisk'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error');
	});

	describe('network-identifier --community-identifier=123', () => {
		setupTest()
			.command(['network-identifier', '--community-identifier=123'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error');
	});

	describe.skip('network-identifier --nethash=Lisk --community-identifier=123', () => {
		setupTest()
			.command([
				'network-identifier',
				'--nethash=Lisk',
				'--community-identifier=123',
			])
			.it('should show networkIdentifier', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					networkIdentifier,
				);
			});
	});
});
