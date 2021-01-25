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
import { getAddressFromPassphrase } from '@liskhq/lisk-cryptography';
import { createGenesisBlock, getGenesisBlockJSON, accountAssetSchemas } from '@liskhq/lisk-genesis';
import { Account } from '@liskhq/lisk-chain';
import { Application, PartialApplicationConfig } from 'lisk-framework';
import { Command, flags as flagParser } from '@oclif/command';
import fs from 'fs-extra';
import { join, resolve } from 'path';
import inquirer from 'inquirer';
import { createMnemonicPassphrase } from '../../utils/mnemonic';
import { defaultGenesis } from '../../utils/genesis';
import { defaultConfig } from '../../utils/config';

interface AccountInfo {
	readonly address: string;
	readonly passphrase: string;
}

const createAccount = (): AccountInfo => {
	const passphrase = createMnemonicPassphrase();
	const address = getAddressFromPassphrase(passphrase).toString('hex');

	return {
		passphrase,
		address,
	};
};

export abstract class BaseGenesisBlockCommand extends Command {
	static description = 'Creates genesis block file.';
	static examples = [
		'generate:genesis-block --output mydir',
		'generate:genesis-block --output mydir --accounts 10',
		'generate:genesis-block --output mydir --accounts 10 --validators 103',
		'generate:genesis-block --output mydir --accounts 10 --validators 103 --token-distribution 500',
	];

	static flags = {
		output: flagParser.string({
			char: 'o',
			description: 'Output folder path of the generated genesis block',
			default: '',
		}),
		accounts: flagParser.integer({
			char: 'a',
			description: 'Number of non-validator accounts to generate',
			default: 10,
		}),
		validators: flagParser.integer({
			char: 'v',
			description: 'Number of validator accounts to generate',
			default: 103,
		}),
		'token-distribution': flagParser.integer({
			char: 't',
			description: 'Amount of tokens distributed to each account',
			default: 500,
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { output, accounts, validators, 'token-distribution': tokenDistribution },
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		} = this.parse(BaseGenesisBlockCommand);

		const accountList = new Array(accounts)
			.fill(0)
			.map((_x, index) => ({ ...{ username: `account_${index}` }, ...createAccount() }));

		const delegateList = new Array(validators)
			.fill(0)
			.map((_x, index) => ({ ...{ username: `delegate_${index}` }, ...createAccount() }));

		const prepareAccounts = (
			data: {
				username: string;
				passphrase: string;
				address: string;
			}[],
		): Account[] =>
			data.map(acc => ({
				address: Buffer.from(acc.address, 'hex'),
				token: { balance: BigInt(tokenDistribution) },
			}));

		const validAccounts = prepareAccounts(accountList);
		const validDelegateAccounts = prepareAccounts(delegateList);
		const app = this.getApplication(defaultGenesis, defaultConfig as PartialApplicationConfig);
		const schema = app.getSchema();
		const accountSchemas = schema.account.properties;

		const updatedGenesisBlock = createGenesisBlock({
			initDelegates: validDelegateAccounts.map(a => a.address),
			accounts: [...validAccounts, ...validDelegateAccounts] as Account[],
			accountAssetSchemas: accountSchemas as accountAssetSchemas,
		});

		const genesisBlock = getGenesisBlockJSON({
			genesisBlock: updatedGenesisBlock,
			accountAssetSchemas: accountSchemas as accountAssetSchemas,
		});

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(output) || regexWhitespace.test(output)) {
			this.error('Invalid name');
		}

		// determine proper path
		const configPath = join(process.cwd(), output);
		const filePath = join(configPath, 'genesis_block');

		// check for existing file at networkName & ask the user before overwriting
		if (fs.existsSync(filePath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message:
					'A genesis_block file already exists at the given location. Do you want to overwrite it?',
			});
			if (!userResponse.confirm) {
				this.error('Operation cancelled, config file already present at the desired location');
			} else {
				fs.writeJSONSync(resolve(configPath, 'genesis_block.json'), JSON.stringify(genesisBlock));
				fs.writeJSONSync(
					resolve(configPath, 'accounts.json'),
					JSON.stringify([...accountList, ...delegateList]),
				); // add to gitignore
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });
			fs.writeJSONSync(resolve(configPath, 'genesis_block.json'), JSON.stringify(genesisBlock));
			fs.writeJSONSync(
				resolve(configPath, 'accounts.json'),
				JSON.stringify([...accountList, ...delegateList]),
			); // add to gitignore
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}
