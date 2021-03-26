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

import { convertLSKToBeddows, signTransaction } from '@liskhq/lisk-transactions';
import { testing } from 'lisk-framework';

const schema = {
	$id: 'lisk/transfer-asset',
	title: 'Transfer transaction asset',
	type: 'object',
	required: ['amount', 'recipientAddress', 'data'],
	properties: {
		amount: {
			dataType: 'uint64',
			fieldNumber: 1,
		},
		recipientAddress: {
			dataType: 'bytes',
			fieldNumber: 2,
			minLength: 20,
			maxLength: 20,
		},
		data: {
			dataType: 'string',
			fieldNumber: 3,
			minLength: 0,
			maxLength: 64,
		},
	},
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createTransferTransaction = ({
	amount,
	fee,
	recipientAddress,
	nonce,
	networkIdentifier,
}: {
	amount: string;
	fee: string;
	recipientAddress: string;
	nonce: number;
	networkIdentifier: Buffer;
}) => {
	const genesisAccount = testing.fixtures.defaultFaucetAccount;
	const transaction = signTransaction(
		schema,
		{
			moduleID: 2,
			assetID: 0,
			nonce: BigInt(nonce),
			fee: BigInt(convertLSKToBeddows(fee)),
			senderPublicKey: genesisAccount.publicKey,
			asset: {
				amount: BigInt(convertLSKToBeddows(amount)),
				recipientAddress: Buffer.from(recipientAddress, 'hex'),
				data: '',
			},
		},
		networkIdentifier,
		genesisAccount.passphrase,
	) as any;

	return {
		...transaction,
		id: transaction.id.toString('hex'),
		senderPublicKey: transaction.senderPublicKey.toString('hex'),
		signatures: transaction.signatures.map((s: Buffer) => s.toString('hex')),
		asset: {
			...transaction.asset,
			amount: transaction.asset.amount.toString(),
			recipientAddress: transaction.asset.recipientAddress.toString('hex'),
		},
		nonce: transaction.nonce.toString(),
		fee: transaction.fee.toString(),
	};
};
