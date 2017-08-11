'use strict';

// Init tests dependencies
var chai   = require('chai');
var expect = require('chai').expect;
var sinon  = require('sinon');
var rewire = require('rewire');

// Load config file - global (not one from test directory)
var config = require('../../../config.json');
var sql    = require('../../sql/pgNotify.js');
var slots  = require('../../../helpers/slots.js');

// Init tests subject
var pg_notify = rewire('../../../helpers/pg-notify.js');

// Init global variables
var db, invalid_db, logger, bus;
var delegates_list_json = '{"round": 666, "list": ["2f872264534a1722e136bddf29a301fa97708f88583130770d54c1d11366e5fc","c1b5b642849729f087c862046391bc744717541cfe0b52968c705148c576fbf1","1d4941371e39987f25e2ac9f6d579d2162dd1d0bfc50bbba65694d990e7da137","0c7c2b612db9cccba57583e962bb609ea67838f8616546ce946eaf40bf73a2da","7fe4fb9ede1b715b20afcee7f5258a02a4d007c5ede2f0287c7ba1c2c66638b8","90e2f5ca74d39a76c117bc0e3be5e8b572b47fa12536fabfe5802972db943db8","54cd463ad4769270c2057dbc8ad2512452882631c952531dad09ae79b4b78fc1","9d6d602db22619c59a3932d3eba3c4e81277832bab24454676191a5fe1e7385b","8ec002db73e38a22f76f70c9f94968f99d77f1c009f23860400427ab63296785","0a4178fbca14a0cf4b5eb934343da94d766b24a673d6cf197b5d1dcaaf6f9f55","8f375813bfa12a510f556b1fbd3796d5ac08c5356c2982471cc79a68d73f3308","60d36c7ba3b76c2bb3e2d2f8bedf61f17a54de9cfd8f5e49c1fe5658e8832dcc","326544de0b5ae1d73c5b7c233f873de57b02fbec890c90847aa46e621a164b3d","49664663158a141d18b44954959728545fd0597317ccd8f99d5f206dd424cc23","2a899596ae3a8ab438f7efc7ef2b2b7f48d20315e9c669ecb91d7d679f993378","c97d92df8210680610637751b571563120da4e8aa78cc757356efbfdfd0f4d25","366cfff7cc7f96e16c512b9df04f5bc05b694cb253a46e52f1ac8d79be223b06","2052d8fdd3fab6334f77730c4d56de4be35cea5bae706b945ae8f19ea4d62c81","f8453e3b8eb53e26e4486a50ad85fa5be5e9aeb30542d5b71d6c6d20be09c298","12c8dd3b4ca12fdade63c27f767ed85e012d54847932b5c65dd51aacb0d7d25b","c7fc591a74e216fde01fbe89346f919688e9d8d304c593a6d985ec48533a3f48","ed48864abffe2aa66b2f0bdfe43f151e87f653543f4ea5f61f469fdc655754cc","09a4491e247a8a871e48904c69fcd58e92bc5d06075fb23f5813736de516e2b3","6dceabf4f0f8cb0101165cb00689372d60617cd24894d46824a620011c3f297d","ad26f937b4e8d2f663df8b148ff2b56cd768766eac59ba78551f5a415fd94924","f8313e19ad3e3b61cab3c591147d0fce90429696b96f82243ffab10f58a20678","0cfb773eac46cd18609323e298711c427f382d847a5f078c690a21ce09ef1c9c","3fc7907abb6ca45b3c9f315f61a488d0999744a590918ed4f4673d615fc7f35f","9dc80749af77db925345ccc83e4cb74a9548ce11713b74e886efeb5ba13204d1","4b61c3180e4d50681c8e8ba22bd8624d1fb990d3430832993b96d6e177f67a79","b0968d8fd6ab885b1df6ec2af2cacc87c8ee56a3429d39064a69f59a7533a5ad","5510cff50bb32a2f38dd0a6d3d95653810e20483fb280c50f152c2e23bfb69ca","fdd2b4a9842d626bc89028bb5a766fd17ecb292a8003f06b8f824fac86f2cf53","f8d8aa286b689fa7279ad99f0fdfaeb3c0d2b22bee62230df2ba2fe40b9eb628","0a47b151eafe8cfc278721ba14305071cae727395abf4c00bd298296c851dab9","ec5e69549e2b278cc81278822310f040a6fa25472e73ed3fa31d2854d905b7db","1b4662cbd609141211518497e524d401087ab051abf753f6b1ddd41baa43b35a","79de262387a6d51f5510d3dca33c40e614510f00f7bfcc5f9a1ba3a704104fcf","baa1a74353d4dc44caeda1a6b1fdb9a2e2089ab25678cf9e8ceea54b574fa745","82018190e97c950275aa73546510c8acb9203254234cf15ac5376970c0bfb8fa","95c5f754d58fe448ea4013b48abe3fd95250a47e0b3ffb1f62fb026b7e59e87f","8162b08bc15732b4220814693d16eb2db9eee0801eca9fa2015b127d32be4f8d","d18a5f22a1402275fe9d40f4609e5688c1c2a200fb1ba962310c5145114cf34a","2be0301710d1295f9afeba6c469f7447e6915e3e63fcbdd69c3fa54a50184803","14b7969b93494a1e8345e8330148e4a88da6d30dacf02388fdd8a2ba63f2c69d","7d76d68a1fabf8a00ff97b7ae8514d23923e2acfc5594d1f47e3ace5e6a1649e","2c3f411ca51c70e46cd19835ec687f49ae490dc405ffae7bf4ea23607d9ea5cc","83811ea7f9b00e2d540f33c7fa431ac71e734abde89dffd0ff8eb9b09277fc13","9bb219513cfdcf75d096e46ec338732bf78f1453c1c9e949fb14590bccdee31c","33a8d3d41f3276cef20c6ed9c468c31a75ad9643dc3347e8a9370b1ba38524d1","35ab9b36db1207eee23ca6d0706c2fedc82ccf4856453ce7079b1de12fc882b7","f14daa7a42093f0d1b60b8ca0fb70f3ce9dd25f1dd80bdd0ff8cf3875ddf1d16","f555bf37565aab4a500a8225a178bae5afa20c749ce2266d1010728b4578c8cf","1e52b5f94256b29d3978f1a3e1933d2c917376994abe1e03af1332d5f56a83a1","f42203fbd0e6a781530f8e60e41603b04b54cc148b8fc7b975cebe33a682dbb2","362ec7711dd52f97e24af8823e1abc58f545353f6ab13c3855f0020f86f2cd15","4326747318f97e25bbb1873e63a2b54065851175125d9769f3e731eb7e865cf2","ec8efaf175bc9b292302da2de8595cb2e17cc37fbba4dd606b98e1717aa281b1","855e01df4e59df149773aac715340fcc3a9f8e79b18fc63483b8e78c70d08707","e34473ed004f6b39e0af599fe4f43f5bc36286680140f80c026c25e91955f03d","aa9bac4ccaab8206a0bafb3fd8979b13db29a56c632586c0fc2e43452f1704c7","02a968172428da5c33c1f12ecc6a3117886018d42e7a996a263da362ec3aa9bb","d277e465d3b802e51adc7897440f1b2c2037b4dbb59347ccfe0db253df259477","4a18c604dae421566de114ccaef1da51f9ee108a2cfccc33b4e98ac817875ab9","89e546e33eadad6d04d0d89946432058652b2491739f73128ee7b7cfd2a3776c","c379455ea222666817e8b6d7673fb47f3594ab0516441efbcf93c0ab0d9ab15f","1e82d980d55167ece64111a175f6ce558714e4a5a9e3f69fc8776abeedc3e214","a1f23beac0af1cf5d973509c872e8552ef02d585de729ed07e1aa27cc224d262","b3484d1993d9dee4c2225311ff81222c8f8b57e21d1a9f2540ecee31be48b2d9","b55fb628cc9dad2f4073a402941ffc2f53cd0b3e882b7f2b1770d58d2e439df9","80a15f589177338c086095cd80f157d964d78b463684388d9e0c7a126c9313a8","1a8de1c82a2bb79b51fc452580ddcd30f802de268cf914bee54e5e3c72505ae0","687f54af22b69a15d685fe4aa3ee157a3a17c6c62cad86cde3066bdc26dbb69f","14d6e1db90c94afc0d59bf52061311c20b030a13919842b1af06e94951219f4d","9548a003ec975142d99e0e9a720655b4be0a08801f940dc0fbc242de2ecd5558","f654f16a9d538120b391fb2de6683802d5926408b7b2c95f7307ebd83156eb77","703ee0695471a0c274dc225d691fb2387e061bbb28f9c729c09149f20a7efe44","95f0cc8ee70052aa78866ec0be9146917d05a05db814b2c4d4ed151b4e5e6f7b","a21f655cf396727c186254f23d9f266481884442f6338a9d55f603a7abbdcb61","dae47d539641710c933136522794c56f2152c8a41fb1f8599666f01f25c977eb","5351f73cc176500d968f50aed518fb1fe9c748d14af905e740f03fbd5ee4e51e","b6f1017fc2d51dbe5e30115e1cbd7619269969bee098359da0eef83916fa49ff","09e13e1c72143c9b75013f0d5fe13e1e978e608ea883bb93a3a9c38f0c8826f3","b06fc6c45bfccb5ab0da94a06f083b08ee069f849cccafd68da3ce334f330da7","129049f0f3fb76738123e483060fd83cbff2d90d67833763f54717d915a23cb3","ecfb82f80f204e508b83c0eab2543b33b946fe31958f3d7ce91015dbe3c7f31a","05c3190c0bb57d9908c2b82f8b8d6d0f2b69f1ce7dff0c7fccaff23c00b8072b","02a70630d4f4eb9722763ac91abf2048fcaa9172e8734a32dbd1f70c6c5668a8","38de3395db59b478a2a2a1bc5b24fca3c2ffea77f101ff9d4e39809afac842f9","8e094cebc4cdafdf379b5ce5097fe5910f2dc34ae5fe223a1cc3ef6fe55ca51b","3046ab9cd2cf06e8483873852595fbaee6c3078caa169d58e17a6b2371ce05b7","08b81a3228a70b6a96d7e432718e3ee36d4a691c34a9986b202378da0ebe4357","66e6564444ce14caab3e5c92084e163ce7af71847f32669a42b4959f430aa999","fa7e7da4d339d0cd07290364509b0b90758e1654de6cd9cbb04672b555680597","084b559ee2fec7d755aa458387e5276f830ddf4b08dcfc2ff11e3dc38d451493","7d395718ae51f1dedd3ceff4fb3fb807c57bee88ae93d05684ede9d3152d53ce","37d70714bf4e447ba80bdb348ae38f0fced03551fccf5e52dcab8cbbdf7b4e15","7f31ab028c700d4cf0ca933866c40a5249bc78cbc4d108cbb468e0bcd190715d","09702cba04017cf2847925e6d072d708a7933ab9a385ac77549fda28991907dc","6122ac1fd71b437014ddbc4ec01e07879f5af1853536efaa0233bc12907c684b","0f6a1ac6c2a98dc611a1de1ed8fb81186ec6d1852f9054841dc36e73bdd9e20d"]}';
var delegates_list = JSON.parse(delegates_list_json);

