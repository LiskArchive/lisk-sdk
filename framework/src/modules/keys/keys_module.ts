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

import { AccountKeyAsset } from './types';
import {
	isMultisignatureAccount,
	validateSignature,
	verifyMultiSignatureTransaction,
} from './utils';
import { BaseModule, TransactionApplyInput } from '../base_module';

export class KeysModule extends BaseModule {
	public name = 'keys';
	public type = 4;
	public accountSchema = {
		type: 'object',
		properties: {
			numberOfSignatures: { dataType: 'uint32', fieldNumber: 1 },
			mandatoryKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 2,
			},
			optionalKeys: {
				type: 'array',
				items: { dataType: 'bytes' },
				fieldNumber: 3,
			},
		},
		default: {
			mandatoryKeys: [],
			optionalKeys: [],
			numberOfSignatures: 0,
		},
	};

	// eslint-disable-next-line class-methods-use-this
	public async beforeTransactionApply({
		stateStore,
		tx: { getSigningBytes, id, senderID, senderPublicKey, signatures },
	}: TransactionApplyInput): Promise<void> {
		const sender = await stateStore.account.get<AccountKeyAsset>(senderID);
		const { networkIdentifier } = stateStore.chain;
		const transactionBytes = getSigningBytes();

		const transactionWithNetworkIdentifierBytes = Buffer.concat([
			networkIdentifier,
			transactionBytes,
		]);

		if (!isMultisignatureAccount(sender)) {
			validateSignature(senderPublicKey, signatures[0], transactionWithNetworkIdentifierBytes, id);
			return;
		}

		verifyMultiSignatureTransaction(id, sender, signatures, transactionWithNetworkIdentifierBytes);
	}
}
