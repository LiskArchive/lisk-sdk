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
 *
 */
import { expect } from 'chai';
import { MockStateStore as store } from './helpers';
import { VoteTransaction } from '../src/3_vote_transaction';
import { validVoteTransactions } from '../fixtures';
import { TransactionJSON } from '../src/transaction_types';
import { Status } from '../src/response';
import { generateRandomPublicKeys } from './helpers/cryptography';

describe('Vote transaction class', () => {
	let validTestTransaction: VoteTransaction;
	let storeAccountCacheStub: sinon.SinonStub;
	let storeAccountGetStub: sinon.SinonStub;
	let storeAccountSetStub: sinon.SinonStub;
	let storeAccountFindStub: sinon.SinonStub;

	const defaultValidSender = {
		address: '8004805717140184627L',
		balance: '100000000',
		publicKey:
			'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
		votedDelegatesPublicKeys: [
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

	beforeEach(async () => {
		validTestTransaction = new VoteTransaction(validVoteTransactions[2]);
		storeAccountCacheStub = sandbox.stub(store.account, 'cache');
		storeAccountGetStub = sandbox
			.stub(store.account, 'get')
			.returns(defaultValidSender);
		storeAccountSetStub = sandbox.stub(store.account, 'set');
		storeAccountFindStub = sandbox
			.stub(store.account, 'find')
			.returns(defaultValidDependentAccounts[0]);
	});

	describe('#constructor', () => {
		it('should create instance of VoteTransaction', async () => {
			expect(validTestTransaction).to.be.instanceOf(VoteTransaction);
		});

		it('should set the vote asset', async () => {
			expect(validTestTransaction.asset.votes).to.be.an('array');
		});

		it('should not throw TransactionMultiError when asset is not string array', async () => {
			const invalidVoteTransactionData = {
				...validVoteTransactions[1],
				asset: {
					votes: [1, 2, 3],
				},
			};
			expect(
				() => new VoteTransaction(invalidVoteTransactionData),
			).not.to.throw();
		});
	});

	describe('#assetToBytes', () => {
		it('should return valid buffer', async () => {
			const assetBytes = (validTestTransaction as any).assetToBytes();
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
			] as any);
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

	describe('#assetToJSON', async () => {
		it('should return an object of type transfer asset', async () => {
			expect(validTestTransaction.assetToJSON())
				.to.be.an('object')
				.and.to.have.property('votes')
				.that.is.a('array');
		});
	});

	describe('#prepare', async () => {
		it('should call state store', async () => {
			await validTestTransaction.prepare(store);
			expect(storeAccountCacheStub).to.have.been.calledWithExactly([
				{ address: validTestTransaction.senderId },
				{
					publicKey:
						'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				},
			]);
		});
	});

	describe('#validateAsset', () => {
		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).validateAsset();

			expect(errors).to.be.empty;
		});

		it('should return error when asset includes unsigned public key', async () => {
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
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when asset includes more than 33 signed public key', async () => {
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

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when asset includes null', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				asset: {
					votes: [null],
				},
			};
			const transaction = new VoteTransaction(invalidTransaction);
			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
		});

		it('should return error when asset is an empty array', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				asset: { votes: [] },
				id: '12771680061315781764',
			};
			const transaction = new VoteTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.votes');
		});

		it('should return error when recipientId is empty', async () => {
			const invalidTransaction = {
				...validVoteTransactions[2],
				recipientId: '',
				id: '17277443568874824891',
			};
			const transaction = new VoteTransaction(invalidTransaction);

			const errors = (transaction as any).validateAsset();
			expect(errors).not.to.be.empty;
			expect(errors[0].dataPath).to.be.equal('.recipientId');
		});
	});

	describe('#applyAsset', () => {
		it('should call state store', async () => {
			(validTestTransaction as any).applyAsset(store);
			expect(storeAccountGetStub).to.be.calledWithExactly(
				validTestTransaction.senderId,
			);
			expect(storeAccountFindStub).to.be.calledOnce;
			expect(storeAccountSetStub).to.be.calledWithExactly(
				defaultValidSender.address,
				{
					...defaultValidSender,
					votedDelegatesPublicKeys: [
						...defaultValidSender.votedDelegatesPublicKeys,
						'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
					],
				},
			);
		});

		it('should return error when voted account is not a delegate', async () => {
			const nonDelegateAccount = [
				{
					balance: '0',
					address: '123L',
					publicKey:
						'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				},
			];
			storeAccountFindStub.returns(nonDelegateAccount[0]);
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
		});

		it('should return error when the delegate is already voted', async () => {
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votedDelegatesPublicKeys: [
					'5a82f58bf35ef4bdfac9a371a64e91914519af31a5cf64a5b8b03ca7d32c15dc',
					'473c354cdf627b82e9113e02a337486dd3afc5615eb71ffd311c5a0beda37b8c',
				],
			};
			storeAccountGetStub.returns(invalidSender);
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contain('is already voted.');
			expect(errors[0].dataPath).equal('.asset.votes');
		});

		it('should return error when vote exceeds maximum votes', async () => {
			const invalidSender = {
				address: '8004805717140184627L',
				balance: '100000000',
				publicKey:
					'30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f483',
				votedDelegatesPublicKeys: generateRandomPublicKeys(101),
			};
			storeAccountGetStub.returns(invalidSender);
			const errors = (validTestTransaction as any).applyAsset(store);
			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.contains(
				'Vote cannot exceed 101 but has 102.',
			);
			expect(errors[0].dataPath).equal('.asset.votes');
		});
	});

	describe('#undoAsset', () => {
		it('should call state store', async () => {
			(validTestTransaction as any).undoAsset(store);
			expect(storeAccountGetStub).to.be.calledWithExactly(
				validTestTransaction.senderId,
			);

			expect(storeAccountSetStub).to.be.calledWithExactly(
				defaultValidSender.address,
				defaultValidSender,
			);
		});

		it('should return no errors', async () => {
			const errors = (validTestTransaction as any).undoAsset(store);
			expect(errors).to.be.empty;
		});
	});
});
