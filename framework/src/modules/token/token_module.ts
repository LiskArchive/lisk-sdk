/*
 * Copyright © 2020 Lisk Foundation
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
import { CHAIN_STATE_BURNT_FEE, GENESIS_BLOCK_MAX_BALANCE } from './constants';
import { TransferAsset } from './transfer_asset';
import { TokenAccount } from './types';
import { getTotalFees } from './utils';
import { BaseModule } from '../base_module';
import {
	AfterBlockApplyContext,
	AfterGenesisBlockApplyContext,
	StateStore,
	TransactionApplyContext,
	GenesisConfig,
} from '../../types';

export class TokenModule extends BaseModule {
	public name = 'token';
	public id = 2;
	public accountSchema = {
		type: 'object',
		properties: {
			balance: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	};
	public reducers = {
		credit: async (params: Record<string, unknown>, stateStore: StateStore): Promise<void> => {
			const { address, amount } = params;
			if (!Buffer.isBuffer(address)) {
				throw new Error('Address must be a buffer');
			}
			if (typeof amount !== 'bigint') {
				throw new Error('Amount must be a bigint');
			}
			const account = await stateStore.account.getOrDefault<TokenAccount>(address);
			account.token.balance += amount;
			if (account.token.balance < this._minRemainingBalance) {
				throw new Error(
					`Remaining balance must be greater than ${this._minRemainingBalance.toString()}`,
				);
			}
			stateStore.account.set(address, account);
		},
		debit: async (params: Record<string, unknown>, stateStore: StateStore): Promise<void> => {
			const { address, amount } = params;
			if (!Buffer.isBuffer(address)) {
				throw new Error('Address must be a buffer');
			}
			if (typeof amount !== 'bigint') {
				throw new Error('Amount must be a bigint');
			}
			const account = await stateStore.account.getOrDefault<TokenAccount>(address);
			account.token.balance -= amount;
			if (account.token.balance < this._minRemainingBalance) {
				throw new Error(
					`Remaining balance must be greater than ${this._minRemainingBalance.toString()}`,
				);
			}
			stateStore.account.set(address, account);
		},
		getBalance: async (
			params: Record<string, unknown>,
			stateStore: StateStore,
		): Promise<bigint> => {
			const { address } = params;
			if (!Buffer.isBuffer(address)) {
				throw new Error('Address must be a buffer');
			}
			const account = await stateStore.account.getOrDefault<TokenAccount>(address);
			return account.token.balance;
		},
	};

	private readonly _minRemainingBalance: bigint;

	public constructor(genesisConfig: GenesisConfig) {
		super(genesisConfig);
		const { minRemainingBalance } = this.config;
		if (typeof minRemainingBalance !== 'string') {
			throw new Error('minRemainingBalance in genesisConfig must be a string.');
		}
		this._minRemainingBalance = BigInt(minRemainingBalance);
		this.transactionAssets = [new TransferAsset(this._minRemainingBalance)];
	}

	// eslint-disable-next-line @typescript-eslint/require-await
	public async beforeTransactionApply({
		transaction,
		stateStore,
	}: TransactionApplyContext): Promise<void> {
		// Check if transaction fee is lower than the minimum required fee (minFeePerBytes + baseFee)
		const minFee = BigInt(this.config.minFeePerByte) * BigInt(transaction.getBytes().length);
		const baseFee =
			this.config.baseFees.find(
				fee => fee.moduleID === transaction.moduleID && fee.assetID === transaction.assetID,
			)?.baseFee ?? BigInt(0);
		const minimumRequiredFee = minFee + BigInt(baseFee);
		if (transaction.fee < minimumRequiredFee) {
			throw new Error(
				`Insufficient transaction fee. Minimum required fee is: ${minimumRequiredFee.toString()}`,
			);
		}

		// Deduct transaction fee from sender balance
		const senderAddress = transaction.senderID;
		const sender = await stateStore.account.getOrDefault<TokenAccount>(senderAddress);
		sender.token.balance -= transaction.fee;
		stateStore.account.set(senderAddress, sender);
	}

	public async afterTransactionApply({
		transaction,
		stateStore,
	}: TransactionApplyContext): Promise<void> {
		// Verify sender has minimum remaining balance
		const senderAddress = transaction.senderID;
		const sender = await stateStore.account.getOrDefault<TokenAccount>(senderAddress);
		if (sender.token.balance < this._minRemainingBalance) {
			throw new Error(
				`Account does not have enough minimum remaining balance: ${sender.address.toString(
					'hex',
				)}. Current balance is: ${
					sender.token.balance
				}. Required minimum balance is: ${this._minRemainingBalance.toString()}.`,
			);
		}
	}

	public async afterBlockApply({ block, stateStore }: AfterBlockApplyContext): Promise<void> {
		// Credit reward and fee to generator
		const generatorAddress = getAddressFromPublicKey(block.header.generatorPublicKey);
		const generator = await stateStore.account.get<TokenAccount>(generatorAddress);
		generator.token.balance += block.header.reward;
		// If there is no transactions, no need to give fee
		if (!block.payload.length) {
			stateStore.account.set(generatorAddress, generator);

			return;
		}
		const { totalFee, totalMinFee } = getTotalFees(
			block,
			BigInt(this.config.minFeePerByte),
			this.config.baseFees,
		);
		// Generator only gets total fee - min fee
		const givenFee = totalFee - totalMinFee;
		generator.token.balance += givenFee;
		const totalFeeBurntBuffer = await stateStore.chain.get(CHAIN_STATE_BURNT_FEE);
		let totalFeeBurnt = totalFeeBurntBuffer ? totalFeeBurntBuffer.readBigInt64BE() : BigInt(0);
		totalFeeBurnt += givenFee > 0 ? totalMinFee : BigInt(0);
		// Update state store
		const updatedTotalBurntBuffer = Buffer.alloc(8);
		updatedTotalBurntBuffer.writeBigInt64BE(totalFeeBurnt);
		stateStore.account.set(generatorAddress, generator);
		stateStore.chain.set(CHAIN_STATE_BURNT_FEE, updatedTotalBurntBuffer);
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/require-await
	public async afterGenesisBlockApply({
		genesisBlock,
	}: AfterGenesisBlockApplyContext<TokenAccount>): Promise<void> {
		// Validate genesis accounts balance
		let totalBalance = BigInt(0);
		for (const account of genesisBlock.header.asset.accounts) {
			totalBalance += BigInt(account.token.balance);
		}

		if (totalBalance > GENESIS_BLOCK_MAX_BALANCE) {
			throw new Error('Total balance exceeds the limit (2^63)-1');
		}
	}
}
