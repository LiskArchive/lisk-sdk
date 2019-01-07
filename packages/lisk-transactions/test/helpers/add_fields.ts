export const addFields = (transaction: any) => {
	return {
		...transaction,
		signSignature: transaction.signSignature ? transaction.signSignature : undefined,
		receivedAt: new Date(),
	};
};
