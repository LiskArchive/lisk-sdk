/*
 * LiskHQ/lisk-commander
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

import { Flags as flagParser } from '@oclif/core';
import { DEFAULT_NETWORK } from '../constants';

const messageDescription = `Specifies a source for providing a message to the command. If a string is provided directly as an argument, this option will be ignored. The message must be provided via an argument or via this option. Sources must be one of \`file\` or \`stdin\`. In the case of \`file\`, a corresponding identifier must also be provided.
	Note: if both secret passphrase and message are passed via stdin, the passphrase must be the first line.
	Examples:
	- --message=file:/path/to/my/message.txt
	- --message="hello world"
`;

const passphraseDescription = `Specifies a source for your secret passphrase. Command will prompt you for input if this option is not set.
	Examples:
	- --passphrase='my secret passphrase' (should only be used where security is not important)
`;

const passwordDescription = `Specifies a source for your secret password. Command will prompt you for input if this option is not set.
	Examples:
	- --password=pass:password123 (should only be used where security is not important)
`;

const dataPathDescription =
	'Directory path to specify where node data is stored. Environment variable "LISK_DATA_PATH" can also be used.';

const offlineDescription = 'Specify whether to connect to a local node or not.';

const networkDescription =
	'Default network config to use. Environment variable "LISK_NETWORK" can also be used.';

const configDescription =
	'File path to a custom config. Environment variable "LISK_CONFIG_FILE" can also be used.';

const prettyDescription = 'Prints JSON in pretty format rather than condensed.';

const outputDescription = 'The output directory. Default will set to current working directory.';

const fileDescription = `The file to upload.
	Example:
		--file=./myfile.json
`;

export type AlphabetLowercase =
	| 'a'
	| 'b'
	| 'c'
	| 'd'
	| 'e'
	| 'f'
	| 'g'
	| 'h'
	| 'i'
	| 'j'
	| 'k'
	| 'l'
	| 'm'
	| 'n'
	| 'o'
	| 'p'
	| 'q'
	| 'r'
	| 's'
	| 't'
	| 'u'
	| 'v'
	| 'w'
	| 'x'
	| 'y'
	| 'z';

export interface FlagMap {
	readonly [key: string]: {
		readonly char?: AlphabetLowercase;
		readonly description: string;
	};
}

export const flags: FlagMap = {
	message: {
		char: 'm',
		description: messageDescription,
	},
	passphrase: {
		char: 'p',
		description: passphraseDescription,
	},
	password: {
		char: 'w',
		description: passwordDescription,
	},
	dataPath: {
		char: 'd',
		description: dataPathDescription,
	},
	offline: {
		description: offlineDescription,
	},
	network: {
		char: 'n',
		description: networkDescription,
	},
	config: {
		char: 'c',
		description: configDescription,
	},
	pretty: {
		description: prettyDescription,
	},
	output: {
		char: 'o',
		description: outputDescription,
	},
	json: {
		char: 'j',
		description: 'Print the transaction in JSON format.',
	},
	senderPublicKey: {
		char: 's',
		description:
			"Set a custom senderPublicKey property for the transaction, to be used when account address does not correspond to signer's private key",
	},
	file: {
		char: 'f',
		description: fileDescription,
	},
};

export const flagsWithParser = {
	dataPath: flagParser.string({
		...flags.dataPath,
		env: 'LISK_DATA_PATH',
	}),
	network: flagParser.string({
		...flags.network,
		env: 'LISK_NETWORK',
		default: DEFAULT_NETWORK,
	}),
	config: flagParser.string({
		...flags.config,
		env: 'LISK_CONFIG_FILE',
	}),
	pretty: flagParser.boolean(flags.pretty),
	passphrase: flagParser.string(flags.passphrase),
	output: flagParser.string(flags.output),
	password: flagParser.string(flags.password),
	offline: flagParser.boolean({
		...flags.offline,
	}),
	json: flagParser.boolean(flags.json),
	senderPublicKey: flagParser.string(flags.senderPublicKey),
	chainID: flagParser.string(flags.chainID),
	file: flagParser.string(flags.file),
};
