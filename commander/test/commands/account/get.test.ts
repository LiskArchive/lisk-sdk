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
import * as config from '../../../src/utils/config';
import * as printUtils from '../../../src/utils/print';
import * as apiUtils from '../../../src/utils/api';
import * as queryHandler from '../../../src/utils/query';

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
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub));

	describe('account:get', () => {
		setupTest()
			.stdout()
			.command(['account:get'])
			.catch((error: Error) =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error when arg is not provided');
	});

	describe('account:get address', () => {
		const address = '3520445367460290306L';
		const queryResult = [
			{
				address,
				name: 'i am owner',
			},
		];

		setupTest()
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.stdout()
			.command(['account:get', address])
			.it('should get an account info and display as an object', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(queryHandler.query).to.be.calledWithExactly(
					apiClientStub,
					endpoint,
					[
						{
							query: {
								limit: 1,
								address,
							},
							placeholder: {
								address,
								message: 'Address not found.',
							},
						},
					],
				);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});

	describe('account:get addresses', () => {
		const addresses = ['3520445367460290306L', '2802325248134221536L'];
		const addressesWithEmpty = ['3520445367460290306L', ''];
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
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.stdout()
			.command(['account:get', addresses.join(',')])
			.it('should get accounts info and display as an array', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(queryHandler.query).to.be.calledWithExactly(
					apiClientStub,
					endpoint,
					[
						{
							query: {
								limit: 1,
								address: addresses[0],
							},
							placeholder: {
								address: addresses[0],
								message: 'Address not found.',
							},
						},
						{
							query: {
								limit: 1,
								address: addresses[1],
							},
							placeholder: {
								address: addresses[1],
								message: 'Address not found.',
							},
						},
					],
				);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});

		setupTest()
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.stdout()
			.command(['account:get', addressesWithEmpty.join(',')])
			.it(
				'should get accounts info only using non-empty args and display as an array',
				() => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									limit: 1,
									address: addressesWithEmpty[0],
								},
								placeholder: {
									address: addressesWithEmpty[0],
									message: 'Address not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				},
			);
	});
});
