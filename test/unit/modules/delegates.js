'use strict';/*eslint*/

var _  = require('lodash');
var crypto = require('crypto');
var async = require('async');
var sinon = require('sinon');

var chai = require('chai');
var expect = require('chai').expect;

var node = require('./../../node.js');
var ed = require('../../../helpers/ed');
var bignum = require('../../../helpers/bignum.js');
var constants = require('../../../helpers/constants.js');
var ws = require('../../common/wsCommunication.js');
var genesisDelegates = require('../../genesisDelegates.json');

describe('delegates', function () {

	var whiteListedIp = '127.0.0.1';
	var testDelegate = genesisDelegates.delegates[0];

	var library;
	var __private;

	before(function (done) {
		node.initApplication(function (scope) {
			library = scope;

			// Set delegates module as loaded to allow manual forging
			library.rewiredModules.delegates.__set__('__private.loaded', true);

			setTimeout(done, 10000);
		});
	});

	before(function (done) {
		// Load forging delegates
		__private = library.rewiredModules.delegates.__get__('__private');
		__private.loadDelegates(done);
	});

	function fakeRequest (ip, body) {
		var req = {
			ip: ip,
			body: body
		};

		return req;
	}

	describe('internal', function () {
		var delegates;

		before(function () {
			delegates = library.modules.delegates;
		});

		function updateForgingStatus (testDelegate, action, cb) {
			var body = {
				publicKey: testDelegate.publicKey
			};

			delegates.internal.forgingStatus(fakeRequest(whiteListedIp, body), function (err, res) {
				if ((res.enabled && action == 'disable') || (!res.enabled && action == 'enable')) {
					var body = {
						publicKey: testDelegate.publicKey,
						key: testDelegate.key
					};
					delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), cb);
				} else {
					cb(err, {
						publicKey: testDelegate.publicKey,
						key: testDelegate.key
					});
				}
			});
		}

		describe('forgingEnable', function () {

			it('should return error when ip is not whitelisted', function (done) {
				var randomIp = '192.168.0.1';
				var body = {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				};

				delegates.internal.forgingEnable(fakeRequest(randomIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Access denied');
					done();
				});
			});

			it('should return error with invalid schema', function (done) {
				var body = {
					publicKey: '1231'
				};

				delegates.internal.forgingEnable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Missing required property: secret');
					done();
				});
			});

			it('should return error with invalid secret', function (done) {
				var invalidSecret = 'Invalid secret';
				var body = {
					secret: invalidSecret
				};

				delegates.internal.forgingEnable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Delegate not found');
					done();
				});
			});

			it('should return error with invalid publicKey', function (done) {
				var invalidPublicKey= '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				var body = {
					publicKey: invalidPublicKey,
					secret: testDelegate.secret
				};

				delegates.internal.forgingEnable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Invalid passphrase and public key combination');
					done();
				});
			});

			it('should return error with non delegate account', function (done) {
				var body = {
					publicKey: node.gAccount.publicKey,
					secret: node.gAccount.password
				};

				delegates.internal.forgingEnable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Delegate not found');
					done();
				});
			});

			it('should return error when forging is already enabled', function (done) {
				var body = {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				};

				updateForgingStatus(testDelegate, 'enable', function (err, res) {
					expect(err).to.not.exist;

					delegates.internal.forgingEnable(fakeRequest(whiteListedIp, body), function (err, res) {
						expect(err).to.equal('Forging is already enabled');
						done();
					});
				});
			});

			it('should be ok using valid params', function (done) {
				var body = {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				};

				updateForgingStatus(testDelegate, 'disable', function (err, res) {
					expect(err).to.not.exist;

					delegates.internal.forgingEnable(fakeRequest(whiteListedIp, body), function (err, res) {
						expect(err).to.not.exist;
						done();
					});
				});
			});
		});

		describe('forgingDisable', function () {

			it('should return error when ip is not whitelisted', function (done) {
				var randomIp = '192.168.0.1';
				var body = {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				};

				delegates.internal.forgingDisable(fakeRequest(randomIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Access denied');
					done();
				});
			});

			it('should return error with invalid schema', function (done) {
				var body = {
					publicKey: testDelegate.publicKey
				};

				delegates.internal.forgingDisable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Missing required property: secret');
					done();
				});
			});

			it('should return error with invalid secret', function (done) {
				var invalidSecret = 'Invalid secret';
				var body = {
					secret: invalidSecret
				};

				delegates.internal.forgingDisable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Delegate not found');
					done();
				});
			});

			it('should return error with invalid publicKey', function (done) {
				var invalidPublicKey= '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				var body = {
					publicKey: invalidPublicKey,
					secret: testDelegate.secret
				};

				delegates.internal.forgingDisable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Invalid passphrase and public key combination');
					done();
				});
			});

			it('should return error with non delegate account', function (done) {
				var body = {
					publicKey: node.gAccount.publicKey,
					secret: node.gAccount.password
				};

				delegates.internal.forgingDisable(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Delegate not found');
					done();
				});
			});

			it('should return error when forging is already disabled', function (done) {
				var body = {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				};

				updateForgingStatus(testDelegate, 'disable', function (err, res) {
					expect(err).to.not.exist;

					delegates.internal.forgingDisable(fakeRequest(whiteListedIp, body), function (err, res) {
						expect(err).to.equal('Delegate not found');
						done();
					});
				});
			});

			it('using valid params should be ok', function (done) {
				var body = {
					publicKey: testDelegate.publicKey,
					secret: testDelegate.secret
				};

				updateForgingStatus(testDelegate, 'enable', function (err, res) {
					expect(err).to.not.exist;

					delegates.internal.forgingDisable(fakeRequest(whiteListedIp, body), function (err, res) {
						expect(err).to.not.exist;
						done();
					});
				});
			});
		});

		describe('forgingToggle', function () {

			var defaultKey;

			before(function () {
				defaultKey = library.config.forging.defaultKey;
			});
			

			it('should return error when ip is not whitelisted', function (done) {
				var randomIp = '192.168.0.1';
				var body = {
					publicKey: testDelegate.publicKey
				};

				delegates.internal.forgingToggle(fakeRequest(randomIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Access denied');
					done();
				});
			});

			it('should return error with invalid schema', function (done) {
				var body = {
					publicKey: testDelegate.publicKey
				};

				delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Missing required property: key');
					done();
				});
			});

			it('should return error with invalid key', function (done) {
				var invalidKey = 'Invalid key';
				var body = {
					key: invalidKey,
					publicKey: testDelegate.publicKey
				};

				delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Invalid key and public key combination');
					done();
				});
			});

			it('should return error with invalid publicKey', function (done) {
				var invalidPublicKey = '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				var body = {
					publicKey: invalidPublicKey,
					key: defaultKey
				};

				delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found');
					done();
				});
			});

			it('should return error with non delegate account', function (done) {
				var body = {
					publicKey: node.gAccount.publicKey,
					key: node.gAccount.password
				};

				delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), function (err, res) {
					expect(err).to.exist;
					expect(err).to.equal('Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found');
					done();
				});
			});

			it('should toggle forging from enable to disable', function (done) {
				var body = {
					key: defaultKey,
					publicKey: testDelegate.publicKey,
				};

				updateForgingStatus(testDelegate, 'enable', function (err, res) {
					expect(err).to.not.exist;

					delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql({ 
							publicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
							forging: false
						});
						done();
					});
				});
			});

			it('should toggle forging from disable to enable', function (done) {
				var body = {
					key: defaultKey,
					publicKey: testDelegate.publicKey,
				};

				updateForgingStatus(testDelegate, 'disable', function (err, res) {
					expect(err).to.not.exist;

					delegates.internal.forgingToggle(fakeRequest(whiteListedIp, body), function (err, res) {
						expect(err).to.not.exist;
						expect(res).to.eql({
							publicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
							forging: true
						});
						done();
					});
				});
			});
		});
	});

	describe('__private', function (cb) {

		describe('loadDelegates', function () {

			var rewiredDelegates;
			var loadDelegates;
			var config;
			var __private;

			var plainTextSecrets = [
				'robust swift grocery peasant forget share enable convince deputy road keep cheap',
				'weapon van trap again sustain write useless great pottery urge month nominee',
				'course genuine appear elite library fabric armed chat pipe scissors mask novel',
				'unknown critic shield network goat detail grid dry surround clay wrap six',
				'head miracle inquiry body salt hedgehog purity tilt kit magic chat evolve',
				'trial offer detail flee gadget elevator fix unhappy panda ordinary goat glide',
				'pencil rescue over bachelor team rib venue broom axis bonus nominee volcano',
				'latin swamp simple bridge pilot become topic summer budget dentist hollow seed',
				'acid catch quit barely siege smile witness pass artwork forget quote disease'
			];

			var encryptedSecret = [{
				publicKey: '9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9f2f0f',
				encryptedSecret: '19e9f8eee5d9516234a10953669518bf23371d34e114713c8043a98378fd866834946380c4cc0e40f23305643206c1c5be496074f350d09d87735c42eae30c604cabea9862f4fe8f906313c67a7146d54fa844171e6cf925b7c953987082cdd6',
			}, {
				publicKey: '141b16ac8d5bd150f16b1caa08f689057ca4c4434445e56661831f4e671b7c0a',
				encryptedSecret: '14ac6a589c2d3690dd1638eeccfa5ea6f88bfcf01bdcd65665ede305260f63f3d4ee87cb35ade7c237255a898f080fb160110ab2900108bb99cb9215771b1aaa6892ae48789f6a985b3cedf7ad42e94c',
			}, {
				publicKey: '3ff32442bb6da7d60c1b7752b24e6467813c9b698e0f278d48c43580da972135',
				encryptedSecret: '2df503fb168552063136a479fe5598a28e90261b8ba6c16a8a27ff3ac9b3398aeebe6cf7afe6e84279f204bfcd2a62a18d71e08b14792a456bd3b78e60e215263a3aa2ed401346016e72c2a841e0d236',
			}];

			before(function () {
				loadDelegates = library.rewiredModules.delegates.__get__('__private.loadDelegates');
			});

			beforeEach(function () {
				config = library.rewiredModules.delegates.__get__('library.config');
				__private = library.rewiredModules.delegates.__get__('__private');
			});

			beforeEach(function () {
				__private.keypairs = {};
				config.forging.force = true;
				config.forging.secret = [];
				config.forging.encryptedSecrets = [];
			});

			describe('via plaintext secrets', function () {

				it('should not load any delegates when forging.secret array is empty', function (done) {
					config.forging.secret = [];
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should not load any delegates when forging.secret list is undefined', function (done) {
					config.forging.secret = undefined;
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should return error if account does not exist', function (done) {
					var randomAccount = node.randomAccount();
					config.forging.secret = [randomAccount.password];
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.equal(['Account with public key:', randomAccount.publicKey, 'not found'].join(' '));
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should not load account as delegates for non-delegate item', function (done) {
					config.forging.secret = [node.gAccount.password];
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should load secrets in plaintext format', function (done) {
					config.forging.secret = plainTextSecrets;
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(plainTextSecrets.length);
						done();
					});
				});

				it('should load 101 delegates in plaintext format', function (done) {
					config.forging.secret = genesisDelegates.delegates.map(function (delegate) {
						return delegate.secret;
					});
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(101);
						done();
					});
				});
			});

			describe('via encrypted secrets', function () {

				it('should not load any delegates when forging.force is false', function (done) {
					config.forging.force = false;
					config.forging.secret = [];
					config.forging.encryptedSecrets = encryptedSecret;

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should not load any delegates when forging.encryptedSecrets array is empty', function (done) {
					config.forging.secret = [];
					config.forging.encryptedSecrets = [];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should not load any delegates when forging.encryptedSecrets list is undefined', function (done) {
					config.forging.secret = [];
					config.forging.encryptedSecrets = undefined;

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});


				it('should return error if encrypted secret does not decrypt with default secret', function (done) {

					var accountDetails = {
						encryptedSecret:  '1cc653f6bc2a458ae758dcd618b310e31e1598f237c4c4d96321173050e49c3652876808c73ebc2aa75f49044375077108ca7b8594efc6ae4ce0aa239d7e11f',
						publicKey: '35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
					};

					config.forging.secret = [];
					config.forging.encryptedSecrets = [accountDetails];

					loadDelegates(function (err) {
						expect(err).to.equal('Invalid encryptedSecret for publicKey: ' + accountDetails.publicKey);
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should return error if publicKeys do not match', function (done) {
					var accountDetails = {
						encryptedSecret:  '60cc653f6bc2a458ae758dcd618b310e31e1598f237c4c4d96321173050e49c3652876808c73ebc2aa75f49044375077108ca7b8594efc6ae4ce0aa239d7e11f',
						publicKey: 'randomKey',
					};

					config.forging.secret = [];
					config.forging.encryptedSecrets = [accountDetails];

					loadDelegates(function (err) {
						expect(err).to.equal('Public keys do not match');
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should return error if account does not exist', function (done) {
					var randomAccount = {
						publicKey: '35b9364d1733e503599a1e9eefdb4994dd07bb9924acebfec06195cf1a0fa6db',
						secret: 'robust swift deputy enable forget peasant grocery road convince',
						encryptedSecret: '60cc653f6bc2a458ae758dcd618b310e31e1598f237c4c4d96321173050e49c3652876808c73ebc2aa75f49044375077108ca7b8594efc6ae4ce0aa239d7e11f',
						key: 'elephant tree paris dragon chair galaxy'
					};
					var accountDetails = {
						encryptedSecret: randomAccount.encryptedSecret,
						publicKey: randomAccount.publicKey,
					};
					config.forging.secret = [];
					config.forging.encryptedSecrets = [accountDetails];

					loadDelegates(function (err) {
						expect(err).to.equal(['Account with public key:', accountDetails.publicKey.toString('hex'), 'not found'].join(' '));
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should not load account as delegates for non-delegate item', function (done) {
					config.forging.secret = [];
					config.forging.encryptedSecrets = [{
						encryptedSecret: node.gAccount.encryptedSecret,
						publicKey: node.gAccount.publicKey
					}];

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(0);
						done();
					});
				});

				it('should load secrets in encrypted format with the key', function (done) {
					config.forging.secret = [];
					config.forging.encryptedSecrets = encryptedSecret;

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(encryptedSecret.length);
						done();
					});
				});

				it('should load all 101 delegates', function (done) {
					config.forging.secret = [];
					config.forging.encryptedSecrets = genesisDelegates.delegates.map(function (delegate) {
						return {
							encryptedSecret: delegate.encryptedSecret,
							publicKey: delegate.publicKey
						};
					});

					loadDelegates(function (err) {
						expect(err).to.not.exist;
						expect(Object.keys(__private.keypairs).length).to.equal(101);
						done();
					});
				});
			});

			it('should load delegates from plaintext and encrypted secrets list', function (done) {
				config.forging.secret = genesisDelegates.delegates.map(function (delegate) {
					return delegate.secret;
				}).slice(0, 10);
				config.forging.encryptedSecrets = genesisDelegates.delegates.map(function (delegate) {
					return {
						encryptedSecret: delegate.encryptedSecret,
						publicKey: delegate.publicKey
					};
				}).slice(10, 20);

				loadDelegates(function (err) {
					expect(err).to.not.exist;
					expect(Object.keys(__private.keypairs).length).to.equal(20);
					done();
				});
			});
		});
	});
});
