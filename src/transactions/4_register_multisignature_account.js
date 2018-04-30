/*
 * Copyright © 2018 Lisk Foundation
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
import { MULTISIGNATURE_FEE } from './constants';
import {
	prependPlusToPublicKeys,
	validateKeysgroup,
	wrapTransactionCreator,
} from './utils';

const registerMultisignatureAccount = ({ keysgroup, lifetime, minimum }) => {
	validateKeysgroup(keysgroup);

	const plusPrependedKeysgroup = prependPlusToPublicKeys(keysgroup);
	const keygroupFees = plusPrependedKeysgroup.length + 1;

	return {
		type: 4,
		fee: (MULTISIGNATURE_FEE * keygroupFees).toString(),
		asset: {
			multisignature: {
				min: minimum,
				lifetime,
				keysgroup: plusPrependedKeysgroup,
			},
		},
	};
};

export default wrapTransactionCreator(registerMultisignatureAccount);
