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
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({ api: apiConfig }))
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub));

	describe('block:get', () => {
		setupTest()
			.stdout()
			.command(['block:get'])
			.catch((error: Error) =>
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
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['block:get', blockId])
			.it('should get block info and display as an object', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(queryHandler.query).to.be.calledWithExactly(
					apiClientStub,
					endpoint,
					[
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
					],
				);
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
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['block:get', blockIds.join(',')])
			.it('should get blocks info and display as an array', () => {
				expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
				expect(queryHandler.query).to.be.calledWithExactly(
					apiClientStub,
					endpoint,
					[
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
					],
				);
				return expect(printMethodStub).to.be.calledWithExactly(queryResult);
			});

		setupTest()
			.stdout()
			.stub(queryHandler, 'query', sandbox.stub().resolves(queryResult))
			.command(['block:get', blockIdsWithEmpty.join(',')])
			.it(
				'should get blocks info only using non-empty args and display as an array',
				() => {
					expect(apiUtils.getAPIClient).to.be.calledWithExactly(apiConfig);
					expect(queryHandler.query).to.be.calledWithExactly(
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
