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
import * as sandbox from 'sinon';
import { expect, test } from '@oclif/test';
import * as config from '../../src/utils/config';
import * as printUtils from '../../src/utils/print';

describe('network-identifier command', () => {
	const networkIdentifier = {
		networkIdentifier: '8EetDbmdyMMqEEwrX8UW/skK9+Zbl5A0qzibQI/Ixrk=',
	};

	const printMethodStub = sandbox.stub();

	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stdout();

	describe('network-identifier', () => {
		setupTest()
			.command(['network-identifier'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('network-identifier --community-identifier=LiskDiamond', () => {
		setupTest()
			.command(['network-identifier', '--community-identifier=LiskDiamond'])
			.catch(error => {
				return expect(error.message).to.contain('Missing 1 required arg');
			})
			.it('should throw an error');
	});

	describe('network-identifier 123', () => {
		setupTest()
			.command(['network-identifier', '123'])
			.it('should show networkIdentifier', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					networkIdentifier,
				);
			});
	});
});
