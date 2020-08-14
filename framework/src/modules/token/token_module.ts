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
	AfterBlockApplyInput,
	AfterGenesisBlockApplyInput,
	StateStore,
	TransactionApplyInput,
} from '../../types';

export class TokenModule extends BaseModule {
	public name = 'token';
	public type = 2;
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
	public transactionAssets = [new TransferAsset()];
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
	};

	private readonly _minRemainingBalance = this.config.minRemainingBalance as bigint;

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/require-await
	public async beforeTransactionApply({ transaction }: TransactionApplyInput): Promise<void> {
		// Throw error if fee is lower than minimum fee (minFeePerBytes + baseFee)
		const minFee = BigInt(this.config.minFeePerByte) * BigInt(transaction.getBytes().length);
		const baseFee =
			this.config.baseFees.find(
				fee => fee.moduleType === transaction.moduleType && fee.assetType === transaction.assetType,
			)?.baseFee ?? BigInt(0);
		if (BigInt(baseFee) < minFee) {
			throw new Error(
				`Insufficient transaction fee. Minimum required fee is: ${minFee.toString()}`,
			);
		}
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/require-await
	public async afterTransactionApply({
		transaction,
		stateStore,
	}: TransactionApplyInput): Promise<void> {
		// Verify sender has minimum remaining balance
		const senderAddress = transaction.senderPublicKey;
		const sender = await stateStore.account.getOrDefault<TokenAccount>(senderAddress);
		if (sender.token.balance < this._minRemainingBalance) {
			throw new Error(
				`Account does not have enough minimum remaining balance: ${sender.address.toString(
					'base64',
				)}. Current balance is: ${
					sender.token.balance
				}. Required minimum balance is: ${this._minRemainingBalance.toString()}.`,
			);
		}
	}

	// eslint-disable-next-line class-methods-use-this, @typescript-eslint/require-await
	public async afterBlockApply({ block, stateStore }: AfterBlockApplyInput): Promise<void> {
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
		// This is necessary only for genesis block case, where total fee is 0, which is invalid
		// Also, genesis block cannot be reverted
		generator.token.balance += givenFee > 0 ? givenFee : BigInt(0);
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
	}: AfterGenesisBlockApplyInput<TokenAccount>): Promise<void> {
		// Validate genesis accounts balance
		const accountAddresses = [];
		let totalBalance = BigInt(0);
		for (const account of genesisBlock.header.asset.accounts) {
			accountAddresses.push(account.address);
			totalBalance += BigInt(account.token.balance);
		}

		if (totalBalance > GENESIS_BLOCK_MAX_BALANCE) {
			throw new Error('Total balance exceeds the limit (2^63)-1');
		}
	}
}
