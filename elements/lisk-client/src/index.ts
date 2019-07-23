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
import { APIClient as APIClientModule } from '@liskhq/lisk-api-client';
import * as constantsModule from '@liskhq/lisk-constants';
import * as cryptographyModule from '@liskhq/lisk-cryptography';
import * as passphraseModule from '@liskhq/lisk-passphrase';
import * as transactionModule from '@liskhq/lisk-transactions';

// tslint:disable-next-line variable-name
export const APIClient = APIClientModule;
export const constants = constantsModule;
export const cryptography = cryptographyModule;
export const passphrase = passphraseModule;
export const transaction = transactionModule;

// tslint:disable-next-line no-default-export
export default {
	APIClient,
	constants,
	cryptography,
	passphrase,
	transaction,
};
