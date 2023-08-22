/* eslint-disable no-param-reassign */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/explicit-member-accessibility */
import { Flags as flagParser } from '@oclif/core';
import { FlagInput } from '@oclif/core/lib/interfaces';
import { BaseStartCommand } from 'lisk-commander';
import { Application, ApplicationConfig, PartialApplicationConfig } from 'lisk-sdk';
import { ForgerPlugin } from '@liskhq/lisk-framework-forger-plugin';
import { MonitorPlugin } from '@liskhq/lisk-framework-monitor-plugin';
import { ReportMisbehaviorPlugin } from '@liskhq/lisk-framework-report-misbehavior-plugin';
import { DashboardPlugin } from '@liskhq/lisk-framework-dashboard-plugin';
import { FaucetPlugin } from '@liskhq/lisk-framework-faucet-plugin';
import { ChainConnectorPlugin } from '@liskhq/lisk-framework-chain-connector-plugin';
import { join } from 'path';
import { getApplication } from '../app/app';

interface Flags {
	[key: string]: string | number | boolean | undefined;
}

const setPluginConfig = (config: ApplicationConfig, flags: Flags): void => {
	if (flags['monitor-plugin-port'] !== undefined) {
		config.plugins[MonitorPlugin.name] = config.plugins[MonitorPlugin.name] ?? {};
		config.plugins[MonitorPlugin.name].port = flags['monitor-plugin-port'];
	}
	if (
		flags['monitor-plugin-whitelist'] !== undefined &&
		typeof flags['monitor-plugin-whitelist'] === 'string'
	) {
		config.plugins[MonitorPlugin.name] = config.plugins[MonitorPlugin.name] ?? {};
		config.plugins[MonitorPlugin.name].whiteList = flags['monitor-plugin-whitelist']
			.split(',')
			.filter(Boolean);
	}
	if (flags['faucet-plugin-port'] !== undefined) {
		config.plugins[FaucetPlugin.name] = config.plugins[FaucetPlugin.name] ?? {};
		config.plugins[FaucetPlugin.name].port = flags['faucet-plugin-port'];
	}
	if (flags['dashboard-plugin-port'] !== undefined) {
		config.plugins[DashboardPlugin.name] = config.plugins[DashboardPlugin.name] ?? {};
		config.plugins[DashboardPlugin.name].port = flags['dashboard-plugin-port'];
	}
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type StartFlags = typeof BaseStartCommand.flags & FlagInput<any>;

export class StartCommand extends BaseStartCommand {
	static flags: StartFlags = {
		...BaseStartCommand.flags,
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
			env: 'LISK_ENABLE_MISBEHAVIOR_PLUGIN',
			default: false,
		}),
		'enable-faucet-plugin': flagParser.boolean({
			description:
				'Enable Faucet Plugin. Environment variable "LISK_ENABLE_FAUCET_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_FAUCET_PLUGIN',
			default: false,
		}),
		'faucet-plugin-port': flagParser.integer({
			description:
				'Port to be used for Faucet Plugin. Environment variable "LISK_FAUCET_PLUGIN_PORT" can also be used.',
			env: 'LISK_FAUCET_PLUGIN_PORT',
			dependsOn: ['enable-faucet-plugin'],
		}),
		'enable-dashboard-plugin': flagParser.boolean({
			description:
				'Enable Dashboard Plugin. Environment variable "LISK_ENABLE_DASHBOARD_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_DASHBOARD_PLUGIN',
			default: false,
		}),
		'dashboard-plugin-port': flagParser.integer({
			description:
				'Port to be used for Dashboard Plugin. Environment variable "LISK_DASHBOARD_PLUGIN_PORT" can also be used.',
			env: 'LISK_DASHBOARD_PLUGIN_PORT',
			dependsOn: ['enable-dashboard-plugin'],
		}),
		'enable-chain-connector-plugin': flagParser.boolean({
			description:
				'Enable ChainConnector Plugin. Environment variable "LISK_ENABLE_CHAIN_CONNECTOR_PLUGIN" can also be used.',
			env: 'LISK_ENABLE_CONNECTOR_PLUGIN',
			default: false,
		}),
	};

	public async getApplication(config: PartialApplicationConfig): Promise<Application> {
		/* eslint-disable @typescript-eslint/no-unsafe-call */
		const { flags } = await this.parse(StartCommand);
		// Set Plugins Config
		setPluginConfig(config as ApplicationConfig, flags);
		const app = getApplication(config);

		if (flags['enable-forger-plugin']) {
			app.registerPlugin(new ForgerPlugin(), { loadAsChildProcess: true });
		}
		if (flags['enable-monitor-plugin']) {
			app.registerPlugin(new MonitorPlugin(), { loadAsChildProcess: true });
		}
		if (flags['enable-report-misbehavior-plugin']) {
			app.registerPlugin(new ReportMisbehaviorPlugin(), { loadAsChildProcess: true });
		}
		if (flags['enable-faucet-plugin']) {
			app.registerPlugin(new FaucetPlugin(), { loadAsChildProcess: true });
		}
		if (flags['enable-dashboard-plugin']) {
			app.registerPlugin(new DashboardPlugin(), { loadAsChildProcess: true });
		}
		if (flags['enable-chain-connector-plugin']) {
			app.registerPlugin(new ChainConnectorPlugin(), { loadAsChildProcess: true });
		}

		return app;
	}

	public getApplicationConfigDir(): string {
		return join(__dirname, '../../config');
	}
}
