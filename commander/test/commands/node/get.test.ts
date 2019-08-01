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

describe('node:get', () => {
	const defaultGetConstantsResponse = {
		data: {
			version: '1.0.0',
		},
	};
	const defaultGetStatusResponse = {
		data: {
			height: 3,
		},
	};
	const defaultForgingStatusResponse = {
		data: [
			{
				publicKey:
					'2ca9a7143fc721fdc540fef893b27e8d648d2288efa61e56264edf01a2c23079',
				forging: true,
			},
		],
	};

	const apiClientStub = {
		node: {
			getConstants: sandbox.stub().resolves(defaultGetConstantsResponse),
			getStatus: sandbox.stub().resolves(defaultGetStatusResponse),
			getForgingStatus: sandbox.stub().resolves(defaultForgingStatusResponse),
		},
	};

	const printMethodStub = sandbox.stub();
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stdout();

	describe('node:get', () => {
		setupTest()
			.stub(
				apiClientStub.node,
				'getConstants',
				sandbox.stub().rejects(new Error('getConstants failed')),
			)
			.command(['node:get'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('getConstants failed');
			})
			.it('should throw error when getConstants fails');

		setupTest()
			.stub(
				apiClientStub.node,
				'getStatus',
				sandbox.stub().rejects(new Error('getStatus failed')),
			)
			.command(['node:get'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('getStatus failed');
			})
			.it('should throw error when getStatus fails');

		setupTest()
			.command(['node:get'])
			.it('should get the node status without forging status', () => {
				expect(apiClientStub.node.getForgingStatus).not.to.be.called;
				return expect(printMethodStub).to.be.calledWithExactly(
					Object.assign(
						{},
						defaultGetConstantsResponse.data,
						defaultGetStatusResponse.data,
					),
				);
			});
	});

	describe('node:get --forging-status', () => {
		const errorMessage = 'Error 403: Unauthorized';
		setupTest()
			.stub(
				apiClientStub.node,
				'getForgingStatus',
				sandbox.stub().rejects(new Error(errorMessage)),
			)
			.command(['node:get', '--forging-status'])
			.it('should get the node status with forging status error', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					Object.assign(
						{},
						defaultGetConstantsResponse.data,
						defaultGetStatusResponse.data,
						{
							forgingStatus: errorMessage,
						},
					),
				);
			});

		setupTest()
			.stub(apiClientStub.node, 'getForgingStatus', sandbox.stub().resolves({}))
			.command(['node:get', '--forging-status'])
			.it('should get the node status and empty forging status', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					Object.assign(
						{},
						defaultGetConstantsResponse.data,
						defaultGetStatusResponse.data,
						{
							forgingStatus: [],
						},
					),
				);
			});

		setupTest()
			.command(['node:get', '--forging-status'])
			.it('should get the node status and forging status', () => {
				return expect(printMethodStub).to.be.calledWithExactly(
					Object.assign(
						{},
						defaultGetConstantsResponse.data,
						defaultGetStatusResponse.data,
						{
							forgingStatus: defaultForgingStatusResponse.data,
						},
					),
				);
			});
	});
});
