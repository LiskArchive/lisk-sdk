export const addDate = (transaction: any) => {
	return {
		...transaction,
		receivedAt: new Date(),
	};
};
