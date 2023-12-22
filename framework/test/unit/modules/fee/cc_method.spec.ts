/*
 * Copyright © 2021 Lisk Foundation
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

import { utils } from '@liskhq/lisk-cryptography';
import { Modules } from '../../../../src';
import { FeeInteroperableMethod } from '../../../../src/modules/fee/cc_method';
import { CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE } from '../../../../src/modules/fee/constants';
import { createCrossChainMessageContext } from '../../../../src/testing';
import { CrossChainMessageContext } from '../../../../src/modules/interoperability/types';
import { RelayerFeeProcessedEvent } from '../../../../src/modules/fee/events/relayer_fee_processed';

describe('FeeInteroperableMethod', () => {
	const feeModule = new Modules.Fee.FeeModule();
	const ccm = {
		module: 'token',
		crossChainCommand: 'crossChainTransfer',
		fee: BigInt(1000000),
		nonce: BigInt(2),
		params: Buffer.alloc(0),
		receivingChainID: utils.getRandomBytes(4),
		sendingChainID: utils.getRandomBytes(4),
		status: 1,
	};
	const messageFeeTokenID = Buffer.from('0000000000000002', 'hex');
	const feePoolAddress = utils.getRandomBytes(20);

	let feeMethod: FeeInteroperableMethod;
	let context: CrossChainMessageContext;

	beforeEach(() => {
		feeMethod = new FeeInteroperableMethod(feeModule.stores, feeModule.events, feeModule.name);
		feeMethod.init({ feePoolAddress } as any);
		feeMethod.addDependencies(
			{
				getMessageFeeTokenID: jest.fn().mockResolvedValue(messageFeeTokenID),
				getMessageFeeTokenIDFromCCM: jest.fn().mockResolvedValue(messageFeeTokenID),
			},
			{
				burn: jest.fn(),
				getAvailableBalance: jest.fn(),
				lock: jest.fn(),
				transfer: jest.fn(),
				unlock: jest.fn(),
				userSubstoreExists: jest.fn(),
			},
		);
		context = createCrossChainMessageContext({
			ccm,
		});
	});

	describe('beforeCrossChainCommandExecute', () => {
		beforeEach(async () => {
			await feeMethod.beforeCrossChainCommandExecute(context);
		});

		it('should lock ccm fee from sender', () => {
			expect(feeMethod['_tokenMethod'].lock).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule.name,
				messageFeeTokenID,
				ccm.fee,
			);
		});

		it('should set ccm fee to as availableCCMFee', () => {
			expect(context.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE)).toEqual(ccm.fee);
		});
	});

	describe('afterCrossChainCommandExecute', () => {
		const availableFee = BigInt(100);

		beforeEach(async () => {
			jest.spyOn(feeMethod['events'].get(RelayerFeeProcessedEvent), 'log');
			context.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE, availableFee);
		});

		it('should unlock ccm fee from sender', async () => {
			await feeMethod.afterCrossChainCommandExecute(context);

			expect(feeMethod['_tokenMethod'].unlock).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feeModule.name,
				messageFeeTokenID,
				ccm.fee,
			);
		});

		it('should transfer the used fee to fee pool address if it exists and is initialized for the cross-chain message fee token', async () => {
			feeMethod['_tokenMethod'].userSubstoreExists = jest.fn().mockResolvedValue(true);
			await feeMethod.afterCrossChainCommandExecute(context);

			expect(feeMethod['_tokenMethod'].transfer).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				feePoolAddress,
				messageFeeTokenID,
				ccm.fee - availableFee,
			);
		});

		it('should burn the used fee', async () => {
			feeMethod['_tokenMethod'].userSubstoreExists = jest.fn().mockResolvedValue(false);
			await feeMethod.afterCrossChainCommandExecute(context);

			expect(feeMethod['_tokenMethod'].burn).toHaveBeenCalledWith(
				expect.anything(),
				context.transaction.senderAddress,
				messageFeeTokenID,
				ccm.fee - availableFee,
			);
		});

		it('should log event', async () => {
			await feeMethod.afterCrossChainCommandExecute(context);

			expect(context.eventQueue.getEvents()).toHaveLength(1);
			expect(feeMethod['events'].get(RelayerFeeProcessedEvent).log).toHaveBeenCalledWith(
				expect.anything(),
				{
					burntAmount: ccm.fee - availableFee,
					relayerAddress: context.transaction.senderAddress,
					relayerAmount: availableFee,
					ccmID: expect.any(Buffer),
				},
			);
		});

		it('should reset the context store', async () => {
			await feeMethod.afterCrossChainCommandExecute(context);

			expect(context.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE)).toBeUndefined();
		});
	});
});
