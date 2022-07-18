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

import * as cryptography from '@liskhq/lisk-cryptography';
import * as liskPassphrase from '@liskhq/lisk-passphrase';

const { Mnemonic } = liskPassphrase;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createAccount = () => {
	const passphrase = Mnemonic.generateMnemonic();
	const { privateKey, publicKey } = cryptography.utils.getKeys(passphrase);
	const address = cryptography.address.getAddressFromPublicKey(publicKey);

	return {
		passphrase,
		privateKey,
		publicKey,
		address,
	};
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createAccounts = (numberOfAccounts = 1) => {
	const accounts = new Array(numberOfAccounts).fill(0).map(createAccount);
	return accounts;
};

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const createFakeDefaultAccount = (account: any) => ({
	address: account?.address ?? cryptography.utils.getRandomBytes(20),
	token: {
		balance: account?.token?.balance ?? BigInt(0),
	},
	sequence: {
		nonce: account?.sequence?.nonce ?? BigInt(0),
	},
	keys: {
		mandatoryKeys: account?.keys?.mandatoryKeys ?? [],
		optionalKeys: account?.keys?.optionalKeys ?? [],
		numberOfSignatures: account?.keys?.numberOfSignatures ?? 0,
	},
	dpos: {
		delegate: {
			username: account?.dpos?.delegate?.username ?? '',
			pomHeights: account?.dpos?.delegate?.pomHeights ?? [],
			consecutiveMissedBlocks: account?.dpos?.delegate?.consecutiveMissedBlocks ?? 0,
			lastForgedHeight: account?.dpos?.delegate?.lastForgedHeight ?? 0,
			isBanned: account?.dpos?.delegate?.isBanned ?? false,
			totalVotesReceived: account?.dpos?.delegate?.totalVotesReceived ?? BigInt(0),
		},
		sentVotes: account?.dpos?.sentVotes ?? [],
		unlocking: account?.dpos?.unlocking ?? [],
	},
});

export const uninitializedAccount = [
	{
		passphrase: 'salad lawn air dentist enforce purity arctic jewel net neck alone mention',
		privateKey: Buffer.from(
			'80989c2bac40fc16819b87ee35257386ac852eac042dd8043eb19192b2fa21f438262844cf23c096aca2dad2e4cd75d50491ac30c89f84c83932d04ea903ef4c',
			'hex',
		),
		publicKey: Buffer.from(
			'38262844cf23c096aca2dad2e4cd75d50491ac30c89f84c83932d04ea903ef4c',
			'hex',
		),
		address: Buffer.from('8789de4316d79d22', 'hex'),
		oldAddress: '9766581646657035554L',
	},
	{
		passphrase: 'one mask tip slush fog topple acid noodle visual gadget trial wool',
		privateKey: Buffer.from(
			'855ce4e2ba5bdb1207f0cc48fb9ac180a6ce9f4cd3f10956a64a013feef82cc78cc7044fcf1b5b98f121e97d6af7b7b03049e49b7b184ba59627b68f0f059e76',
			'hex',
		),
		publicKey: Buffer.from(
			'8cc7044fcf1b5b98f121e97d6af7b7b03049e49b7b184ba59627b68f0f059e76',
			'hex',
		),
		address: Buffer.from('bdf994ff9c884ffa', 'hex'),
		oldAddress: '13689136367933083642L',
	},
];
