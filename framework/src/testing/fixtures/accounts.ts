/*
 * Copyright © 2021 Lisk Foundation
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
import { Account, AccountDefaultProps, getAccountSchemaWithDefault } from '@liskhq/lisk-chain';
import { getRandomBytes } from '@liskhq/lisk-cryptography';
import { objects } from '@liskhq/lisk-utils';

import { ModuleClass, PartialAccount } from '../types';
import { getAccountSchemaFromModules } from '../utils';
import { defaultConfig, defaultPassword } from './config';

export const defaultFaucetAccount = {
	address: Buffer.from('d04699e57c4a3846c988f3c15306796f8eae5c1c', 'hex'),
	publicKey: Buffer.from('0fe9a3f1a21b5530f27f87a414b549e79a940bf24fdf2b2f05e7f22aeeecc86a', 'hex'),
	passphrase: 'peanut hundred pen hawk invite exclude brain chunk gadget wait wrong ready',
	balance: '10000000000000000',
	encryptedPassphrase:
		'iterations=10&cipherText=6541c04d7a46eacd666c07fbf030fef32c5db324466e3422e59818317ac5d15cfffb80c5f1e2589eaa6da4f8d611a94cba92eee86722fc0a4015a37cff43a5a699601121fbfec11ea022&iv=141edfe6da3a9917a42004be&salt=f523bba8316c45246c6ffa848b806188&tag=4ffb5c753d4a1dc96364c4a54865521a&version=1',
	password: defaultPassword,
};

export const defaultAccounts = <T>(): PartialAccount<T>[] =>
	defaultConfig.forging.delegates.map(
		account => ({ address: Buffer.from(account.address, 'hex') } as PartialAccount<T>),
	);

export const createDefaultAccount = <T = AccountDefaultProps>(
	modules: ModuleClass[] = [],
	data: Record<string, unknown> = {},
): Account<T> => {
	const { default: defaultAccountData } = getAccountSchemaWithDefault(
		getAccountSchemaFromModules(modules),
	);

	const account = objects.mergeDeep({}, defaultAccountData, data) as Account<T>;
	account.address = account.address ?? getRandomBytes(20);

	return objects.cloneDeep(account);
};
