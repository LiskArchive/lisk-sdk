/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
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
import * as cryptography from '@liskhq/lisk-cryptography';
import { Application, PartialApplicationConfig } from 'lisk-framework';
import { objects } from '@liskhq/lisk-utils';
import { Command, flags as flagParser } from '@oclif/command';
import * as fs from 'fs-extra';
import { join, resolve } from 'path';
import * as inquirer from 'inquirer';
import * as ProgressBar from 'progress';
import { LiskValidationError, validator } from '@liskhq/lisk-validator';
import { BlockJSON } from '@liskhq/lisk-chain';
import { createMnemonicPassphrase } from '../../../utils/mnemonic';
import {
	generateGenesisBlockDefaultDPoSAssets,
	GenesisAssetsInput,
	genesisAssetsSchema,
} from '../../../utils/genesis_creation';
import { flagsWithParser } from '../../../utils/flags';
import { getNetworkConfigFilesPath } from '../../../utils/path';

interface AccountInfo {
	readonly address: string;
	readonly hexAddress: string;
	readonly passphrase: string;
}

interface ValidatorInfo {
	readonly address: string;
	readonly name: string;
	readonly blsKey: string;
	readonly proofOfPossession: string;
	readonly generatorKey: string;
	readonly hexAddress: string;
	readonly passphrase: string;
}

type AccountList = ReturnType<typeof generateGenesisBlockDefaultDPoSAssets>['accountList'];
type ValidatorList = ReturnType<typeof generateGenesisBlockDefaultDPoSAssets>['validatorList'];

const formatAccountInfo = (list: AccountList): AccountInfo[] =>
	list.map(a => ({
		address: a.lisk32Address,
		hexAddress: a.address.toString('hex'),
		passphrase: a.passphrase,
	}));
const formatValidatorInfo = (list: ValidatorList): ValidatorInfo[] =>
	list.map(a => ({
		address: a.lisk32Address,
		name: a.name,
		blsKey: a.blsPublicKey.toString('hex'),
		generatorKey: a.publicKey.toString('hex'),
		proofOfPossession: a.blsPoP.toString('hex'),
		hexAddress: a.address.toString('hex'),
		passphrase: a.passphrase,
	}));

const saveFiles = (
	configPath: string,
	genesisBlock: BlockJSON,
	accountList?: AccountInfo[],
	validatorList?: ValidatorInfo[],
	generationInfo?: Record<string, unknown>[],
	passwordList?: Record<string, unknown>,
) => {
	fs.writeJSONSync(resolve(configPath, 'genesis_block.json'), genesisBlock, {
		spaces: ' ',
	});
	if (accountList || validatorList) {
		fs.writeJSONSync(
			resolve(configPath, 'accounts.json'),
			[...(accountList ?? []), ...(validatorList ?? [])],
			{
				spaces: ' ',
			},
		);
	}
	if (generationInfo) {
		fs.writeJSONSync(resolve(configPath, 'forging_info.json'), generationInfo, {
			spaces: ' ',
		});
	}
	if (passwordList) {
		fs.writeJSONSync(resolve(configPath, 'password.json'), passwordList, {
			spaces: ' ',
		});
	}
};

export abstract class BaseGenesisBlockCommand extends Command {
	static description = 'Creates genesis block file.';
	static examples = [
		'genesis-block:create --output mydir',
		'genesis-block:create --output mydir --assets-file ./assets.json',
		'genesis-block:create --output mydir --accounts 10',
		'genesis-block:create --output mydir --accounts 10 --validators 101',
		'genesis-block:create --output mydir --accounts 10 --validators 101 --token-distribution 500',
	];

	static flags = {
		network: flagsWithParser.network,
		config: flagsWithParser.config,
		output: flagParser.string({
			char: 'o',
			description: 'Output folder path of the generated genesis block',
			default: 'config',
		}),
		'assets-file': flagParser.string({
			char: 'f',
			description: 'Path to file which contains genesis block asset in JSON format',
		}),
		accounts: flagParser.integer({
			char: 'a',
			description: 'Number of non-validator accounts to generate',
			default: 10,
		}),
		validators: flagParser.integer({
			char: 'v',
			description: 'Number of validator accounts to generate',
			default: 101,
		}),
		'token-distribution': flagParser.integer({
			char: 't',
			description: 'Amount of tokens distributed to each account',
			default: 100000000000,
		}),
		'validators-passphrase-encryption-iterations': flagParser.integer({
			description: 'Number of iterations to use for passphrase encryption',
			default: 1000000,
		}),
		'validators-hash-onion-count': flagParser.integer({
			description: 'Number of hashes to produce for each hash-onion',
			default: 100000,
		}),
		'validators-hash-onion-distance': flagParser.integer({
			description: 'Distance between each hashes for hash-onion',
			default: 1000,
		}),
	};

