/*
 * Copyright © 2023 Lisk Foundation
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
 */

import { ed, address } from '@liskhq/lisk-cryptography';
import { codec } from '@liskhq/lisk-codec';
import { Transaction } from '@liskhq/lisk-chain';
import {
	registerMultisignatureParamsSchema,
	multisigRegMsgSchema,
} from '../../../../src/modules/auth/schemas';
import { RegisterMultisignatureParams } from '../../../../src/modules/auth/types';
import { MESSAGE_TAG_MULTISIG_REG } from '../../../../src/modules/auth/constants';

const keyPairsString = [
	{
		privateKey:
			'2475a8233503caade9542f2dd6c8c725f10bc03e3f809210b768f0a2320f06d50904c986211330582ef5e41ed9a2e7d6730bb7bdc59459a0caaaba55be4ec128',
		publicKey: '0904c986211330582ef5e41ed9a2e7d6730bb7bdc59459a0caaaba55be4ec128',
	},
	{
		privateKey:
			'985bc97b4b2aa91d590dde455c19c70818d97c56c7cfff790a1e0b71e3d15962557f1b9647fd2aefa357fed8bead72d1b02e5151b57d3c32d4d3f808c0705026',
		publicKey: '557f1b9647fd2aefa357fed8bead72d1b02e5151b57d3c32d4d3f808c0705026',
	},
	{
		privateKey:
			'd0b159fe5a7cc3d5f4b39a97621b514bc55b0a0f1aca8adeed2dd1899d93f103a3f96c50d0446220ef2f98240898515cbba8155730679ca35326d98dcfb680f0',
		publicKey: 'a3f96c50d0446220ef2f98240898515cbba8155730679ca35326d98dcfb680f0',
	},
	{
		privateKey:
			'03e7852c6f1c6fe5cd0c5f7e3a36e499a1e0207e867f74f5b5bc42bfcc888bc8b8d2422aa7ebf1f85031f0bac2403be1fb24e0196d3bbed33987d4769eb37411',
		publicKey: 'b8d2422aa7ebf1f85031f0bac2403be1fb24e0196d3bbed33987d4769eb37411',
	},
];

export const keyPairs = keyPairsString.map(keyPair => ({
	privateKey: Buffer.from(keyPair.privateKey, 'hex'),
	publicKey: Buffer.from(keyPair.publicKey, 'hex'),
}));

export const chainID = Buffer.from('04000000', 'hex');

export const multisigParams = {
	numberOfSignatures: 4,
	mandatoryKeys: [keyPairs[0].publicKey, keyPairs[1].publicKey],
	optionalKeys: [keyPairs[2].publicKey, keyPairs[3].publicKey],
};

export const multisigAddress = address.getAddressFromPublicKey(multisigParams.mandatoryKeys[0]);
const decodedMessage = {
	address: multisigAddress,
	nonce: BigInt(0),
	...multisigParams,
};
const encodedMessage = codec.encode(multisigRegMsgSchema, decodedMessage);
const signatures: Buffer[] = [];
for (const keyPair of keyPairs) {
	signatures.push(
		ed.signData(MESSAGE_TAG_MULTISIG_REG, chainID, encodedMessage, keyPair.privateKey),
	);
}

export const decodedParams: RegisterMultisignatureParams = {
	numberOfSignatures: multisigParams.numberOfSignatures,
	mandatoryKeys: multisigParams.mandatoryKeys,
	optionalKeys: multisigParams.optionalKeys,
	signatures,
};
const encodedParams = codec.encode(registerMultisignatureParamsSchema, decodedParams);

export const registerMultisigTx = new Transaction({
	module: 'auth',
	command: 'registerMultisignature',
	fee: BigInt('100000000'),
	params: encodedParams,
	nonce: BigInt(0),
	senderPublicKey: keyPairs[0].publicKey,
	signatures: [],
});
