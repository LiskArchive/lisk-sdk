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
import { VoteTransaction } from '../src/11_vote_transaction';
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

	// This is an account with more than 101 votes
	const invalidVotesAccount = {
		passphrase:
			'fly mystery then depart fantasy youth barely jazz slender disease initial food',
		privateKey:
			'a27ea9f3433e84ea50f7f8e0e8c8e531ddb06806ce726dcc9c2c226851e3dcec2a9ac911608bc9eb6d397ebf03208ed845f94a68a173428e5682f13582df3a29',
		publicKey:
			'2a9ac911608bc9eb6d397ebf03208ed845f94a68a173428e5682f13582df3a29',
		address: '14593639398183274871L',
		votedDelegatesPublicKeys: [
			'2a9ac911608bc9eb6d397ebf03208ed845f94a68a173428e5682f13582df3a29',
			'fa667e054e400dc1ee203c304b58526ed30c8d2f5d7d363b71e474b0e6e70369',
			'562f76c75a11fc13d6d0942f4e2dec15ee53db3608f57bc8de808f8fbde77848',
			'ef6ed80f35480b9ea55c426c8ab1fa49aba046d2af0271a22744c23c42baeb4e',
			'f6f772dbaf03ecdcf61554fa23d1fd7c889bdb6208b8bd6a734179b6a2db1370',
			'6ecf29f2c81f361c5107e2309a034ee98b874cbfda0b660b7c939aee97a84526',
			'e8b1ce68a65e9c77bb0c9c916a736809c05f16e4b4456f936d43da3bc163f849',
			'1677f213dc1c464ebc1b4a71bbfeb4139179f67f616f4990d8a4506a7d75755a',
			'84e96c71bc486d49b2ace4ea3a8876816f750df7c183543157019865904a6d32',
			'95deeba8ec59788de0436c15fb44b1b98256fd5895a4a4a2e841bee9ecc3c33f',
			'b78ab17b179a7f8ca9920a14cc592ce8559291ad2ccfda0b76af337983a463e6',
			'112dae08f0b0d9508fd5151697603444bb979a1b56559e2641d074ea7192ab6e',
			'5464675035d252d6cd5465622bceeffa4714d379eb21c8153b3b5b12f038fa03',
			'6e6a70eb5c9c4353a4c54bfd29af967aa0f0666880e62cf1e80763cb0883da3d',
			'3c984348dd3445c69eadd1bbfe082019807309fb1d6595bf2dabbd7aea34a3b4',
			'343e9d93a0df83033916edd322076091145c136797115ba8e53bff4402bcac9a',
			'bb3326ccbc53a4d7e13697e116675ecaf909a2f520e5055477489679241cfc3c',
			'9a5afad3c632b89c3b09ead333b45e23f4b74e9f6211498c8eb56557f6e3b78a',
			'4fdd58bb330f6c52f0e53ff1a249dba555061bde0d933128b1e653d1fa100065',
			'019f66b66e7c118971a2cc838a312f77e83845a020b1306988d4a254c610dc4a',
			'cd8c3b3673911a6180fe5ea41ed6b8c48091e0b1333e392c5def9f0875e401e7',
			'3dd7ac19c3aef1cca9b110933d12448b77e1ac99d7735c86aa402de1b4fae10e',
			'e3d4a15a4631b2b41d46d6b4b8bc41690dbd9fcce8ff00579c29d6af601f4ea9',
			'd91a504b7259da7005b4d2eb1e993c50a00df5014bac1462ed132d7caca1c4a6',
			'63b710247e7b3c462d241cd9f2b97c51e4e7b9aa944b4367c66907b0759c04af',
			'1a2c4b698207e24defc9104df784013c72175c23ac32acc74da3fb195ac6cd4c',
			'd59783c84bef20fe09695d7924e1bcd6f176d0ca1c6e31cfc36e77c5a0ba8707',
			'3619b900a93cbadefed73f085bf02a6ec4f612e391325afe54b4bc8ce0ab74e8',
			'1916945859261eafe89ece4e82d5888f63fc1b480047b2c917be57c682ece260',
			'2538aa325955ee238dd76c6431452f3ed7745397ec3411be5cbf41c9dfdeaeb0',
			'3b923a37a9a8c177fad209c8e7e772d8367a052684b241fb72fbf2e94dd63a58',
			'8ad311acf56ad2fc32c93a52b6866193ada13debba10399f9506f18d8a06b914',
			'aa8ea5534eab73da40763207ab823c45ef5201b010bd61526149906ff57f3e93',
			'0d5fda15f8d8c4acf7b521cb33d72e14d629d881f34bdd3322c4f1e1ccddb05b',
			'f68990937747a17e331ec4d788aa6f8eb7cad46a44ed3b66d313cf048c384edd',
			'e589826f6616d050e4fc7eab94b3926ae90910c4de43b313cfc2ee0e6d5b019b',
			'f5d53cf989afaee9c75c3c585fbb65bb1004b35f7d7b324eda4fd6df7361cff7',
			'62496f4019014ab8ba26b811dd1be918a344b622fc99980b9578ccbe3afba67a',
			'7ad2b32708b82b6b9e408e7442929968c6a1ce3b6552189617b6c6b4097a1721',
			'4f697a0c8679114ebe45f40a4c461bbeb275994ea4429dee8af0003be9da7f0c',
			'c68202bd95acc685932a520bd339f9c40d983e7e46561daa5796103459db88c3',
			'd3a574af0d3ba40b4d11539a5cf77beeb14034035d02771009b3b68b9ee950b4',
			'f942d695a4b069d863c7f6a5c73042dcc814c9b4fc4723a561f17634283f572c',
			'7b20690242b819125dc5e681c79e3f1434a6b06e7b6219dba794f589be202d12',
			'39f71fadb570c47f7989ff546060775d1fec015efcfdcd913b66d9967393ca2f',
			'4005d27a0c77e6501459d7f1b35480ec15c2b21bdd0a7bcb09c34167925cbcc4',
			'0bb993e5559d86939ce47248c541f0f4d23ea7b91ed3e503c3066fdbcd2bfdec',
			'2c4bfb3342a169add30212edc6db46d7b725f6955c28b8bbf915e0cb3c336f5f',
			'20b10867dd5ff0f639fe801141fdb281dc16f892ceb6e6b8e4e32f4eadf44524',
			'decc605f6a84f21f0a734ed90503268bb08ebf1b5a1890405d106d7e06aadff3',
			'beecb2d08e9f02da319d05c57f8bb513f5e08eb469c9da2c6dff4e9ab5fc52f7',
			'da36aa8ebb81329f7b107898d53bef2fa3294311d653e54cf680e3313eeb47f1',
			'0eefc2500ff7021a75adebb1ea7245fce42b9219e7bc87234dd6e8d7f598a140',
			'5b64f22fc5d25d3bac3c3a4b81a8da0a86b4f4c128aba68e5ab4bd504231e003',
			'bf4695b99c830c4d8b3153b0869a52d25b8eac12badd17e5747637234dd8dd62',
			'a25b7319a5f540890a0582ffdd969894c734eab06329c348b616b7d27df57002',
			'9c1b08841aa8c83ecc50439eb0a4eadb9700ef658381aad2285ba014f5474322',
			'cbd79bbcc35d4f329818fa2e66e71ab486761ffd05ac10b6c80ff090a8c3cd84',
			'f85b4e8a58093949796c25c5e20e4388c914919eb3eec9cfe1b395fff94d2b31',
			'f592495bc616916ef9a7cbbcb072739a3b7289bd86215994b522d5007b526e8f',
			'4cf990c30151329f94421a123b5fb28f76321f10f3a5b48dd30f07bfe01e6bca',
			'8590192367dd915f300a9617381ea21d582b300bd96fcbb3c8d7b300a3e33a77',
			'20bd96f600f584f0540169dfb85ea1a7881e5a9b72352ad0fe40c66a456c78b7',
			'58ac2fab80a0ad749db12a5a479bf9df96966481bd477e15bb6e04dd392d5a38',
			'0532c7d392d5236c0d6c747b46d81878ae2715e07caa7b97c72aeb30eb31e7a9',
			'cf4d02b82a46fc6341427ae589f5270141b74c9c4084cb6380364bc0ee9f01c1',
			'a1eeba3f0e5bf9bbbe60315413127c2ff0dadddba33c73b4a96fd02d230dc59c',
			'4450490de1d26ab8f3f7b4e7811e4a6c54e293a948ab1c9ae04f8b10da4dd2ae',
			'da9e70acb7fe2b3628bd30cdb2a37ee16df229c7f776d0c7da6e7fbbb04c5dff',
			'e98b9f9c04abdcb9f4b2c96bcf97b9e3a327339cd61d5fdb7abbedeff2a41f2e',
			'add925e0c7d1c9a0faf7bcb46ca86e4a30aaa0d94857f2376a9ba78a3c0512ab',
			'879568df35747392cd1e07e54e669344aa7cba4e537116fe91f6307c79c44259',
			'08c77356bcd581552be804baacfed00fb5529c32c6b6285e3999b77f1568eaa6',
			'e2ea15a5614eff7872353f308b06ff12f396881759b7e1bee1a5aebfaef265e3',
			'2ff40fbdc9761a4336b5de8e9343dec621d0039ec4037f3d2acd81bcf7be0522',
			'36101ebb29894c6d29aec44bc7755dbae64e4a399ef9c317e77e5d7f1256466b',
			'4ed15b3d6d578d71afdd081b6db240af6e4acdabe8bb0adb00e716a1350cba83',
			'b5402b2ad0e7c7048b265be3fa6c94ed2ae8efbe64c9c595b40f09562110fa66',
			'89231d5ec1aabff1df4497434884d925ec077bcb8779ecbf97d504b240723a2b',
			'46dd32921c4150fd106e881d168b364dc20f369d7f5ea5f098c14a34853837e2',
			'dc892d52bbadbdf9211cbaeccec0caacab5c6f46016989e548de3130300e4293',
			'bfe00ba06813d6d224baf54992956dcc124c214cd32de02c7d056dd24026a366',
			'f7778567143e694e8e4ee9baf38b426b4cefbc65e2d866be044f313a72a09259',
			'f30d6b33756bf1e8161dec21d8a60a245dfc813d341cb08239ccee8936aa8420',
			'f1f7b6ff13450178b9f0f2d355832de2505b0291548e41bff945a957e3f683e1',
			'321d1d0b9199839bf313b57370fbbd772e9b96dcdefa5fbae116a7ccef574631',
			'aa8c0ecf6bcaad1b4af43147055e1e1d87819123c2def0f916dea6ad58f71fbc',
			'6cd7364fc90e73bb2fe9ec64e4dd1febe749bb6fbfa9ac13f30bd4b1cbb2e416',
			'eaeebbe44f0af270a8a30a0b022f8cf0d016ca91fccb0e4b383bf3013ec81d9a',
			'b29b0d0a8830c40d37765a5495150752caed5d977ece737716e8cb2a9b570897',
			'424fa2576482a09e461bfb3f5f00c3554b06479680ae7e9ff80a0e23686735db',
			'b14036bdf89280f1cfd1eb1ae4a369457fc8609eee938214567803699c6998b6',
			'35f4467fc551b81dd26ec6fbeb6b55f9a98c7c7f3dd8ef387d272a739960f9af',
			'6834d4fab69f0282d92a5f328b46a21b2fa8b253764f96da806127f2474bdd97',
			'fe1fe5a8687924774fe37b8d2e4ec820d1371941f2257e1e9295f23e4525a59e',
			'fb9ab2b437bcf72a1f0d52e0f933e858e9d4f7d031148cefd2de48c0913e8ed9',
			'5116ae3744497152abc482b6b3d3a457af174949088898d213620605fa637ab9',
			'4662a75a6d760ff8f1648c7c1b52d70d5a2d3d1764461489d271a8933f18a574',
			'530e305148147225c772098f3e124f6cc5d64faa02256c6806cd80926832f5d8',
			'2dc98f07affe0b52ec1d2d4e83e751ace121c5da243d162de1af4175249b6ede',
			'f26f795bb10a486e3f35f1fcfbe7fcc1047ccbe667cb24c0f1031c359b130b80',
			'310f2d4516bee1e7fa8807eb8d949f963826914c6c4ff6f088b0668158b9de07',
			'24a59bcb2ef5bb78f9b8202cc0bce75cc51991d5ccafaf6d85b44bfda260d0da',
			'ae521bbd4bd70b63f7ebf5f51f3794c1f637e7693178e0f4a45282c6ab3c58e5',
		],
	};

	const networkIdentifier =
		'e48feb88db5b5cf5ad71d93cdcd1d879b6d5ed187a36b0002cc34e0ef9883255';

	beforeEach(async () => {
		validTestTransaction = new VoteTransaction({
			...validVoteTransactions[2],
			networkIdentifier,
		});
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

	describe('#getBasicBytes', () => {
		const expectedBytes =
			'03039d488a30c07dbb72b41e3fda9f29e1a4fc0fce893bb00788515a5e6f50b80312e2f4832b34373363333534636466363237623832653931313365303261333337343836646433616663353631356562373166666433313163356130626564613337623863';
		it('should return valid buffer', async () => {
			const getBasicBytes = (validTestTransaction as any).getBasicBytes();

			expect(getBasicBytes).to.eql(Buffer.from(expectedBytes, 'hex'));
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

		it('should return error when account voted for more than 101 delegates', async () => {
			storeAccountGetStub.returns(invalidVotesAccount);
			const errors = (validTestTransaction as any).undoAsset(store);

			expect(errors).not.to.be.empty;
			expect(errors[0].message).to.be.eql(
				'Vote cannot exceed 101 but has 104.',
			);
		});
	});
});
