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

import { BaseModule, TransactionApplyInput } from '../base_module';
import { SequenceModuleError } from '../../errors';

export class SequenceModule extends BaseModule {
	public name = 'sequence';
	public type = 3;
	public accountSchema = {
		type: 'object',
		properties: {
			nonce: {
				fieldNumber: 1,
				dataType: 'uint64',
			},
		},
		default: {
			balance: BigInt(0),
		},
	};

	public async beforeTransactionApply(input: TransactionApplyInput): Promise<void> {
		const { tx, stateStore } = input;
		const senderAddress = getAddressFromPublicKey(tx.senderPublicKey);
		const senderAccount = await stateStore.account.getOrDefault(senderAddress);

		// Throw error when tx nonce is lower than the account nonce
		if (tx.nonce < senderAccount.nonce) {
			throw new SequenceModuleError(
				`Incompatible transaction nonce for account: ${senderAccount.address.toString(
					'base64',
				)}, Tx Nonce: ${tx.nonce.toString()}, Account Nonce: ${senderAccount.nonce.toString()}`,
				this.name,
				tx.id,
				'.nonce',
				tx.nonce.toString(),
				senderAccount.nonce.toString(),
			);
		}
	}

	public async afterTransactionApply(input: TransactionApplyInput): Promise<void> {
		const { tx, stateStore } = input;
		const senderAddress = getAddressFromPublicKey(tx.senderPublicKey);
		const senderAccount = await stateStore.account.getOrDefault(senderAddress);

		// Throw error when tx nonce is not equal to account nonce
		if (tx.nonce !== senderAccount.nonce) {
			throw new SequenceModuleError(
				`Incompatible transaction nonce for account: ${senderAccount.address.toString(
					'base64',
				)}, Tx Nonce: ${tx.nonce.toString()}, Account Nonce: ${senderAccount.nonce.toString()}`,
				this.name,
				tx.id,
				'.nonce',
				tx.nonce.toString(),
				senderAccount.nonce.toString(),
			);
		}

		// Increment nonce of account when tx is valid
		senderAccount.nonce += BigInt(1);

		// Update sender accounts nonce
		stateStore.account.set(senderAddress, senderAccount);
	}
}
