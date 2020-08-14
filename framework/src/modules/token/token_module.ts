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
			if (account.token.balance < this.config.minRemainingBalance) {
				throw new Error(
					`Remaining balance must be greater than ${(this.config
						.minRemainingBalance as bigint).toString()}`,
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
			if (account.token.balance < this.config.minRemainingBalance) {
				throw new Error(
					`Remaining balance must be greater than ${(this.config
						.minRemainingBalance as bigint).toString()}`,
				);
			}
			stateStore.account.set(address, account);
		},
	};

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

	public async afterTransactionApply({
		transaction,
		stateStore,
	}: TransactionApplyInput): Promise<void> {
		// Verify sender has minimum remaining balance
		const senderAddress = transaction.senderPublicKey;
		const sender = await stateStore.account.getOrDefault<TokenAccount>(senderAddress);
		if (sender.token.balance < this.config.minRemainingBalance) {
			throw new Error(
				`Account does not have enough minimum remaining balance: ${sender.address.toString(
					'base64',
				)}. Current balance is: ${sender.token.balance}. Required minimum balance is: ${(this.config
					.minRemainingBalance as bigint).toString()}.`,
			);
		}
	}
}
