describe('LiskAPI', function() {

	var LSK = new LiskAPI();

	describe('new LiskAPI()', function() {


		it('should create a new instance when using new LiskAPI()', function() {

			(LSK).should.be.ok();

		});

		it('new LiskAPI() should be Object', function() {

			(LSK).should.be.type("object");

		});

	});

	describe('.currentNode', function() {

		it('currentNode should be set by default', function() {

			(LSK.currentNode).should.be.ok();
		});


	});

	describe('#getNethash', function() {

		var NetHash = {

			'Content-Type': 'application/json',
			'nethash': 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'broadhash': 'ed14889723f24ecc54871d058d98ce91ff2f973192075c0155ba2b7b70ad2511',
			'os': 'lisk-js-api',
			'version': '1.0.0',
			'minVersion': '>=0.5.0',
			'port': 8000

		};

		it('Nethash should be hardcoded variables', function() {

			(LSK.getNethash()).should.eql(NetHash);
		});

	});

	describe('#setNode', function() {

		it('should be able to set my own node', function() {

			var myOwnNode = 'myOwnNode.com';
			LSK.setNode(myOwnNode);

			(LSK.currentNode).should.be.equal(myOwnNode);

		});

		it('should select a node when not explicitly set', function() {

			LSK.setNode();

			(LSK.currentNode).should.be.ok();

		});


	});

	describe('#getRandomPeer', function() {

		it('should give a random peer', function() {

			(LSK.getRandomPeer()).should.be.ok();

		});

	});

	describe('#banNode', function() {

		it('should add current node to LSK.bannedNodes', function() {

			var currentNode = LSK.currentNode;
			LSK.banNode();

			(LSK.bannedNodes).should.containEql(currentNode);

		});

	});

	describe('#getURLPrefix', function() {

		it('should be http when ssl is false', function() {

			LSK.setSSL(false);

			(LSK.getURLPrefix()).should.be.equal('http');

		});

		it('should be https when ssl is true', function() {

			LSK.setSSL(true);

			(LSK.getURLPrefix()).should.be.equal('https');

		});

	});


	describe('#trimObj', function() {

		var untrimmedObj = {
			' my_Obj ': ' myval '
		}
		var trimmedObj = {
			'my_Obj': 'myval'
		}

		it('should not be equal before trim', function() {

			(untrimmedObj).should.not.be.equal(trimmedObj);
		});

		it('should be equal after trim an Object in keys and value', function() {

			var trimIt = LSK.trimObj(untrimmedObj);

			(trimIt).should.be.eql(trimmedObj);

		});

	});


	describe('#toQueryString', function() {

		it('should create a http string from an object. Like { obj: "myval", key: "myval" } -> obj=myval&key=myval', function() {

			var myObj = {
				obj: 'myval',
				key: 'my2ndval'
			}

			var serialised = LSK.toQueryString(myObj);

			(serialised).should.be.equal('obj=myval&key=my2ndval');

		})

	});

	describe('#serialiseHttpData', function() {

		it('should create a http string from an object and trim.', function() {

			var myObj = {
				obj: ' myval',
				key: 'my2ndval '
			}

			var serialised = LSK.serialiseHttpData(myObj);

			(serialised).should.be.equal('?obj=myval&key=my2ndval');

		})

	});



});
