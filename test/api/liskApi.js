import liskApi from '../../src/api/liskApi';
import privateApi from '../../src/api/privateApi';

describe('Lisk.api()', () => {
	const testPort = 7000;
	const livePort = 8000;
	const defaultSecret = 'secret';
	const GET = 'GET';
	const POST = 'POST';
	const defaultAddress = {
		publicKey: '5d036a858ce89f844491762eb89e2bfbd50a4a0a0da658e4b2628b25b117ae09',
		address: '18160565574430594874L',
	};
	const defaultRequestLimit = 10;
	const defaultRequestOffset = 101;

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

	describe('#listPeers', () => {
		it('should give a set of the peers', () => {
			(LSK.listPeers()).should.be.ok();
			(LSK.listPeers()).should.be.type('object');
			(LSK.listPeers()).should.have.property('official').have.property('length').be.equal(8);
			(LSK.listPeers()).should.have.property('testnet').have.property('length').be.equal(1);
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
				LSK.sendRequest(GET, 'delegates/', { limit: undefined }, () => {});
			}).should.throw('parameter value "limit" should not be undefined');
		});

		it('should not accept falsy options like NaN', () => {
			(function sendRequestWithNaNLimit() {
				LSK.sendRequest(GET, 'delegates/', { limit: NaN }, () => {});
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

	describe('#listActiveDelegates @now', () => {
		const expectedResponse = {
			body: {
				success: true,
				delegates: [{
					username: 'thepool',
					address: '10839494368003872009L',
					publicKey: 'b002f58531c074c7190714523eec08c48db8c7cfc0c943097db1a2e82ed87f84',
					vote: '2315391211431974',
					producedblocks: 13340,
					missedblocks: 373,
					rate: 1,
					rank: 1,
					approval: 21.64,
					productivity: 97.28,
				}],
			},
		};

		it('should list active delegates', () => {
			const callback = sinon.spy();
			const options = { limit: defaultRequestLimit };
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listActiveDelegates(defaultRequestLimit, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listStandbyDelegates', () => {
		const expectedResponse = {
			body: {
				success: true,
				delegates: [{
					username: 'bangomatic',
					address: '15360265865206254368L',
					publicKey: 'f54ce2a222ab3513c49e586464d89a2a7d9959ecce60729289ec0bb6106bd4ce',
					vote: '1036631485530636',
					producedblocks: 12218,
					missedblocks: 139,
					rate: 102,
					rank: 102,
					approval: 9.69,
					productivity: 0,
				}],
			},
		};

		it('should list standby delegates', () => {
			const callback = sinon.spy();
			const options = { limit: defaultRequestLimit, orderBy: 'rate:asc', offset: defaultRequestOffset };
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listStandbyDelegates(defaultRequestLimit, options, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'delegates', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});

		it('should list standby delegates without specifying offset or orderBy', () => {
			const callback = sinon.spy();
			const options = {};
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listStandbyDelegates(defaultRequestLimit, options, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'delegates', { limit: defaultRequestLimit, orderBy: 'rate:asc', offset: defaultRequestOffset }, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#searchDelegateByUsername', () => {
		const expectedResponse = {
			body: {
				success: true,
				delegates: [{
					username: 'oliver',
					address: '10872755118372042973L',
					publicKey: 'ac2e6931e5df386f3b8d278f9c14b6396ea6f2d8c6aab6e3bc9b857b3e136877',
					vote: '22499233987816',
					producedblocks: 0,
					missedblocks: 0,
				}],
			},
		};

		it('should find a delegate by name', () => {
			const callback = sinon.spy();
			const options = { username: 'oliver' };
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.searchDelegateByUsername('oliver', callback);

			(LSK.sendRequest.calledWithExactly(GET, 'delegates/search', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listBlocks', () => {
		const expectedResponse = {
			body: {
				success: true,
				blocks: [{
					id: '7650813318077105965',
					version: 0,
					timestamp: 30745470,
					height: 2852547,
					previousBlock: '15871436233132203555',
					numberOfTransactions: 0,
					totalAmount: 0,
					totalFee: 0,
					reward: 500000000,
					payloadLength: 0,
					payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					generatorPublicKey: 'b3953cb16e2457b9be78ad8c8a2985435dedaed5f0dd63443bdfbccc92d09f2d',
					generatorId: '6356913781456505636L',
					blockSignature: '2156b5b20bd338fd1d575ddd8550fd5675e80eec70086c31e60e797e30efdeede8075f7ac35db3f0c45fed787d1ffd7368a28a2642ace7ae529eb538a0a90705',
					confirmations: 1,
					totalForged: '500000000',
				}],
			},
		};

		it('should list amount of blocks defined', () => {
			const callback = sinon.spy();
			const options = { limit: '1' };
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listBlocks('1', callback);

			(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listForgedBlocks', () => {
		const expectedResponse = {
			body: {
				success: true,
			},
		};

		it('should list amount of ForgedBlocks', () => {
			const callback = sinon.spy();
			const key = '130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0';
			const options = { generatorPublicKey: key };
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listForgedBlocks(key, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#getBlock', () => {
		const expectedResponse = {
			body: {
				success: true,
				blocks: [{
					id: '5834892157785484325',
					version: 0,
					timestamp: 25656190,
					height: 2346638,
					previousBlock: '10341689082372310738',
					numberOfTransactions: 0,
					totalAmount: 0,
					totalFee: 0,
					reward: 500000000,
					payloadLength: 0,
					payloadHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					generatorPublicKey: '2cb967f6c73d9b6b8604d7b199271fed3183ff18ae0bd9cde6d6ef6072f83c05',
					generatorId: '9540619224043865035L',
					blockSignature: '0c0554e28adeeed7f1071cc5cba76b77340e0f406757e7a9e7ab80b1711856089ec743dd4954c2db10ca6e5e2dab79d48d15f7b5a08e59c29d622a1a20e1fd0d',
					confirmations: 506049,
					totalForged: '500000000',
				}],
				count: 1,
			},
		};

		it('should get a block of certain height', () => {
			const callback = sinon.spy();
			const blockId = '2346638';
			const options = { height: blockId };
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.getBlock(blockId, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'blocks', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listTransactions', () => {
		const expectedResponse = {
			body: {
				success: true,
				transactions: [{
					id: '16951900355716521650',
					height: 2845738,
					blockId: '10920144534340154099',
					type: 0,
					timestamp: 30676572,
					senderPublicKey: '2cb967f6c73d9b6b8604d7b199271fed3183ff18ae0bd9cde6d6ef6072f83c05',
					senderId: '9540619224043865035L',
					recipientId: '12731041415715717263L',
					recipientPublicKey: 'a81d59b68ba8942d60c74d10bc6488adec2ae1fa9b564a22447289076fe7b1e4',
					amount: 146537207,
					fee: 10000000,
					signature: 'b5b6aa065db4c47d2fa5b0d8568138460640216732e3926fdd7eff79f3f183e93ffe38f0e33a1b70c97d4dc9efbe61da55e94ab24ca34e134e71e94fa1b6f108',
					signatures: [],
					confirmations: 7406,
					asset: {},
				}],
				count: '120',
			},
		};


		it('should list transactions of a defined account', () => {
			const callback = sinon.spy();
			const recipientAddress = '12731041415715717263L';
			const senderAddress = '15731041415715717263L';
			const options = {
				recipientId: recipientAddress,
				senderId: senderAddress,
				limit: defaultRequestLimit,
				offset: defaultRequestOffset,
				orderBy: 'timestamp:desc',
			};
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listTransactions(recipientAddress, options, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'transactions', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#getTransaction', () => {
		const expectedResponse = {
			body: {
				success: true,
				transaction: {
					id: '7520138931049441691',
					height: 2346486,
					blockId: '11556561638256817055',
					type: 0,
					timestamp: 25654653,
					senderPublicKey: '632763673e5b3a0b704cd723d8c5bdf0be47e08210fe56a0c530f27ced6c228e',
					senderId: '1891806528760779417L',
					recipientId: '1813095620424213569L',
					recipientPublicKey: 'e01b6b8a9b808ec3f67a638a2d3fa0fe1a9439b91dbdde92e2839c3327bd4589',
					amount: 56340416586,
					fee: 10000000,
					signature: 'd04dc857e718af56ae3cff738ba22dce7da0118565675527ddf61d154cfea70afd11db1e51d6d9cce87e0780685396daab6f47cae74c22fa20638c9b71883d07',
					signatures: [],
					confirmations: 506685,
					asset: {},
				},
			},
		};

		it('should list a defined transaction', () => {
			const callback = sinon.spy();
			const transactionId = '7520138931049441691';
			const options = {
				id: transactionId,
			};
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.getTransaction(transactionId, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'transactions/get', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listVotes', () => {
		const expectedResponse = {
			body: {
				success: true,
				delegates: [{
					username: 'thepool',
					address: '10839494368003872009L',
					publicKey: 'b002f58531c074c7190714523eec08c48db8c7cfc0c943097db1a2e82ed87f84',
					vote: '2317408239538758',
					producedblocks: 13357,
					missedblocks: 373,
					rate: 1,
					rank: 1,
					approval: 21.66,
					productivity: 97.28,
				}],
			},
		};

		it('should list votes of an account', () => {
			const callback = sinon.spy();
			const address = '16010222169256538112L';
			const options = {
				address,
			};
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listVotes(address, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'accounts/delegates', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listVoters', () => {
		const expectedResponse = {
			body: {
				success: true,
				accounts: [{
					username: null,
					address: '7288548278191946381L',
					publicKey: '8c325dc9cabb3a81e40d7291a023a1574629600931fa21cc4fcd87b2d923214f',
					balance: '0',
				}],
			},
		};

		it('should list voters of an account', () => {
			const callback = sinon.spy();
			const publicKey = '6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a';
			const options = {
				publicKey,
			};
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.listVoters(publicKey, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'delegates/voters', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#getAccount', () => {
		const expectedResponse = {
			body: {
				success: true,
				account: {
					address: '12731041415715717263L',
					unconfirmedBalance: '7139704369275',
					balance: '7139704369275',
					publicKey: 'a81d59b68ba8942d60c74d10bc6488adec2ae1fa9b564a22447289076fe7b1e4',
					unconfirmedSignature: 1,
					secondSignature: 1,
					secondPublicKey: 'b823d706cec22383f9f10bb5095a66ed909d9224da0707168dad9d1c9cdef29c',
					multisignatures: [],
					u_multisignatures: [], // eslint-disable-line camelcase
				},
			},
		};

		it('should get account information', () => {
			const callback = sinon.spy();
			const address = '12731041415715717263L';
			const options = {
				address,
			};
			sinon.stub(LSK, 'sendRequest').callsArgWith(3, expectedResponse);

			LSK.getAccount(address, callback);

			(LSK.sendRequest.calledWithExactly(GET, 'accounts', options, callback)).should.be.true();
			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSK.sendRequest.restore();
		});
	});

	describe('#listMultisignatureTransactions', () => {
		it('should list all current not signed multisignature transactions', () => {
			return liskApi().listMultisignatureTransactions((result) => {
				(result).should.be.ok();
				(result).should.be.type('object');
			});
		});
	});

	describe('#getMultisignatureTransaction', () => {
		it('should get a multisignature transaction by id', () => {
			return liskApi().getMultisignatureTransaction('123', (result) => {
				(result).should.be.ok();
				(result).should.be.type('object');
			});
		});
	});

	describe('#sendLSK', () => {
		const expectedResponse = {
			body: { success: true, transactionId: '8921031602435581844' },
		};
		it('should send testnet LSK', () => {
			const options = {
				ssl: false,
				node: '',
				randomPeer: true,
				testnet: true,
				port: testPort,
				bannedPeers: [],
			};
			const callback = sinon.spy();
			const LSKnode = liskApi(options);
			const secret = 'soap arm custom rhythm october dove chunk force own dial two odor';
			const secondSecret = 'spider must salmon someone toe chase aware denial same chief else human';
			const recipient = '10279923186189318946L';
			const amount = 100000000;
			sinon.stub(LSKnode, 'sendRequest').callsArgWith(3, expectedResponse);

			LSKnode.sendLSK(recipient, amount, secret, secondSecret, callback);

			(LSKnode.sendRequest.calledWithExactly(POST, 'transactions', {
				recipientId: recipient,
				amount,
				secret,
				secondSecret,
			}, callback)).should.be.true();

			(callback.called).should.be.true();
			(callback.calledWithExactly(expectedResponse)).should.be.true();
			LSKnode.sendRequest.restore();
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


	describe('#constructRequestData @now', () => {
		const address = defaultAddress.address;
		const requestData = {
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};
		const expectedObject = {
			address: '18160565574430594874L',
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};
		const conflictObject = {
			address: '18160565574430594874',
			limit: 0,
			offset: 5,
		};
		const resolvedConflictObject = {
			address: '18160565574430594874',
			limit: defaultRequestLimit,
			offset: defaultRequestOffset,
		};

		it('should construct optional request data for API helper functions', () => {
			const createObject = privateApi.constructRequestData({ address }, requestData);
			(createObject).should.be.eql(expectedObject);
		});

		it('should construct with variable and callback', () => {
			const createObject = privateApi.constructRequestData({ address }, () => true);
			(createObject).should.be.eql({ address });
		});

		it('should give conflicting input, first parameters passed', () => {
			const createObject = privateApi.constructRequestData(
				{ limit: defaultRequestLimit, offset: defaultRequestOffset }, conflictObject,
			);
			(createObject).should.be.eql(resolvedConflictObject);
		});
	});
});
