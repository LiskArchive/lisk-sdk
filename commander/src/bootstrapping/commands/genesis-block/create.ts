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
import * as cryptography from '@liskhq/lisk-cryptography';
import { Application, PartialApplicationConfig } from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import { Command, flags as flagParser } from '@oclif/command';
import fs from 'fs-extra';
import { join, resolve } from 'path';
import inquirer from 'inquirer';
import ProgressBar from 'progress';
import { createMnemonicPassphrase } from '../../../utils/mnemonic';

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

const saveFiles = (
	configPath: string,
	genesisBlock: Record<string, unknown>,
	accountList: AccountInfo[],
	delegateList: Record<string, unknown>[],
	delegateForgingInfo: Record<string, unknown>[],
) => {
	fs.writeJSONSync(resolve(configPath, 'genesis_block.json'), genesisBlock, {
		spaces: ' ',
	});
	fs.writeJSONSync(resolve(configPath, 'accounts.json'), [...accountList, ...delegateList], {
		spaces: ' ',
	}); // add to gitignore
	fs.writeJSONSync(resolve(configPath, 'forging_info.json'), delegateForgingInfo, {
		spaces: ' ',
	});
};

export abstract class BaseGenesisBlockCommand extends Command {
	static description = 'Creates genesis block file.';
	static examples = [
		'genesis-block:create --output mydir',
		'genesis-block:create --output mydir --accounts 10',
		'genesis-block:create --output mydir --accounts 10 --validators 103',
		'genesis-block:create --output mydir --accounts 10 --validators 103 --token-distribution 500',
	];

	static flags = {
		output: flagParser.string({
			char: 'o',
			description: 'Output folder path of the generated genesis block',
			default: 'config',
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
			default: 10000000,
		}),
	};

	async run(): Promise<void> {
		const {
			flags: { output, accounts, validators, 'token-distribution': tokenDistribution },
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		} = this.parse(BaseGenesisBlockCommand);

		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(output) || regexWhitespace.test(output)) {
			this.error('Invalid name');
		}

		const app = this.getApplication({}, {});
		const registeredModules = app.getRegisteredModules();
		if (!registeredModules.some(module => module.name === 'token')) {
			throw new Error('Token module must be registered to use this command');
		}
		if (!registeredModules.some(module => module.name === 'dpos')) {
			throw new Error('Dpos module must be registered to use this command');
		}
		const schema = app.getSchema();
		const defaultAccount = app.getDefaultAccount();
		const accountSchemas = schema.account.properties;
		const defaultAccountAssetSchema = Object.fromEntries(
			Object.entries(defaultAccount).map(([k, v]) => [k, { default: v }]),
		);
		const accountSchemasWithDefaults = objects.mergeDeep(
			{},
			accountSchemas,
			defaultAccountAssetSchema,
		);

		const accountList = new Array(accounts).fill(0).map(_x => createAccount());
		const delegateList = new Array(validators).fill(0).map((_x, index) => ({
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

		const bar = new ProgressBar('  Creating genesis block [:bar] :percent :etas', {
			complete: '=',
			incomplete: ' ',
			width: 20,
			total: validators - 1,
		});
		const onionSeed = cryptography.generateHashOnionSeed();
		const onionCount = 10000;
		const onionDistance = 1000;

		const delegateForgingInfo = delegateList.map((delegate, index) => {
			const info = {
				// ToDo: use a better password, user sourced using flag
				encryptedPassphrase: cryptography.stringifyEncryptedPassphrase(
					cryptography.encryptPassphraseWithPassword(delegate.passphrase, delegate.password),
				),
				hashOnion: {
					count: onionCount,
					distance: onionDistance,
					hashes: cryptography
						.hashOnion(onionSeed, onionCount, onionDistance)
						.map(buf => buf.toString('hex')),
				},
				address: delegate.address,
			};

			if (index + 1 === validators) {
				bar.terminate();
			} else {
				bar.tick();
			}

			return info;
		});

		// determine proper path
		const configPath = join(process.cwd(), output);
		const filePath = join(configPath, 'genesis_block.json');

		// check for existing file at given location & ask the user before overwriting
		// TODO: check for individual files
		if (fs.existsSync(filePath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message:
					'A genesis_block file already exists at the given location. Do you want to overwrite it?',
			});
			if (!userResponse.confirm) {
				this.error(`Operation cancelled, genesis_block.json file already present at ${configPath}`);
			} else {
				saveFiles(configPath, genesisBlock, accountList, delegateList, delegateForgingInfo);
				this.log('\n');
				this.log(`  Configuration files saved at: ${configPath}.`);
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });
			saveFiles(configPath, genesisBlock, accountList, delegateList, delegateForgingInfo);
			this.log(`  Configuration files saved at: ${configPath}`);
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}
