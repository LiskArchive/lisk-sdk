'use strict';/*eslint*/

var crypto = require('crypto');
var _  = require('lodash');

var expect = require('chai').expect;
var rewire = require('rewire');
var sinon   = require('sinon');

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var modulesLoader = require('../../common/initModule').modulesLoader;

var InTransfer = rewire('../../../logic/inTransfer.js');
var sql = require('../../../sql/dapps.js');

var validPassword = 'robust weapon course unknown head trial pencil latin acid';
var validKeypair = ed.makeKeypair(crypto.createHash('sha256').update(validPassword, 'utf8').digest());

var validSender = {
	password: 'yjyhgnu32jmwuii442t9',
	secondPassword: 'kub8gm2w330pvptx1or',
	username: 'mix8',
	publicKey: '5ff3c8f4be105953301e505d23a6e1920da9f72dc8dfd7babe1481b662f2b081',
	address: '4835566122337813671L',
	secondPublicKey: 'ebfb1157f9f9ad223b1c7468b0d643663ec5a34ac7a6d557243834ae604d72b7' 
};

var senderHash = crypto.createHash('sha256').update(validSender.password, 'utf8').digest();
var senderKeypair = ed.makeKeypair(senderHash);

var validTransaction = {
	id: '1907088915785679339',
	height: 371,
	blockId: '17233974955873751907',
	type: 5,
	timestamp: 40081792,
	senderPublicKey: '644485a01cb11e06a1f4ffef90a7ba251e56d54eb06a0cb2ecb5693a8cc163a2',
	senderId: '5519106118231224961L',
	recipientId: null,
	recipientPublicKey: null,
	amount: 0,
	fee: 2500000000,
	signature: 'b024f90f73e53c9fee943f3c3ef7a9e3da99bab2f9fa3cbfd5ad05ed79cdbbe21130eb7b27698692bf491a1cf573a518dfa63607dc88bc0c01925fda18304905',
	signatures: [],
	confirmations: 717,
	asset: {
		dapp: {
			name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
			description: null,
			tags: null,
			type: 1,
			link: 'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
			category: 2,
			icon: null
		}
	}
};

var rawValidTransaction = {
	t_id: '1907088915785679339',
	b_height: 371,
	t_blockId: '17233974955873751907',
	t_type: 5,
	t_timestamp: 40081792,
	t_senderPublicKey: '644485a01cb11e06a1f4ffef90a7ba251e56d54eb06a0cb2ecb5693a8cc163a2',
	m_recipientPublicKey: null,
	t_senderId: '5519106118231224961L',
	t_recipientId: null,
	t_amount: '0',
	t_fee: '2500000000',
	t_signature: 'b024f90f73e53c9fee943f3c3ef7a9e3da99bab2f9fa3cbfd5ad05ed79cdbbe21130eb7b27698692bf491a1cf573a518dfa63607dc88bc0c01925fda18304905',
	t_SignSignature: null,
	t_signatures: null,
	confirmations: 717,
	dapp_name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
	dapp_description: null,
	dapp_tags: null,
	dapp_link: 'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
	dapp_type: 1,
	dapp_category: 2,
	dapp_icon: null
};

