/*
 * Copyright © 2017 Lisk Foundation
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
import { TRANSFER_FEE, DATA_FEE } from '../constants';
import {
	getAddressAndPublicKeyFromRecipientData,
	wrapTransactionCreator,
} from './utils';

const createAsset = data => {
	if (data && data.length > 0) {
		if (data !== data.toString('utf8'))
			throw new Error(
				'Invalid encoding in transaction data. Data must be utf-8 encoded.',
			);
		return { data };
	}
	return {};
};

const transfer = ({ amount, recipientId, recipientPublicKey, data }) => {
	const { address, publicKey } = getAddressAndPublicKeyFromRecipientData({
		recipientId,
		recipientPublicKey,
	});
	const fee = data ? TRANSFER_FEE + DATA_FEE : TRANSFER_FEE;

	const transaction = {
		type: 0,
		amount: amount.toString(),
		fee: fee.toString(),
		recipientId: address,
		recipientPublicKey: publicKey,
		asset: createAsset(data),
	};

	return transaction;
};

export default wrapTransactionCreator(transfer);
