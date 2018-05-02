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
import APIClientModule from 'lisk-api-client';
import * as constantsModule from 'lisk-constants';
import cryptographyModule from 'lisk-cryptography';
import passphraseModule from 'lisk-passphrase';
import transactionModule from 'lisk-transactions';

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
