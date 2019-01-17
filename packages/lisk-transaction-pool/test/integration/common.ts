import { CheckerFunctionResponse, CheckTransactionsResponse, Status }  from '../../src/check_transactions';
import { Transaction } from '../../src/transaction_pool';

export const checkerFunctionResponseGenerator = (passedTransactions: ReadonlyArray<Transaction>, failedTransactions: ReadonlyArray<Transaction>): Promise<CheckerFunctionResponse> => {
    const passedTransactionsResponse = passedTransactions.map(transaction => {
       return {
           id: transaction.id,
           status: Status.OK,
           errors: [],
       } 
    });

    const failedTransactionsResponse = failedTransactions.map(transaction => {
       return {
           id: transaction.id,
           status: Status.FAIL,
           errors: [new Error()],
       } 
    });

    return Promise.resolve({
        status: failedTransactions.length === 0 ? Status.OK : Status.FAIL,
        transactionsResponses: [...passedTransactionsResponse, ...failedTransactionsResponse]
    });
}

export const dummyCheckFunctionGenerator = (firstCharacterOfFailedTransactionsId: ReadonlyArray<String>) => {
    return (transactions: ReadonlyArray<Transaction>) => {
        return transactions.reduce((checkedTransactions: CheckTransactionsResponse, transaction: Transaction) => {
            if (!firstCharacterOfFailedTransactionsId.includes(transaction.id[0])) {
                checkedTransactions.passedTransactions = [...checkedTransactions.passedTransactions, transaction];
            } else {
                checkedTransactions.failedTransactions = [...checkedTransactions.failedTransactions, transaction];
            }
            return checkedTransactions;
        }, {
            passedTransactions: [],
            failedTransactions: [],
        });
    };
};


export const dummyCheckerFunctionGenerator = (checkFunction: (transactions: ReadonlyArray<Transaction>) => CheckTransactionsResponse) => {
    return (transactions: ReadonlyArray<Transaction>) => {
        const {passedTransactions, failedTransactions} = checkFunction(transactions);
        return checkerFunctionResponseGenerator(passedTransactions, failedTransactions);
    }
}

export const wrapExpectationInNextTick = (expectations: Function) => {
    return new Promise((resolve) => {
        process.nextTick(() => {
            expectations();
            resolve();
        });
    })
};