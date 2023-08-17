/* eslint-disable @typescript-eslint/no-empty-function */
import { ReportMisbehaviorPlugin } from '@liskhq/lisk-framework-report-misbehavior-plugin';
import { Application } from 'lisk-sdk';

export const registerPlugins = (_app: Application): void => {
	_app.registerPlugin(new ReportMisbehaviorPlugin());
};
