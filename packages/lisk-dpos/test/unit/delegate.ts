import { expect } from 'chai';
import * as publicKeyList from '../fixtures/public_key_list.json';
import { sortDelegates, Delegate } from '../../src/delegate';

describe('delegate', () => {
    describe('#sortDelegates', () => {
        let sortedDelegates: Delegate[];
        beforeEach(async () => {
            const delegateList = publicKeyList.list.map((publicKey, i) => ({
                publicKey,
                votes: '1000',
                username: `genesis_${i}`,
            }));
            sortedDelegates = sortDelegates(delegateList);

        });

        it('should resolve to correct delegate for first delegate', () => {
            expect(sortedDelegates[0].publicKey).to.equal('0035cb5cd9c310f79e808042bcf9cda24c1d55b83a535345808042c98fb0a456');
        });

        it('should resolve to correct delegate for second delegate', () => {
            expect(sortedDelegates[1].publicKey).to.equal('03a724e5eb2610247607dc37614d72f15efe92de7c8cc06a717f1c9b22bf0c90');
        });

        it('should resolve to correct delegate for forth delegate', () => {
            console.log(sortedDelegates);
            expect(sortedDelegates[3].publicKey).to.equal('0861e763bbe440691a13e22e104ec62e84f53df301e684cda445b84539dee695');
        });
    });
});