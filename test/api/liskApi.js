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

	describe('.currentNode', function () {

		it('currentNode should be set by default', function () {
			(LSK.currentNode).should.be.ok();
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

			(LSK.currentNode).should.be.equal(myOwnNode);
		});

		it('should select a node when not explicitly set', function () {
			LSK.setNode();

			(LSK.currentNode).should.be.ok();
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

		it('should add current node to LSK.bannedNodes', function () {
			var currentNode = LSK.currentNode;
			LSK.banNode();

			(LSK.bannedNodes).should.containEql(currentNode);
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
});
