/*
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
 */

'use strict';

const {
	transfer,
	registerMultisignature,
	createSignatureObject,
} = require('@liskhq/lisk-transactions');
const accountFixtures = require('../../../fixtures/accounts');
const randomUtil = require('../../../common/utils/random');
const localCommon = require('../../common');
const { getNetworkIdentifier } = require('../../../common/network_identifier');

const networkIdentifier = getNetworkIdentifier(
	__testContext.config.genesisBlock,
);

const { NORMALIZER } = global.__testContext.config;

describe('integration test (type 4) - effect of multisignature registration on memory tables', () => {
	let library;

	const multisigAccount = randomUtil.account();
	let multisigTransaction;
	const creditTransaction = transfer({
		networkIdentifier,
		amount: (1000 * NORMALIZER).toString(),
		passphrase: accountFixtures.genesis.passphrase,
		recipientId: multisigAccount.address,
	});
	const signer1 = randomUtil.account();
	const signer2 = randomUtil.account();

	localCommon.beforeBlock('4_multisig_account', lib => {
		library = lib;
	});

	before(done => {
		localCommon.addTransactionsAndForge(library, [creditTransaction], done);
	});

	describe('forge block with multisignature transaction', () => {
		before('forge block with multisignature transaction', done => {
			const keysgroup = [signer1.publicKey, signer2.publicKey];

			multisigTransaction = registerMultisignature({
				networkIdentifier,
				passphrase: multisigAccount.passphrase,
				keysgroup,
				lifetime: 4,
				minimum: 2,
			});

			const sign1 = createSignatureObject({
				transaction: multisigTransaction,
				passphrase: signer1.passphrase,
				networkIdentifier,
			});
			const sign2 = createSignatureObject({
				transaction: multisigTransaction,
				passphrase: signer2.passphrase,
				networkIdentifier,
			});

			multisigTransaction.signatures = [sign1.signature, sign2.signature];
			multisigTransaction.ready = true;
			localCommon.addTransactionsAndForge(library, [multisigTransaction], done);
		});

		describe('check sender db rows', () => {
			let accountRow;

			before('get mem_account, mem_account2multisignature rows', async () => {
				return localCommon
					.getAccountFromDb(library, multisigAccount.address)
					.then(res => {
						accountRow = res.mem_accounts;
					});
			});

			it('should include signers PKs in membersPublicKeys', async () => {
				return expect(accountRow.membersPublicKeys).to.include(
					signer1.publicKey,
					signer2.publicKey,
				);
			});

			it('should set multimin field set on mem_accounts', async () => {
				return expect(accountRow.multimin).to.eql(
					multisigTransaction.asset.min,
				);
			});

			it('should set multilifetime field set on mem_accounts', async () => {
				return expect(accountRow.multilifetime).to.eql(
					multisigTransaction.asset.lifetime,
				);
			});
		});

		describe('check sender account', () => {
			let account;

			before('get multisignature account', async () => {
				account = await library.components.storage.entities.Account.getOne(
					{ address: multisigAccount.address },
					{ extended: true },
				);
			});

			it('should have multisignatures field set on account', async () => {
				return expect(account.membersPublicKeys).to.include(
					signer1.publicKey,
					signer2.publicKey,
				);
			});

			it('should have multimin field set on account', async () => {
				return expect(account.multiMin).to.eql(multisigTransaction.asset.min);
			});

			it('should have multilifetime field set on account', async () => {
				return expect(account.multiLifetime).to.eql(
					multisigTransaction.asset.lifetime,
				);
			});
		});

		describe('after deleting block', () => {
			before('delete last block', async () => {
				return library.modules.processor.deleteLastBlock();
			});

			describe('sender db rows', () => {
				let accountRow;

				before('get mem_account', async () => {
					return localCommon
						.getAccountFromDb(library, multisigAccount.address)
						.then(res => {
							accountRow = res.mem_accounts;
						});
				});

				it('should have no data in mem_account.membersPublicKeys', async () => {
					return expect(accountRow.membersPublicKeys).to.eql([]);
				});

				it('should have multimin field set to 0 on mem_accounts', async () => {
					return expect(accountRow.multimin).to.eql(0);
				});

				it('should have multilifetime field set to 0 on mem_accounts', async () => {
					return expect(accountRow.multilifetime).to.eql(0);
				});
			});

			describe('sender account', () => {
				let account;

				before('get multisignature account', async () => {
					account = await library.components.storage.entities.Account.getOne(
						{ address: multisigAccount.address },
						{ extended: true },
					);
				});

				it('should set multisignatures field to empty array on account', async () => {
					return expect(account.membersPublicKeys).to.eql([]);
				});

				it('should set multimin field to 0 on account', async () => {
					return expect(account.multiMin).to.eql(0);
				});

				it('should set multilifetime field to 0 on account', async () => {
					return expect(account.multiLifetime).to.eql(0);
				});
			});
		});
	});
});
