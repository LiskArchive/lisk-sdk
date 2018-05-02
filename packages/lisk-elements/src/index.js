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
import APIClientModule from 'lisk-api-client/src';
import * as constantsModule from 'lisk-constants/src';
import cryptographyModule from 'lisk-cryptography/src';
import passphraseModule from 'lisk-passphrase/src';
import transactionModule from 'lisk-transactions/src';

export const APIClient = APIClientModule;
export const constants = constantsModule;
export const cryptography = cryptographyModule;
export const passphrase = passphraseModule;
export const transaction = transactionModule;

export default {
	APIClient,
	cryptography,
	passphrase,
	transaction,
	constants,
};
