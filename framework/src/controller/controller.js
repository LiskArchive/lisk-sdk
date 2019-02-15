const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const psList = require('ps-list');
const systemDirs = require('./config/dirs');
const EventEmitterChannel = require('./channels/event_emitter');
const Bus = require('./bus');
const { DuplicateAppInstanceError } = require('../errors');

/* eslint-disable no-underscore-dangle */

const validateModuleSpec = moduleSpec => {
	assert(moduleSpec.alias, 'Module alias is required.');
	assert(moduleSpec.info.name, 'Module name is required.');
	assert(moduleSpec.info.author, 'Module author is required.');
	assert(moduleSpec.info.version, 'Module version is required.');
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
 * @namespace Framework
 * @requires assert
 * @requires bluebird
 * @requires fs-extra
 * @requires helpers/config
 * @requires channels/event_emitter
 * @requires module.Bus
 * @type {module.Controller}
 */
module.exports = class Controller {
	/**
	 * Controller responsible to run the application
	 *
	 * @param {string} appLabel - Application label
	 * @param {Object} modules - Modules objects
	 * @param {Object} componentConfig - Component configuration provided by user
	 * @param {Object} logger
	 */
	constructor(appLabel, modules, componentConfig, logger) {
		this.logger = logger;
		this.logger.info('Initializing controller');

		this.appLabel = appLabel;
		this.componentConfig = componentConfig;
		this.modules = modules;

		this.channel = null; // Channel for controller
		this.channels = {}; // Keep track of all channels for modules
		this.bus = null;

		this.config = {
			dirs: systemDirs(this.appLabel),
		};
	}

	/**
	 * Load the initial state and start listening for events or triggering actions.
	 * Publishes 'lisk:ready' state on the bus.
	 *
	 * @async
	 */
	async load() {
		this.logger.info('Loading controller');
		await this._setupDirectories();
		await this._validatePidFile();
		await this._setupBus();
		await this._setupControllerActions();
		await this._loadModules();

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
		await this.bus.setup();

		this.channel = new EventEmitterChannel(
			'lisk',
			['ready'],
			['getComponentConfig'],
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

	/**
	 * Setup Controller actions.
	 * Create action for getting component config.
	 *
	 * @async
	 */
	async _setupControllerActions() {
		this.channel.action(
			'getComponentConfig',
			action => this.componentConfig[action.params]
		);
	}

	async _loadModules() {
		return Promise.each(Object.keys(this.modules), m =>
			this._loadInMemoryModule(m)
		);
	}

	async _loadInMemoryModule(alias) {
		const module = this.modules[alias].spec;
		const moduleConfig = this.modules[alias].config;
		validateModuleSpec(module);

		this.logger.info(
			`Loading module with alias: ${module.alias}(${module.info.name}:${
				module.info.version
			})`
		);

		const channel = new EventEmitterChannel(
			module.alias,
			module.events,
			Object.keys(module.actions),
			this.bus,
			{}
		);
		this.channels[alias] = channel;

		await channel.registerToBus();

		Object.keys(module.actions).forEach(action => {
			channel.action(action, module.actions[action]);
		});

		channel.publish(`${module.alias}:registeredToBus`);
		channel.publish(`${module.alias}:loading:started`);
		await module.load(channel, moduleConfig);
		channel.publish(`${module.alias}:loading:finished`);
		this.logger.info(
			`Module ready with alias: ${module.alias}(${module.info.name}:${
				module.info.version
			})`
		);
	}

	async unloadModules(modules = null) {
		return Promise.mapSeries(modules || Object.keys(this.modules), async m => {
			await this.modules[m].spec.unload();
			delete this.modules[m];
		});
	}

	async cleanup(code, reason) {
		this.logger.info('Cleanup controller...');

		if (reason) {
			this.logger.error(reason);
		}

		try {
			await this.unloadModules();
			this.logger.info('Unload completed');
		} catch (error) {
			this.logger.error('Caused error during cleanup', error);
		}
	}
};
