/* eslint-disable @typescript-eslint/no-empty-function */
import {
	Application,
	FeeMethod,
	PoAModule,
	PoSMethod,
	RandomMethod,
	RewardModule,
	TokenMethod,
	ValidatorsMethod,
	PoAMethod,
} from 'lisk-sdk';

export const registerModules = (
	_app: Application,
	method: {
		validator: ValidatorsMethod;
		token: TokenMethod;
		fee: FeeMethod;
		random: RandomMethod;
		pos: PoSMethod;
		poa?: PoAMethod;
	},
): void => {
	const rewardModule = new RewardModule();
	const poaModule = new PoAModule();

	rewardModule.addDependencies(method.token, method.random);
	poaModule.addDependencies(method.validator, method.fee, method.random);

	_app.registerModule(poaModule);
};
