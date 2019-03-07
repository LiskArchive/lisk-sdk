const assert = require('assert');
const fs = require('fs-extra');
const psList = require('ps-list');
const systemDirs = require('./config/dirs');
const { InMemoryChannel, ChildProcessChannel } = require('./channels');
const Bus = require('./bus');
const { DuplicateAppInstanceError } = require('../errors');

/* eslint-disable no-underscore-dangle */

const validateModuleSpec = moduleSpec => {
	assert(moduleSpec.constructor.alias, 'Module alias is required.');
	assert(moduleSpec.constructor.info.name, 'Module name is required.');
	assert(moduleSpec.constructor.info.author, 'Module author is required.');
	assert(moduleSpec.constructor.info.version, 'Module version is required.');
	assert(moduleSpec.defaults, 'Module default options are required.');
	assert(moduleSpec.events, 'Module events are required.');
	assert(moduleSpec.actions, 'Module actions are required.');
	assert(moduleSpec.load, 'Module load action is required.');
	assert(moduleSpec.unload, 'Module unload actions is required.');
};

const isPidRunning = async pid =>
	psList().then(list => list.some(x => x.pid === pid));

/**
 * Controller logic responsible to run the application instance
 *
 * @class
 * @memberof framework.controller
 * @requires assert
 * @requires bluebird
 * @requires fs-extra
 * @requires helpers/config
 * @requires channels/event_emitter
 * @requires module.Bus
 */
class Controller {
	/**
	 * Controller responsible to run the application
	 *
	 * @param {string} appLabel - Application label
	 * @param {Object} componentConfig - Configurations for components
	 * @param {component.Logger} logger - Logger component responsible for writing all logs to output
	 */
	constructor(appLabel, componentConfig, logger) {
		this.logger = logger;
		this.appLabel = appLabel;
		this.logger.info('Initializing controller');

		this.componentConfig = componentConfig;
		this.modules = {};
		this.channel = null; // Channel for controller
		this.modulesChannels = {}; // Keep track of all channels for modules
		this.bus = null;
		this.config = { dirs: systemDirs(this.appLabel) };
		this.socketsPath = {
			pub: `unix://${this.config.dirs.sockets}/bus_pub.sock`,
			sub: `unix://${this.config.dirs.sockets}/bus_sub.sock`,
			rpc: `unix://${this.config.dirs.sockets}/bus_rpc.sock`,
		};
	}

	/**
	 * Load the initial state and start listening for events or triggering actions.
	 * Publishes 'lisk:ready' state on the bus.
	 *
	 * @param modules
	 * @async
	 */
	async load(modules) {
		this.logger.info('Loading controller');
		await this._setupDirectories();
		await this._validatePidFile();
		await this._setupBus();
		await this._loadModules(modules);

		this.logger.info('Bus listening to events', this.bus.getEvents());
		this.logger.info('Bus ready for actions', this.bus.getActions());

		this.channel.publish('lisk:ready', {});
	}

	/**
	 * Verify existence of required directories.
	 *
	 * @async
	 */
	// eslint-disable-next-line class-methods-use-this
	async _setupDirectories() {
		// Make sure all directories exists
		await fs.ensureDir(this.config.dirs.temp);
		await fs.ensureDir(this.config.dirs.sockets);
		await fs.ensureDir(this.config.dirs.pids);
	}

	async _validatePidFile() {
		const pidPath = `${this.config.dirs.pids}/controller.pid`;
		const pidExists = await fs.pathExists(pidPath);
		if (pidExists) {
			const pidRunning = await isPidRunning(
				parseInt(await fs.readFile(pidPath))
			);
			if (pidRunning) {
				this.logger.error(
					`An instance of application "${
						this.appLabel
					}" is already running. You have to change application name to run another instance.`
				);
				throw new DuplicateAppInstanceError(this.appLabel, pidPath);
			}
		}
		await fs.writeFile(pidPath, process.pid);
	}

