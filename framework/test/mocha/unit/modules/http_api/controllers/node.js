const rewire = require('rewire');
const application = require('../../../../common/application');

const RewiredNodeController = rewire(
	'../../../../../../src/modules/http_api/controllers/node'
);

describe('node/api', () => {
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

			it('should assign applicationState', () => {
				return expect(privateLibrary).to.have.property(
					'applicationState',
					library.applicationState
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
});
