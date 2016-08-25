'use strict'; /*jslint mocha:true, expr:true */

var node = require('./../node.js');

var block = {
	blockHeight: 0,
	id: 0,
	generatorPublicKey: '',
	totalAmount: 0,
	totalFee: 0
};

var testBlocksUnder101 = 0;

describe('GET /blocks/getEpoch', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getEpoch')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
			// console.log(JSON.stringify(res.body));
			node.expect(res.body).to.have.property('epoch').to.be.a('string');
			done();
			});
	});
});

describe('GET /blocks/getHeight', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getHeight')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				if (res.body.success === true && res.body.height != null) {
					node.expect(res.body).to.have.property('height').to.be.above(0);
					if (res.body.success === true) {
						block.blockHeight = res.body.height;
						if (res.body.height > 100) {
							testBlocksUnder101 = true;
						}
					}
				} else {
					console.log('Request failed or height is null');
				}
				done();
			});
	});
});

describe('GET /blocks/getFee', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getFee')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('fee');
				node.expect(res.body.fee).to.equal(node.Fees.transactionFee);
				done();
			});
	});
});

describe('GET /blocks/getFees', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getFees')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('fees');
				node.expect(res.body.fees.send).to.equal(node.Fees.transactionFee);
				node.expect(res.body.fees.vote).to.equal(node.Fees.voteFee);
				node.expect(res.body.fees.dapp).to.equal(node.Fees.dappAddFee);
				node.expect(res.body.fees.secondsignature).to.equal(node.Fees.secondPasswordFee);
				node.expect(res.body.fees.delegate).to.equal(node.Fees.delegateRegistrationFee);
				node.expect(res.body.fees.multisignature).to.equal(node.Fees.multisignatureRegistrationFee);
				done();
			});
	});
});

describe('GET /blocks/getNethash', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getNethash')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('nethash').to.be.a('string');
				node.expect(res.body.nethash).to.equal(node.config.nethash);
				done();
			});
	});
});

describe('GET /blocks/getMilestone', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getMilestone')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('milestone').to.be.a('number');
				done();
			});
	});
});

describe('GET /blocks/getReward', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getReward')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('reward').to.be.a('number');
				done();
			});
	});
});

describe('GET /blocks/getSupply', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getSupply')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('supply').to.be.a('number');
				done();
			});
	});
});

describe('GET /blocks/getStatus', function () {

	it('Should be ok', function (done) {
		node.api.get('/blocks/getStatus')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('epoch').to.be.a('string');
				node.expect(res.body).to.have.property('height').to.be.a('number');
				node.expect(res.body).to.have.property('fee').to.be.a('number');
				node.expect(res.body).to.have.property('milestone').to.be.a('number');
				node.expect(res.body).to.have.property('nethash').to.be.a('string');
				node.expect(res.body).to.have.property('reward').to.be.a('number');
				node.expect(res.body).to.have.property('supply').to.be.a('number');
				done();
			});
	});
});

