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

import { objects } from '@liskhq/lisk-utils';
import { validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleInitArgs, ModuleMetadata } from '../base_module';
import { defaultConfig } from './constants';
import { ModuleConfig, TokenMethod } from './types';
import {
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../state_machine';
import { FeeMethod } from './method';
import { FeeEndpoint } from './endpoint';
import { configSchema } from './schemas';

export class FeeModule extends BaseModule {
	public method = new FeeMethod(this.stores, this.events);
	public configSchema = configSchema;
	public endpoint = new FeeEndpoint(this.stores, this.offchainStores);
	private _tokenMethod!: TokenMethod;
	private _minFeePerByte!: number;
	private _tokenID!: Buffer;

	public addDependencies(tokenMethod: TokenMethod) {
		this._tokenMethod = tokenMethod;
	}

	public metadata(): ModuleMetadata {
		return {
			endpoints: [],
			commands: [],
			events: [],
			assets: [],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		validator.validate<ModuleConfig>(configSchema, config);

		this._tokenID = Buffer.from(config.feeTokenID, 'hex');
		this._minFeePerByte = config.minFeePerByte;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyTransaction(context: TransactionVerifyContext): Promise<VerificationResult> {
		const { getMethodContext, transaction } = context;
		const minFee = BigInt(this._minFeePerByte * transaction.getBytes().length);

		if (transaction.fee < minFee) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Insufficient transaction fee. Minimum required fee is ${minFee}.`),
			};
		}

		const balance = await this._tokenMethod.getAvailableBalance(
			getMethodContext(),
			transaction.senderAddress,
			this._tokenID,
		);
		if (transaction.fee > balance) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error('Insufficient balance.'),
			};
		}

		return { status: VerifyStatus.OK };
	}

	public async beforeCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const {
			header: { generatorAddress },
			transaction: { senderAddress },
		} = context;
		const minFee = BigInt(this._minFeePerByte * context.transaction.getBytes().length);
		const methodContext = context.getMethodContext();

		const isNative = await this._tokenMethod.isNative(methodContext, this._tokenID);
		if (isNative) {
			await this._tokenMethod.burn(methodContext, senderAddress, this._tokenID, minFee);
			await this._tokenMethod.transfer(
				methodContext,
				senderAddress,
				generatorAddress,
				this._tokenID,
				context.transaction.fee - minFee,
			);

			return;
		}

		await this._tokenMethod.transfer(
			methodContext,
			senderAddress,
			generatorAddress,
			this._tokenID,
			context.transaction.fee,
		);
	}
}