describe('inTransfer', function () {

	var inTransfer;
	var dbStub;

	var trs;
	var rawTrs; 
	var sender;

	before(function () {
		dbStub = {
			query: sinon.stub()
		};
		inTransfer = new InTransfer(dbStub, modulesLoader.scope.logger, modulesLoader.scope.schema, modulesLoader.scope.network);
	});

	beforeEach(function () {
		dbStub.query.reset();
	});

	beforeEach(function () {
		trs = _.cloneDeep(validTransaction);
		rawTrs = _.cloneDeep(rawValidTransaction);
		sender = _.cloneDeep(validSender);
	});

	describe('constructor', function () {

		it('should be attach schema and logger to library variable', function () {
			new InTransfer(dbStub, modulesLoader.scope.logger, modulesLoader.scope.schema, modulesLoader.scope.network);
			var library = InTransfer.__get__('library');

			expect(library).to.eql({
				db: dbStub,
				logger: modulesLoader.scope.logger,
				schema: modulesLoader.scope.schema,
				network: modulesLoader.scope.network
			});
		});
	});

	describe('bind', function () {

		it('should be okay with empty params', function () {
			inTransfer.bind();
		});
	});

	describe('calculateFee', function () {

		it('should return the correct fee for second signature transaction', function () {
			expect(inTransfer.calculateFee(trs)).to.equal(node.constants.fees.dapp);
		});
	});

	describe('verify', function () {

		it('should return error if receipient exists', function (done) {
			trs.recipientId = '4835566122337813671L';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid recipient');
				done();
			});
		});

		it('should return error if amount is not equal to 0', function (done) {
			trs.amount = 1;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid transaction amount');
				done();
			});
		});

		it('should return error if dapp cateogry is undefined', function (done) {
			trs.asset.inTransfer.category = undefined;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application category');
				done();
			});
		});

		it('should return error if dapp cateogry not found', function (done) {
			trs.asset.dapp.category = 9;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application category not found');
				done();
			});
		});

		it('should return error if dapp icon is not link', function (done) {
			trs.asset.dapp.icon = 'random string';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application icon link');
				done();
			});
		});

		it('should return error if dapp icon link is invalid', function (done) {
			trs.asset.dapp.icon = 'https://www.youtube.com/watch?v=de1-igivvda';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application icon file type');
				done();
			});
		});

		it('should return error if dapp type is invalid', function (done) {
			trs.asset.dapp.type = -1;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application type');
				done();
			});
		});

		it('should not return error for valid type', function (done) {
			trs.asset.dapp.type = 2;

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application type');
				done();
			});
		});

		it('should return error if dapp link is not actually a link', function (done) {
			trs.asset.inTransfer.link = 'random string';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application link');
				done();
			});
		});

		it('should return error if dapp link is invalid', function (done) {
			trs.asset.dapp.link = 'https://www.youtube.com/watch?v=de1-igivvda';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Invalid application file type');
				done();
			});
		});

		it('should return error if dapp name is blank', function (done) {
			trs.asset.dapp.name = '  ';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application name must not be blank');
				done();
			});
		});

		it('should return error if dapp name starts and ends with spac', function (done) {
			trs.asset.dapp.name = ' randomname ';

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application name must not be blank');
				done();
			});
		});

		it('should return error if dapp name is longer than 32 characters', function (done) {
			trs.asset.dapp.name = new Array(33).fill('a').join('');

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application name is too long. Maximum is 32 characters');
				done();
			});
		});

		it('should return error if dapp description is longer than 160 characters', function (done) {
			trs.asset.dapp.description = new Array(161).fill('a').join('');

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application description is too long. Maximum is 160 characters');
				done();
			});
		});

		it('should return error if dapp tags are longer than 160 characters', function (done) {
			trs.asset.dapp.tags = new Array(161).fill('a').join('');

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application tags is too long. Maximum is 160 characters');
				done();
			});
		});

		it('should return error if dapp tags duplicate', function (done) {
			trs.asset.dapp.tags = new Array(2).fill('a').join(',');

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Encountered duplicate tag: a in application');
				done();
			});
		});

		it('should return error if application name already exists', function (done) {
			dbStub.query.withArgs(sql.getExisting, {
				name: trs.asset.dapp.name,
				link: trs.asset.dapp.link || null,
				transactionId: trs.id
			}).resolves([{
				name: trs.asset.dapp.name
			}]);

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application name already exists: ' + trs.asset.dapp.name);
				done();
			});
		});

		it('should return error if application link already exists', function (done) {
			dbStub.query.withArgs(sql.getExisting, {
				name: trs.asset.dapp.name,
				link: trs.asset.dapp.link || null,
				transactionId: trs.id
			}).resolves([{}]);

			inTransfer.verify(trs, sender, function (err) {
				expect(err).to.equal('Application already exists');
				done();
			});
		});

		it('should return error if application link already exists', function (done) {
			dbStub.query.withArgs(sql.getExisting, {
				name: trs.asset.dapp.name,
				link: trs.asset.dapp.link || null,
				transactionId: trs.id
			}).resolves([]);

			inTransfer.verify(trs, sender, function (err, res) {
				expect(err).to.not.exist;
				expect(res).to.eql(trs);
				done();
			});
		});
	});

	describe('process', function () {

		it('should call the callback', function (done) {
			inTransfer.process(trs, sender, done);
		});
	});

	describe('getBytes', function () {

		it('should get bytes of valid transaction', function () {
			expect(inTransfer.getBytes(trs).toString('hex')).to.equal('414f37657a42313143674364555a69356f38597a784341746f524c41364669687474703a2f2f7777772e6c69736b2e696f2f414f37657a42313143674364555a69356f38597a784341746f524c413646692e7a69700100000002000000');
		});

		// Docs say trs size should vary b/w 150 - 200 bytes, while here it's just 93.
		it('should get bytes of valid transaction', function () {
			expect(inTransfer.getBytes(trs).length).to.equal(136);
		});
	});

	describe('apply', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should update unconfirmed name and links private variables', function (done) {
			inTransfer.apply(trs, dummyBlock, sender, function () {
				var unconfirmedNames = InTransfer.__get__('__private.unconfirmedNames');
				var unconfirmedLinks = InTransfer.__get__('__private.unconfirmedLinks');
				expect(unconfirmedNames[trs.asset.dapp.name]).to.not.exist;
				expect(unconfirmedLinks[trs.asset.dapp.link]).to.not.exist;
				done();
			});
		});
	});

	describe('undo', function () {

		var dummyBlock = {
			id: '9314232245035524467',
			height: 1
		};

		it('should call the callback function', function (done) {
			inTransfer.undo(trs, dummyBlock, sender, function () {
				done();
			});
		});
	});

	describe('applyUnconfirmed', function () {

		it('should return error if unconfirmed names already exists', function (done) {
			var dappNames = {};
			var dappLinks = {};
			dappNames[trs.asset.dapp.name] = true;
			dappLinks[trs.asset.dapp.link] = false;

			InTransfer.__set__('__private.unconfirmedNames', dappNames);
			InTransfer.__set__('__private.unconfirmedLinks', dappLinks);

			inTransfer.applyUnconfirmed(trs, sender, function (err) {
				expect(err).to.equal('Application name already exists');
				done();
			});
		});

		it('should return error if unconfirmed link already exists', function (done) {
			var dappNames = {};
			var dappLinks = {};
			dappNames[trs.asset.dapp.name] = false;
			dappLinks[trs.asset.dapp.link] = true;

			InTransfer.__set__('__private.unconfirmedNames', dappNames);
			InTransfer.__set__('__private.unconfirmedLinks', dappLinks);

			inTransfer.applyUnconfirmed(trs, sender, function (err) {
				expect(err).to.equal('Application link already exists');
				done();
			});
		});

		it('should update unconfirmed name and links private variable', function (done) {
			var dappNames = {};
			var dappLinks = {};
			dappNames[trs.asset.dapp.name] = false;
			dappLinks[trs.asset.dapp.link] = false;

			InTransfer.__set__('__private.unconfirmedNames', dappNames);
			InTransfer.__set__('__private.unconfirmedLinks', dappLinks);

			inTransfer.applyUnconfirmed(trs, sender, function () {
				var unconfirmedNames = InTransfer.__get__('__private.unconfirmedNames');
				var unconfirmedLinks = InTransfer.__get__('__private.unconfirmedLinks');
				expect(unconfirmedNames[trs.asset.dapp.name]).to.equal(true);
				expect(unconfirmedLinks[trs.asset.dapp.link]).to.equal(true);
				done();
			});
		});
	});

	describe('undoUnconfirmed', function () {

		it('should update unconfirmed name and links private variables', function (done) {

			var dappNames = {};
			var dappLinks = {};
			dappNames[trs.asset.dapp.name] = true;
			dappLinks[trs.asset.dapp.link] = true;

			InTransfer.__set__('__private.unconfirmedNames', dappNames);
			InTransfer.__set__('__private.unconfirmedLinks', dappLinks);

			inTransfer.undoUnconfirmed(trs, sender, function () {
				var unconfirmedNames = InTransfer.__get__('__private.unconfirmedNames');
				var unconfirmedLinks = InTransfer.__get__('__private.unconfirmedLinks');
				expect(unconfirmedNames[trs.asset.dapp.name]).to.not.exist;
				expect(unconfirmedLinks[trs.asset.dapp.link]).to.not.exist;
				done();
			});
		});
	});

	describe('objectNormalize', function () {

		it('should use the correct format to validate against', function () {
			var library = InTransfer.__get__('library');
			var schemaSpy = sinon.spy(library.schema, 'validate');
			inTransfer.objectNormalize(trs);
			expect(schemaSpy.calledOnce).to.equal(true);
			expect(schemaSpy.calledWithExactly(trs.asset.dapp, InTransfer.prototype.schema)).to.equal(true);
			schemaSpy.restore();
		});

		it('should return error asset schema is invalid', function () {
			trs.asset.dapp.tags = 2;

			expect(function () {
				inTransfer.objectNormalize(trs);
			}).to.throw('Failed to validate dapp schema: Expected type string but found type integer');
		});

		it('should return transaction when asset is valid', function () {
			expect(inTransfer.objectNormalize(trs)).to.eql(trs);
		});
	});

	describe('dbRead', function () {

		it('should return null publicKey is not set ', function () {
			delete rawTrs.dapp_name;

			expect(inTransfer.dbRead(rawTrs)).to.eql(null);
		});

		it('should be okay for valid input', function () {
			expect(inTransfer.dbRead(rawTrs)).to.eql({
				dapp: {
					category: 2,
					description: null,
					icon: null,
					link: 'http://www.lisk.io/AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi.zip',
					name: 'AO7ezB11CgCdUZi5o8YzxCAtoRLA6Fi',
					tags: null,
					type: 1
				}
			});
		});
	});

	describe('dbSave', function () {

		it('should be okay for valid input', function () {
			expect(inTransfer.dbSave(trs)).to.eql({
				table: 'dapps',
				fields: [
					'type',
					'name',
					'description',
					'tags',
					'link',
					'category',
					'icon',
					'transactionId'
				],
				values: {
					type: trs.asset.dapp.type,
					name: trs.asset.dapp.name,
					description: trs.asset.dapp.description || null,
					tags: trs.asset.dapp.tags || null,
					link: trs.asset.dapp.link || null,
					icon: trs.asset.dapp.icon || null,
					category: trs.asset.dapp.category,
					transactionId: trs.id
				}
			});
		});
	});

	describe('ready', function () {

		it('should return true for single signature trs', function () {
			expect(inTransfer.ready(trs, sender)).to.equal(true);
		});

		it('should return false for multi signature transaction with less signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];

			expect(inTransfer.ready(trs, sender)).to.equal(false);
		});

		it('should return true for multi signature transaction with alteast min signatures', function () {
			sender.multisignatures = [validKeypair.publicKey.toString('hex')];
			sender.multimin = 1;

			delete trs.signature;
			// Not really correct signature, but we are not testing that over here
			trs.signature = crypto.randomBytes(64).toString('hex');;
			trs.signatures = [crypto.randomBytes(64).toString('hex')];

			expect(inTransfer.ready(trs, sender)).to.equal(true);
		});
	});
});
