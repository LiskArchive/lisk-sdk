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
			'7dbdc2b4694bd5ab6663c4d078aa628ae032cb91ce0fe03a5077d7ef3ba2e8bc',
	};

	const networkIdentifierStub = sandbox.stub();
	const printMethodStub = sandbox.stub();

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(
				NetworkIdentifierCommand,
				sandbox.stub().returns(networkIdentifierStub),
			)
			.stdout();

	describe('network-identifier', () => {
		setupTest()
			.command(['network-identifier'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error');
	});

	describe('network-identifier --nethash=123', () => {
		setupTest()
			.command(['network-identifier', '--nethash=123'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error');
	});

	describe('network-identifier --community-identifier=Lisk', () => {
		setupTest()
			.command(['network-identifier', '--community-identifier=Lisk'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error');
	});

	describe('network-identifier --nethash=123 --community-identifier=Lisk', () => {
		setupTest()
			.command([
				'network-identifier',
				'--nethash=123',
				'--community-identifier=Lisk',
			])
			.it('should show networkIdentifier', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					networkIdentifier,
				);
			});
	});
});
