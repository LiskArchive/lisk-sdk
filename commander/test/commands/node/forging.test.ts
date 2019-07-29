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
import * as inputUtils from '../../../src/utils/input';

describe('node:forging', () => {
	const defaultInputs = {
		password: '123',
	};
	const defaultPublicKey =
		'479b0fdb56199a211062203fa5c431bafe6a0a628661fc58f30f3105f2b17332';

	const defaultAPIResponse = {
		data: {
			publicKey: defaultPublicKey,
			forging: true,
		},
	};

	const printMethodStub = sandbox.stub();
	const apiClientStub = {
		node: {
			updateForgingStatus: sandbox.stub().resolves(defaultAPIResponse),
		},
	};
	const setupTest = () =>
		test
			.stub(printUtils, 'print', sandbox.stub().returns(printMethodStub))
			.stub(config, 'getConfig', sandbox.stub().returns({}))
			.stub(apiUtils, 'getAPIClient', sandbox.stub().returns(apiClientStub))
			.stub(
				inputUtils,
				'getInputsFromSources',
				sandbox.stub().resolves(defaultInputs),
			)
			.stdout();

	describe('node:forging', () => {
		setupTest()
			.command(['node:forging'])
			.catch((error: Error) => {
				return expect(error.message).to.contain('Missing 2 required arg');
			})
			.it('should throw an error');
	});

	describe('node:forging status', () => {
		setupTest()
			.command(['node:forging', 'disable'])
			.catch((error: Error) =>
				expect(error.message).to.contain('Missing 1 required arg'),
			)
			.it('should throw an error without public key');

		setupTest()
			.command(['node:forging', 'wrong'])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Expected wrong to be one of: enable, disable',
				);
			})
			.it('should throw an error when status is not enable or disable');
	});

	describe('node:forging status publicKey', () => {
		setupTest()
			.command([
				'node:forging',
				'enable',
				'479b0fdb56199a211062203fa5c431bafe6a0a628661fc58f30fxxxxxxxxxxxx',
			])
			.catch((error: Error) => {
				return expect(error.message).to.contain(
					'Argument must be a valid hex string.',
				);
			})
			.it('should throw an error with invalid public key');

		setupTest()
			.command(['node:forging', 'enable', defaultPublicKey])
			.it(
				'should update the forging status of the node with the public key',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						password: {
							source: undefined,
						},
					});
					expect(
						apiClientStub.node.updateForgingStatus,
					).to.be.calledWithExactly({
						password: defaultInputs.password,
						publicKey: defaultPublicKey,
						forging: true,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultAPIResponse.data,
					);
				},
			);
	});

	describe('node:forging status publicKey --password=pass:123', () => {
		setupTest()
			.command([
				'node:forging',
				'disable',
				defaultPublicKey,
				'--password=pass:123',
			])
			.it(
				'should disable the forging status of the node with the public key and the password from the flag',
				() => {
					expect(inputUtils.getInputsFromSources).to.be.calledWithExactly({
						password: {
							source: 'pass:123',
						},
					});
					expect(
						apiClientStub.node.updateForgingStatus,
					).to.be.calledWithExactly({
						password: defaultInputs.password,
						publicKey: defaultPublicKey,
						forging: false,
					});
					return expect(printMethodStub).to.be.calledWithExactly(
						defaultAPIResponse.data,
					);
				},
			);
	});
});
