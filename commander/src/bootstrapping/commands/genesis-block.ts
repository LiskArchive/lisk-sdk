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
import { Command, flags as flagParser } from '@oclif/command';
import fs from 'fs-extra';
import { join, resolve } from 'path';
import inquirer from 'inquirer';
import { createMnemonicPassphrase } from '../../utils/mnemonic';
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
		'genesis-block:create --output mydir',
		'genesis-block:create --output mydir --accounts 10',
		'genesis-block:create --output mydir --accounts 10 --validators 103',
		'genesis-block:create --output mydir --accounts 10 --validators 103 --token-distribution 500',
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

		const prepareNormalAccounts = (
			data: {
				username: string;
				passphrase: string;
				address: string;
			}[],
		): Account[] =>
			data.map(acc => ({
				address: Buffer.from(acc.address, 'hex'),
				token: { balance: BigInt(tokenDistribution) },
				sequence: { nonce: BigInt(0) },
				keys: { numberOfSignatures: 0, mandatoryKeys: [], optionalKeys: [] },
				dpos: {
					delegate: {
						username: '',
						pomHeights: [],
						consecutiveMissedBlocks: 0,
						lastForgedHeight: 0,
						isBanned: false,
						totalVotesReceived: BigInt(0),
					},
					sentVotes: [],
					unlocking: [],
					pomHeights: [],
				},
			}));

		// add self votes to validator accounts
		const prepareValidatorAccounts = (
			data: {
				username: string;
				passphrase: string;
				address: string;
			}[],
		): Account[] =>
			data.map(acc => ({
				address: Buffer.from(acc.address, 'hex'),
				token: { balance: BigInt(tokenDistribution) },
				sequence: { nonce: BigInt(0) },
				keys: { numberOfSignatures: 0, mandatoryKeys: [], optionalKeys: [] },
				dpos: {
					delegate: {
						username: acc.username,
						pomHeights: [],
						consecutiveMissedBlocks: 0,
						lastForgedHeight: 0,
						isBanned: false,
						totalVotesReceived: BigInt(1000000000000),
					},
					sentVotes: [
						{
							delegateAddress: Buffer.from(acc.address, 'hex'),
							amount: BigInt(1000000000000),
						},
					],
					unlocking: [],
					pomHeights: [],
				},
			}));

		const accountList = new Array(accounts)
			.fill(0)
			.map((_x, index) => ({ ...{ username: `account_${index}` }, ...createAccount() }));

		const delegateList = new Array(validators)
			.fill(0)
			.map((_x, index) => ({ ...{ username: `delegate_${index}` }, ...createAccount() }));

		const onionSeed = cryptography.generateHashOnionSeed();
		const onionCount = 1000;
		const onionDistance = 1000;

		const delegateForgingInfo = delegateList.map(del => ({
			// ToDo: use a better password, user sourced using flag
			encryptedPassphrase: cryptography.stringifyEncryptedPassphrase(
				cryptography.encryptPassphraseWithPassword(del.passphrase, del.username),
			), // password is the username
			hashOnion: {
				count: onionCount, // These parameters can be configurable using relevant flags
				distance: onionDistance,
				hashes: cryptography
					.hashOnion(onionSeed, onionCount, onionDistance)
					.map(buf => buf.toString('hex')),
			},
			address: del.address,
		}));

		const validAccounts = prepareNormalAccounts(accountList);
		const validDelegateAccounts = prepareValidatorAccounts(delegateList);
		const app = this.getApplication({}, defaultConfig as PartialApplicationConfig);
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

		// check for existing file at given location & ask the user before overwriting
		// ToDo: check for individual files
		if (fs.existsSync(filePath)) {
			const userResponse = await inquirer.prompt({
				type: 'confirm',
				name: 'confirm',
				message:
					'A genesis_block file already exists at the given location. Do you want to overwrite it?',
			});
			if (!userResponse.confirm) {
				this.error(
					'Operation cancelled, genesis_block file already present at the desired location',
				);
			} else {
				fs.writeJSONSync(resolve(configPath, 'genesis_block.json'), JSON.stringify(genesisBlock), {
					spaces: ' ',
				});
				fs.writeJSONSync(
					resolve(configPath, 'accounts.json'),
					JSON.stringify([...accountList, ...delegateList]),
					{ spaces: ' ' },
				); // add to gitignore
				fs.writeJSONSync(
					resolve(configPath, 'forging_info.json'),
					JSON.stringify(delegateForgingInfo),
					{ spaces: ' ' },
				);
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });
			fs.writeJSONSync(resolve(configPath, 'genesis_block.json'), JSON.stringify(genesisBlock), {
				spaces: ' ',
			});
			fs.writeJSONSync(
				resolve(configPath, 'accounts.json'),
				JSON.stringify([...accountList, ...delegateList]),
				{ spaces: ' ' },
			); // add to gitignore
			fs.writeJSONSync(
				resolve(configPath, 'forging_info.json'),
				JSON.stringify(delegateForgingInfo),
				{ spaces: ' ' },
			);
		}
	}

	abstract getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application;
}
