/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { flags as flagParser } from '@oclif/command';
import { BaseStartCommand } from 'lisk-commander';
import {
	Application,
	ApplicationConfig,
	PartialApplicationConfig,
	HTTPAPIPlugin,
	ForgerPlugin,
	MonitorPlugin,
	ReportMisbehaviorPlugin,
} from 'lisk-sdk';
import { join } from 'path';
import { getApplication } from '../app/app';

interface Flags {
	[key: string]: string | number | boolean | undefined;
}

const setPluginConfig = (config: ApplicationConfig, flags: Flags): void => {
	if (flags['http-api-plugin-port'] !== undefined) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		config.plugins[HTTPAPIPlugin.alias] = config.plugins[HTTPAPIPlugin.alias] ?? {};
		config.plugins[HTTPAPIPlugin.alias].port = flags['http-api-plugin-port'];
	}
	if (
		flags['http-api-plugin-whitelist'] !== undefined &&
		typeof flags['http-api-plugin-whitelist'] === 'string'
	) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		config.plugins[HTTPAPIPlugin.alias] = config.plugins[HTTPAPIPlugin.alias] ?? {};
		config.plugins[HTTPAPIPlugin.alias].whiteList = flags['http-api-plugin-whitelist']
			.split(',')
			.filter(Boolean);
	}
	if (flags['monitor-plugin-port'] !== undefined) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		config.plugins[MonitorPlugin.alias] = config.plugins[MonitorPlugin.alias] ?? {};
		config.plugins[MonitorPlugin.alias].port = flags['monitor-plugin-port'];
	}
	if (
		flags['monitor-plugin-whitelist'] !== undefined &&
		typeof flags['monitor-plugin-whitelist'] === 'string'
	) {
		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		config.plugins[MonitorPlugin.alias] = config.plugins[MonitorPlugin.alias] ?? {};
		config.plugins[MonitorPlugin.alias].whiteList = flags['monitor-plugin-whitelist']
			.split(',')
			.filter(Boolean);
	}
};

type StartFlags = typeof BaseStartCommand.flags & { [key: string]: Record<string, unknown> };

export class StartCommand extends BaseStartCommand {
	static flags: StartFlags = {
		...BaseStartCommand.flags,
		'enable-http-api-plugin': flagParser.boolean({
			description:
				'Enable HTTP API Plugin. Environment variable "LISK_ENABLE_HTTP_API_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_HTTP_API_PLUGIN',
			default: false,
		}),
		'http-api-plugin-port': flagParser.integer({
			description:
				'Port to be used for HTTP API Plugin. Environment variable "LISK_HTTP_API_PLUGIN_PORT" can also be used.',
			env: 'LISK_HTTP_API_PLUGIN_PORT',
			dependsOn: ['enable-http-api-plugin'],
		}),
		'http-api-plugin-whitelist': flagParser.string({
			description:
				'List of IPs in comma separated value to allow the connection. Environment variable "LISK_HTTP_API_PLUGIN_WHITELIST" can also be used.',
			env: 'LISK_HTTP_API_PLUGIN_WHITELIST',
			dependsOn: ['enable-http-api-plugin'],
		}),
		'enable-forger-plugin': flagParser.boolean({
			description:
				'Enable Forger Plugin. Environment variable "LISK_ENABLE_FORGER_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_FORGER_PLUGIN',
			default: false,
		}),
		'enable-monitor-plugin': flagParser.boolean({
			description:
				'Enable Monitor Plugin. Environment variable "LISK_ENABLE_MONITOR_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_MONITOR_PLUGIN',
			default: false,
		}),
		'monitor-plugin-port': flagParser.integer({
			description:
				'Port to be used for Monitor Plugin. Environment variable "LISK_MONITOR_PLUGIN_PORT" can also be used.',
			env: 'LISK_MONITOR_PLUGIN_PORT',
			dependsOn: ['enable-monitor-plugin'],
		}),
		'monitor-plugin-whitelist': flagParser.string({
			description:
				'List of IPs in comma separated value to allow the connection. Environment variable "LISK_MONITOR_PLUGIN_WHITELIST" can also be used.',
			env: 'LISK_MONITOR_PLUGIN_WHITELIST',
			dependsOn: ['enable-monitor-plugin'],
		}),
		'enable-report-misbehavior-plugin': flagParser.boolean({
			description:
				'Enable ReportMisbehavior Plugin. Environment variable "LISK_ENABLE_REPORT_MISBEHAVIOR_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_MONITOR_PLUGIN',
			default: false,
		}),
	};

	public getApplication(
		genesisBlock: Record<string, unknown>,
		config: PartialApplicationConfig,
	): Application {
		/* eslint-disable @typescript-eslint/no-unsafe-call */
		const { flags } = this.parse(BaseStartCommand);
		// Set Plugins Config
		setPluginConfig(config as ApplicationConfig, flags);
		const app = getApplication(genesisBlock, config);

		if (flags['enable-http-api-plugin']) {
			app.registerPlugin(HTTPAPIPlugin, { loadAsChildProcess: true });
		}
		if (flags['enable-forger-plugin']) {
			app.registerPlugin(ForgerPlugin, { loadAsChildProcess: true });
		}
		if (flags['enable-monitor-plugin']) {
			app.registerPlugin(MonitorPlugin, { loadAsChildProcess: true });
		}
		if (flags['enable-report-misbehavior-plugin']) {
			app.registerPlugin(ReportMisbehaviorPlugin, { loadAsChildProcess: true });
		}

		return app;
	}

	public getApplicationConfigDir(): string {
		return join(__dirname, '../../config');
	}
}
