import { Application } from 'lisk-sdk';
import { TestNftModule } from './modules/testNft/module';

export const registerModules = (app: Application): void => {
	app.registerModule(new TestNftModule());
};
