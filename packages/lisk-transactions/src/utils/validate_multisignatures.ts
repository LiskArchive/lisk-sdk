import * as cryptography from '@liskhq/lisk-cryptography';
import { Account, TransactionJSON } from '../transaction_types';

export const validateMultisignatures = (
	sender: Account,
	transaction: TransactionJSON,
	transactionHash: Buffer,
): boolean => {
	const minimumValidations = sender.multimin || 0;
	const transactionSignatures = transaction.signatures as ReadonlyArray<string>;
	const keyGroup = sender.multisignatures || [];
	// tslint:disable-next-line no-let
	let validatedSignaturesCount = 0;
	keyGroup.forEach(key => {
		transactionSignatures.forEach(signature => {
			if (cryptography.verifyData(transactionHash, signature, key)) {
				validatedSignaturesCount++;
			}
		});
	});

	return validatedSignaturesCount >= minimumValidations ? true : false;
};
