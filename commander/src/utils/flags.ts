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
const networkIdentifierDescription =
	'Network identifier defined for the network or main | test for the Lisk Network.';
const communityIdentifierDescription = 'Unique community identifier for network.';
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
	networkIdentifier: {
		description: networkIdentifierDescription,
	},
	communityIdentifier: {
		description: communityIdentifierDescription,
	},
	dataPath: {
		char: 'd',
		description:
			'Directory path to specify where node data is stored. Environment variable "LISK_DATA_PATH" can also be used.',
	},
	offline: {
		description: 'Specify whether to connect to a local node or not.',
	},
	network: {
		char: 'n',
		description:
			'Default network config to use. Environment variable "LISK_NETWORK" can also be used.',
	},
};
