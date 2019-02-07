import {
    validAccount,
    validTransaction,
} from '../../fixtures';

const getter = {
    get: () => {
        return {...validTransaction};
    },
    find: () => []
}

const setter = {
    get: () => {
        return {...validAccount};
    },
    set: () => {
        return;
    },
    find: () => []
};

export const MockStateStore: any = {
    account: {
        ...setter,
    },
    transaction: {
        ...getter,
    },
};