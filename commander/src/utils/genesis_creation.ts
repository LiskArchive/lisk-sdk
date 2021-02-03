/*
 * LiskHQ/lisk-commander
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
import { Account } from '@liskhq/lisk-chain';
import { createGenesisBlock, getGenesisBlockJSON, accountAssetSchemas } from '@liskhq/lisk-genesis';
import { RegisteredSchema } from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import * as cryptography from '@liskhq/lisk-cryptography';
import { createMnemonicPassphrase } from './mnemonic';

interface generateGenesisBlockInput {
	readonly schema: RegisteredSchema;
	readonly defaultAccount: Record<string, unknown>;
	readonly numOfAccounts: number;
	readonly numOfValidators: number;
	readonly tokenDistribution: number;
}

interface generateGenesisBlockOutput {
	readonly genesisBlock: Record<string, unknown>;
	readonly accountList: AccountInfo[];
	readonly delegateList: {
		readonly password: string;
		readonly address: string;
		readonly passphrase: string;
		readonly username: string;
	}[];
}

interface AccountInfo {
	readonly address: string;
	readonly passphrase: string;
}
const createAccount = (): AccountInfo => {
	const passphrase = createMnemonicPassphrase();
	const address = cryptography.getAddressFromPassphrase(passphrase).toString('hex');
	return {
		passphrase,
		address,
	};
};

const prepareNormalAccounts = (
	data: {
		address: string;
	}[],
	tokenBalance: number,
): Account[] =>
	data.map(acc => ({
		address: Buffer.from(acc.address, 'hex'),
		token: { balance: BigInt(tokenBalance) },
	}));

const prepareValidatorAccounts = (
	data: {
		username: string;
		address: string;
	}[],
	tokenBalance: number,
): Account[] =>
	data.map(acc => ({
		address: Buffer.from(acc.address, 'hex'),
		token: { balance: BigInt(tokenBalance) },
		dpos: {
			delegate: {
				username: acc.username,
			},
		},
	}));

export const generateGenesisBlock = ({
	defaultAccount,
	numOfAccounts = 10,
	numOfValidators = 103,
	schema,
	tokenDistribution = 10000000,
}: generateGenesisBlockInput): generateGenesisBlockOutput => {
	const accountSchemas = schema.account.properties;
	const defaultAccountAssetSchema = Object.fromEntries(
		Object.entries(defaultAccount).map(([k, v]) => [k, { default: v }]),
	);
	const accountSchemasWithDefaults = objects.mergeDeep(
		{},
		accountSchemas,
		defaultAccountAssetSchema,
	);
	const accountList = new Array(numOfAccounts).fill(0).map(_x => createAccount());
	const delegateList = new Array(numOfValidators).fill(0).map((_x, index) => ({
		...{ username: `delegate_${index}` },
		...createAccount(),
		...{ password: createMnemonicPassphrase() },
	}));
	const validAccounts = prepareNormalAccounts(accountList, tokenDistribution);
	const validDelegateAccounts = prepareValidatorAccounts(delegateList, tokenDistribution);

	const updatedGenesisBlock = createGenesisBlock({
		initDelegates: validDelegateAccounts.map(a => a.address),
		accounts: [...validAccounts, ...validDelegateAccounts] as Account[],
		accountAssetSchemas: accountSchemasWithDefaults as accountAssetSchemas,
	});
	const genesisBlock = getGenesisBlockJSON({
		genesisBlock: updatedGenesisBlock,
		accountAssetSchemas: accountSchemasWithDefaults as accountAssetSchemas,
	});

	return {
		genesisBlock,
		delegateList,
		accountList,
	};
};
