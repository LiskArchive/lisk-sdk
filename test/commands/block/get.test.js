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
import { test } from '@oclif/test';
import * as config from '../../../src/utils/config';
import * as print from '../../../src/utils/print';
import * as api from '../../../src/utils/api';
import * as query from '../../../src/utils/query';

describe('block:get', () => {
	const endpoint = 'blocks';
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

	describe('block:get', () => {
		setupTest()
			.stdout()
			.command(['block:get'])
			.catch(error =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error when arg is not provided');
	});

	describe('block:get blockId', () => {
		const blockId = '9249767683252385637';
		const queryResult = {
			id: blockId,
			height: 1,
		};

		setupTest()
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['block:get', blockId])
			.it('should get block info and display as an object', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						query: {
							limit: 1,
							blockId,
						},
						placeholder: {
							id: blockId,
							message: 'Block not found.',
						},
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});
	});

	describe('block:get blockIds', () => {
		const blockIds = ['9249767683252385637', '12690684816503689985'];
		const blockIdsWithEmpty = ['9249767683252385637', ''];
		const queryResult = [
			{
				id: blockIds[0],
				height: 3,
			},
			{
				id: blockIds[1],
				height: 4,
			},
		];

		setupTest()
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['block:get', blockIds.join(',')])
			.it('should get blocks info and display as an array', () => {
				expect(api.default).to.be.calledWithExactly(apiConfig);
				expect(query.default).to.be.calledWithExactly(apiClientStub, endpoint, [
					{
						query: {
							limit: 1,
							blockId: blockIds[0],
						},
						placeholder: {
							id: blockIds[0],
							message: 'Block not found.',
						},
					},
					{
						query: {
							limit: 1,
							blockId: blockIds[1],
						},
						placeholder: {
							id: blockIds[1],
							message: 'Block not found.',
						},
					},
				]);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});

		setupTest()
			.stdout()
			.stub(query, 'default', sandbox.stub().resolves(queryResult))
			.command(['block:get', blockIdsWithEmpty.join(',')])
			.it(
				'should get blocks info only using non-empty args and display as an array',
				() => {
					expect(api.default).to.be.calledWithExactly(apiConfig);
					expect(query.default).to.be.calledWithExactly(
						apiClientStub,
						endpoint,
						[
							{
								query: {
									limit: 1,
									blockId: blockIdsWithEmpty[0],
								},
								placeholder: {
									id: blockIdsWithEmpty[0],
									message: 'Block not found.',
								},
							},
						],
					);
					return expect(printMethodStub).to.be.calledWithExactly(queryResult);
				},
			);
	});
});
