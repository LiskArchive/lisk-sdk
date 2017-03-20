function getUrlVars (url) {
	var hash;
	var myJson = {};
	var hashes = url.slice(url.indexOf('?') + 1).split('&');

	for (var i = 0; i < hashes.length; i++) {
		hash = hashes[i].split('=');
		myJson[hash[0]] = hash[1];
	}

	return myJson;
}

process.env.NODE_ENV = 'test';

describe('Lisk.api()', function () {

	var LSK = lisk.api();

	describe('lisk.api()', function () {

		it('should create a new instance when using lisk.api()', function () {
			(LSK).should.be.ok();
		});

		it('new lisk.api() should be Object', function () {
			(LSK).should.be.type('object');
		});
	});

	describe('.currentPeer', function () {

		it('currentPeer should be set by default', function () {
			(LSK.currentPeer).should.be.ok();
		});
	});

	describe('#getNethash', function () {

		var NetHash = {
			'Content-Type': 'application/json',
			'nethash': 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'broadhash': 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'os': 'lisk-js-api',
			'version': '1.0.0',
			'minVersion': '>=0.5.0',
			'port': 8000
		};

		it('Nethash should be hardcoded variables', function () {
			(LSK.getNethash()).should.eql(NetHash);
		});

		LSK.setTestnet(true);

		NetHash = {
			'Content-Type': 'application/json',
			'nethash': 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			'broadhash': 'da3ed6a45429278bac2666961289ca17ad86595d33b31037615d4b8e8f158bba',
			'os': 'lisk-js-api',
			'version': '1.0.0',
			'minVersion': '>=0.5.0',
			'port': 7000
		};

		it('should give corret Nethash for testnet', function () {
			(LSK.getNethash()).should.eql(NetHash);
		});
	});

	describe('#setTestnet', function () {

		it('should set to testnet', function () {
			var LISK = lisk.api();
			LISK.setTestnet(true);

			(LISK.testnet).should.be.true;
		});
	});

	describe('#setNode', function () {

		it('should be able to set my own node', function () {
			var myOwnNode = 'myOwnNode.com';
			LSK.setNode(myOwnNode);

			(LSK.currentPeer).should.be.equal(myOwnNode);
		});

		it('should select a node when not explicitly set', function () {
			LSK.setNode();

			(LSK.currentPeer).should.be.ok();
		});
	});

	describe('#selectNode', function () {

		it('should return the node from initial settings when set', function () {
			var LiskUrlInit = lisk.api({ port: 7000, node: 'localhost', ssl: true, randomPeer: false });

			(LiskUrlInit.selectNode()).should.be.equal('localhost');
		});
	});

	describe('#getRandomPeer', function () {

		it('should give a random peer', function () {
			(LSK.getRandomPeer()).should.be.ok();
		});
	});

	describe('#banNode', function () {

		it('should add current node to LSK.bannedPeers', function () {
			var currentNode = LSK.currentPeer;
			LSK.banNode();

			(LSK.bannedPeers).should.containEql(currentNode);
		});
	});

	describe('#getFullUrl', function () {

		it('should give the full url inclusive port', function () {
			var LiskUrlInit = lisk.api({ port: 7000, node: 'localhost', ssl: false });
			var fullUrl = 'http://localhost:7000';

			(LiskUrlInit.getFullUrl()).should.be.equal(fullUrl);
		});

		it('should give the full url without port and with SSL', function () {
			var LiskUrlInit = lisk.api({ port: '', node: 'localhost', ssl: true });
			var fullUrl = 'https://localhost';

			(LiskUrlInit.getFullUrl()).should.be.equal(fullUrl);
		});
	});

	describe('#getURLPrefix', function () {

		it('should be http when ssl is false', function () {
			LSK.setSSL(false);

			(LSK.getURLPrefix()).should.be.equal('http');
		});

		it('should be https when ssl is true', function () {
			LSK.setSSL(true);

			(LSK.getURLPrefix()).should.be.equal('https');
		});
	});

	describe('#trimObj', function () {

		var untrimmedObj = {
			' my_Obj ': ' myval '
		};

		var trimmedObj = {
			'my_Obj': 'myval'
		};

		it('should not be equal before trim', function () {
			(untrimmedObj).should.not.be.equal(trimmedObj);
		});

		it('should be equal after trim an Object in keys and value', function () {
			var trimIt = LSK.trimObj(untrimmedObj);

			(trimIt).should.be.eql(trimmedObj);
		});
	});

	describe('#toQueryString', function () {

		it('should create a http string from an object. Like { obj: "myval", key: "myval" } -> obj=myval&key=myval', function () {
			var myObj = {
				obj: 'myval',
				key: 'my2ndval'
			};

			var serialised = LSK.toQueryString(myObj);

			(serialised).should.be.equal('obj=myval&key=my2ndval');
		});
	});

	describe('#serialiseHttpData', function () {

		before(function () {
			process.env.NODE_ENV = 'main';
		});

		it('should create a http string from an object and trim.', function () {
			var myObj = {
				obj: ' myval',
				key: 'my2ndval '
			};

			var serialised = LSK.serialiseHttpData(myObj);

			(serialised).should.be.equal('?obj=myval&key=my2ndval');
		});

		it('should add random if type is GET', function () {
			var myObj = {
				obj: ' myval',
				key: 'my2ndval '
			};

			var serialised = LSK.serialiseHttpData(myObj, 'GET');

			var objectify = getUrlVars(serialised.substring(1));

			(objectify).should.have.property('random');
			(objectify).should.have.property('obj');
			(objectify).should.have.property('key');
		});

		after(function () {
			process.env.NODE_ENV = 'test';
		});
	});

	describe('#getAddressFromSecret', function () {

		it('should create correct address and publicKey', function () {
			var address = {
				publicKey: 'a4465fd76c16fcc458448076372abf1912cc5b150663a64dffefe550f96feadd',
				address: '12475940823804898745L'
			};

			(LSK.getAddressFromSecret('123')).should.eql(address);
		});
	});

	describe('#checkRequest', function () {

		it('should identify GET requests', function () {
			var requestType = 'api/loader/status';
			var options = '';
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('GET');

			var requestType = 'api/loader/status/sync';
			var options = '';
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('GET');

			var requestType = 'api/loader/status/ping';
			var options = '';
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('GET');

			var requestType = 'api/transactions';
			var options = {blockId: '123', senderId: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('GET');
		});

		it('should identify POST requests', function () {
			var requestType = 'accounts/generatePublicKey';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('POST');

			var requestType = 'accounts/open';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('POST');
		});

		it('should identify PUT requests', function () {
			var requestType = 'accounts/delegates';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('PUT');

			var requestType = 'signatures';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('PUT');

			var requestType = 'transactions';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('PUT');
		});

		it('should identify NOACTION requests', function () {
			var requestType = 'delegates/forging/enable';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('NOACTION');

			var requestType = 'dapps/uninstall';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('NOACTION');

			var requestType = 'multisignatures/sign';
			var options = {secret: '123'};
			var checkRequestAnswer = LSK.checkRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.equal('NOACTION');
		});
	});

	describe('#changeRequest', function () {

		it('should give the correct parameters for GET requests', function () {
			var requestType = 'transactions';
			var options = {blockId: '123', senderId: '123'};
			var checkRequestAnswer = lisk.api({ node: 'localhost' }).changeRequest(requestType, options);

			var output = {
				nethash: '',
				requestMethod: 'GET',
				requestParams: {
					blockId: '123',
					senderId: '123'
				},
				requestUrl: 'http://localhost:8000/api/transactions?blockId=123&senderId=123'
			};

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.eql(output);
		});

		it('should give the correct parameters for GET requests with parameters', function () {
			var requestType = 'delegates/search/';
			var options = {q: 'oliver'};
			var checkRequestAnswer = lisk.api({ node: 'localhost' }).changeRequest(requestType, options);

			var output = {
				nethash: '',
				requestMethod: 'GET',
				requestParams: {
					q: 'oliver',
				},
				requestUrl: 'http://localhost:8000/api/delegates/search/?q=oliver'
			};

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.eql(output);
		});

		it('should give the correct parameters for NOACTION requests', function () {
			var requestType = 'delegates/forging/enable';
			var options = {secret: '123'};
			var checkRequestAnswer = lisk.api({ node: 'localhost' }).changeRequest(requestType, options);

			var output = {
				nethash: '',
				requestMethod: '',
				requestParams: '',
				requestUrl: ''
			};

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.eql(output);
		});

		it('should give the correct parameters for POST requests', function () {
			var requestType = 'accounts/open';
			var options = {secret: '123'};
			var checkRequestAnswer = lisk.api({ node: 'localhost' }).changeRequest(requestType, options);

			var output = {
				nethash: '',
				requestMethod: 'GET',
				requestParams: {secret: '123'},
				requestUrl: 'http://localhost:8000/api/accounts?address=12475940823804898745L'
			};

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer).should.be.eql(output);
		});

		it('should give the correct parameters for PUT requests', function () {
			var requestType = 'signatures';
			var options = {secret: '123', secondSecret: '1234'};
			var checkRequestAnswer = lisk.api({ node: 'localhost' }).changeRequest(requestType, options);

			(checkRequestAnswer).should.be.ok;
			(checkRequestAnswer.requestParams.transaction).should.have.property('id').which.is.a.String();
			(checkRequestAnswer.requestParams.transaction).should.have.property('amount').which.is.a.Number();
			(checkRequestAnswer.requestParams).should.have.property('transaction').which.is.a.Object();
		});
	});

	describe('#sendRequest', function () {

		it('should receive Height from a random public peer', function(done) {
			lisk.api().sendRequest('blocks/getHeight', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});

	describe('#listActiveDelegates', function () {

		it('should list active delegates', function(done) {
			lisk.api().listActiveDelegates('5', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				(data.delegates).should.have.length(5);
				done();
			});
		});
	});

	describe('#listStandyDelegates', function () {

		it.skip('should list non-active delegates', function(done) {
			lisk.api().listStandyDelegates('5', function (data) {
				console.log(data);
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				(data.delegates).should.have.length(5);
				done();
			});
		});
	});

	describe('#searchDelegateByUsername', function () {

		it('should find a delegate by name', function(done) {
			lisk.api().searchDelegateByUsername('oliver', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				(data.delegates[0].username).should.be.equal('oliver');
				done();
			});
		});
	});

	describe('#listBlocks', function () {

		it('should list amount of blocks defined', function(done) {
			this.timeout(3000);
			lisk.api().listBlocks('3', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				(data.blocks).should.have.length(3);
				done();
			});
		});
	});

	describe('#listForgedBlocks', function () {

		it('should list amount of ForgedBlocks', function(done) {
			this.timeout(4000);
			lisk.api().listForgedBlocks('130649e3d8d34eb59197c00bcf6f199bc4ec06ba0968f1d473b010384569e7f0', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});

	describe('#getBlock', function () {

		it('should list a block of certain height', function(done) {
			this.timeout(5000);
			lisk.api().getBlock('2346638', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});

	describe('#listTransactions', function () {

		it('should list transactions of a defined account', function(done) {
			this.timeout(3000);
			lisk.api().listTransactions('12731041415715717263L', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});

	describe('#listTransactions', function () {

		it('should list a defined transaction', function(done) {
			this.timeout(3000);
			lisk.api().getTransaction('7520138931049441691', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});

	describe('#listVotes', function () {

		it('should list votes of an account', function(done) {
			this.timeout(3000);
			lisk.api().listVotes('16010222169256538112L', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});

	describe('#listVoters', function () {

		it('should list voters of an account', function(done) {
			this.timeout(3000);
			lisk.api().listVoters('6a01c4b86f4519ec9fa5c3288ae20e2e7a58822ebe891fb81e839588b95b242a', function (data) {
				(data).should.be.ok;
				(data).should.be.type('object');
				(data.success).should.be.true;
				done();
			});
		});
	});
});
