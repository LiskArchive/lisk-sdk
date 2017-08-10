// import liskApi from '../../src/api/liskApi';
import privateApi from '../../src/api/privateApi';

describe('privateApi', () => {
	const testPort = 7000;
	// const livePort = 8000;
	const localNode = 'localhost';
	const externalNode = 'external';
	const defaultSecret = 'secret';
	// const defaultSecondSecret = 'second secret';

	let LSK;

	beforeEach(() => {
		LSK = {
			options: {
				node: localNode,
				randomPeer: false,
			},
			currentPeer: localNode,
			defaultPeers: [localNode, externalNode],
			defaultSSLPeers: [localNode, externalNode],
			bannedPeers: [],
			port: testPort,

			parseOfflineRequests: () => ({
				requestMethod: 'GET',
			}),
		};
	});

	describe('#selectNode', () => {
		it('should return the node from initial settings when set', () => {
			(privateApi.selectNode.call(LSK)).should.be.equal(localNode);
		});
	});

	describe('#getRandomPeer', () => {
		// LSK = liskApi({ port: testPort, node: localNode, ssl: true, randomPeer: false });
		it('should give a random peer', () => {
			(privateApi.getRandomPeer.call(LSK)).should.be.ok();
		});
	});

	describe('#banNode', () => {
		it('should add current node to banned peers', () => {
			const currentNode = LSK.currentPeer;
			privateApi.banNode.call(LSK);

			(LSK.bannedPeers).should.containEql(currentNode);
		});
	});

	describe('#getFullUrl', () => {
		it('should give the full url inclusive port', () => {
			const fullUrl = `http://${localNode}:${testPort}`;

			(privateApi.getFullUrl.call(LSK)).should.be.equal(fullUrl);
		});

		it('should give the full url without port and with SSL', () => {
			LSK.port = '';
			LSK.ssl = true;
			const fullUrl = `https://${localNode}`;

			(privateApi.getFullUrl.call(LSK)).should.be.equal(fullUrl);
		});
	});

	describe('#getURLPrefix', () => {
		it('should be http when ssl is false', () => {
			LSK.ssl = false;

			(privateApi.getURLPrefix.call(LSK)).should.be.equal('http');
		});

		it('should be https when ssl is true', () => {
			LSK.ssl = true;

			(privateApi.getURLPrefix.call(LSK)).should.be.equal('https');
		});
	});

	describe('#serialiseHttpData', () => {
		it('should create a http string from an object and trim.', () => {
			const myObj = {
				obj: ' myval',
				key: 'my2ndval ',
			};

			const serialised = privateApi.serialiseHttpData(myObj);

			(serialised).should.be.equal('?obj=myval&key=my2ndval');
		});
	});

	describe('#checkRequest', () => {
		describe('should identify GET requests', () => {
			it('api/loader/status', () => {
				const requestType = 'api/loader/status';
				const options = '';
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('GET');
			});

			it('api/loader/status/sync', () => {
				const requestType = 'api/loader/status/sync';
				const options = '';
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('GET');
			});

			it('api/loader/status/ping', () => {
				const requestType = 'api/loader/status/ping';
				const options = '';
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('GET');
			});

			it('api/transactions', () => {
				const requestType = 'api/transactions';
				const options = { blockId: '123', senderId: '123' };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('GET');
			});
		});

		describe('should identify POST requests', () => {
			beforeEach(() => {
				LSK.parseOfflineRequests = () => ({
					requestMethod: 'POST',
				});
			});

			it('accounts/generatePublicKey', () => {
				const requestType = 'accounts/generatePublicKey';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('POST');
			});
			it('accounts/open', () => {
				const requestType = 'accounts/open';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('POST');
			});
			it('multisignatures/sign', () => {
				const requestType = 'multisignatures/sign';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('POST');
			});
		});

		describe('should identify PUT requests', () => {
			beforeEach(() => {
				LSK.parseOfflineRequests = () => ({
					requestMethod: 'PUT',
				});
			});

			it('accounts/delegates', () => {
				const requestType = 'accounts/delegates';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('PUT');
			});

			it('signatures', () => {
				const requestType = 'signatures';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('PUT');
			});

			it('transactions', () => {
				const requestType = 'transactions';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('PUT');
			});
		});

		describe('should identify NOACTION requests', () => {
			beforeEach(() => {
				LSK.parseOfflineRequests = () => ({
					requestMethod: 'NOACTION',
				});
			});

			it('enable forging', () => {
				const requestType = 'delegates/forging/enable';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('NOACTION');
			});

			it('uninstall dapp', () => {
				const requestType = 'dapps/uninstall';
				const options = { secret: defaultSecret };
				const checkRequestAnswer = privateApi.checkRequest.call(LSK, requestType, options);

				(checkRequestAnswer).should.be.ok();
				(checkRequestAnswer).should.be.equal('NOACTION');
			});
		});
	});

	describe.skip('#checkOptions', () => {
		it('should not accept falsy options like undefined', () => {
			(function sendRequestWithUndefinedLimit() {
				LSK.sendRequest('delegates/', { limit: undefined }, () => {});
			}).should.throw('parameter value "limit" should not be undefined');
		});

		it('should not accept falsy options like NaN', () => {
			(function sendRequestWithNaNLimit() {
				LSK.sendRequest('delegates/', { limit: NaN }, () => {});
			}).should.throw('parameter value "limit" should not be NaN');
		});
	});

	describe('#changeRequest', () => {
		it('should give the correct parameters for GET requests', () => {
			const requestType = 'transactions';
			const options = { blockId: '123', senderId: '123' };
			const checkRequestAnswer = privateApi.changeRequest.call(LSK, requestType, options);

			const output = {
				nethash: '',
				requestMethod: 'GET',
				requestParams: {
					blockId: '123',
					senderId: '123',
				},
				requestUrl: `http://${localNode}:${testPort}/api/transactions?blockId=123&senderId=123`,
			};

			(checkRequestAnswer).should.be.ok();
			(checkRequestAnswer).should.be.eql(output);
		});

		it('should give the correct parameters for GET requests with parameters', () => {
			const requestType = 'delegates/search/';
			const options = { q: 'oliver' };
			const checkRequestAnswer = privateApi.changeRequest.call(LSK, requestType, options);

			const output = {
				nethash: '',
				requestMethod: 'GET',
				requestParams: {
					q: 'oliver',
				},
				requestUrl: `http://${localNode}:${testPort}/api/delegates/search/?q=oliver`,
			};

			(checkRequestAnswer).should.be.ok();
			(checkRequestAnswer).should.be.eql(output);
		});

		it('should give the correct parameters for NOACTION requests', () => {
			const requestType = 'delegates/forging/enable';
			const options = { secret: defaultSecret };
			// const thisLSK = liskApi({ node: localNode });
			const checkRequestAnswer = privateApi.changeRequest.call(LSK, requestType, options);

			const output = {
				nethash: '',
				requestMethod: '',
				requestParams: '',
				requestUrl: '',
			};

			(checkRequestAnswer).should.be.ok();
			(checkRequestAnswer).should.be.eql(output);
		});
	});

	describe('#checkReDial', () => {
		it('should check if all the peers are already banned', () => {
			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
		});

		it('should be able to get a new node when current one is not reachable', () => {
			// return liskApi({
			// 	node: externalNode,
			// 	randomPeer: true,
			// }).sendRequest('blocks/getHeight', {}, (result) => {
			// 	(result).should.be.type('object');
			// });
		});

		it('should recognize that now all the peers are banned for mainnet', () => {
			LSK.bannedPeers = LSK.defaultPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should recognize that now all the peers are banned for testnet', () => {
			// const thisLSK = liskApi({ testnet: true });
			LSK.bannedPeers = LSK.defaultTestnetPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should recognize that now all the peers are banned for ssl', () => {
			// const thisLSK = liskApi({ ssl: true });
			LSK.bannedPeers = LSK.defaultSSLPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should stop redial when all the peers are banned already', () => {
			LSK.bannedPeers = LSK.defaultPeers;
			LSK.currentPeer = '';

			return LSK.sendRequest('blocks/getHeight').then((e) => {
				(e.message).should.be.equal('could not create http request to any of the given peers');
			});
		});

		it('should redial to new node when randomPeer is set true', () => {
			// const thisLSK = liskApi({ randomPeer: true, node: externalNode });

			return LSK.getAccount('12731041415715717263L', (data) => {
				(data).should.be.ok();
				(data.success).should.be.equal(true);
			});
		});

		it('should not redial to new node when randomPeer is set to true but unknown nethash provided', () => {
			// const thisLSK = liskApi({ randomPeer: true, node: externalNode, nethash: '123' });

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should redial to mainnet nodes when nethash is set and randomPeer is true', () => {
			// const thisLSK = liskApi({
			// 	randomPeer: true,
			// 	node: externalNode,
			// 	nethash: 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			// });

			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
			(LSK.testnet).should.be.equal(false);
		});

		it('should redial to testnet nodes when nethash is set and randomPeer is true', () => {
			// const thisLSK = liskApi({
			// 	randomPeer: true,
			// 	node: externalNode,
			// 	nethash: 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			// });

			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
			(LSK.testnet).should.be.equal(true);
		});

		it('should not redial when randomPeer is set false', () => {
			// const LSK = liskApi({ randomPeer: false });

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});
	});
});
