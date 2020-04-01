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

const passphraseDescription = `Specifies a source for your secret passphrase. Lisk Commander will prompt you for input if this option is not set.
	Examples:
	- --passphrase='my secret passphrase' (should only be used where security is not important)
`;

const passwordDescription = `Specifies a source for your secret password. Lisk Commander will prompt you for input if this option is not set.
	Examples:
	- --password=pass:password123 (should only be used where security is not important)
`;

const votesDescription = `Specifies the public keys for the delegate candidates you want to vote for. Takes a string of public keys separated by commas.
	Examples:
	- --votes=publickey1,publickey2
`;

const unlockDescription = `Specifies the unlock objects for the delegate candidates to unlock from. Takes a string of address amount unvoteHeight separated by commas.
	Examples:
	- --unlock=123L,1000000,500
`;

const noSignatureDescription =
	'Creates the transaction without a signature. Your passphrase will therefore not be required.';

const networkDescription = 'Lisk Core network name.';
const installationPathDescription = 'Lisk Core installation path.';
const releaseUrlDescription = 'Lisk Core download URL.';
const snapshotUrlDescription = 'Lisk Core blockchain snapshot URL.';
const noSnapshotDescription =
	'Install Lisk Core without a blockchain snapshot.';
const liskVersionDescription = 'Lisk Core version.';
const noStartDescription = 'Install Lisk Core without starting.';
const networkIdentifierDescription =
	'Network identifier defined for the network or main | test for the Lisk Network.';
const communityIdentifierDescription =
	'Unique community identifier for network.';
const mandatoryKeyDescription =
	'Mandatory publicKey required for multi signature transaction.';
const optionalKeyDescription =
	'Optional publicKey for multi signature transaction.';
const numberOfSignaturesDescription =
	'Number of signatures required to approve the transaction from multi signature account';
const numberOfPassphrasesDescription =
	'Number of times you require the passphrase prompt to appear';
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
	noSignature: {
		description: noSignatureDescription,
	},
	passphrase: {
		char: 'p',
		description: passphraseDescription,
	},
	password: {
		char: 'w',
		description: passwordDescription,
	},
	votes: {
		description: votesDescription,
	},
	unlock: {
		description: unlockDescription,
	},
	networkIdentifier: {
		description: networkIdentifierDescription,
	},
	communityIdentifier: {
		description: communityIdentifierDescription,
	},
	network: {
		char: 'n',
		description: networkDescription,
	},
	installationPath: {
		char: 'p',
		description: installationPathDescription,
	},
	releaseUrl: {
		char: 'r',
		description: releaseUrlDescription,
	},
	snapshotUrl: {
		char: 's',
		description: snapshotUrlDescription,
	},
	noSnapshot: {
		description: noSnapshotDescription,
	},
	liskVersion: {
		description: liskVersionDescription,
	},
	noStart: {
		description: noStartDescription,
	},
	mandatoryKey: {
		char: 'm',
		description: mandatoryKeyDescription,
	},
	optionalKey: {
		char: 'o',
		description: optionalKeyDescription,
	},
	numberOfSignatures: {
		description: numberOfSignaturesDescription,
	},
	numberOfPassphrases: {
		description: numberOfPassphrasesDescription,
	},
};
