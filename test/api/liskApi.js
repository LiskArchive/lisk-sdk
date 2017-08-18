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
import liskApi from '../../src/api/liskApi';
import privateApi from '../../src/api/privateApi';

describe('Lisk.api()', () => {
	const fixedPoint = 10 ** 8;
	const testPort = 7000;
	const livePort = 8000;
	const defaultSecret = 'secret';
	const defaultSecondSecret = 'second secret';
	const GET = 'GET';
	const POST = 'POST';
	const defaultAddress = {
		publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		address: '18160565574430594874L',
	};
	const defaultRequestLimit = 10;
	const defaultRequestOffset = 101;
	const defaultAmount = 1 * fixedPoint;
	const defaultOrderBy = 'rate:asc';

	let LSK;

	beforeEach(() => {
		LSK = liskApi();
	});

	describe('liskApi()', () => {
		it('should create a new instance when using liskApi()', () => {
			(LSK).should.be.ok();
		});

		it('new liskApi() should be Object', () => {
			(LSK).should.be.type('object');
		});

		it('should use testnet peer for testnet settings', () => {
			LSK = liskApi({ testnet: true });
			(LSK).should.have.property('port').be.equal(testPort);
			(LSK).should.have.property('testnet').be.equal(true);
		});

		it('currentPeer should be set by default', () => {
			(LSK).should.have.property('currentPeer').be.ok();
		});
	});

	describe('#getPeers', () => {
		it('should get a set of peers', () => {
			(LSK.getPeers()).should.be.ok();
			(LSK.getPeers()).should.be.type('object');
			(LSK.getPeers()).should.have.property('official').have.property('length').be.equal(8);
			(LSK.getPeers()).should.have.property('testnet').have.property('length').be.equal(1);
		});
	});

	describe('#getNethash', () => {
		const defaultNethash = {
			'Content-Type': 'application/json',
			nethash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			broadhash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			os: 'lisk-js-api',
			version: '1.0.0',
			minVersion: '>=0.5.0',
			port: livePort,
		};
		const testnetNethash = Object.assign({}, defaultNethash, {
			nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			broadhash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			port: testPort,
		});
		const customNethash = Object.assign({}, defaultNethash, {
			nethash: '123',
			version: '0.0.0a',
			port: livePort,
		});

		it('nethash should provide default values', () => {
			(LSK.getNethash()).should.eql(defaultNethash);
		});

		it('should provide correct nethash for testnet', () => {
			LSK.setTestnet(true);
			(LSK.getNethash()).should.eql(testnetNethash);
		});

		it('should be possible to use my own nethash', () => {
			LSK = liskApi({ nethash: '123' });
			(LSK).should.have.property('nethash').be.eql(customNethash);
		});
	});

	describe('#setTestnet', () => {
		it('should set testnet to true', () => {
			LSK.setTestnet(true);
			(LSK).should.have.property('testnet').be.true();
		});

		it('should set testnet to false', () => {
			LSK.setTestnet(false);
			(LSK).should.have.property('testnet').be.false();
		});
	});

	describe('#setNode', () => {
		it('should be able to set my own node', () => {
			const myOwnNode = 'myOwnNode.com';
			LSK.setNode(myOwnNode);

			(LSK).should.have.property('currentPeer').be.equal(myOwnNode);
		});

		it('should select a node when not explicitly set', () => {
			LSK.setNode();

			(LSK).should.have.property('currentPeer').be.ok();
		});
	});

	describe('#getAddressFromSecret', () => {
		it('should create correct address and publicKey', () => {
			(LSK.getAddressFromSecret(defaultSecret)).should.eql(defaultAddress);
		});
	});

	describe('#sendRequest', () => {
		it('should receive block height from a random public peer', () => {
			const expectedResponse = {
				body: {
					success: true,
					height: 2850466,
				},
			};
			const stub = sinon.stub(privateApi, 'sendRequestPromise').resolves(expectedResponse);

			return LSK.sendRequest(GET, 'blocks/getHeight', (data) => {
				(data).should.be.ok();
				(data).should.be.type('object');
				(data).should.have.property('success').be.true();
				stub.restore();
			});
		});
	});

	describe('#checkOptions', () => {
		it('should not accept falsy options like undefined', () => {
			(function sendRequestWithUndefinedLimit() {
				LSK.sendRequest(GET, 'delegates', { limit: undefined }, () => {});
			}).should.throw('parameter value "limit" should not be undefined');
		});

		it('should not accept falsy options like NaN', () => {
			(function sendRequestWithNaNLimit() {
				LSK.sendRequest(GET, 'delegates', { limit: NaN }, () => {});
			}).should.throw('parameter value "limit" should not be NaN');
		});
	});

	describe('#sendRequest with promise', () => {
		it('should be able to use sendRequest as a promise for GET', () => {
			return liskApi().sendRequest(GET, 'blocks/getHeight', {}).then((result) => {
				(result).should.be.type('object');
				(result.success).should.be.equal(true);
				(result.height).should.be.type('number');
			});
		});

		it('should be able to use sendRequest as a promise for POST', () => {
			const options = {
				ssl: false,
				node: '',
				randomPeer: true,
				testnet: true,
				port: testPort,
				bannedPeers: [],
			};

			const LSKnode = liskApi(options);
			const secret = 'soap arm custom rhythm october dove chunk force own dial two odor';
			const secondSecret = 'spider must salmon someone toe chase aware denial same chief else human';
			const recipient = '10279923186189318946L';
			const amount = 100000000;

			return LSKnode.sendRequest(GET, 'transactions', { recipientId: recipient, secret, secondSecret, amount }).then((result) => {
				(result).should.be.type('object');
				(result).should.be.ok();
			});
		});

		it('should retry timestamp in future failures', () => {
			const successResponse = { body: { success: true } };
			const futureTimestampResponse = {
				body: { success: false, message: 'Invalid transaction timestamp. Timestamp is in the future' },
			};
			const stub = sinon.stub(privateApi, 'sendRequestPromise');
			const spy = sinon.spy(LSK, 'sendRequest');
			stub.resolves(futureTimestampResponse);
			stub.onThirdCall().resolves(successResponse);

			return LSK.sendRequest(GET, 'transactions')
				.then(() => {
					(spy.callCount).should.equal(3);
					(spy.args[1][2]).should.have.property('timeOffset').equal(10);
					(spy.args[2][2]).should.have.property('timeOffset').equal(20);
					stub.restore();
					spy.restore();
				});
		});

		it('should not retry timestamp in future failures forever', () => {
			const thisLSK = liskApi();
			const futureTimestampResponse = {
				body: { success: false, message: 'Invalid transaction timestamp. Timestamp is in the future' },
			};
			const stub = sinon.stub(privateApi, 'sendRequestPromise');
			const spy = sinon.spy(thisLSK, 'sendRequest');
			stub.resolves(futureTimestampResponse);

			return thisLSK.sendRequest(GET, 'transactions')
				.then((response) => {
					(response).should.equal(futureTimestampResponse.body);
					stub.restore();
					spy.restore();
				});
		});
	});

	describe('API Functions', () => {
		let callback;
		let stub;

		beforeEach(() => {
			callback = sinon.spy();
			stub = sinon.stub(LSK, 'sendRequest');
		});

		afterEach(() => {
			stub.restore();
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
				const options = { orderBy, offset, limit: defaultRequestLimit };

				LSK.getStandbyDelegates(defaultRequestLimit, options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
			});

			it('should get standby delegates with a default offset and ordering when not specified', () => {
				const options = {};

				LSK.getStandbyDelegates(defaultRequestLimit, options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', { limit: defaultRequestLimit, orderBy: defaultOrderBy, offset: defaultRequestOffset }, callback)).should.be.true();
			});
		});

		describe('#searchDelegatesByUsername', () => {
			it('should find delegates by name', () => {
				const options = { search: 'oliver' };

				LSK.searchDelegatesByUsername('oliver', callback);
				(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
			});
		});

		describe('#getBlocks', () => {
			it('should get amount of blocks defined', () => {
				const options = { limit: defaultRequestLimit };

				LSK.getBlocks(defaultRequestLimit, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			});
		});

		describe('#getForgedBlocks', () => {
			it('should get amount of ForgedBlocks', () => {
				const key = '130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0';
				const options = { generatorPublicKey: key };

				LSK.getForgedBlocks(key, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			});
		});

		describe('#getBlock', () => {
			it('should get a block of certain height', () => {
				const blockId = '2346638';
				const options = { height: blockId };

				LSK.getBlock(blockId, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			});
		});

		describe('#getTransactions', () => {
			it('should get transactions of a defined account', () => {
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
			it('should get a defined transaction', () => {
				const transactionId = '7520138931049441691';
				const options = {
					transactionId,
				};

				LSK.getTransaction(transactionId, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'transactions', options, callback)).should.be.true();
			});
		});

		describe('#getVotes', () => {
			it('should get votes of an account', () => {
				const address = '16010222169256538112L';
				const options = {
					address,
				};

				LSK.getVotes(address, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'votes', options, callback)).should.be.true();
			});
		});

		describe('#getVoters', () => {
			it('should get voters of an account', () => {
				const username = 'lightcurve';
				const options = {
					username,
				};

				LSK.getVoters(username, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'voters', options, callback)).should.be.true();
			});
		});

		describe('#getAccount', () => {
			it('should get account information', () => {
				const address = '12731041415715717263L';
				const options = {
					address,
				};

				LSK.getAccount(address, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'accounts', options, callback)).should.be.true();
			});
		});

		describe('#getUnsignedMultisignatureTransactions', () => {
			it('should get all current unsigned multisignature transactions', () => {
				const transactionId = '7520138931049441691';
				const options = {
					transactionId,
				};
				LSK.getUnsignedMultisignatureTransactions(options, callback);
				(LSK.sendRequest.calledWithExactly(GET, 'transactions/unsigned', options, callback)).should.be.true();
			});
		});

		describe('#getDapp', () => {
			it('should get a dapp by transactiondId', () => {
				const transactionId = '7520138931049441691';
				const options = {
					transactionId,
				};
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
				const options = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
				};
				const expectedPassedOptions = {
					limit: defaultRequestLimit,
					offset: defaultRequestOffset,
					category: 'blockchain',
				};
				LSK.getDappsByCategory('blockchain', options, callback);
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

	describe('#broadcastSignedTransaction', () => {
		it('should be able to broadcast a finished and signed transaction', () => {
			const LSKAPI = liskApi({ testnet: true });
			const transaction = {
				type: 0,
				amount: 100000,
				fee: 10000000,
				recipientId: '1859190791819301L',
				senderPublicKey: 'a056010eed1ad3233d7872a5e158d90a777a6d894a3c0ec7ff1a2ddfd393f530',
				timestamp: 38349628,
				asset: {},
				signature: '2a36c96669bd8eeae22a3b8bb88ad8ddc519777cade7526e70cd77a608c4bed218e34a6bf82921fcc85ec54390bcb6fd9212c46e70b499f65f6db54dfe69250f',
				id: '15207344917078411810',
			};

			return LSKAPI.broadcastSignedTransaction(transaction, (result) => {
				(result.success).should.be.true();
			});
		});
	});


	describe('#constructRequestData', () => {
		const { address } = defaultAddress;
		const optionsObject = {
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};
		const expectedObject = {
			address: '18160565574430594874L',
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};
		const optionsWithConflictObject = {
			address: '123L',
			limit: 4,
			offset: 5,
		};
		const resolvedConflictObject = {
			address: '123L',
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};

		it('should merge a data object with an options object', () => {
			const requestData = privateApi.constructRequestData({ address }, optionsObject);
			(requestData).should.be.eql(expectedObject);
		});

		it('should recognise when a callback function is passed instead of an options object', () => {
			const requestData = privateApi.constructRequestData({ address }, () => true);
			(requestData).should.be.eql({ address });
		});

		it('should prioritise values from the data object when the data object and options object conflict', () => {
			const requestData = privateApi.constructRequestData(
				{ limit: defaultRequestLimit, offset: defaultRequestOffset }, optionsWithConflictObject,
			);
			(requestData).should.be.eql(resolvedConflictObject);
		});
	});
});
