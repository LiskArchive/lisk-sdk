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
import LiskAPI from '../../src/api/liskApi';
import privateApi from '../../src/api/privateApi';
import utils from '../../src/api/utils';

describe('Lisk API module', () => {
	const fixedPoint = 10 ** 8;
	const testPort = 7000;
	const livePort = 8000;
	const mainnetHash = 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
	const testnetHash = 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
	const defaultNethash = {
		'Content-Type': 'application/json',
		nethash: mainnetHash,
		broadhash: mainnetHash,
		os: 'lisk-js-api',
		version: '1.0.0',
		minVersion: '>=0.5.0',
		port: livePort,
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
	const defaultSecret = 'secret';
	const defaultSecondSecret = 'second secret';
	const GET = 'GET';
	const POST = 'POST';
	const defaultRequestLimit = 10;
	const defaultRequestOffset = 101;
	const defaultAmount = 1 * fixedPoint;
	const defaultOrderBy = 'rate:asc';
	const defaultBannedPeers = ['naughty1', 'naughty2', 'naughty3'];
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

	let selectNodeStub;
	let sendRequestPromiseStub;
	let checkOptionsStub;
	let handleTimestampIsInFutureFailuresStub;
	let handleSendRequestFailuresStub;
	let getFullURLStub;
	let LSK;

	beforeEach(() => {
		selectNodeStub = sinon
			.stub(privateApi, 'selectNode')
			.returns(defaultSelectedNode);
		sendRequestPromiseStub = sinon
			.stub(privateApi, 'sendRequestPromise')
			.resolves(Object.assign({}, defaultRequestPromiseResult));
		checkOptionsStub = sinon
			.stub(utils, 'checkOptions')
			.returns(Object.assign({}, defaultCheckedOptions));
		handleTimestampIsInFutureFailuresStub = sinon
			.stub(privateApi, 'handleTimestampIsInFutureFailures')
			.resolves(Object.assign({}, defaultRequestPromiseResult.body));
		handleSendRequestFailuresStub = sinon
			.stub(privateApi, 'handleSendRequestFailures');
		getFullURLStub = sinon
			.stub(privateApi, 'getFullURL')
			.returns(defaultUrl);

		LSK = new LiskAPI();
	});

	afterEach(() => {
		selectNodeStub.restore();
		sendRequestPromiseStub.restore();
		checkOptionsStub.restore();
		handleTimestampIsInFutureFailuresStub.restore();
		handleSendRequestFailuresStub.restore();
		getFullURLStub.restore();
	});

	describe('LiskAPI()', () => {
		it('should create a new instance of LiskAPI', () => {
			(LSK).should.be.type('object').and.be.instanceof(LiskAPI);
		});

		it('should set currentPeer string by default', () => {
			(LSK).should.have.property('currentPeer').and.be.type('string');
		});

		describe('with testnet equal to true', () => {
			beforeEach(() => {
				LSK = new LiskAPI({ testnet: true });
			});

			it('should set the port to 7000', () => {
				(LSK).should.have.property('port').be.equal(testPort);
			});

			it('should set testnet to true', () => {
				(LSK).should.have.property('testnet').be.equal(true);
			});
		});
	});

	describe('#getNethash', () => {
		it('should provide default mainnet nethash values', () => {
			(LSK.getNethash()).should.eql(defaultNethash);
		});

		it('should provide default testnet nethash values', () => {
			LSK = new LiskAPI({ testnet: true });
			(LSK.getNethash()).should.eql(testnetNethash);
		});

		it('should get values for a custom nethash', () => {
			(LSK.getNethash('123')).should.be.eql(customNethash);
		});
	});

	describe('#getPeers', () => {
		it('should get a set of peers', () => {
			(LSK.getPeers()).should.be.type('object');
		});

		it('should list 8 official peers', () => {
			const peers = LSK.getPeers();
			(peers).should.have.property('official').have.property('length').be.equal(8);
			peers.official.forEach((peer) => {
				(peer).should.have.property('node').and.be.type('string');
			});
		});

		it('should list 8 ssl peers', () => {
			const peers = LSK.getPeers();
			(peers).should.have.property('ssl').have.property('length').be.equal(8);
			peers.ssl.forEach((peer) => {
				(peer).should.have.property('node').and.be.type('string');
				(peer).should.have.property('ssl').and.be.true();
			});
		});

		it('should list 1 testnet peer', () => {
			const peers = LSK.getPeers();
			(peers).should.have.property('testnet').have.property('length').be.equal(1);
			peers.testnet.forEach((peer) => {
				(peer).should.have.property('node').and.be.type('string');
				(peer).should.have.property('testnet').and.be.true();
			});
		});
	});

	describe('#setNode', () => {
		it('should set current peer to a provided node', () => {
			const myOwnNode = 'myOwnNode.com';
			LSK.setNode(myOwnNode);

			(LSK).should.have.property('currentPeer').and.be.equal(myOwnNode);
		});

		it('should select a node when called with undefined', () => {
			const callCount = selectNodeStub.callCount;
			LSK.setNode();

			(selectNodeStub.callCount).should.be.equal(callCount + 1);
			(LSK).should.have.property('currentPeer').and.be.equal(defaultSelectedNode);
		});
	});

	describe('#setTestnet', () => {
		describe('to true', () => {
			beforeEach(() => {
				LSK.setTestnet(true);
			});

			it('should set testnet to true', () => {
				(LSK).should.have.property('testnet').and.be.true();
			});

			it('should set port to 7000', () => {
				(LSK).should.have.property('port').and.be.equal(testPort);
			});

			it('should select a node', () => {
				const callCount = selectNodeStub.callCount;
				LSK.setTestnet(true);
				(selectNodeStub.callCount).should.be.equal(callCount + 1);
			});
		});

		describe('to false', () => {
			beforeEach(() => {
				LSK.setTestnet(false);
			});

			it('should set testnet to false', () => {
				(LSK).should.have.property('testnet').and.be.false();
			});

			it('should set port to 8000', () => {
				(LSK).should.have.property('port').and.be.equal(livePort);
			});

			it('should select a node', () => {
				const callCount = selectNodeStub.callCount;
				LSK.setTestnet(true);
				(selectNodeStub.callCount).should.be.equal(callCount + 1);
			});
		});

		describe('banned peers', () => {
			beforeEach(() => {
				LSK.bannedPeers = [].concat(defaultBannedPeers);
			});

			describe('when initially on mainnet', () => {
				it('should reset banned peers when switching from mainnet to testnet', () => {
					LSK.setTestnet(true);
					(LSK).should.have.property('bannedPeers').and.be.Array().and.be.empty();
				});

				it('should not reset banned peers when switching from mainnet to mainnet', () => {
					LSK.setTestnet(false);
					(LSK).should.have.property('bannedPeers').and.be.eql(defaultBannedPeers);
				});
			});

			describe('when initially on testnet', () => {
				beforeEach(() => {
					LSK.testnet = true;
				});

				it('should reset banned peers when switching from testnet to mainnet', () => {
					LSK.setTestnet(false);
					(LSK).should.have.property('bannedPeers').and.be.Array().and.be.empty();
				});

				it('should not reset banned peers when switching from testnet to testnet', () => {
					LSK.setTestnet(true);
					(LSK).should.have.property('bannedPeers').and.be.eql(defaultBannedPeers);
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
					(LSK).should.have.property('ssl').and.be.true();
				});

				it('should not change bannedPeers', () => {
					LSK.bannedPeers = [].concat(defaultBannedPeers);
					LSK.setSSL(true);
					(LSK).should.have.property('bannedPeers').and.eql(defaultBannedPeers);
				});

				it('should not select a node', () => {
					const callCount = selectNodeStub.callCount;
					LSK.setSSL(true);
					(selectNodeStub.callCount).should.equal(callCount);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.setSSL(false);
					(LSK).should.have.property('ssl').and.be.false();
				});

				it('should reset bannedPeers', () => {
					LSK.bannedPeers = [].concat(defaultBannedPeers);
					LSK.setSSL(false);
					(LSK).should.have.property('bannedPeers').and.be.Array().and.be.empty();
				});

				it('should select a node', () => {
					const callCount = selectNodeStub.callCount;
					LSK.setSSL(false);
					(selectNodeStub.callCount).should.equal(callCount + 1);
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
					(LSK).should.have.property('ssl').and.be.true();
				});

				it('should reset bannedPeers', () => {
					LSK.bannedPeers = [].concat(defaultBannedPeers);
					LSK.setSSL(true);
					(LSK).should.have.property('bannedPeers').and.be.Array().and.be.empty();
				});

				it('should select a node', () => {
					const callCount = selectNodeStub.callCount;
					LSK.setSSL(true);
					(selectNodeStub.callCount).should.equal(callCount + 1);
				});
			});

			describe('when set to false', () => {
				it('should have ssl set to false', () => {
					LSK.setSSL(false);
					(LSK).should.have.property('ssl').and.be.false();
				});

				it('should not change bannedPeers', () => {
					LSK.bannedPeers = [].concat(defaultBannedPeers);
					LSK.setSSL(false);
					(LSK).should.have.property('bannedPeers').and.eql(defaultBannedPeers);
				});

				it('should select a node', () => {
					const callCount = selectNodeStub.callCount;
					LSK.setSSL(false);
					(selectNodeStub.callCount).should.equal(callCount);
				});
			});
		});
	});

	describe('#broadcastSignedTransaction', () => {
		it('should use getFullURL to get the url', () => {
			return new Promise((resolve) => {
				LSK.broadcastSignedTransaction({}, resolve);
			})
				.then(() => {
					(getFullURLStub.calledOn(LSK)).should.be.true();
				});
		});

		it('should call sendRequestPromise with a prepared request object', () => {
			const transaction = {
				key1: 'value1',
				key2: 2,
			};
			const requestObject = {
				requestUrl: `${defaultUrl}/api/transactions`,
				nethash: defaultNethash,
				requestParams: { transaction },
			};

			return new Promise((resolve) => {
				LSK.broadcastSignedTransaction(transaction, resolve);
			})
				.then(() => {
					(sendRequestPromiseStub.calledOn(LSK)).should.be.true();
					(sendRequestPromiseStub.calledWithExactly(POST, requestObject)).should.be.true();
				});
		});

		it('should call the callback with the body of the result of sendRequestPromise', () => {
			return new Promise((resolve) => {
				LSK.broadcastSignedTransaction({}, resolve);
			})
				.then((result) => {
					(result).should.be.equal(defaultRequestPromiseResult.body);
				});
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

		it('should call a callback if provided with no options', () => {
			return new Promise((resolve) => {
				LSK.sendRequest(method, endpoint, resolve);
			});
		});

		it('should call a callback if provided with options', () => {
			return new Promise((resolve) => {
				LSK.sendRequest(method, endpoint, options, resolve);
			});
		});

		it('should return a promise if no callback is provided with no options', () => {
			return new Promise((resolve) => {
				LSK.sendRequest(method, endpoint)
					.then(resolve);
			});
		});

		it('should return a promise if no callback is provided with options', () => {
			return new Promise((resolve) => {
				LSK.sendRequest(method, endpoint, options)
					.then(resolve);
			});
		});

		it('should check options if provided', () => {
			return LSK.sendRequest(method, endpoint, options)
				.then(() => {
					(checkOptionsStub.calledWithExactly(options)).should.be.true();
				});
		});

		it('should call sendRequestPromise with provided options', () => {
			return LSK.sendRequest(method, endpoint, options)
				.then(() => {
					(sendRequestPromiseStub.calledOn(LSK)).should.be.true();
					(sendRequestPromiseStub.firstCall.args[2]).should.be.eql(defaultCheckedOptions);
				});
		});

		it('should call sendRequestPromise with default options', () => {
			return LSK.sendRequest(method, endpoint)
				.then(() => {
					(sendRequestPromiseStub.calledOn(LSK)).should.be.true();
					(sendRequestPromiseStub.firstCall.args[2]).should.be.eql({});
				});
		});

		it('should handle timestamp is in future failures', () => {
			return LSK.sendRequest(method, endpoint, options)
				.then(() => {
					(handleTimestampIsInFutureFailuresStub.calledOn(LSK)).should.be.true();
					(handleTimestampIsInFutureFailuresStub.calledWithExactly(
						method, endpoint, defaultCheckedOptions, defaultRequestPromiseResult.body,
					))
						.should.be.true();
				});
		});

		it('should catch promise rejections', () => {
			const error = new Error('oh no');
			handleTimestampIsInFutureFailuresStub.rejects(error);
			return LSK.sendRequest(method, endpoint, options)
				.then(() => {
					(handleSendRequestFailuresStub.calledOn(LSK)).should.be.true();
					(handleSendRequestFailuresStub.calledWithExactly(
						method, endpoint, defaultCheckedOptions, error,
					))
						.should.be.true();
				});
		});
	});

	describe('API methods', () => {
		let callback;
		let sendRequestStub;

		beforeEach(() => {
			callback = () => {};
			sendRequestStub = sinon.stub(LSK, 'sendRequest');
		});

		afterEach(() => {
			sendRequestStub.restore();
		});

		describe('#getAccount', () => {
			it('should get account information', () => {
				const address = '12731041415715717263L';
				const options = { address };

				LSK.getAccount(address, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'accounts', options, callback)).should.be.true();
			});
		});

		describe('#getActiveDelegates', () => {
			it('should get active delegates', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getActiveDelegates(defaultRequestLimit, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
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

				LSK.getStandbyDelegates(defaultRequestLimit, options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
			});

			it('should get standby delegates with a default offset and ordering when not specified', () => {
				LSK.getStandbyDelegates(defaultRequestLimit, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', { limit: defaultRequestLimit, orderBy: defaultOrderBy, offset: defaultRequestOffset }, callback)).should.be.true();
			});
		});

		describe('#searchDelegatesByUsername', () => {
			it('should find delegates by name', () => {
				const searchTerm = 'light';
				const options = { search: searchTerm };

				LSK.searchDelegatesByUsername(searchTerm, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
			});
		});

		describe('#getBlocks', () => {
			it('should get a number of blocks according to requested limit', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getBlocks(defaultRequestLimit, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			});
		});

		describe('#getForgedBlocks', () => {
			it('should get blocks for a given generator public key', () => {
				const generatorPublicKey = '130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0';
				const options = { generatorPublicKey };

				LSK.getForgedBlocks(generatorPublicKey, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			});
		});

		describe('#getBlock', () => {
			it('should get a block for a given height', () => {
				const height = '2346638';
				const options = { height };

				LSK.getBlock(height, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
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

				LSK.getTransactions(recipientAddress, options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'transactions', expectedPassedOptions, callback)).should.be.true();
			});
		});

		describe('#getTransaction', () => {
			it('should get a transaction by id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getTransaction(transactionId, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'transactions', options, callback)).should.be.true();
			});
		});

		describe('#getVotes', () => {
			it('should get votes from a given address', () => {
				const address = '16010222169256538112L';
				const options = { address };

				LSK.getVotes(address, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'votes', options, callback)).should.be.true();
			});
		});

		describe('#getVoters', () => {
			it('should get voters for a given delegate username', () => {
				const username = 'lightcurve';
				const options = { username };

				LSK.getVoters(username, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'voters', options, callback)).should.be.true();
			});
		});

		describe('#getUnsignedMultisignatureTransactions', () => {
			it('should get all currently unsigned multisignature transactions', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getUnsignedMultisignatureTransactions(options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'transactions/unsigned', options, callback)).should.be.true();
			});
		});

		describe('#getDapp', () => {
			it('should get a dapp by transaction id', () => {
				const transactionId = '7520138931049441691';
				const options = { transactionId };

				LSK.getDapp(transactionId, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'dapps', options, callback)).should.be.true();
			});
		});

		describe('#getDapps', () => {
			it('should get dapps with options', () => {
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};

				LSK.getDapps(options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'dapps', options, callback)).should.be.true();
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

				LSK.getDappsByCategory(category, options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'dapps', expectedPassedOptions, callback)).should.be.true();
			});
		});

		describe('#sendLSK', () => {
			it('should send testnet LSK', () => {
				const recipientId = '10279923186189318946L';
				const options = {
					recipientId,
					amount: defaultAmount,
					secret: defaultSecret,
					secondSecret: defaultSecondSecret,
				};

				LSK.sendLSK(recipientId, defaultAmount, defaultSecret, defaultSecondSecret, callback);
				(LSK.sendRequest.calledWithExactly(POST, 'transactions', options, callback)).should.be.true();
			});
		});
	});
});