describe('GET /blocks', function () {

	it('Using height. Should be ok', function (done) {
		var height = block.blockHeight, limit = 100, offset = 0;
		node.api.get('/blocks?height='+height+'&limit='+limit+'&offset='+offset)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				if (res.body.success === true && res.body.blocks != null) {
					node.expect(res.body).to.have.property('blocks').that.is.an('array');
					node.expect(res.body).to.have.property('count').to.equal(1);
					node.expect(res.body.blocks.length).to.equal(1);
					node.expect(res.body.blocks[0]).to.have.property('previousBlock');
					node.expect(res.body.blocks[0]).to.have.property('totalAmount');
					node.expect(res.body.blocks[0]).to.have.property('totalFee');
					node.expect(res.body.blocks[0]).to.have.property('generatorId');
					node.expect(res.body.blocks[0]).to.have.property('confirmations');
					node.expect(res.body.blocks[0]).to.have.property('blockSignature');
					node.expect(res.body.blocks[0]).to.have.property('numberOfTransactions');
					node.expect(res.body.blocks[0].height).to.equal(block.blockHeight);
					block.id = res.body.blocks[0].id;
					block.generatorPublicKey = res.body.blocks[0].generatorPublicKey;
					block.totalAmount = res.body.blocks[0].totalAmount;
					block.totalFee = res.body.blocks[0].totalFee;
				} else {
					console.log('Request failed or blocks array is null');
				}
				done();
			});
	});

	it('Using height < 100. Should be ok', function (done) {
		if (testBlocksUnder101) {
			var height = 10;
			node.api.get('/blocks?height='+height)
				.set('Accept', 'application/json')
				.expect('Content-Type', /json/)
				.expect(200)
				.end(function (err, res) {
					// console.log(JSON.stringify(res.body));
					node.expect(res.body).to.have.property('success').to.be.ok;
					if (res.body.success === true && res.body.blocks != null) {
						node.expect(res.body).to.have.property('count');
						node.expect(res.body).to.have.property('blocks').that.is.an('array');
						node.expect(res.body.blocks.length).to.equal(1);
						node.expect(res.body.blocks[0]).to.have.property('previousBlock');
						node.expect(res.body.blocks[0]).to.have.property('totalAmount');
						node.expect(res.body.blocks[0]).to.have.property('totalFee');
						node.expect(res.body.blocks[0]).to.have.property('generatorId');
						node.expect(res.body.blocks[0]).to.have.property('confirmations');
						node.expect(res.body.blocks[0]).to.have.property('blockSignature');
						node.expect(res.body.blocks[0]).to.have.property('numberOfTransactions');
						node.expect(res.body.blocks[0].height).to.equal(10);
						block.id = res.body.blocks[0].id;
						block.generatorPublicKey = res.body.blocks[0].generatorPublicKey;
						block.totalAmount = res.body.blocks[0].totalAmount;
						block.totalFee = res.body.blocks[0].totalFee;
					} else {
						console.log('Request failed or blocks array is null');
					}
					done();
				});
		} else {
			done();
		}
	});

	it('Using generatorPublicKey. Should be ok', function (done) {
		var generatorPublicKey = block.generatorPublicKey, limit = 100, offset = 0, orderBy = '';
		node.api.get('/blocks?generatorPublicKey='+generatorPublicKey+'&limit='+limit+'&offset='+offset)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				for (var i = 0; i < res.body.blocks.length; i++) {
					node.expect(res.body.blocks[i].generatorPublicKey).to.equal(block.generatorPublicKey);
				}
				done();
			});
	});

	it('Using totalFee. Should be ok', function (done) {
		var totalFee = block.totalFee, limit = 100, offset = 0;
		node.api.get('/blocks?totalFee='+totalFee+'&limit='+limit+'&offset='+offset)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				for (var i = 0; i < res.body.blocks.length; i++) {
					node.expect(res.body.blocks[i].totalFee).to.equal(block.totalFee);
				}
				done();
			});
	});

	it('Using totalAmount. Should be ok', function (done) {
		var totalAmount = block.totalAmount, limit = 100, offset = 0;
		node.api.get('/blocks?totalAmount='+totalAmount+'&limit='+limit+'&offset='+offset)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				for (var i = 0; i < res.body.blocks.length; i++) {
					node.expect(res.body.blocks[i].totalAmount).to.equal(block.totalAmount);
				}
				done();
			});
	});

	it('Using previousBlock. Should be ok', function (done) {
		if (block.id != null) {
			var previousBlock = block.id;

			node.onNewBlock(function (err) {
				node.expect(err).to.be.not.ok;
				node.api.get('/blocks?previousBlock='+previousBlock)
					.set('Accept', 'application/json')
					.expect('Content-Type', /json/)
					.expect(200)
					.end(function (err, res) {
						// console.log(JSON.stringify(res.body));
						node.expect(res.body).to.have.property('success').to.be.ok;
						node.expect(res.body).to.have.property('blocks').that.is.an('array');
						node.expect(res.body.blocks).to.have.length(1);
						node.expect(res.body.blocks[0].previousBlock).to.equal(previousBlock);
						done();
					});
			});
		}
	});

	it('Using orderBy. Should be ok', function (done) {
		var orderBy = 'height:desc';

		node.api.get('/blocks?orderBy='+orderBy)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('blocks').that.is.an('array');
				for (var i = 0; i < res.body.blocks.length; i++) {
					if (res.body.blocks[i+1] != null) {
						node.expect(res.body.blocks[i].height).to.be.above(res.body.blocks[i+1].height);
					}
				}
				done();
			});
	});
});

describe('GET /blocks/get?id=', function () {

	it('Using genesisblock id. Should be ok', function (done) {
		var genesisblockId = '6524861224470851795';

		node.api.get('/blocks/get?id=' + genesisblockId)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.ok;
				node.expect(res.body).to.have.property('block').to.be.a('object');
				node.expect(res.body.block).to.have.property('id').to.be.a('string');
				done();
			});
	});

	it('Using unknown id. Should be fail', function (done) {
		var unknownId = '9928719876370886655';

		node.api.get('/blocks/get?id=' + unknownId)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.be.a('string');
				done();
			});
	});

	it('Using no id. Should be fail', function (done) {
		node.api.get('/blocks/get?id=' + null)
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(200)
			.end(function (err, res) {
				// console.log(JSON.stringify(res.body));
				node.expect(res.body).to.have.property('success').to.be.not.ok;
				node.expect(res.body).to.have.property('error').to.be.a('string');
				done();
			});
	});
});
