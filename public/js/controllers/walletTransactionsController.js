require('angular');

angular.module('liskApp').controller('walletTransactionsController', ['$scope', '$rootScope', '$http', "userService", "$interval", "sendTransactionModal", "secondPassphraseModal", "delegateService", 'viewFactory', 'transactionsService', 'ngTableParams', 'transactionInfo', '$timeout', 'userInfo', '$filter', 'multiMembersModal', '$stateParams', 'multiService', 'gettextCatalog', function ($rootScope, $scope, $http, userService, $interval, sendTransactionModal, secondPassphraseModal, delegateService, viewFactory, transactionsService, ngTableParams, transactionInfo, $timeout, userInfo, $filter, multiMembersModal, $stateParams, multiService, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.page = {title: gettextCatalog.getString('Transactions'), previous: 'main.multi'};
    $scope.view.bar = {};
    $scope.showAllColumns = true;
    $scope.showFullTime = false;
    $scope.transactionsView = transactionsService;
    $scope.searchTransactions = transactionsService;
    $scope.countForgingBlocks = 0;
    $scope.walletAddress = $stateParams.walletId;

    $scope.userInfo = function (userId) {
        $scope.modal = userInfo.activate({userId: userId});
    }

    $scope.transactionInfo = function (block, signList) {
        $scope.modal = transactionInfo.activate({block: block, signList: signList});
    }

    $scope.getParams = function () {

        $http.get("/api/accounts?address=" + $scope.walletAddress)
            .then(function (response) {

                if (response.data.success) {
                    $scope.requestParams = {
                        ownerPublicKey: response.data.account.publicKey,
                        ownerAddress: response.data.account.address,
                        recipientId: response.data.account.address,
                        senderId: response.data.account.address
                    };
                    $scope.updateTransactions();
                } else {
                    console.warn('Failed to get account: ' + $scope.walletAddress);
                }
            });

    }();

    // Transactions
    $scope.tableWalletTransactions = new ngTableParams({
        page: 1,
        count: 25,
        sorting: {
            timestamp: 'desc'
        }
    }, {
        total: 0,
        counts: [],
        getData: function ($defer, params) {
            if ($scope.requestParams) {
                transactionsService.getMultiTransactions($defer, params, $scope.filter,
                    $scope.requestParams, function (error) {
                        $timeout(function () {
                            $scope.$apply();
                        }, 1);
                    });
            }
        }
    });

    $scope.tableWalletTransactions = {
        height : gettextCatalog.getString('Height'),
        id : gettextCatalog.getString('Transaction ID'),
        recipientId : gettextCatalog.getString('Recipient'),
        timestamp : gettextCatalog.getString('Time'),
        amount : gettextCatalog.getString('Amount'),
        fee : gettextCatalog.getString('Fee'),
        confirmations : gettextCatalog.getString('Confirmations')
    };

    $scope.tableWalletTransactions.settings().$scope = $scope;

    $scope.$watch("filter.$", function () {
        $scope.tableWalletTransactions.reload();
    });
    // end Transactions

    $scope.updateTransactions = function () {
        $scope.tableWalletTransactions.reload();
    }

    $scope.$on('$destroy', function () {
    });

    $scope.showMembers = function (confirmed) {
        $scope.multiMembersModal = multiMembersModal.activate({
            confirmed: confirmed,
            destroy: function () {
            }
        });
    }

}]);
