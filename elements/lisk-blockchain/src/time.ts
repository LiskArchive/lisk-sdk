const MS_TIME = 1000;

export const getTimeFromBlockchainEpoch = (epochTime: number): number => {
	const startingPoint = new Date().getTime();

	return Math.floor((startingPoint - epochTime) / MS_TIME);
};
