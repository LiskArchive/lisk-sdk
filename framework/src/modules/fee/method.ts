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
			this._deductFeeFromKey(
				methodContext,
				CONTEXT_STORE_KEY_AVAILABLE_CCM_FEE,
				amount,
				'Cross-chain message ran out of fee.',
			);
			return;
		}
		this._deductFeeFromKey(
			methodContext,
			CONTEXT_STORE_KEY_AVAILABLE_FEE,
			amount,
			'Transaction ran out of fee.',
		);
	}

	private _deductFeeFromKey(
		methodContext: MethodContext,
		key: string,
		amount: bigint,
		outOfFeeMsg: string,
	) {
		const availableFee = getContextStoreBigInt(methodContext.contextStore, key);
		if (availableFee < amount) {
			this.events.get(InsufficientFeeEvent).error(methodContext);
			methodContext.contextStore.delete(key);
			throw new Error(outOfFeeMsg);
		}
		methodContext.contextStore.set(key, availableFee - amount);
	}
}