describe('helpers/pg-notify', function () {

	before(function (done) {
		// Init dummy connection with database - valid, used for tests here
		// We don't use pg-native here on purpose - it lacks connection.client.processID, and we need it to perform reconnect tests
		var pgp = require('pg-promise')();
		config.db.user = config.db.user || process.env.USER;
		db = pgp(config.db);

		// Init dummy connection with database - invalid one
		invalid_db = pgp({user: 'invalidUser'});

		// Set spies for logger
		logger = {
			debug: sinon.spy(),
			info:  sinon.spy(),
			warn:  sinon.spy(),
			error: sinon.spy()
		};

		// Set spy for bus
		bus = {
			message: sinon.spy()
		};

		done();
	});

	function resetSpiesState () {
		// Reset state of spies
		logger.debug.reset();
		logger.info.reset();
		logger.warn.reset();
		logger.error.reset();
		bus.message.reset();
	}

	function failQueryBatch (t) {
		var queries = [];
		queries.push(t.none('SELECT invalid_sql_query'));
		return t.batch(queries);
	}

	function reconnect (done) {
		pg_notify.init(db, bus, logger, function (err) {
			// Should be no error
			expect(err).to.be.undefined;
			expect(logger.info.args[0][0]).to.equal('pg-notify: Initial connection estabilished');
			resetSpiesState();
			done();
		});
	}

	beforeEach(function (done) {
		resetSpiesState();
		reconnect(done);
	});

	afterEach(function () {
		var connection = pg_notify.__get__('connection');
		// Release the connection
		if (connection) {
			connection.done();
		}
	});

	describe('init', function () {
		it('should establish initial connection using valid params', function (done) {
			pg_notify.init(db, bus, logger, function (err) {
				// Should be no error
				expect(err).to.be.undefined;
				expect(logger.info.args[0][0]).to.equal('pg-notify: Initial connection estabilished');
				done();
			});
		});

		it('should fail (after 1 retry) to establish initial connection using invalid params', function (done) {
			pg_notify.init(invalid_db, bus, logger, function (err) {
				var err_msgs = ['password authentication failed for user "invalidUser"', 'role "invalidUser" does not exist'];
				// Error should propagate
				expect(err).to.be.an('error');
				expect(err_msgs).to.include(err.message);
				// First try
				expect(logger.error.args[0][0]).to.equal('pg-notify: Error connecting');
				expect(logger.error.args[0][1]).to.be.an('error');
				expect(err_msgs).to.include(logger.error.args[0][1].message);
				// Retry
				expect(logger.error.args[1][0]).to.equal('pg-notify: Initial connection failed');
				expect(logger.error.args[1][1]).to.be.an('error');
				expect(err_msgs).to.include(logger.error.args[1][1].message);
				done();
			});
		});

		it('should establish initial connection using valid params and fail (after 1 retry) if execution of LISTEN queries encounters error', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite listenQueries function with one that always fail
			var restore = pg_notify.__set__('listenQueries', failQueryBatch);

			pg_notify.init(db, bus, logger, function (err) {
				var err_msg = 'column "invalid_sql_query" does not exist';
				// Error should propagate
				expect(err).to.deep.include({name: 'BatchError', message: err_msg});
				// First try
				expect(logger.error.args[0][0]).to.equal('pg-notify: Failed to execute LISTEN queries');
				expect(logger.error.args[0][1]).to.deep.include({name: 'BatchError', message: err_msg});
				// Retry
				expect(logger.error.args[1][0]).to.equal('pg-notify: Initial connection failed');
				expect(logger.error.args[1][1]).to.deep.include({name: 'BatchError', message: err_msg});
				restore();
				done();
			});
		});
	});

	describe('setListeners', function () {
		it('should set listeners correctly after successful connection', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');
			var onNotification = pg_notify.__get__('onNotification');

			expect(setListeners).to.be.an('function');
			expect(connection).to.be.an('object').and.have.property('client');
			expect(connection.client._events.notification).to.be.an('function');
			expect(connection.client._events.notification).equal(onNotification);
			done();
		});

		it('should fail if execution of LISTEN encounters error', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite listenQueries function with one that always fail
			var restore = pg_notify.__set__('listenQueries', failQueryBatch);

			setListeners(connection.client, function (err) {
				expect(logger.error.args[0][0]).to.equal('pg-notify: Failed to execute LISTEN queries');
				expect(err).to.deep.include({name: 'BatchError', message: 'column "invalid_sql_query" does not exist'});
				restore();
				return done();
			});
		});
	});

	describe('onConnectionLost', function () {
		it('should fail after 10 retries if cannot reconnect', function (done) {
			var err_msgs = ['password authentication failed for user "invalidUser"', 'role "invalidUser" does not exist'];
			// Re-init connection
			pg_notify.init(invalid_db, bus, logger, function (err) {
				resetSpiesState();

				// Spy private functions
				var setListeners = pg_notify.__get__('setListeners');
				var connection = pg_notify.__get__('connection');

				var exit = sinon.stub(process, 'exit');

				// Execute query that terminate existing connection
				db.query(sql.interruptConnection, {pid: connection.client.processID}).then(setTimeout(function () {
					// 12 errors should be collected
					expect(logger.error.args).to.be.an('array').and.lengthOf(12);

					// First error is caused by our test SQL query
					expect(logger.error.args[0][0]).to.equal('pg-notify: Connection lost');
					expect(logger.error.args[0][1]).to.be.an('error');
					expect(logger.error.args[0][1].message).to.equal('terminating connection due to administrator command');

					var errors = logger.error.args.slice(1, 11);
					// Iterating over errors (failed retries)
					for (var i = errors.length - 1; i >= 0; i--) {
						expect(errors[i][0]).to.equal('pg-notify: Error connecting');
						expect(errors[i][1]).to.be.an('error');
						expect(err_msgs).to.include(errors[i][1].message);
					}

					// Last error - function should fail to reconnect
					expect(logger.error.args[11][0]).to.equal('pg-notify: Failed to reconnect - connection lost');
					
					// Connection should be cleared
					connection = pg_notify.__get__('connection');
					expect(connection).to.be.an('null');

					expect(exit.calledOnce).to.be.ok;
					exit.restore();

					done();
				}, 60000)).catch(done);
			});
		});

		it('should reconnect successfully if possible', function (done) {
			// Spy private functions
			var setListeners = pg_notify.__get__('setListeners');
			var connection = pg_notify.__get__('connection');

			resetSpiesState();

			// Execute query that terminate existing connection
			db.query(sql.interruptConnection, {pid: connection.client.processID}).then(setTimeout(function () {
				expect(logger.error.args[0][0]).to.equal('pg-notify: Connection lost');
				expect(logger.error.args[0][1]).to.be.an('error');
				expect(logger.error.args[0][1].message).to.equal('terminating connection due to administrator command');

				expect(logger.info.args[0][0]).to.equal('pg-notify: Reconnected successfully');
				done();
			}, 10000)).catch(done);
		});
	});

	describe('removeListeners', function () {
		it('should remove listeners correctly', function (done) {
			// Spy private functions
			var removeListeners = pg_notify.__get__('removeListeners');
			var connection = pg_notify.__get__('connection');

			removeListeners(connection.client, function (err) {
				expect(removeListeners).to.be.an('function');
				expect(connection).to.be.an('object').and.have.property('client');
				expect(connection.client._events.notification).to.be.undefined;
				done();
			});
		});

		it('should remove listeners correctly even if error encountered executing UNLISTEN queries', function (done) {
			// Spy private functions
			var removeListeners = pg_notify.__get__('removeListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite unlistenQueries function with one that always fail
			var restore = pg_notify.__set__('unlistenQueries', failQueryBatch);

			removeListeners(connection.client, function (err) {
				expect(logger.error.args[0][0]).to.equal('pg-notify: Failed to execute UNLISTEN queries');
				expect(err).to.deep.include({name: 'BatchError', message: 'column "invalid_sql_query" does not exist'});
				restore();
				done();
			});
		});

		it('should remove listeners correctly even if connection is null', function (done) {
			// Spy private functions
			var removeListeners = pg_notify.__get__('removeListeners');
			var connection = pg_notify.__get__('connection');
			// Overwrite connection object with null
			var restore = pg_notify.__set__('connection', null);

			removeListeners(connection.client, function (err) {
				expect(removeListeners).to.be.an('function');
				expect(connection).to.be.an('object').and.have.property('client');
				expect(connection.client._events.notification).to.be.undefined;
				restore();
				done();
			});
		});
	});

	describe('onNotification', function () {
		var delegates_list_db;
		var round;

		before(function (done) {
			// Get valid data from database, so we can compare notifications results with them
			db.query(sql.getDelegatesList).then(function (result) {
				delegates_list_db = result[0].list;
			}).catch(done);

			db.query(sql.getRound).then(function (result) {
				round = result[0].round;
				done();
			}).catch(done);
		});

		it('should not notify about round-closed event when payload is not valid JSON', function (done) {
			var channel = 'round-closed';
			var message = 'not_json';

			// Execute query that trigger notify
			db.query(sql.triggerNotifyWithMessage, {channel: channel, message: message}).then(setTimeout(function () {
				expect(logger.debug.args[0]).to.deep.equal(['pg-notify: Notification received', {channel: 'round-closed', data: 'not_json'}]);
				expect(logger.info.args[0]).to.deep.equal(['pg-notify: Round closed']);
				expect(logger.warn.args[0]).to.be.undefined;
				expect(logger.error.args[0][0]).to.equal('pg-notify: Unable to parse JSON');
				expect(bus.message.args[0]).to.be.undefined;
				done();
			}, 20)).catch(done);
		});

		it('should not notify about round-reopened event when payload is not valid JSON', function (done) {
			var channel = 'round-reopened';
			var message = 'not_json';

			// Execute query that trigger notify
			db.query(sql.triggerNotifyWithMessage, {channel: channel, message: message}).then(setTimeout(function () {
				expect(logger.debug.args[0]).to.deep.equal(['pg-notify: Notification received', {channel: 'round-reopened', data: 'not_json'}]);
				expect(logger.info.args[0]).to.be.undefined;
				expect(logger.warn.args[0]).to.deep.equal(['pg-notify: Round reopened']);
				expect(logger.error.args[0][0]).to.equal('pg-notify: Unable to parse JSON');
				expect(bus.message.args[0]).to.be.undefined;
				done();
			}, 20)).catch(done);
		});

		it('should not notify about unknown event', function (done) {
			var channel = 'unknown';

			// Execute query that trigger notify
			db.query(sql.triggerNotify, {channel: channel}).then(setTimeout(function () {
				expect(logger.debug.args[0]).to.be.undefined;
				expect(logger.info.args[0]).to.be.undefined;
				expect(logger.warn.args[0]).to.be.undefined;
				expect(logger.error.args[0]).to.be.undefined;
				expect(bus.message.args[0]).to.be.undefined;
				done();
			}, 20)).catch(done);
		});

		it('should not notify about event on invalid channel, but log it', function (done) {
			var channel = 'round-reopened';

			// Overwrite channels object with custom ones
			var restore = pg_notify.__set__('channels', {});

			// Execute query that trigger notify
			db.query(sql.triggerNotify, {channel: channel}).then(setTimeout(function () {
				expect(logger.debug.args[0][0]).to.equal('pg-notify: Notification received');
				expect(logger.debug.args[0][1].channel).to.equal(channel);
				expect(JSON.parse(logger.debug.args[0][1].data)).to.deep.equal({round: round, list: delegates_list_db});
				expect(logger.error.args[0]).to.deep.equal(['pg-notify: Invalid channel', channel]);
				expect(logger.info.args[0]).to.be.undefined;
				expect(logger.warn.args[0]).to.be.undefined;
				expect(bus.message.args[0]).to.be.undefined;
				restore();
				done();
			}, 20)).catch(done);
		});

		it('should not notify about event on not supported channel, but log it', function (done) {
			var channel = 'test';

			// Overwrite channels object with custom ones
			var restore = pg_notify.__set__('channels', {test: 'test'});

			pg_notify.init(db, bus, logger, function (err) {
				resetSpiesState();

				// Execute query that trigger notify
				db.query(sql.triggerNotify, {channel: channel}).then(setTimeout(function () {
					expect(logger.debug.args[0][0]).to.equal('pg-notify: Notification received');
					expect(logger.debug.args[0][1].channel).to.equal(channel);
					expect(JSON.parse(logger.debug.args[0][1].data)).to.deep.equal({round: round, list: delegates_list_db});
					expect(logger.error.args[0]).to.deep.equal(['pg-notify: Channel not supported', channel]);
					expect(logger.info.args[0]).to.be.undefined;
					expect(logger.warn.args[0]).to.be.undefined;
					expect(bus.message.args[0]).to.be.undefined;
					restore();
					done();
				}, 20)).catch(done);
			});
		});

		it('should notify about round-reopened event', function (done) {
			var channel = 'round-reopened';

			// Execute query that trigger notify
			db.query(sql.triggerNotifyWithMessage, {channel: channel, message: delegates_list_json}).then(setTimeout(function () {
				expect(logger.debug.args[0]).to.deep.equal(['pg-notify: Notification received', {channel: channel, data: delegates_list_json}]);
				expect(logger.info.args[0]).to.be.undefined;
				expect(logger.warn.args[0]).to.deep.equal(['pg-notify: Round reopened']);
				expect(logger.error.args[0]).to.be.undefined;
				expect(bus.message.args[0]).to.deep.equal(['roundChanged', delegates_list]);
				done();
			}, 20)).catch(done);
		});

		it('should notify about round-closed event', function (done) {
			var channel = 'round-closed';

			// Execute query that trigger notify
			db.query(sql.triggerNotifyWithMessage, {channel: channel, message: delegates_list_json}).then(setTimeout(function () {
				expect(logger.debug.args[0]).to.deep.equal(['pg-notify: Notification received', {channel: channel, data: delegates_list_json}]);
				expect(logger.info.args[0]).to.deep.equal(['pg-notify: Round closed']);
				expect(logger.warn.args[0]).to.be.undefined;
				expect(logger.error.args[0]).to.be.undefined;
				expect(bus.message.args[0]).to.deep.equal(['roundChanged', delegates_list]);

				done();
			}, 20)).catch(done);
		});

		it('should notify about round-reopened event (message generated by query)', function (done) {
			var channel = 'round-reopened';

			// Execute query that trigger notify
			db.query(sql.triggerNotify, {channel: channel}).then(setTimeout(function () {
				expect(logger.debug.args[0][0]).to.equal('pg-notify: Notification received');
				expect(logger.info.args[0]).to.be.undefined;
				expect(logger.warn.args[0]).to.deep.equal(['pg-notify: Round reopened']);
				expect(logger.error.args[0]).to.be.undefined;
				expect(bus.message.args[0][0]).to.equal('roundChanged');
				expect(bus.message.args[0][1].round).to.be.a('number');
				expect(bus.message.args[0][1].list).to.be.an('array').and.lengthOf(slots.delegates);

				done();
			}, 20)).catch(done);
		});

		it('should notify about round-closed event (message generated by query)', function (done) {
			var channel = 'round-closed';

			// Execute query that trigger notify
			db.query(sql.triggerNotify, {channel: channel}).then(setTimeout(function () {
				expect(logger.debug.args[0][0]).to.equal('pg-notify: Notification received');
				expect(logger.info.args[0]).to.deep.equal(['pg-notify: Round closed']);
				expect(logger.warn.args[0]).to.be.undefined;
				expect(logger.error.args[0]).to.be.undefined;
				expect(bus.message.args[0][0]).to.equal('roundChanged');
				expect(bus.message.args[0][1].round).to.be.a('number');
				expect(bus.message.args[0][1].list).to.be.an('array').and.lengthOf(slots.delegates);

				done();
			}, 20)).catch(done);
		});
	});
});
