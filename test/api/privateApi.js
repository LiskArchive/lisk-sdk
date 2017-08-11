import privateApi from '../../src/api/privateApi';

describe('privateApiq', () => {
	const port = 7000;
	const localNode = 'localhost';
	const externalNode = 'external';
	const externalTestnetNode = 'testnet';

	let LSK;

	beforeEach(() => {
		LSK = {
			options: {
				node: localNode,
			},
			randomPeer: false,
			currentPeer: localNode,
			defaultPeers: [localNode, externalNode],
			defaultSSLPeers: [localNode, externalNode],
			defaultTestnetPeers: [localNode, externalTestnetNode],
			bannedPeers: [],
			port,

			parseOfflineRequests: () => ({
				requestMethod: 'GET',
			}),
			setTestnet: () => {},
		};
	});

	describe('#selectNode', () => {
		it('should return the node from initial settings when set', () => {
			(privateApi.selectNode.call(LSK)).should.be.equal(localNode);
		});
	});

	describe('#getRandomPeer', () => {
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
			const fullUrl = `http://${localNode}:${port}`;

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

	describe('#checkReDial', () => {
		beforeEach(() => {
			LSK.randomPeer = true;
		});

		it('should check if all the peers are already banned', () => {
			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
		});

		it.skip('should be able to get a new node when current one is not reachable', () => {
			return LSK.sendRequest('blocks/getHeight', {}, (result) => {
				(result).should.be.type('object');
			});
		});

		it('should recognize that now all the peers are banned for mainnet', () => {
			LSK.bannedPeers = LSK.defaultPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should recognize that now all the peers are banned for testnet', () => {
			LSK.testnet = true;
			LSK.bannedPeers = LSK.defaultTestnetPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should recognize that now all the peers are banned for ssl', () => {
			LSK.ssl = true;
			LSK.bannedPeers = LSK.defaultSSLPeers;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it.skip('should stop redial when all the peers are banned already', () => {
			LSK.bannedPeers = LSK.defaultPeers;
			LSK.currentPeer = '';

			return LSK.sendRequest('blocks/getHeight').then((e) => {
				(e.message).should.be.equal('could not create http request to any of the given peers');
			});
		});

		it('should redial to new node when randomPeer is set true', () => {
			LSK.randomPeer = true;

			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
		});

		it('should not redial to new node when randomPeer is set to true but unknown nethash provided', () => {
			LSK.options.nethash = '123';

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});

		it('should redial to mainnet nodes when nethash is set and randomPeer is true', () => {
			LSK.options.nethash = 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511';
			const stub = sinon.stub(LSK, 'setTestnet');

			(privateApi.checkReDial.call(LSK)).should.be.true();
			(stub.calledWithExactly(false)).should.be.true();
			stub.restore();
		});

		it('should redial to testnet nodes when nethash is set and randomPeer is true', () => {
			LSK.options.nethash = 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba';
			const stub = sinon.stub(LSK, 'setTestnet');

			(privateApi.checkReDial.call(LSK)).should.be.equal(true);
			(stub.calledWithExactly(true)).should.be.true();
			stub.restore();
		});

		it('should not redial when randomPeer is set false', () => {
			LSK.randomPeer = false;

			(privateApi.checkReDial.call(LSK)).should.be.equal(false);
		});
	});
});