	/**
	 * Initialize bus
	 *
	 * @async
	 */
	async _setupBus() {
		this.bus = new Bus(this, {
			wildcard: true,
			delimiter: ':',
			maxListeners: 1000,
		});

		await this.bus.setup(this.socketsPath);

		this.channel = new InMemoryChannel(
			'lisk',
			['ready'],
			{
				getComponentConfig: action => this.componentConfig[action.params],
			},
			this.bus,
			{ skipInternalEvents: true }
		);

		await this.channel.registerToBus();

		// If log level is greater than info
		if (this.logger.level && this.logger.level() < 30) {
			this.bus.onAny((name, event) => {
				this.logger.debug(
					`MONITOR: ${event.source} -> ${event.module}:${event.name}`,
					event.data
				);
			});
		}
	}

	async _loadModules(modules) {
		// To perform operations in sequence and not using bluebird
		// eslint-disable-next-line no-restricted-syntax
		for (const alias of Object.keys(modules)) {
			const { klass, options } = modules[alias];
			if (options.useSocketChannel) {
				// eslint-disable-next-line no-await-in-loop
				await this._loadModuleWithSocketChannel(alias, klass, options);
			} else {
				// eslint-disable-next-line no-await-in-loop
				await this._loadInMemoryModule(alias, klass, options);
			}
		}
	}

	async _loadInMemoryModule(alias, Klass, options) {
		const module = new Klass(options);
		validateModuleSpec(module);

		const moduleAlias = alias || module.constructor.alias;
		const { name, version } = module.constructor.info;

		this.logger.info(
			`Loading module with alias: ${moduleAlias}(${name}:${version})`
		);

		const channel = new InMemoryChannel(
			moduleAlias,
			module.events,
			module.actions,
			this.bus
		);

		this.modulesChannels[moduleAlias] = channel;

		await channel.registerToBus();

		channel.publish(`${moduleAlias}:registeredToBus`);
		channel.publish(`${moduleAlias}:loading:started`);
		await module.load(channel);
		channel.publish(`${moduleAlias}:loading:finished`);

		this.modules[moduleAlias] = module;
		this.logger.info(
			`Module ready with alias: ${moduleAlias}(${name}:${version})`
		);
	}

	async _loadModuleWithSocketChannel(alias, Klass, options) {
		const module = new Klass(options);
		validateModuleSpec(module);

		const moduleAlias = alias || module.constructor.alias;
		const { name, version } = module.constructor.info;

		this.logger.info(
			`Loading module with alias: ${moduleAlias}(${name}:${version})`
		);

		const channel = new ChildProcessChannel(
			moduleAlias,
			module.events,
			module.actions
		);

		this.modulesChannels[moduleAlias] = channel;

		await channel.connect(this.socketsPath);
		await channel.registerToBus();

		channel.publish(`${moduleAlias}:registeredToBus`);
		channel.publish(`${moduleAlias}:loading:started`);
		await module.load(channel);
		channel.publish(`${moduleAlias}:loading:finished`);

		this.modules[moduleAlias] = module;
		this.logger.info(
			`Module ready with alias: ${moduleAlias}(${name}:${version})`
		);
	}

	async unloadModules(modules = undefined) {
		// To perform operations in sequence and not using bluebird

		// eslint-disable-next-line no-restricted-syntax
		for (const alias of modules || Object.keys(this.modules)) {
			// eslint-disable-next-line no-await-in-loop
			await this.modules[alias].unload();
			delete this.modules[alias];
		}
	}

	async cleanup(code, reason) {
		this.logger.info('Cleanup controller...');

		if (reason) {
			this.logger.error(reason);
		}

		try {
			await this.bus.cleanup();
			await this.unloadModules();
			this.logger.info('Unload completed');
		} catch (error) {
			this.logger.error('Caused error during cleanup', error);
		}
	}
}

module.exports = Controller;
