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

describe.only('network-identifier command', () => {
	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(
				config,
				'getConfig',
				sandbox.stub().returns({ api: { network: 'test' } }),
			)
			.stub(NetworkIdentifierCommand, 'run', sandbox.stub());

	describe.only('network-identifier', () => {
		setupTest()
			.command(['network-identifier'])
			.catch(error => {
				return expect(error.message).to.contain('Missing required flag');
			})
			.it('should throw an error when nethash is not provided');
	});

	describe('network-identifier --nethash=Lisk', () => {
		setupTest()
			.command(['network-identifier --nethash=Lisk'])
			.catch(error => {
				return expect(error.message).to.contain(
					'command network-identifier --nethash=Lisk not found',
				);
			})
			.it('should throw an error when community-identifier is not provided');
	});

	describe('network-identifier --community-identifier=123', () => {
		setupTest()
			.command(['network-identifier --community-identifier=123'])
			.catch(error => {
				return expect(error.message).to.contain(
					'command network-identifier --community-identifier=123 not found',
				);
			})
			.it('should throw an error when nethash is not provided');
	});

	describe('network-identifier --nethash=Lisk --community-identifier=123', () => {
		setupTest()
			.command(['network-identifier --nethash=Lisk --community-identifier=123'])
			.it(
				'should call network-identifier with flag --nethash=Lisk and --community-identifier=123',
				() => {
					return expect(NetworkIdentifierCommand.run).to.be.calledWithExactly(
						[],
					);
				},
			);
	});
});
