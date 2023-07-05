import {
	Application,
	AuthModule,
	FeeModule,
	PartialApplicationConfig,
	PoAModule,
	RandomModule,
	RewardModule,
	SidechainInteroperabilityModule,
	TokenModule,
	ValidatorsModule,
} from 'lisk-sdk';

export const registerModules = (config: PartialApplicationConfig): Application => {
	const application = new Application(config);
	// create module instances
	const authModule = new AuthModule();
	const tokenModule = new TokenModule();
	const feeModule = new FeeModule();
	const rewardModule = new RewardModule();
	const randomModule = new RandomModule();
	const validatorModule = new ValidatorsModule();
	const poaModule = new PoAModule();
	const interoperabilityModule = new SidechainInteroperabilityModule();

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
