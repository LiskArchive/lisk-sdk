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
import { Account } from '../base_asset';
import { NonceOutOfBoundsError } from '../../errors';
import { InvalidNonceError } from './errors';

interface SequenceAccount {
	readonly sequence: {
		nonce: bigint;
	};
}

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
			nonce: BigInt(0),
		},
	};

	// eslint-disable-next-line class-methods-use-this
	public async beforeTransactionApply({ tx, stateStore }: TransactionApplyInput): Promise<void> {
		const senderAddress = getAddressFromPublicKey(tx.senderPublicKey);
		const senderAccount = await stateStore.account.get<Account<SequenceAccount>>(senderAddress);

		// Throw error when tx nonce is lower than the account nonce
		if (tx.nonce < senderAccount.sequence.nonce) {
			throw new InvalidNonceError(
				`Transaction with id:${tx.id.toString()} nonce is lower than account nonce`,
				tx.nonce,
				senderAccount.sequence.nonce,
			);
		}
	}

	// eslint-disable-next-line class-methods-use-this
	public async afterTransactionApply({ tx, stateStore }: TransactionApplyInput): Promise<void> {
		const senderAddress = getAddressFromPublicKey(tx.senderPublicKey);
		const senderAccount = await stateStore.account.get<Account<SequenceAccount>>(senderAddress);

		// Throw error when tx nonce is not equal to account nonce
		if (tx.nonce !== senderAccount.sequence.nonce) {
			throw new NonceOutOfBoundsError(
				`Transaction with id:${tx.id.toString()} nonce is not equal to account nonce`,
				tx.nonce,
				senderAccount.sequence.nonce,
			);
		}

		// Increment nonce of account when tx is valid
		senderAccount.sequence.nonce += BigInt(1);

		// Update sender account nonce
		stateStore.account.set(senderAddress, senderAccount);
	}
}
