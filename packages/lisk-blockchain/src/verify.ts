import { getBlockHeaderById } from './repo';
import { DataStore } from './types';

export const verifyExist = async (
	db: DataStore,
	id: string,
): Promise<Error | undefined> => {
	try {
		await getBlockHeaderById(db, id);

		return new Error(`Block ${id} already processed`);
	} catch (err) {
		return undefined;
	}
};
