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

describe('delegate:get', () => {
	const endpoint = 'delegates';
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

	describe('delegate:get', () => {
		setupTest()
			.stdout()
			.command(['delegate:get'])
			.catch(error =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error when arg is not provided');
	});

	describe('delegate:get delegate', () => {
		const username = 'genesis_5';
		const queryResult = [
			{
				username,
				vote: 1000000,
			},
		];

		setupTest()
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['delegate:get', username])
			.it('should get an delegate info and display as an object', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						query: {
							limit: 1,
							username,
						},
						placeholder: {
							username,
							message: 'Delegate not found.',
						},
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});

	describe('delegate:get delegates', () => {
		const usernames = ['genesis_5', 'genesis_6'];
		const usernamesWithEmpty = ['genesis_4', ''];
		const queryResult = [
			{
				username: usernames[0],
				vote: 1000000,
			},
			{
				username: usernames[1],
				vote: 2000000,
			},
		];

		setupTest()
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['delegate:get', usernames.join(',')])
			.it('should get delegates info and display as an array', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						query: {
							username: usernames[0],
							limit: 1,
						},
						placeholder: {
							username: usernames[0],
							message: 'Delegate not found.',
						},
					},
					{
						query: {
							username: usernames[1],
							limit: 1,
						},
						placeholder: {
							username: usernames[1],
							message: 'Delegate not found.',
						},
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});

		setupTest()
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['delegate:get', usernamesWithEmpty.join(',')])
			.it(
				'should get delegates info only using non-empty args and display as an array',
				() => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									username: usernamesWithEmpty[0],
									limit: 1,
								},
								placeholder: {
									username: usernamesWithEmpty[0],
									message: 'Delegate not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				},
			);
	});
});
