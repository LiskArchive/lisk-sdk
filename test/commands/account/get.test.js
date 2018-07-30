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
import { expect, test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as api from '../../../src/utils/api';
import * as query from '../../../src/utils/query';

describe('account:get command', () => {
	const endpoint = 'accounts';
	const apiConfig = {
		nodes: ['http://local.host'],
		network: 'main',
	};
	const printMethodStub = sandbox.stub();
	const apiClientStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(print, 'default', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stub(api, 'default', sandbox.stub().returns(apiClientStub));

	describe('account:get', () => {
		setupTest()
			.stdout()
			.command(['account:get'])
			.catch(error =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error when arg is not provided');
	});

	describe('account:get account', () => {
		const address = '3520445367460290306L';
		const queryResult = [
			{
				address,
				name: 'i am owner',
			},
		];

		setupTest()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.stdout()
			.command(['account:get', address])
			.it('should get an account info and display as an object', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						limit: 1,
						address,
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});

	describe('account:get accounts', () => {
		const addresses = ['3520445367460290306L', '2802325248134221536L'];
		const queryResult = [
			{
				address: addresses[0],
				name: 'i am owner',
			},
			{
				address: addresses[1],
				name: 'some name',
			},
		];

		setupTest()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.stdout()
			.command(['account:get', addresses.join(',')])
			.it('should get accounts info and display as an array', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						limit: 1,
						address: addresses[0],
					},
					{
						limit: 1,
						address: addresses[1],
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});
});
