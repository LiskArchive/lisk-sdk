/*
 * Copyright © 2019 Lisk Foundation
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
import { codec, GenericObject } from '@liskhq/lisk-codec';
import { BaseTransaction } from '@liskhq/lisk-transactions';
import { hash } from '@liskhq/lisk-cryptography';

export interface RegisteredTransactions {
	readonly [key: string]: typeof BaseTransaction;
}

export class TransactionInterfaceAdapter {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	private readonly _transactionClassMap: Map<number, any>;

	public constructor(registeredTransactions: RegisteredTransactions = {}) {
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		this._transactionClassMap = new Map();
		codec.addSchema(BaseTransaction.BASE_SCHEMA);
		Object.keys(registeredTransactions).forEach(transactionType => {
			const transaction = registeredTransactions[transactionType];
			this._transactionClassMap.set(
				Number(transactionType),
				transaction,
			);
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const { ASSET_SCHEMA } = this._transactionClassMap.get(Number(transactionType));
			codec.addSchema(ASSET_SCHEMA);
		});
	}

	// First encode message asset and then encode base message
	// eslint-disable-next-line class-methods-use-this
	public encode(message: BaseTransaction): Buffer {
		return message.getBytes();
	}

	// First decode base message and then decode asset
	public decode(binaryMessage: Buffer): BaseTransaction {
		const baseMessage = codec.decode<BaseTransaction>(BaseTransaction.BASE_SCHEMA, binaryMessage);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const TransactionClass = this._transactionClassMap.get(baseMessage.type);

		if (!TransactionClass) {
			throw new Error('Transaction type not found.');
		}
		// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
		const assetMessage = codec.decode<BaseTransaction>(TransactionClass.ASSET_SCHEMA, baseMessage.asset as Buffer);
		const message = { ...baseMessage, asset: assetMessage };

		const id = hash(binaryMessage)
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return,@typescript-eslint/no-unsafe-call
		return new TransactionClass({ ...message, id });
	}
}
