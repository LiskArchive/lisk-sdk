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
const testing = require('../dist-node/testing');
const os = require('os');
const { address, ed } = require('@liskhq/lisk-cryptography');
const { codec } = require('@liskhq/lisk-codec');
const { Transaction, TAG_TRANSACTION } = require('@liskhq/lisk-chain');
const { transferParamsSchema } = require('../dist-node/modules/token/schemas');

const defaultTokenID = chainID => Buffer.concat([chainID, Buffer.from([0, 0, 0, 0])]);

const createTransferTransaction = input => {
	const encodedParams = codec.encode(transferParamsSchema, {
		tokenID: defaultTokenID(input.chainID),
		recipientAddress: input.recipientAddress,
		amount: input.amount ?? BigInt('10000000000'),
		data: '',
	});

	const publicKey = ed.getPublicKeyFromPrivateKey(input.privateKey);

	const tx = new Transaction({
		module: 'token',
		command: 'transfer',
		nonce: input.nonce,
		senderPublicKey: publicKey,
		fee: input.fee ?? BigInt('50000000'),
		params: encodedParams,
		signatures: [],
	});
	tx.signatures.push(
		ed.signData(TAG_TRANSACTION, input.chainID, tx.getSigningBytes(), input.privateKey),
	);
	return tx;
};

const genesis = testing.fixtures.defaultFaucetAccount;

(async () => {
	const databasePath = `${os.tmpdir()}/lisk/test`;
	const processEnv = await testing.getBlockProcessingEnv({
		options: {
			databasePath,
		},
		logLevel: 'info',
	});
	for (let i = 0; i < 100000; i++) {
		const authData = await processEnv.invoke('auth_getAuthAccount', {
			address: genesis.address,
		});
		const transactions = [];
		for (let j = 0; j < 90; j++) {
			const transaction = createTransferTransaction({
				nonce: BigInt(authData.nonce) + BigInt(j),
				recipientAddress: address.getAddressFromLisk32Address(genesis.address),
				amount: BigInt(1_0000_0000),
				chainID: processEnv.getChainID(),
				fee: BigInt(5000_0000) + BigInt(2000_0000),
				privateKey: Buffer.from(genesis.privateKey, 'hex'),
			});
			transactions.push(transaction);
		}

		const newBlock = await processEnv.createBlock(transactions);
		console.log(`processing new block ${newBlock.header.height}`);
		console.time('process');
		await processEnv.process(newBlock);
		console.timeEnd('process');
		console.log('completed', newBlock.header.height);
		console.log('^'.repeat(100));
	}

	processEnv.cleanup({ databasePath });
})();
