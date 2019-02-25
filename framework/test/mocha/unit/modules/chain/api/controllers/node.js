const rewire = require('rewire');
const genesisDelegates = require('../../../../../data/genesis_delegates.json');
const accountFixtures = require('../../../../../fixtures/accounts');
const application = require('../../../../../common/application');

const RewiredNodeController = rewire(
	'../../../../../../../../framework/src/modules/http_api/controllers/node'
);

// TODO: To be fixed in base branch
// eslint-disable-next-line mocha/no-skipped-tests
describe.skip('node/api', () => {
	const testDelegate = genesisDelegates.delegates[0];
	let defaultPassword;
	let library;
	let privateLibrary;

	before(done => {
		application.init(
			{ sandbox: { name: 'lisk_test_controllers_node' } },
			(err, scope) => {
				library = scope;
				new RewiredNodeController(library);
				privateLibrary = RewiredNodeController.__get__('library');
				done(err);
			}
		);
	});

	after(done => {
		application.cleanup(done);
	});

	describe('constructor', () => {
		describe('library', () => {
			it('should assign storage', () => {
				return expect(privateLibrary).to.have.nested.property(
					'components.storage',
					library.components.storage
				);
			});

			it('should assign system', () => {
				return expect(privateLibrary).to.have.nested.property(
					'components.system',
					library.components.system
				);
			});

			it('should assign config', () => {
				return expect(privateLibrary).to.have.property(
					'config',
					library.config
				);
			});

			it('should assign channel', () => {
				return expect(privateLibrary).to.have.property(
					'channel',
					library.channel
				);
			});
		});
	});

	describe('private functions', () => {
		let __private;

		before(done => {
			__private = {
				updateForgingStatus: RewiredNodeController.__get__(
					'_updateForgingStatus'
				),
				getForgingStatus: RewiredNodeController.__get__('_getForgingStatus'),
			};
			done();
		});

		describe('_updateForgingStatus()', () => {
			before(done => {
				defaultPassword = library.config.forging.defaultPassword;
				done();
			});

			it('should return error with invalid password', () => {
				return expect(
					__private.updateForgingStatus(testDelegate.publicKey),
					'Invalid password',
					true
				).to.eventually.be.rejectedWith(
					'Invalid password and public key combination'
				);
			});

			it('should return error with invalid publicKey', () => {
				const invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				return expect(
					__private.updateForgingStatus(invalidPublicKey, defaultPassword, true)
				).to.eventually.be.rejectedWith(
					'Delegate with publicKey: 9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a not found'
				);
			});

			it('should return error with non delegate account', () => {
				return expect(
					__private.updateForgingStatus(
						accountFixtures.genesis.publicKey,
						accountFixtures.genesis.password,
						true
					)
				).to.eventually.be.rejectedWith(
					'Delegate with publicKey: c094ebee7ec0c50ebee32918655e089f6e1a604b83bcaa760293c61e0f18ab6f not found'
				);
			});

			it('should update forging from enabled to disabled', async () => {
				const forgingStatus = await __private.getForgingStatus(
					testDelegate.publicKey
				);
				if (forgingStatus.length) {
					let result = await __private.updateForgingStatus(
						testDelegate.publicKey,
						testDelegate.password,
						true
					);

					expect(result).to.deep.equal({
						publicKey: testDelegate.publicKey,
						forging: true,
					});

					result = await __private.updateForgingStatus(
						testDelegate.publicKey,
						testDelegate.password,
						false
					);

					expect(result).to.deep.equal({
						publicKey: testDelegate.publicKey,
						forging: false,
					});
				}
			});

			it('should update forging from disabled to enabled', async () => {
				const forgingStatus = await __private.getForgingStatus(
					testDelegate.publicKey
				);
				if (forgingStatus.length) {
					let result = await __private.updateForgingStatus(
						testDelegate.publicKey,
						testDelegate.password,
						false
					);

					expect(result).to.deep.equal({
						publicKey: testDelegate.publicKey,
						forging: false,
					});

					result = await __private.updateForgingStatus(
						testDelegate.publicKey,
						testDelegate.password,
						true
					);

					expect(result).to.deep.equal({
						publicKey: testDelegate.publicKey,
						forging: true,
					});
				}
			});
		});

		describe('_getForgingStatus()', () => {
			it('should return delegate full list when publicKey is not provided', async () => {
				const forgingStatus = await __private.getForgingStatus(null);
				expect(forgingStatus[0]).to.deep.equal({
					forging: true,
					publicKey: testDelegate.publicKey,
				});
				expect(forgingStatus.length).to.equal(
					genesisDelegates.delegates.length
				);
			});

			it('should return delegate status when publicKey is provided', async () => {
				const forgingStatus = await __private.getForgingStatus(
					testDelegate.publicKey
				);
				expect(forgingStatus[0]).to.deep.equal({
					forging: true,
					publicKey: testDelegate.publicKey,
				});
				expect(forgingStatus.length).to.equal(1);
			});

			it('should return delegate status when publicKey is provided and updated forging from enabled to disabled', async () => {
				const result = await __private.updateForgingStatus(
					testDelegate.publicKey,
					defaultPassword,
					false
				);
				expect(result).to.deep.equal({
					publicKey: testDelegate.publicKey,
					forging: false,
				});

				const forgingStatus = await __private.getForgingStatus(
					testDelegate.publicKey
				);

				expect(forgingStatus[0]).to.deep.equal({
					forging: false,
					publicKey: testDelegate.publicKey,
				});

				expect(forgingStatus.length).to.equal(1);
			});

			it('should return updated delegate full list when publicKey is not provided and forging status was changed', async () => {
				const forgingStatus = await __private.getForgingStatus(null);
				expect(forgingStatus[0]).to.deep.equal({
					forging: false,
					publicKey: testDelegate.publicKey,
				});
				expect(forgingStatus.length).to.equal(
					genesisDelegates.delegates.length
				);
			});

			it('should return empty array when invalid publicKey is provided', async () => {
				const invalidPublicKey =
					'9d3058175acab969f41ad9b86f7a2926c74258670fe56b37c429c01fca9fff0a';
				const forgingStatus = await __private.getForgingStatus(
					invalidPublicKey
				);
				expect(forgingStatus.length).to.equal(0);
			});
		});
	});
});
