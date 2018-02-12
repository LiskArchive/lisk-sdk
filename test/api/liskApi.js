/*
 * Copyright © 2017 Lisk Foundation
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
import LiskAPI from 'api/liskApi';

const privateApi = require('api/privateApi');
const utils = require('api/utils');

describe('Lisk API module', () => {
	const fixedPoint = 10 ** 8;
	const testPort = '7000';
	const livePort = '8000';
	const sslPort = '443';
	const mainnetHash =
		'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetHash =
		'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const defaultNethash = {
		'Content-Type': 'application/json',
		nethash: mainnetHash,
		broadhash: mainnetHash,
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: sslPort,
		Accept: 'application/json',
	};
	const testnetNethash = Object.assign({}, defaultNethash, {
		nethash: testnetHash,
		broadhash: testnetHash,
		port: testPort,
	});
	const customNethash = Object.assign({}, defaultNethash, {
		nethash: '123',
		version: '0.0.0a',
	});
	const defaultPassphrase = 'secret';
	const defaultSecondPassphrase = 'second secret';
	const GET = 'GET';
	const POST = 'POST';
	const defaultRequestLimit = 10;
	const defaultRequestOffset = 101;
	const defaultAmount = 1 * fixedPoint;
	const defaultOrderBy = 'rate:asc';
	const defaultbannedNodes = ['naughty1', 'naughty2', 'naughty3'];
	const defaultNodes = ['goodnode1', 'goodnode2', 'goodnode3'];
	const defaultSelectedNode = 'selected_node';
	const defaultUrl = 'node.url.com';
	const defaultRequestPromiseResult = {
		body: {
			success: true,
		},
	};
	const defaultCheckedOptions = {
		key1: 'value1',
		key2: 2,
	};

	let selectNewNodeStub;
	let sendRequestPromiseStub;
	let checkOptionsStub;
	let handleTimestampIsInFutureFailuresStub;
	let handleSendRequestFailuresStub;
	let LSK;

	beforeEach(() => {
		selectNewNodeStub = sandbox
			.stub(privateApi, 'selectNewNode')
			.returns(defaultSelectedNode);
		sendRequestPromiseStub = sandbox
			.stub(privateApi, 'sendRequestPromise')
			.resolves(Object.assign({}, defaultRequestPromiseResult));
		checkOptionsStub = sandbox
			.stub(utils, 'checkOptions')
			.returns(Object.assign({}, defaultCheckedOptions));
		handleTimestampIsInFutureFailuresStub = sandbox
			.stub(privateApi, 'handleTimestampIsInFutureFailures')
			.resolves(Object.assign({}, defaultRequestPromiseResult.body));
		handleSendRequestFailuresStub = sandbox.stub(
			privateApi,
			'handleSendRequestFailures',
		);

		LSK = new LiskAPI({});
	});

	describe('LiskAPI()', () => {
		it('should create a new instance of LiskAPI', () => {
			return LSK.should.be.type('object').and.be.instanceof(LiskAPI);
		});

		it('should set node string by default', () => {
			return LSK.should.have.property('node').and.be.type('string');
		});

		describe('with option testnet true', () => {
			beforeEach(() => {
				LSK = new LiskAPI({ testnet: true });
			});

			it('should set the port to 7000 on initialization', () => {
				return LSK.should.have.property('port').be.equal(testPort);
			});

			it('should set testnet to true on initialization', () => {
				return LSK.should.have.property('testnet').be.equal(true);
			});
		});
	});

	describe('on initialize', () => {
		describe('SSL', () => {
			it('should set SSL to true on initialization when no SSL options is passed', () => {
				return LSK.should.have.property('ssl').be.true();
			});

			it('should set SSL to false on initialization when passed as an option', () => {
				LSK = new LiskAPI({ ssl: false });
				return LSK.should.have.property('ssl').be.false();
			});

			it('should set SSL to true on initialization when passed as an option', () => {
				LSK = new LiskAPI({ ssl: true });
				return LSK.should.have.property('ssl').be.true();
			});
		});

		describe('randomNode', () => {
			it('should set randomNode to true when randomNode not explicitly set', () => {
				return LSK.should.have.property('randomNode').be.true();
			});

			it('should set randomNode to true on initialization when passed as an option', () => {
				LSK = new LiskAPI({ randomNode: true });
				return LSK.should.have.property('randomNode').be.true();
			});

			it('should set randomNode to false on initialization when passed as an option', () => {
				LSK = new LiskAPI({ randomNode: false });
				return LSK.should.have.property('randomNode').be.false();
			});
		});

		describe('port', () => {
			it('should set port to desired port if set on initialization when passed as an option', () => {
				LSK = new LiskAPI({ port: '2000' });
				return LSK.should.have.property('port').be.equal('2000');
			});

			it('should set port to default testnet port if not set but used testnet on initialization when passed as an option', () => {
				LSK = new LiskAPI({ port: undefined, testnet: true });
				return LSK.should.have.property('port').be.equal(testPort);
			});

			it('should set testnet true and port to 100 on initialization when passed as an option', () => {
				LSK = new LiskAPI({ port: '100', testnet: true });
				return LSK.should.have.property('port').be.equal('100');
			});
		});

		describe('nodes', () => {
			it('should set all nodes lists to provided nodes on initialization when passed as an option', () => {
				LSK = new LiskAPI({ nodes: defaultNodes });
				LSK.should.have.property('defaultNodes').be.equal(defaultNodes);
				LSK.should.have.property('defaultTestnetNodes').be.equal(defaultNodes);
				return LSK.should.have
					.property('defaultSSLNodes')
					.be.equal(defaultNodes);
			});

			it('should set all bannedNodes list to provided bannedNodes on initialization when passed as an option', () => {
				LSK = new LiskAPI({ bannedNodes: defaultbannedNodes });
				return LSK.should.have
					.property('bannedNodes')
					.be.equal(defaultbannedNodes);
			});

			it('should set node to provided node on initialization when passed as an option', () => {
				LSK = new LiskAPI({ node: defaultUrl });
				return LSK.should.have.property('node').be.equal(defaultUrl);
			});
		});

		describe('nethash', () => {
			it('should set nethash to devnet when own nethash used', () => {
				const ownNethash = '123';
				const expectedDevNethash = {
					'Content-Type': 'application/json',
					nethash: ownNethash,
					broadhash: mainnetHash,
					os: 'lisk-js-api',
					version: '0.0.0a',
					minVersion: '>=0.5.0',
					port: sslPort,
					Accept: 'application/json',
				};
				LSK = new LiskAPI({ nethash: ownNethash });
				return LSK.should.have.property('nethash').be.eql(expectedDevNethash);
			});
		});
	});

	describe('#getNethash', () => {
		it('should provide default mainnet nethash values', () => {
			return LSK.getNethash().should.eql(defaultNethash);
		});

		it('should provide default testnet nethash values', () => {
			LSK = new LiskAPI({ testnet: true });
			return LSK.getNethash().should.eql(testnetNethash);
		});

		it('should get values for a custom nethash', () => {
			return LSK.getNethash('123').should.be.eql(customNethash);
		});
	});

	describe('#getNodes', () => {
		it('should get a set of nodes', () => {
			return LSK.getNodes().should.be.type('object');
		});

		it('should list 8 official nodes', () => {
			const nodes = LSK.getNodes();
			nodes.should.have
				.property('official')
				.have.property('length')
				.be.equal(8);
			return nodes.official.forEach(node => {
				node.should.have.property('node').and.be.type('string');
			});
		});

		it('should list 8 ssl nodes', () => {
			const nodes = LSK.getNodes();
			nodes.should.have
				.property('ssl')
				.have.property('length')
				.be.equal(8);
			return nodes.ssl.forEach(node => {
				node.should.have.property('node').and.be.type('string');
				node.should.have.property('ssl').and.be.true();
			});
		});

		it('should list 1 testnet node', () => {
			const nodes = LSK.getNodes();
			nodes.should.have
				.property('testnet')
				.have.property('length')
				.be.equal(1);
			return nodes.testnet.forEach(node => {
				node.should.have.property('node').and.be.type('string');
				node.should.have.property('testnet').and.be.true();
			});
		});
	});

	describe('#setNode', () => {
		it('should set current node to a provided node', () => {
			const myOwnNode = 'myOwnNode.com';
			LSK.setNode(myOwnNode);

			return LSK.should.have.property('node').and.be.equal(myOwnNode);
		});

		it('should select a node when called with undefined', () => {
			const callCount = selectNewNodeStub.callCount;
			LSK.setNode();

			selectNewNodeStub.callCount.should.be.equal(callCount + 1);
			return LSK.should.have.property('node').and.be.equal(defaultSelectedNode);
		});
	});

	describe('#setTestnet', () => {
		describe('to true', () => {
			beforeEach(() => {
				LSK.setTestnet(true);
			});

			it('should set testnet to true', () => {
				return LSK.should.have.property('testnet').and.be.true();
			});

			it('should set port to 7000', () => {
				return LSK.should.have.property('port').and.be.equal(testPort);
			});

			it('should select a node', () => {
				const callCount = selectNewNodeStub.callCount;
				LSK.setTestnet(true);
				return selectNewNodeStub.should.have.callCount(callCount + 1);
			});
		});

		describe('to false', () => {
			beforeEach(() => {
				LSK.setTestnet(false);
			});

			it('should set testnet to false', () => {
				return LSK.should.have.property('testnet').and.be.false();
			});

			it('should set port to 8000', () => {
				return LSK.should.have.property('port').and.be.equal(livePort);
			});

			it('should select a node', () => {
				const callCount = selectNewNodeStub.callCount;
				LSK.setTestnet(true);
				return selectNewNodeStub.should.have.callCount(callCount + 1);
			});
		});

		describe('banned nodes', () => {
			beforeEach(() => {
				LSK.bannedNodes = [].concat(defaultbannedNodes);
			});

			describe('when initially on mainnet', () => {
				it('should reset banned nodes when switching from mainnet to testnet', () => {
					LSK.setTestnet(true);
					return LSK.should.have
						.property('bannedNodes')
						.and.be.Array()
						.and.be.empty();
				});

				it('should not reset banned nodes when switching from mainnet to mainnet', () => {
					LSK.setTestnet(false);
					return LSK.should.have
						.property('bannedNodes')
						.and.be.eql(defaultbannedNodes);
				});
			});

			describe('when initially on testnet', () => {
				beforeEach(() => {
					LSK.testnet = true;
				});

				it('should reset banned nodes when switching from testnet to mainnet', () => {
					LSK.setTestnet(false);
					return LSK.should.have
						.property('bannedNodes')
						.and.be.Array()
						.and.be.empty();
				});

				it('should not reset banned nodes when switching from testnet to testnet', () => {
					LSK.setTestnet(true);
					return LSK.should.have
						.property('bannedNodes')
						.and.be.eql(defaultbannedNodes);
				});
			});
		});
	});

	describe('#setSSL', () => {
		describe('when ssl is initially true', () => {
			beforeEach(() => {
				LSK.ssl = true;
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.setSSL(true);
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultbannedNodes);
					LSK.setSSL(true);
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultbannedNodes);
				});

				it('should not select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(true);
					return selectNewNodeStub.should.have.callCount(callCount);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.setSSL(false);
					return LSK.should.have.property('ssl').and.be.false();
				});

				it('should reset bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultbannedNodes);
					LSK.setSSL(false);
					return LSK.should.have
						.property('bannedNodes')
						.and.be.Array()
						.and.be.empty();
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(false);
					return selectNewNodeStub.should.have.callCount(callCount + 1);
				});
			});
		});

		describe('when ssl is initially false', () => {
			beforeEach(() => {
				LSK.ssl = false;
			});

			describe('when set to true', () => {
				it('should have ssl set to true', () => {
					LSK.setSSL(true);
					return LSK.should.have.property('ssl').and.be.true();
				});

				it('should reset bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultbannedNodes);
					LSK.setSSL(true);
					return LSK.should.have
						.property('bannedNodes')
						.and.be.Array()
						.and.be.empty();
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(true);
					return selectNewNodeStub.should.have.callCount(callCount + 1);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.setSSL(false);
					return LSK.should.have.property('ssl').and.be.false();
				});

				it('should not change bannedNodes', () => {
					LSK.bannedNodes = [].concat(defaultbannedNodes);
					LSK.setSSL(false);
					return LSK.should.have
						.property('bannedNodes')
						.and.eql(defaultbannedNodes);
				});

				it('should select a node', () => {
					const callCount = selectNewNodeStub.callCount;
					LSK.setSSL(false);
					return selectNewNodeStub.should.have.callCount(callCount);
				});
			});
		});
	});

	describe('#broadcastTransactions', () => {
		let transactions;

		beforeEach(() => {
			transactions = [
				{
					key1: 'value1',
					key2: 2,
				},
				{
					key3: 'value3',
					key4: 4,
				},
			];
		});

		it('should call sendRequestPromise with a prepared request object', () => {
			return LSK.broadcastTransactions(transactions).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.should.be.calledWithExactly(
					POST,
					'transactions',
					transactions,
				);
			});
		});

		it('should resolve to the body of the result of sendRequestPromise', () => {
			return LSK.broadcastTransactions(transactions).then(result =>
				result.should.be.equal(defaultRequestPromiseResult.body),
			);
		});
	});

	describe('#broadcastTransaction', () => {
		let transaction;
		let broadcastTransactionsResult;
		let result;

		beforeEach(() => {
			transaction = {
				key1: 'value1',
				key2: 2,
			};
			broadcastTransactionsResult = { success: true };
			sandbox
				.stub(LSK, 'broadcastTransactions')
				.returns(broadcastTransactionsResult);
			result = LSK.broadcastTransaction(transaction);
			return result;
		});

		it('should wrap the transaction in an array and call broadcastTransactions', () => {
			return LSK.broadcastTransactions.should.be.calledWithExactly([
				transaction,
			]);
		});
		it('should return the result of broadcasting the transaction', () => {
			return result.should.equal(broadcastTransactionsResult);
		});
	});

	describe('#broadcastSignatures', () => {
		let signatures;

		beforeEach(() => {
			signatures = [
				{
					key1: 'value1',
					key2: 2,
				},
				{
					key3: 'value3',
					key4: 4,
				},
			];
		});

		it('should call sendRequestPromise with a prepared request object', () => {
			return LSK.broadcastSignatures(signatures).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.should.be.calledWithExactly(POST, 'signatures', {
					signatures,
				});
			});
		});

		it('should resolve to the body of the result of sendRequestPromise', () => {
			return LSK.broadcastSignatures(signatures).then(result =>
				result.should.be.equal(defaultRequestPromiseResult.body),
			);
		});
	});

	describe('#sendRequest', () => {
		const method = GET;
		const endpoint = 'transactions';
		let options;

		beforeEach(() => {
			options = {
				limit: 5,
				offset: 101,
			};
		});

		it('should return a promise with no options', () => {
			return new Promise(resolve => {
				LSK.sendRequest(method, endpoint).then(resolve);
			});
		});

		it('should return a promise with options', () => {
			return new Promise(resolve => {
				LSK.sendRequest(method, endpoint, options).then(resolve);
			});
		});

		it('should check options if provided', () => {
			return LSK.sendRequest(method, endpoint, options).then(() => {
				checkOptionsStub.should.be.calledWithExactly(options);
			});
		});

		it('should call sendRequestPromise with provided options', () => {
			return LSK.sendRequest(method, endpoint, options).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.firstCall.args[2].should.be.eql(
					defaultCheckedOptions,
				);
			});
		});

		it('should call sendRequestPromise with default options', () => {
			return LSK.sendRequest(method, endpoint).then(() => {
				sendRequestPromiseStub.should.be.calledOn(LSK);
				sendRequestPromiseStub.firstCall.args[2].should.be.eql(
					defaultCheckedOptions,
				);
			});
		});

		it('should handle timestamp is in future failures', () => {
			return LSK.sendRequest(method, endpoint, options).then(() => {
				handleTimestampIsInFutureFailuresStub.should.be.calledOn(LSK);
				handleTimestampIsInFutureFailuresStub.should.be.calledWithExactly(
					method,
					endpoint,
					defaultCheckedOptions,
					defaultRequestPromiseResult.body,
				);
			});
		});

		it('should catch promise rejections', () => {
			const error = new Error('oh no');
			handleTimestampIsInFutureFailuresStub.rejects(error);
			return LSK.sendRequest(method, endpoint, options).then(() => {
				handleSendRequestFailuresStub.should.be.calledOn(LSK);
				handleSendRequestFailuresStub.should.be.calledWithExactly(
					method,
					endpoint,
					defaultCheckedOptions,
					error,
				);
			});
		});
	});

	describe('API methods', () => {
		beforeEach(() => {
			sandbox.stub(LSK, 'sendRequest');
		});

		describe('#getAccount', () => {
			it('should get account information', () => {
				const address = '12731041415715717263L';
				const options = { address };

				LSK.getAccount(address);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'accounts',
					options,
				);
			});
		});

		describe('#getActiveDelegates', () => {
			it('should get active delegates', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getActiveDelegates(defaultRequestLimit);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					options,
				);
			});
		});

		describe('#getStandbyDelegates', () => {
			it('should get standby delegates', () => {
				const orderBy = 'rate:desc';
				const offset = '202';
				const options = {
					orderBy,
					offset,
					limit: defaultRequestLimit,
				};

				LSK.getStandbyDelegates(defaultRequestLimit, options);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					options,
				);
			});

			it('should get standby delegates with a default offset and ordering when not specified', () => {
				LSK.getStandbyDelegates(defaultRequestLimit);
				return LSK.sendRequest.should.be.calledWithExactly(GET, 'delegates', {
					limit: defaultRequestLimit,
					orderBy: defaultOrderBy,
					offset: defaultRequestOffset,
				});
			});
		});

		describe('#searchDelegatesByUsername', () => {
			it('should find delegates by name', () => {
				const searchTerm = 'light';
				const options = { search: searchTerm };

				LSK.searchDelegatesByUsername(searchTerm);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'delegates',
					options,
				);
			});
		});

		describe('#getBlocks', () => {
			it('should get a number of blocks according to requested limit', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getBlocks(defaultRequestLimit);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'blocks',
					options,
				);
			});
		});

		describe('#getForgedBlocks', () => {
			it('should get blocks for a given generator public key', () => {
				const generatorPublicKey =
					'130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0';
				const options = { generatorPublicKey };

				LSK.getForgedBlocks(generatorPublicKey);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'blocks',
					options,
				);
			});
		});

		describe('#getBlock', () => {
			it('should get a block for a given height', () => {
				const height = '2346638';
				const options = { height };

				LSK.getBlock(height);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'blocks',
					options,
				);
			});
		});

		describe('#getTransactions', () => {
			it('should get transactions for a given address', () => {
				const recipientAddress = '12731041415715717263L';
				const senderAddress = '15731041415715717263L';
				const orderBy = 'timestamp:desc';
				const options = {
					senderId: senderAddress,
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
					orderBy,
				};
				const expectedPassedOptions = {
					recipientId: recipientAddress,
					senderId: senderAddress,
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
					orderBy,
				};

				LSK.getTransactions(recipientAddress, options);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'transactions',
					expectedPassedOptions,
				);
			});
		});

		describe('#getTransaction', () => {
			it('should get a transaction by id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getTransaction(transactionId);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'transactions',
					options,
				);
			});
		});

		describe('#getVotes', () => {
			it('should get votes from a given address', () => {
				const address = '16010222169256538112L';
				const options = { address };

				LSK.getVotes(address);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'votes',
					options,
				);
			});
		});

		describe('#getVoters', () => {
			it('should get voters for a given delegate username', () => {
				const username = 'lightcurve';
				const options = { username };

				LSK.getVoters(username);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'voters',
					options,
				);
			});
		});

		describe('#getUnsignedMultisignatureTransactions', () => {
			it('should get all currently unsigned multisignature transactions', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getUnsignedMultisignatureTransactions(options);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'transactions/unsigned',
					options,
				);
			});
		});

		describe('#getDapp', () => {
			it('should get a dapp by transaction id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getDapp(transactionId);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'dapps',
					options,
				);
			});
		});

		describe('#getDapps', () => {
			it('should get dapps with options', () => {
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};

				LSK.getDapps(options);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'dapps',
					options,
				);
			});
		});

		describe('#getDappsByCategory', () => {
			it('should get dapps by category', () => {
				const category = 'blockchain';
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};
				const expectedPassedOptions = {
					category,
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};

				LSK.getDappsByCategory(category, options);
				return LSK.sendRequest.should.be.calledWithExactly(
					GET,
					'dapps',
					expectedPassedOptions,
				);
			});
		});

		describe('#transferLSK', () => {
			it('should transfer testnet LSK', () => {
				const recipientId = '10279923186189318946L';
				const options = {
					recipientId,
					amount: defaultAmount,
					passphrase: defaultPassphrase,
					secondPassphrase: defaultSecondPassphrase,
				};

				LSK.transferLSK(
					recipientId,
					defaultAmount,
					defaultPassphrase,
					defaultSecondPassphrase,
				);
				return LSK.sendRequest.should.be.calledWithExactly(
					POST,
					'transactions',
					options,
				);
			});
		});
	});
});
