const fs = require('fs-extra');
const Controller = require('../../../../../src/controller/controller');
const Bus = require('../../../../../src/controller/bus');
const InMemoryChannel = require('../../../../../src/controller/channels/in_memory_channel');

jest.mock('fs-extra');
jest.mock('../../../../../src/controller/bus');
jest.mock('../../../../../src/controller/channels/in_memory_channel');

describe('Controller Class', () => {
	// Arrange
	const appLabel = '#LABEL';
	const logger = {
		info: jest.fn(),
		error: jest.fn(),
	};
	const config = {
		components: '#CONFIG',
		initialState: '#CONFIG',
	};
	const rootDir = process.cwd();
	const systemDirs = {
		root: rootDir,
		temp: `${rootDir}/tmp/${appLabel}/`,
		sockets: `${rootDir}/tmp/${appLabel}/sockets`,
		pids: `${rootDir}/tmp/${appLabel}/pids`,
	};
	const configController = {
		...config,
		dirs: systemDirs,
		socketsPath: {
			root: `unix://${systemDirs.sockets}`,
			pub: `unix://${systemDirs.sockets}/lisk_pub.sock`,
			sub: `unix://${systemDirs.sockets}/lisk_sub.sock`,
			rpc: `unix://${systemDirs.sockets}/lisk_rpc.sock`,
		},
	};

	let controller = null;

	beforeEach(() => {
		// Act
		controller = new Controller(appLabel, config, logger);
	});

	afterEach(async () => {
		// Act
		controller.cleanup();
	});

	describe('#constructor', () => {
		it('should initialize the instance correctly when valid arguments were provided.', () => {
			// Assert
			expect(controller.logger).toEqual(logger);
			expect(controller.appLabel).toEqual(appLabel);
			expect(controller.config).toEqual(configController);
			expect(controller.modules).toEqual({});
			expect(controller.channel).toBeNull();
			expect(controller.bus).toBeNull();
		});
	});

	describe('#load', () => {
		it('should call initialization methods.', async () => {
			// Arrange
			const spies = {
				_setupDirectories: jest.spyOn(controller, '_setupDirectories'),
				_validatePidFile: jest.spyOn(controller, '_validatePidFile'),
				_initState: jest.spyOn(controller, '_initState'),
				_setupBus: jest.spyOn(controller, '_setupBus'),
				_loadModules: jest.spyOn(controller, '_loadModules'),
			};
			const modules = {};

			// Act
			await controller.load(modules);

			// Assert
			// Order of the functions matters in load method
			expect(spies._setupDirectories).toHaveBeenCalled();
			expect(spies._validatePidFile).toHaveBeenCalledAfter(
				spies._setupDirectories
			);
			expect(spies._initState).toHaveBeenCalledAfter(spies._validatePidFile);
			expect(spies._setupBus).toHaveBeenCalledAfter(spies._initState);
			expect(spies._loadModules).toHaveBeenCalledAfter(spies._setupBus);
			expect(spies._loadModules).toHaveBeenCalledWith(modules);
		});

		// #region TODO channel.publish('lisk:ready')
		it.todo(
			'should publish "lisk:ready" event.'
			/**
			, async () => {
				// Arrange
				const modules = {};
				const spies = {
					/**
					 * _validatePidFile is interacting with File System,
					 * and throwing exception when we have multiple pid files,
					 * with the same label.
					 * /
					_validatePidFile: jest
						.spyOn(controller, '_validatePidFile')
						.mockResolvedValue(''),
				};

				// Act
				await controller.load(modules);

				// Arrange Again
				// Channel is established after load method was executed
				// Therefore, we couldn't spy it before.
				// @ToDO This initialization logic should be improved.
				spies.channelPublish = jest.spyOn(controller.channel, 'publish');

				// Assert
				expect(spies.channelPublish).toHaveBeenCalledWith('lisk:ready');
			}
		*/
		);
		// #endregion
	});

	describe('#setupDirectories', () => {
		it('should ensure directories exist', async () => {
			// Act
			await controller._setupDirectories();

			// Assert
			expect(fs.ensureDir).toHaveBeenCalledWith(systemDirs.temp);
			expect(fs.ensureDir).toHaveBeenCalledWith(systemDirs.sockets);
			expect(fs.ensureDir).toHaveBeenCalledWith(systemDirs.pids);
		});
	});

	describe('#_initState', () => {
		it.todo('should create application state');
	});

	describe('#_validatePidFile', () => {
		it.todo(
			'should call `fs.writeFile` function with pidPath, process.pid arguments.'
		);

		it.todo(
			'should throw `DuplicateAppInstanceError` if an application is already running with the given label.'
		);
	});

	describe('#_setupBus', () => {
		beforeEach(async () => {
			// Act
			controller._setupBus();
		});

		it('should set created `Bus` instance to `controller.bus` property.', () => {
			// Assert
			expect(Bus).toHaveBeenCalledWith(
				{
					wildcard: true,
					delimiter: ':',
					maxListeners: 1000,
				},
				logger,
				configController
			);
			expect(controller.bus).toBeInstanceOf(Bus);
		});

		it('should call `controller.bus.setup()` method.', () => {
			// Assert
			expect(controller.bus.setup).toHaveBeenCalled();
		});

		it('should set created `InMemoryChannel` instance to `controller.channel` property.', () => {
			// Assert
			/**
			 * @todo it is not possible to test the arguments at the moment.
				expect(InMemoryChannel).toHaveBeenCalledWith(
					'lisk',
					['ready'],
					{
						getComponentConfig: () => {},
					},
					controller.bus,
					{ skipInternalEvents: true }
				);
			*/
			expect(controller.channel).toBeInstanceOf(InMemoryChannel);
		});

		it('should call `controller.channel.registerToBus()` method.', () => {
			// Assert
			expect(controller.bus.setup).toHaveBeenCalled();
		});

		it.todo('should log events if level is greater than info.');
	});

	describe('#_loadModules', () => {
		it('should load modules in sequence', async () => {
			// Arrange
			const spies = {
				_loadInMemoryModule: jest
					.spyOn(controller, '_loadInMemoryModule')
					.mockResolvedValue(''),
			};

			const modules = {
				dummyModule1: {
					klass: '#KLASS1',
					options: '#OPTIONS1',
				},
				dummyModule2: {
					klass: '#KLASS2',
					options: '#OPTIONS2',
				},
				dummyModule3: {
					klass: '#KLASS3',
					options: '#OPTIONS3',
				},
			};

			// Act
			await controller._loadModules(modules);

			// Assert
			Object.keys(modules).forEach((alias, index) => {
				expect(spies._loadInMemoryModule).toHaveBeenNthCalledWith(
					index + 1,
					alias,
					modules[alias].klass,
					modules[alias].options
				);
			});
		});
	});

	describe('#_loadInMemoryModule', () => {
		it.todo('should call validateModuleSpec function.');

		describe('when creating channel', () => {
			it.todo(
				'should add created channel to `controller.modulesChannel` object'
			);

			it.todo(
				'should call `channel.registerToBus` method to register channel to the Bus.'
			);
		});

		describe('when creating module', () => {
			it.todo('should publish `loading:started` event before loading module.');
			it.todo('should call `module.load` method.');
			it.todo('should publish `loading:finished` event after loading module.');
			it.todo('should add module to `controller.modules` object.');
		});
	});
	describe('#unloadModules', () => {
		let stubs = {};
		beforeEach(() => {
			// Arrange
			stubs = {
				dummyModuleUnload1: jest.fn(),
				dummyModuleUnload2: jest.fn(),
				dummyModuleUnload3: jest.fn(),
			};

			controller.modules = {
				dummyModule1: {
					unload: stubs.dummyModuleUnload1,
				},
				dummyModule2: {
					unload: stubs.dummyModuleUnload2,
				},
				dummyModule3: {
					unload: stubs.dummyModuleUnload3,
				},
			};
		});

		it('should unload modules in sequence', async () => {
			// Act
			await controller.unloadModules();

			// Assert
			expect(stubs.dummyModuleUnload1).toHaveBeenCalled();
			expect(stubs.dummyModuleUnload2).toHaveBeenCalledAfter(
				stubs.dummyModuleUnload1
			);
			expect(stubs.dummyModuleUnload3).toHaveBeenCalledAfter(
				stubs.dummyModuleUnload2
			);
		});

		it('should unload all modules if modules argument was not provided', async () => {
			// Act
			await controller.unloadModules();

			// Assert
			expect(controller.modules).toEqual({});
		});

		it('should unload given modules if modules argument was provided', async () => {
			// Act
			await controller.unloadModules(['dummyModule1', 'dummyModule3']);

			// Assert
			expect(controller.modules).toEqual({
				dummyModule2: {
					unload: stubs.dummyModuleUnload2,
				},
			});
		});
	});
});
