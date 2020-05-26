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
 *
 */
import {
	isValidFee,
	isValidNonce,
	validateNetworkIdentifier,
} from '@liskhq/lisk-validator';

import { ProofOfMisbehaviorTransaction } from './15_proof_of_misbehavior_transaction';
import { BlockHeaderJSON, TransactionJSON } from './types';
import { createBaseTransaction } from './utils';

export interface ReportMisbehaviorInputs {
	readonly fee: string;
	readonly nonce: string;
	readonly networkIdentifier: string;
	readonly senderPublicKey?: string;
	readonly passphrase?: string;
	readonly header1: BlockHeaderJSON;
	readonly header2: BlockHeaderJSON;
}

const validateInputs = ({
	networkIdentifier,
	fee,
	nonce,
	header1,
	header2,
}: ReportMisbehaviorInputs): void => {
	if (!isValidNonce(nonce)) {
		throw new Error('Nonce must be a valid number in string format.');
	}

	if (!isValidFee(fee)) {
		throw new Error('Fee must be a valid number in string format.');
	}

	validateNetworkIdentifier(networkIdentifier);

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!header1) {
		throw new Error('Header 1 is required for poof of misbehavior');
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (!header2) {
		throw new Error('Header 2 is required for poof of misbehavior');
	}
};

export const reportMisbehavior = (
	inputs: ReportMisbehaviorInputs,
): Partial<TransactionJSON> => {
	validateInputs(inputs);
	const { passphrase, networkIdentifier, header1, header2 } = inputs;

	const transaction = {
		...createBaseTransaction(inputs),
		type: 15,
		asset: {
			header1,
			header2,
		},
	};

	if (!passphrase) {
		return transaction;
	}

	const transactionWithSenderInfo = {
		...transaction,
		senderPublicKey: transaction.senderPublicKey as string,
		asset: {
			...transaction.asset,
		},
	};

	const pomTransaction = new ProofOfMisbehaviorTransaction(
		transactionWithSenderInfo,
	);

	pomTransaction.sign(networkIdentifier, passphrase);

	const { errors } = pomTransaction.validate();
	if (errors.length > 0) {
		throw new Error(errors.toString());
	}

	return pomTransaction.toJSON();
};
