const assert = require('assert');
const Promise = require('bluebird');
const fs = require('fs-extra');
const config = require('./helpers/config');
const EventEmitterChannel = require('./channels/event_emitter');
const Bus = require('./bus');

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

/**
 * Controller logic responsible to run the application instance
 *
 * @namespace Framework
 * @type {module.Controller}
 */
module.exports = class Controller {
	constructor(modules, componentConfig, logger) {
		this.logger = logger;
		this.componentConfig = componentConfig;
		this.logger.info('Initializing controller');
		this.channel = null; // Channel for controller
		this.channels = {}; // Keep track of all channels for modules
		this.bus = null;
		this.modules = modules;
	}

	async load() {
		this.logger.info('Loading controller');
		await this._setupDirectories();
		await this._setupBus();
		await this._setupControllerActions();
		await this._loadModules();

		this.logger.info('Bus listening to events', this.bus.getEvents());
		this.logger.info('Bus ready for actions', this.bus.getActions());

		this.channel.publish('lisk:ready', {});
	}

	// eslint-disable-next-line class-methods-use-this
	async _setupDirectories() {
		// Make sure all directories exists
		fs.emptyDirSync(config.dirs.temp);
		fs.ensureDirSync(config.dirs.sockets);
		fs.ensureDirSync(config.dirs.pids);
		fs.writeFileSync(`${config.dirs.pids}/controller.pid`, process.pid);
	}

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
