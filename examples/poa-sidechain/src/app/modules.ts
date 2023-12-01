import { Application, Modules, PartialApplicationConfig } from 'lisk-sdk';

export const registerModules = (config: PartialApplicationConfig): Application => {
	const application = new Application(config);
	// create module instances
	const authModule = new Modules.Auth.AuthModule();
	const tokenModule = new Modules.Token.TokenModule();
	const feeModule = new Modules.Fee.FeeModule();
	const rewardModule = new Modules.Reward.RewardModule();
	const randomModule = new Modules.Random.RandomModule();
	const validatorModule = new Modules.Validators.ValidatorsModule();
	const poaModule = new Modules.PoA.PoAModule();
	const interoperabilityModule = new Modules.Interoperability.SidechainInteroperabilityModule();

	interoperabilityModule.addDependencies(validatorModule.method, tokenModule.method);
	rewardModule.addDependencies(tokenModule.method, randomModule.method);
	feeModule.addDependencies(tokenModule.method, interoperabilityModule.method);
	poaModule.addDependencies(validatorModule.method, feeModule.method, randomModule.method);

	interoperabilityModule.registerInteroperableModule(tokenModule);
	interoperabilityModule.registerInteroperableModule(feeModule);

	// Register modules in the sequence defined in LIP0063 https://github.com/LiskHQ/lips/blob/main/proposals/lip-0063.md#modules
	application.registerModule(authModule);
	application.registerModule(validatorModule);
	application.registerModule(tokenModule);
	application.registerModule(feeModule);
	application.registerModule(interoperabilityModule);
	application.registerModule(poaModule);
	application.registerModule(randomModule);

	return application;
};
