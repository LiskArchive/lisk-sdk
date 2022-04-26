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

import { getAddressFromPublicKey } from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BaseModule, ModuleInitArgs } from '../base_module';
import { defaultConfig, MODULE_ID_FEE } from './constants';
import { BaseFee, TokenAPI } from './types';
import {
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../node/state_machine';
import { FeeAPI } from './api';
import { FeeEndpoint } from './endpoint';
import { configSchema } from './schemas';

export class FeeModule extends BaseModule {
	public id = MODULE_ID_FEE;
	public name = 'fee';
	public api = new FeeAPI(this.id);
	public configSchema = configSchema;
	public endpoint = new FeeEndpoint(this.id);
	private _tokenAPI!: TokenAPI;
	private _minFeePerByte!: number;
	private _baseFees!: Array<BaseFee>;
	private _tokenID!: Buffer;

	public addDependencies(tokenAPI: TokenAPI) {
		this._tokenAPI = tokenAPI;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const { genesisConfig, moduleConfig } = args;
		const config = objects.mergeDeep({}, defaultConfig, moduleConfig);
		const errors = validator.validate(configSchema, config);
		if (errors.length) {
			throw new LiskValidationError(errors);
		}
		this._tokenID = Buffer.from(config.feeTokenID, 'hex');
		this._minFeePerByte = genesisConfig.minFeePerByte;
		this._baseFees = genesisConfig.baseFees.map(fee => ({ ...fee, baseFee: BigInt(fee.baseFee) }));
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyTransaction(context: TransactionVerifyContext): Promise<VerificationResult> {
		const { transaction } = context;
		const minFee =
			BigInt(this._minFeePerByte * transaction.getBytes().length) +
			this._extraFee(transaction.moduleID, transaction.commandID);

		if (transaction.fee < minFee) {
			return {
				status: VerifyStatus.FAIL,
				error: new Error(`Insufficient transaction fee. Minimum required fee is ${minFee}.`),
			};
		}

		return { status: VerifyStatus.OK };
	}

	public async beforeCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const minFee =
			BigInt(this._minFeePerByte * context.transaction.getBytes().length) +
			this._extraFee(context.transaction.moduleID, context.transaction.commandID);
		const senderAddress = getAddressFromPublicKey(context.transaction.senderPublicKey);
		const apiContext = context.getAPIContext();

		const isNative = await this._tokenAPI.isNative(apiContext, this._tokenID);
		if (isNative) {
			await this._tokenAPI.burn(apiContext, senderAddress, this._tokenID, minFee);
			await this._tokenAPI.transfer(
				apiContext,
				senderAddress,
				context.header.generatorAddress,
				this._tokenID,
				context.transaction.fee - minFee,
			);

			return;
		}

		await this._tokenAPI.transfer(
			apiContext,
			senderAddress,
			context.header.generatorAddress,
			this._tokenID,
			context.transaction.fee,
		);
	}

	private _extraFee(moduleID: number, commandID: number): bigint {
		const foundFee = this._baseFees.find(
			fee => fee.moduleID === moduleID && fee.commandID === commandID,
		);

		return foundFee?.baseFee ?? BigInt(0);
	}
}
