/*
 * Copyright © 2023 Lisk Foundation
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
 */

import { codec } from '@liskhq/lisk-codec';
import { utils } from '@liskhq/lisk-cryptography';
import {
	CHAIN_REGISTRATION_FEE,
	CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
	EMPTY_BYTES,
	MIN_RETURN_FEE_PER_BYTE_LSK,
	MODULE_NAME_INTEROPERABILITY,
} from '../../../../../src/modules/interoperability/constants';
import { MainchainInteroperabilityEndpoint } from '../../../../../src/modules/interoperability/mainchain/endpoint';
import {
	CROSS_CHAIN_COMMAND_NAME_TRANSFER,
	ModuleEndpointContext,
	CCMsg,
} from '../../../../../src';
import {
	CCM_STATUS_OK,
	USER_SUBSTORE_INITIALIZATION_FEE,
} from '../../../../../src/modules/token/constants';
import { crossChainTransferMessageParams } from '../../../../../src/modules/token/schemas';
import {
	createTransientModuleEndpointContext,
	InMemoryPrefixedStateDB,
} from '../../../../../src/testing';
import { PrefixedStateReadWriter } from '../../../../../src/state_machine/prefixed_state_read_writer';
import { getCCMSize } from '../../../../../src/modules/interoperability/utils';

describe('MainchainInteroperabilityEndpoint', () => {
	let context: ModuleEndpointContext;
	let endpoint: MainchainInteroperabilityEndpoint;

	const storesMock = {};
	const offchainStoresMock = {};
	const defaultAddress = utils.getRandomBytes(20);
	const defaultAmount = BigInt(100000000);

	beforeEach(() => {
		const stateStore = new PrefixedStateReadWriter(new InMemoryPrefixedStateDB());

		endpoint = new MainchainInteroperabilityEndpoint(storesMock as any, offchainStoresMock as any);
		context = createTransientModuleEndpointContext({
			stateStore,
		});
	});

	describe('getRegistrationFee', () => {
		it('should return the registration fee', () => {
			const result = endpoint.getRegistrationFee();

			expect(result).toEqual({ fee: CHAIN_REGISTRATION_FEE.toString() });
		});
	});

	describe('getMinimumMessageFee', () => {
		let ccm: CCMsg;
		beforeEach(async () => {
			ccm = {
				nonce: BigInt(0),
				module: MODULE_NAME_INTEROPERABILITY,
				crossChainCommand: CROSS_CHAIN_COMMAND_NAME_REGISTRATION,
				sendingChainID: utils.intToBuffer(2, 4),
				receivingChainID: utils.intToBuffer(3, 4),
				fee: BigInt(20000),
				status: 0,
				params: EMPTY_BYTES,
			};
		});
		describe('CROSS_CHAIN_COMMAND_NAME_TRANSFER', () => {
			beforeEach(() => {
				ccm = {
					crossChainCommand: CROSS_CHAIN_COMMAND_NAME_TRANSFER,
					module: 'token',
					nonce: BigInt(1),
					sendingChainID: Buffer.from([3, 0, 0, 0]),
					receivingChainID: Buffer.from([0, 0, 0, 1]),
					fee: BigInt(30000),
					status: CCM_STATUS_OK,
					params: codec.encode(crossChainTransferMessageParams, {
						tokenID: Buffer.from([1, 0, 0, 0, 0, 0, 0, 0]),
						amount: defaultAmount,
						senderAddress: defaultAddress,
						recipientAddress: defaultAddress,
						data: 'ddd',
					}),
				};
			});

			it('should calculate minimum message fee with extra fee when user initialization needed', () => {
				context.params = {
					ccm,
					isUserInitialized: false,
				};

				const result = endpoint.getMinimumMessageFee(context);

				expect(result).toEqual({
					fee: (
						getCCMSize(ccm) * MIN_RETURN_FEE_PER_BYTE_LSK +
						USER_SUBSTORE_INITIALIZATION_FEE
					).toString(),
				});
			});

			it('should calculate minimum message fee with extra fee when user initialization NOT needed', () => {
				context.params = {
					ccm,
					isUserInitialized: true,
				};

				const result = endpoint.getMinimumMessageFee(context);

				expect(result).toEqual({ fee: (getCCMSize(ccm) * MIN_RETURN_FEE_PER_BYTE_LSK).toString() });
			});
		});

		it('should calculate minimum message fee according to ccm size', async () => {
			context.params = { ccm };

			const result = endpoint.getMinimumMessageFee(context);

			expect(result).toEqual({ fee: (getCCMSize(ccm) * MIN_RETURN_FEE_PER_BYTE_LSK).toString() });
		});
	});
});
