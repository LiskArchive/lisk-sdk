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

import { getContextStoreBigInt, getContextStoreBool, MethodContext } from '../../state_machine';
import { BaseMethod } from '../base_method';
import { CONTEXT_STORE_KEY_CCM_PROCESSING } from '../interoperability/constants';
import { CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE, CONTEXT_STORE_KEY_AVAILABLE_FEE } from './constants';
import { InsufficientFeeEvent } from './events/insufficient_fee';
import { ModuleConfig } from './types';

export class FeeMethod extends BaseMethod {
	private _config!: ModuleConfig;

	public init(config: ModuleConfig) {
		this._config = config;
	}

	public getFeeTokenID(): Buffer {
		return this._config.feeTokenID;
	}

	public payFee(methodContext: MethodContext, amount: bigint): void {
		const isCCMProcessing = getContextStoreBool(
			methodContext.contextStore,
			CONTEXT_STORE_KEY_CCM_PROCESSING,
		);
		if (isCCMProcessing) {
			const availableFee = getContextStoreBigInt(
				methodContext.contextStore,
				CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE,
			);
			if (availableFee < amount) {
				this.events.get(InsufficientFeeEvent).error(methodContext);
				methodContext.contextStore.delete(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE);
				throw new Error('Cross-chain message ran out of fee.');
			}
			methodContext.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE, availableFee - amount);
			return;
		}
		const availableFee = getContextStoreBigInt(
			methodContext.contextStore,
			CONTEXT_STORE_KEY_AVAILABLE_FEE,
		);
		if (availableFee < amount) {
			this.events.get(InsufficientFeeEvent).error(methodContext);
			methodContext.contextStore.delete(CONTEXT_STORE_KEY_AVAILABLE_FEE);
			throw new Error('Transaction ran out of fee.');
		}
		methodContext.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_FEE, availableFee - amount);
	}
}
