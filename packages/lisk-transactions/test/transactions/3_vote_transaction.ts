/*
 * Copyright © 2018 Lisk Foundation
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
import { expect } from 'chai';
import {
	VoteTransaction,
	Attributes,
	BaseTransaction,
} from '../../src/transactions';
import { validVoteTransactions, validTransaction } from '../../fixtures';
import { Status, TransactionJSON } from '../../src/transaction_types';
import { generateRandomPublicKeys } from '../helpers/cryptography';

describe('Vote transaction class', () => {
	let validTestTransaction: VoteTransaction;

	beforeEach(async () => {
		validTestTransaction = new VoteTransaction(validVoteTransactions[2]);
	});

	describe('#constructor', () => {
		it('should create instance of VoteTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(VoteTransaction);
		});

		it('should set the vote asset', async () => {
			expect(validTestTransaction.asset.votes).to.be.an('array');
		});

		it('should throw TransactionMultiError when asset is not string array', async () => {
			const invalidVoteTransactionData = {
				...validVoteTransactions[1],
				asset: {
					votes: [1, 2, 3],
				},
			};
			expect(() => new VoteTransaction(invalidVoteTransactionData)).to.throw(
				'Invalid field types',
			);
		});
	});

	describe('#getAssetBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).getAssetBytes();
			expect(assetBytes).to.eql(
				Buffer.from(validVoteTransactions[2].asset.votes.join(''), 'utf8'),
			);
		});
	});

	describe('#verifyAgainstOtherTransactions', () => {
		it('should return status true with non conflicting transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validVoteTransactions[1],
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return status true with non related transactions', async () => {
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				validVoteTransactions[0],
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(0);
			expect(status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when other transaction has the same addition public key', async () => {
			const conflictTransaction = {
				...validVoteTransactions[2],
				asset: { votes: validVoteTransactions[2].asset.votes.slice() },
			};
			conflictTransaction.asset.votes.push(
				validVoteTransactions[1].asset.votes.filter(
					v => v.charAt(0) === '+',
				)[0],
			);
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(status).to.equal(Status.FAIL);
		});

		it('should return TransactionResponse with error when other transaction has the same deletion public key', async () => {
			const conflictTransaction = {
				...validVoteTransactions[2],
				asset: { votes: validVoteTransactions[2].asset.votes.slice() },
			};
			conflictTransaction.asset.votes.push(
				validVoteTransactions[1].asset.votes.filter(
					v => v.charAt(0) === '-',
				)[0],
			);
			const {
				errors,
				status,
			} = validTestTransaction.verifyAgainstOtherTransactions([
				conflictTransaction,
			] as ReadonlyArray<TransactionJSON>);
			expect(errors)
				.to.be.an('array')
				.of.length(1);
			expect(status).to.equal(Status.FAIL);
		});
	});

	describe('#getRequiredAttributes', () => {
		let attribute: Attributes;

		beforeEach(async () => {
			attribute = validTestTransaction.getRequiredAttributes();
		});

		it('should return attribute including sender address', async () => {
			expect(attribute.account.address).to.include(
				validVoteTransactions[1].senderId,
			);
		});

		it('should return attribute including vote public keys', async () => {
			expect(attribute.account.publicKey).to.eql(
				validTestTransaction.asset.votes.map(x => x.substring(1)),
			);
		});
	});

	describe('#processRequiredState', () => {
		beforeEach(async () => {
			validTestTransaction = new VoteTransaction(validVoteTransactions[2]);
		});

		it('should return sender and dependentState.account with voted accounts', async () => {
			const sender = {
				address: '8004805717140184627L',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
			};
			const votedAccounts = [
				{
					address: '1L',
					publicKey:
						'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				},
			];
			const validEntity = {
				account: [sender, ...votedAccounts],
			};
			expect(
				validTestTransaction.processRequiredState(validEntity).sender,
			).to.eql(sender);
			expect(
				validTestTransaction.processRequiredState(validEntity).dependentState,
			)
				.to.have.property('account')
				.and.eql(votedAccounts);
		});

		it('should throw an error when state does not have account key', async () => {
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					{},
				),
			).to.throw('Entity account is required.');
		});

		it('should throw an error when account state does not have address and public key', async () => {
			const invalidEntity = {
				account: [
					{ balance: '0' },
					{
						address: '1L',
						publicKey:
							'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('Required state does not have valid account type.');
		});

		it('should throw an error when account state does not include the sender', async () => {
			const invalidEntity = {
				account: [
					{
						address: '1L',
						publicKey:
							'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('No sender account is found.');
		});

		it('should throw an error when account state does not voted account', async () => {
			const invalidEntity = {
				account: [
					{
						address: '1L',
						publicKey:
							'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
					},
				],
			};
			expect(
				validTestTransaction.processRequiredState.bind(
					validTestTransaction,
					invalidEntity,
				),
			).to.throw('No sender account is found.');
		});
	});

	describe('#validateSchema', () => {
		it('should return TransactionResponse with status OK', async () => {
			expect(validTestTransaction.validateSchema().status).to.equal(Status.OK);
		});

		it('should return TransactionResponse with error when asset includes unsigned public key', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				asset: {
					votes: [
						...validVoteTransactions[2].asset.votes,
						'e683da7b4fe46164b9db3fd599481ad0630d2d892546c1ac63e59a5acb903140',
					],
				},
			};
			const transaction = new VoteTransaction(invalidTransaction);
			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should throw TransactionResponse with error when asset includes more than 33 signed public key', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				asset: {
					votes: [
						'+633698916662935403780f04fd01119f32f9cd180a3b104b67c5ae5ebb6d5593',
						'+b59c6580a05ae00896f03dd66205ac141a22599674cbf0db6654a0908b73e5e5',
						'+faf9f863e704f9cf560bc7a5718a25d851666d38195cba3cacd360cd5fa96fd3',
						'+cda0220f413c7f62cfe46e9544519cced3277d0931d0342270e6b47b4b346e0b',
						'+791576c970ff6bd58cb0be049618d031e31095d272496ebc54f221d1b2635295',
						'+712add287f4979ff0c236265dfe437998c2d3b9f4b396e319e7d581e048fbeda',
						'+19bdab59b24f7ef2a9d0b1b0942cff450875302e0c59c437a372eb6bb27a0b43',
						'+8f2ae5a4fa63ecdd53aa85711ac0a14f2d9a42451838ebfcf5999c5cf5eded06',
						'+ea613be11a264b5775e985b9d7d40f836a74bd181a1855de218ee849efa3b1fe',
						'+6ee309d4190de0e9adea6b06f83582e61bc7556022e7d3e29a886e35ab80d6a4',
						'+279320364fc3edd39b77f1fa29594d442e39220b165956fa729f741150b0dc4d',
						'+6a8d02899c66dfa2423b125f44d360be6da0669cedadde32e63e629cb2e3195c',
						'+db2627fbee9cf5351fe5b87e35ba981f3e29da085f0a45a1f9851c9e04db910e',
						'+a725db7ae839028867f55feb5f332ae09e0ac0b6e9060f045a9ff4f8f2520aa8',
						'+ad6fbbe0f62bfb934f4a510c24f59baf600dd8b8bfaa4b59944037c50873a481',
						'+4d6e32111dc36f8074bda232f07119394180b11ac8e9f3698537c909ef24637e',
						'+2521c1136f095d4031af08d9c5aaf5bbf2589e620c7fc79dfdcdcc6f05d00d72',
						'+5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
						'+473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
						'-8aceda0f39b35d778f55593227f97152f0b5a78b80b5c4ae88979909095d6204',
						'-71e1e34dd0529d920ee6c38497b028352c57b7130d55737c8a778ff3974ec29f',
						'-e82b9ab22f2b60674fdb35dec867d83ccee65bd1694c7ff9859519da3766a337',
						'-7beb5f1e8592022fe5272b45eeeda6a1b6923a801af6e1790933cc6a78ed95a1',
						'-3697a4f8c74cb21949eec31fddde190c16ab2497709fb503c567d3a9e6a6e989',
						'-abf9787621f8f43ec4e4a645b515094f42fc5615f2e231eca24eaf6e69dc6a65',
						'-4c6a450cc6769efa4ba0f9a23318af0cb9def2402f0a51c5e7215856c08df7af',
						'-fa7bfd3a2dc0ca55b700247aae4694709d6cdfa34c6bfb0237e032d7aae404f0',
						'-9ebf74d64dcecd6eb0005967d8888e66d3e2901c8d0c72c7396f021d93a130fc',
						'-71d74ec6d8d53244fde9cededae7c9c9f1d5dba5c7ddfe63d2e766cb874169b0',
						'-fc4f231b00f72ba93a4778890c5d2b89d3f570e606c04619a0343a3cdddf73c7',
						'-2493d52fc34ecaaa4a7d0d76e6de9bda24f1b5e11e3363c30a13d59e9c345f82',
						'-e683da7b4fe46164b9db3fd599481ad0630d2d892546c1ac63e59a5acb903140',
						'-b7633636a88ba1ce8acd98aa58b4a9618650c8ab860c167be6f8d78404265bae',
						'-cdcba9e30dfd559bdc217fbc5674007927ef68d443650ba804a67d41bf05a1b7',
					],
				},
			};
			const transaction = new VoteTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should throw TransactionResponse with error when asset is an empty array', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				asset: { votes: [] },
				id: '12771680061315781764',
			};
			const transaction = new VoteTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.votes');
		});

		it('should throw TransactionResponse with error when recipientId is empty', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				recipientId: '',
				id: '17277443568874824891',
			};
			const transaction = new VoteTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.recipientId');
		});

		it('should throw TransactionResponse with error when recipientPublicKey is empty', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				recipientPublicKey: '',
			};
			const transaction = new VoteTransaction(invalidTransaction);

			const { status, errors } = transaction.validateSchema();
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.recipientPublicKey');
		});
	});

	describe('#verify', () => {
		const defaultValidSender = {
			address: '8004805717140184627L',
			balance: '100000000',
			publicKey:
				'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
			votes: [
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
			],
		};

		const defaultValidDependentAccounts = [
			{
				balance: '0',
				address: '123L',
				publicKey:
					'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				username: 'delegate_0',
			},
		];

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when dependent state does not exist', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
				}),
			).to.throw('Dependent state is required for vote transaction.');
		});

		it('should throw an error when dependent state does include account', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {} as any,
				}),
			).to.throw('Entity account is required.');
		});

		it('should throw an error when dependent state account does not have public key', async () => {
			expect(
				validTestTransaction.verify.bind(validTestTransaction, {
					sender: defaultValidSender,
					dependentState: {
						account: [{ balance: '0', address: '123L' }],
					} as any,
				}),
			).to.throw('Required state does not have valid account type.');
		});

		it('should return TransactionResponse with error when voted account is not a delegate', async () => {
			const nonDelegateAccount = [
				{
					balance: '0',
					address: '123L',
					publicKey:
						'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				},
			];
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { account: nonDelegateAccount },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
		});

		it('should return TransactionResponse with error when the delegate is already voted', async () => {
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votes: [
					'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
					'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				],
			};
			const { status, errors } = validTestTransaction.verify({
				sender: invalidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contain('is already voted.');
		});

		it('should return TransactionResponse with error when the delegate is not voted', async () => {
			const tx = {
				...validVoteTransactions[2],
				asset: {
					votes: [
						...validVoteTransactions[2].asset.votes,
						'-fc4f231b00f72ba93a4778890c5d2b89d3f570e606c04619a0343a3cdddf73c7',
					],
				},
			};
			validTestTransaction = new VoteTransaction(tx);
			const dependentAccounts = [
				...defaultValidDependentAccounts,
				{
					balance: '0',
					address: '123L',
					publicKey:
						'fc4f231b00f72ba93a4778890c5d2b89d3f570e606c04619a0343a3cdddf73c7',
					username: 'delegate_0',
				},
			];
			const { status, errors } = validTestTransaction.verify({
				sender: defaultValidSender,
				dependentState: { account: dependentAccounts },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contain('is not voted.');
		});

		it('should return TransactionResponse with error when sender exceeds maximum vote', async () => {
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votes: generateRandomPublicKeys(101),
			};
			const { status, errors } = validTestTransaction.verify({
				sender: invalidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.eql(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contains(
				'Vote cannot exceed 101 but has 102.',
			);
		});
	});

	describe('#apply', () => {
		const defaultValidSender = {
			address: '8004805717140184627L',
			balance: '100000000',
			publicKey:
				'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
			votes: [
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
			],
		};

		const defaultValidDependentAccounts = [
			{
				balance: '0',
				address: '123L',
				publicKey:
					'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				username: 'delegate_0',
			},
		];

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.apply({
				sender: defaultValidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'apply').returns({});
			expect(
				validTestTransaction.apply.bind(validTransaction, {
					sender: defaultValidSender,
					dependentState: { account: defaultValidDependentAccounts },
				}),
			).to.throw('State is required for applying transaction.');
		});

		it('should return updated account state with added votes', async () => {
			const { state } = validTestTransaction.apply({
				sender: defaultValidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect((state as any).sender.votes).to.include(
				defaultValidDependentAccounts[0].publicKey,
			);
		});

		it('should return updated account state without removed votes', async () => {
			const removingVote =
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc';
			const tx = {
				...validVoteTransactions[2],
				asset: {
					votes: [...validVoteTransactions[2].asset.votes, `-${removingVote}`],
				},
			};
			validTestTransaction = new VoteTransaction(tx);
			const dependentAccounts = [
				...defaultValidDependentAccounts,
				{
					balance: '0',
					address: '123L',
					publicKey:
						'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
					username: 'delegate_0',
				},
			];
			const { state } = validTestTransaction.apply({
				sender: defaultValidSender,
				dependentState: { account: dependentAccounts },
			});
			expect((state as any).sender.votes).not.to.include(removingVote);
		});

		it('should return updated account state when vote exceeds maximum votes', async () => {
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votes: generateRandomPublicKeys(101),
			};
			const { state } = validTestTransaction.apply({
				sender: invalidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect((state as any).sender.votes).to.include(
				validTestTransaction.asset.votes[0].substring(1),
			);
		});

		it('should return TransactionResponse with error when vote exceeds maximum votes', async () => {
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votes: generateRandomPublicKeys(101),
			};
			const { status, errors } = validTestTransaction.apply({
				sender: invalidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contains(
				'Vote cannot exceed 101 but has 102.',
			);
		});
	});

	describe('#undo', () => {
		const defaultValidSender = {
			address: '8004805717140184627L',
			balance: '100000000',
			publicKey:
				'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
			votes: [
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
				'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
			],
		};

		const defaultValidDependentAccounts = [
			{
				balance: '0',
				address: '456L',
				publicKey:
					'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				username: 'delegate_1',
			},
			{
				balance: '0',
				address: '123L',
				publicKey:
					'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
				username: 'delegate_0',
			},
		];

		it('should return TransactionResponse with status OK', async () => {
			const { status, errors } = validTestTransaction.undo({
				sender: defaultValidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.equal(Status.OK);
			expect(errors).to.be.empty;
		});

		it('should throw an error when state does not exist from the base transaction', async () => {
			sandbox.stub(BaseTransaction.prototype, 'undo').returns({});
			expect(
				validTestTransaction.undo.bind(validTransaction, {
					sender: defaultValidSender,
					dependentState: { account: defaultValidDependentAccounts },
				}),
			).to.throw('State is required for undoing transaction.');
		});

		it('should return updated account state without added votes', async () => {
			const { state } = validTestTransaction.undo({
				sender: defaultValidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect((state as any).sender.votes).not.to.include(
				defaultValidDependentAccounts[0].publicKey,
			);
		});

		it('should return updated account state with removed votes', async () => {
			const removingVote =
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc';
			const tx = {
				...validVoteTransactions[2],
				asset: {
					votes: [...validVoteTransactions[2].asset.votes, `-${removingVote}`],
				},
			};
			validTestTransaction = new VoteTransaction(tx);
			const dependentAccounts = [
				...defaultValidDependentAccounts,
				{
					balance: '0',
					address: '123L',
					publicKey:
						'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
					username: 'delegate_0',
				},
			];
			const { state } = validTestTransaction.undo({
				sender: defaultValidSender,
				dependentState: { account: dependentAccounts },
			});
			expect((state as any).sender.votes).to.include(removingVote);
		});

		it('should return updated account state when vote exceeds maximum votes', async () => {
			const removingVote =
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc';
			const tx = {
				...validVoteTransactions[2],
				asset: {
					votes: [...validVoteTransactions[2].asset.votes, `-${removingVote}`],
				},
			};
			validTestTransaction = new VoteTransaction(tx);
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votes: generateRandomPublicKeys(101),
			};
			const { state } = validTestTransaction.undo({
				sender: invalidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect((state as any).sender.votes).to.include(removingVote);
		});

		it('should return TransactionResponse with error when vote exceeds maximum votes', async () => {
			const removingVote =
				'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc';
			const tx = {
				...validVoteTransactions[2],
				asset: {
					votes: [...validVoteTransactions[2].asset.votes, `-${removingVote}`],
				},
			};
			validTestTransaction = new VoteTransaction(tx);
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votes: generateRandomPublicKeys(101),
			};
			const { status, errors } = validTestTransaction.undo({
				sender: invalidSender,
				dependentState: { account: defaultValidDependentAccounts },
			});
			expect(status).to.equal(Status.FAIL);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contains(
				'Vote cannot exceed 101 but has 102.',
			);
		});
	});
});