	async run(): Promise<void> {
		const {
			flags: {
				output,
				accounts,
				validators,
				config: configFilePath,
				network,
				'assets-file': assetsFile,
				'token-distribution': tokenDistribution,
				'validators-hash-onion-count': validatorsHashOnionCount,
				'validators-hash-onion-distance': validatorsHashOnionDistance,
				'validators-passphrase-encryption-iterations': validatorsPassphraseEncryptionIterations,
			},
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		} = this.parse(BaseGenesisBlockCommand);
		// validate folder name to not include camelcase or whitespace
		const regexWhitespace = /\s/g;
		const regexCamelCase = /^([a-z]+)(([A-Z]([a-z]+))+)$/;
		if (regexCamelCase.test(output) || regexWhitespace.test(output)) {
			this.error('Invalid name');
		}
		const { configFilePath: defaultConfigFilepath } = getNetworkConfigFilesPath(
			this.getApplicationConfigDir(),
			network,
			true,
		);
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		let config = await fs.readJSON(defaultConfigFilepath);
		if (configFilePath) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const customConfig = await fs.readJSON(resolve(configFilePath));
			config = objects.mergeDeep(config, customConfig);
		}
		// determine proper path
		const configPath = join(process.cwd(), output);
		const filePath = join(configPath, 'genesis_block.json');
		const app = this.getApplication(config);
		// If assetsFile exist, create from assetsFile and default config/accounts are not needed
		if (assetsFile) {
			const assetsJSON = (await fs.readJSON(resolve(assetsFile))) as GenesisAssetsInput;
			const assetSchemaError = validator.validate(genesisAssetsSchema, assetsJSON);
			if (assetSchemaError.length) {
				throw new LiskValidationError(assetSchemaError);
			}
			const genesisBlock = await app.generateGenesisBlock({
				assets: assetsJSON.assets.map(a => ({
					moduleID: a.moduleID,
					data: a.data,
					schema: a.schema,
				})),
			});
			fs.mkdirSync(configPath, { recursive: true });
			saveFiles(configPath, genesisBlock.toJSON());
			this.log(`Genesis block files saved at: ${configPath}`);
		}

		const registeredModules = app.getRegisteredModules();
		if (!registeredModules.some(module => module.name === 'token')) {
			throw new Error('Token module must be registered to use this command');
		}
		if (!registeredModules.some(module => module.name === 'dpos')) {
			throw new Error('Dpos module must be registered to use this command');
		}
		const { accountList, validatorList, genesisAssets } = generateGenesisBlockDefaultDPoSAssets({
			tokenDistribution,
			numberOfValidators: validators,
			numberOfAccounts: accounts,
		});
		const genesisBlock = await app.generateGenesisBlock({ assets: genesisAssets });
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const bar = new ProgressBar('  Creating genesis block [:bar] :percent :etas', {
			complete: '=',
			incomplete: ' ',
			width: 20,
			total: validators - 1,
		});
		const onionSeed = cryptography.generateHashOnionSeed();
		const password = createMnemonicPassphrase();
		const passwordList = { defaultPassword: password };
		const generatorInfo = validatorList.map(async (val, index) => {
			const encryptedPassphrase = await cryptography.encryptPassphraseWithPassword(
				val.passphrase,
				password,
				{ kdfparams: { iterations: validatorsPassphraseEncryptionIterations } },
			);
			const info = {
				// TODO: use a better password, user sourced using flag
				encryptedPassphrase: cryptography.stringifyEncryptedPassphrase(encryptedPassphrase),
				hashOnion: {
					count: validatorsHashOnionCount,
					distance: validatorsHashOnionDistance,
					hashes: cryptography
						.hashOnion(onionSeed, validatorsHashOnionCount, validatorsHashOnionDistance)
						.map(buf => buf.toString('hex')),
				},
				address: val.address.toString('hex'),
			};
			if (index + 1 === validators) {
				bar.terminate();
			} else {
				bar.tick();
			}
			return info;
		});

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
				saveFiles(
					configPath,
					genesisBlock.toJSON(),
					formatAccountInfo(accountList),
					formatValidatorInfo(validatorList),
					generatorInfo as any,
					passwordList,
				);
				this.log('\n');
				this.log(`Configuration files saved at: ${configPath}.`);
			}
		} else {
			fs.mkdirSync(configPath, { recursive: true });
			saveFiles(
				configPath,
				genesisBlock.toJSON(),
				formatAccountInfo(accountList),
				formatValidatorInfo(validatorList),
				generatorInfo as any,
				passwordList,
			);
			this.log(`Configuration files saved at: ${configPath}`);
		}
	}

	abstract getApplication(config: PartialApplicationConfig): Application;
	abstract getApplicationConfigDir(): string;
}
