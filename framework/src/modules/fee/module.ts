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
import { address } from '@liskhq/lisk-cryptography';
import { ModuleInitArgs, ModuleMetadata } from '../base_module';
import { CONTEXT_STORE_KEY_AVAILABLE_FEE, defaultConfig } from './constants';
import { InteroperabilityMethod, ModuleConfigJSON, TokenMethod } from './types';
import {
	getContextStoreBigInt,
	TransactionExecuteContext,
	TransactionVerifyContext,
	VerificationResult,
	VerifyStatus,
} from '../../state_machine';
import { FeeMethod } from './method';
import { FeeEndpoint } from './endpoint';
import {
	configSchema,
	getFeeTokenIDResponseSchema,
	getMinFeePerByteResponseSchema,
} from './schemas';
import { GeneratorFeeProcessedEvent } from './events/generator_fee_processed';
import { RelayerFeeProcessedEvent } from './events/relayer_fee_processed';
import { InsufficientFeeEvent } from './events/insufficient_fee';
import { FeeInteroperableMethod } from './cc_method';
import { BaseInteroperableModule } from '../interoperability/base_interoperable_module';

export class FeeModule extends BaseInteroperableModule {
	public method = new FeeMethod(this.stores, this.events);
	public crossChainMethod = new FeeInteroperableMethod(this.stores, this.events, this.name);
	public configSchema = configSchema;
	public endpoint = new FeeEndpoint(this.stores, this.offchainStores);
	private _tokenMethod!: TokenMethod;
	private _minFeePerByte!: number;
	private _tokenID!: Buffer;
	private _feePoolAddress?: Buffer;

	public constructor() {
		super();
		this.events.register(GeneratorFeeProcessedEvent, new GeneratorFeeProcessedEvent(this.name));
		this.events.register(RelayerFeeProcessedEvent, new RelayerFeeProcessedEvent(this.name));
		this.events.register(InsufficientFeeEvent, new InsufficientFeeEvent(this.name));
	}

	public addDependencies(tokenMethod: TokenMethod, interopMethod: InteroperabilityMethod) {
		this._tokenMethod = tokenMethod;
		this.crossChainMethod.addDependencies(interopMethod, tokenMethod);
	}

	public metadata(): ModuleMetadata {
		return {
			...this.baseMetadata(),
			endpoints: [
				{
					name: this.endpoint.getMinFeePerByte.name,
					response: getMinFeePerByteResponseSchema,
				},
				{
					name: this.endpoint.getFeeTokenID.name,
					response: getFeeTokenIDResponseSchema,
				},
			],
		};
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async init(args: ModuleInitArgs): Promise<void> {
		const defaultFeeTokenID = `${args.genesisConfig.chainID}${Buffer.alloc(4).toString('hex')}`;
		const config = objects.mergeDeep(
			{},
			{ ...defaultConfig, feeTokenID: defaultFeeTokenID },
			args.moduleConfig,
		);
		validator.validate<ModuleConfigJSON>(configSchema, config);

		const moduleConfig = {
			...config,
			feeTokenID: Buffer.from(config.feeTokenID, 'hex'),
			feePoolAddress: config.feePoolAddress
				? address.getAddressFromLisk32Address(config.feePoolAddress)
				: undefined,
		};
		this.method.init(moduleConfig);
		this.endpoint.init(moduleConfig);

		this._tokenID = moduleConfig.feeTokenID;
		this._minFeePerByte = moduleConfig.minFeePerByte;
		this._feePoolAddress = moduleConfig.feePoolAddress;
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async verifyTransaction(context: TransactionVerifyContext): Promise<VerificationResult> {
		const { getMethodContext, transaction } = context;
		const minFee = BigInt(this._minFeePerByte) * BigInt(transaction.getBytes().length);

		if (transaction.fee < minFee) {
			throw new Error(`Insufficient transaction fee. Minimum required fee is ${minFee}.`);
		}

		const balance = await this._tokenMethod.getAvailableBalance(
			getMethodContext(),
			transaction.senderAddress,
			this._tokenID,
		);
		if (transaction.fee > balance) {
			throw new Error(`Insufficient balance.`);
		}

		return { status: VerifyStatus.OK };
	}

	public async beforeCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const { transaction } = context;
		const methodContext = context.getMethodContext();
		// The Token module beforeCrossChainCommandExecute needs to be called first
		// to ensure that the relayer has enough funds
		await this._tokenMethod.lock(
			methodContext,
			transaction.senderAddress,
			this.name,
			this._tokenID,
			transaction.fee,
		);
		const minFee = BigInt(this._minFeePerByte * context.transaction.getBytes().length);

		context.contextStore.set(CONTEXT_STORE_KEY_AVAILABLE_FEE, transaction.fee - minFee);
	}

	public async afterCommandExecute(context: TransactionExecuteContext): Promise<void> {
		const { header, transaction } = context;
		await this._tokenMethod.unlock(
			context.getMethodContext(),
			transaction.senderAddress,
			this.name,
			this._tokenID,
			transaction.fee,
		);
		const availableFee = getContextStoreBigInt(
			context.contextStore,
			CONTEXT_STORE_KEY_AVAILABLE_FEE,
		);
		const minFee = transaction.fee - availableFee;
		if (this._feePoolAddress) {
			await this._tokenMethod.transfer(
				context.getMethodContext(),
				transaction.senderAddress,
				this._feePoolAddress,
				this._tokenID,
				minFee,
			);
		} else {
			await this._tokenMethod.burn(
				context.getMethodContext(),
				transaction.senderAddress,
				this._tokenID,
				minFee,
			);
		}

		await this._tokenMethod.transfer(
			context.getMethodContext(),
			transaction.senderAddress,
			header.generatorAddress,
			this._tokenID,
			availableFee,
		);

		this.events.get(GeneratorFeeProcessedEvent).log(context, {
			burntAmount: transaction.fee - availableFee,
			generatorAddress: header.generatorAddress,
			generatorAmount: availableFee,
			senderAddress: transaction.senderAddress,
		});
		context.contextStore.delete(CONTEXT_STORE_KEY_AVAILABLE_FEE);
	}
}
