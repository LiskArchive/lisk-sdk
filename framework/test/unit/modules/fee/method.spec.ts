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
import { createMethodContext, MethodContext } from '../../../../src/state_machine/method_context';
import { FeeMethod, FeeModule } from '../../../../src';
import { ModuleConfig } from '../../../../src/modules/fee/types';
import {
	CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE,
	CONTEXT_STORE_KEY_AVAILABLE_FEE,
	defaultConfig,
} from '../../../../src/modules/fee/constants';
import { InMemoryPrefixedStateDB } from '../../../../src/testing';
import { CONTEXT_STORE_KEY_CCM_PROCESSING } from '../../../../src/modules/interoperability/constants';
import { EventQueue } from '../../../../src/state_machine';
import { PrefixedStateReadWriter } from '../../../../src/state_machine/prefixed_state_read_writer';

describe('FeeMethod', () => {
	const fee = new FeeModule();
	const config: ModuleConfig = {
		...defaultConfig,
		feeTokenID: Buffer.from('1000000000000002', 'hex'),
		minFeePerByte: 1234,
	};

	let feeMethod: FeeMethod;
	let methodContext: MethodContext;

	beforeEach(() => {
		feeMethod = new FeeMethod(fee.stores, fee.events);
		feeMethod.init(config);
		methodContext = createMethodContext({
			contextStore: new Map(),
			eventQueue: new EventQueue(0, [], [utils.getRandomBytes(32)]),
			stateStore: new PrefixedStateReadWriter(new InMemoryPrefixedStateDB()),
		});
	});

	describe('getFeeTokenID', () => {
		it('should return feeTokenID', () => {
			expect(feeMethod.getFeeTokenID()).toEqual(config.feeTokenID);
		});
	});

	describe('payFee', () => {
		const availableAmount = BigInt(10000);
		beforeEach(() => {
			methodContext.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE, availableAmount);
			methodContext.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_FEE, availableAmount);
		});

		it('should fail and log event when ccm is processing and ccm available fee is less than amount', () => {
			methodContext.contextStore.set(CONTEXT_STORE_KEY_CCM_PROCESSING, true);
			expect(() => feeMethod.payFee(methodContext, availableAmount + BigInt(1))).toThrow(
				'Cross-chain message ran out of fee',
			);
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
		});

		it('should deduct amount from ccm available fee when ccm is processing and transaction available fee is sufficient for amount', () => {
			methodContext.contextStore.set(CONTEXT_STORE_KEY_CCM_PROCESSING, true);
			expect(() => feeMethod.payFee(methodContext, availableAmount - BigInt(1))).not.toThrow();
			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
			expect(methodContext.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE)).toEqual(
				BigInt(1),
			);
		});

		it('should fail and log event when ccm is not processing and transaction available fee is less than amount', () => {
			expect(() => feeMethod.payFee(methodContext, availableAmount + BigInt(1))).toThrow(
				'Transaction ran out of fee',
			);
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
		});

		it('should deduct amount from available fee when ccm is not processing and available fee is sufficient for amount', () => {
			expect(() => feeMethod.payFee(methodContext, availableAmount - BigInt(1))).not.toThrow();
			expect(methodContext.eventQueue.getEvents()).toHaveLength(0);
			expect(methodContext.contextStore.get(CONTEXT_STORE_KEY_AVAILABLE_FEE)).toEqual(BigInt(1));
		});

		it('should fail and log event when ccmProcessing is false and transaction available fee is less than amount', () => {
			methodContext.contextStore.set(CONTEXT_STORE_KEY_CCM_PROCESSING, false);
			expect(() => feeMethod.payFee(methodContext, availableAmount + BigInt(1))).toThrow(
				'Transaction ran out of fee',
			);
			expect(methodContext.eventQueue.getEvents()).toHaveLength(1);
		});
	});
});
