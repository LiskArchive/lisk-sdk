import * as cryptography from '@liskhq/lisk-cryptography';
import { Account, TransactionJSON } from '../transaction_types';

export const validateMultisignatures = (
	sender: Account,
	transaction: TransactionJSON,
	transactionHash: Buffer,
): ReadonlyArray<string> => {
	const minimumValidations = sender.multimin || 0;
	const transactionSignatures = transaction.signatures as ReadonlyArray<string>;
	const senderPublicKeys = sender.multisignatures || [];
	// tslint:disable-next-line no-let
	let validatedSignaturesCount = 0;
	// tslint:disable-next-line no-let
	let checkedPublicKeys: ReadonlyArray<string> = [];

	const unvalidatedSignatures = senderPublicKeys.reduce(
		(
			signaturesArray: ReadonlyArray<string>,
			publicKey: string,
		): ReadonlyArray<string> => {
			if (checkedPublicKeys.includes(publicKey)) {
				return signaturesArray;
			}

			return [
				...signaturesArray,
				...transactionSignatures.reduce(
					(
						collectedSignatures: ReadonlyArray<string>,
						signature: string,
					): ReadonlyArray<string> => {
						if (
							cryptography.verifyData(transactionHash, signature, publicKey)
						) {
							checkedPublicKeys = [publicKey, ...checkedPublicKeys];
							validatedSignaturesCount++;

							return collectedSignatures;
						}

						return [signature, ...collectedSignatures];
					},
					[],
				),
			];
		},
		[],
	);

	return validatedSignaturesCount >= minimumValidations
		? []
		: [...new Set(unvalidatedSignatures)];
};
