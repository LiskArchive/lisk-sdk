require('angular');

angular.module('liskApp').controller('walletPendingsController', ['$scope', '$rootScope', '$http', "userService", "$interval", "sendTransactionModal", "secondPassphraseModal", "delegateService", 'viewFactory', 'transactionsService', 'ngTableParams', 'transactionInfo', '$timeout', 'userInfo', 'gettextCatalog', function ($rootScope, $scope, $http, userService, $interval, sendTransactionModal, secondPassphraseModal, delegateService, viewFactory, transactionsService, ngTableParams, transactionInfo, $timeout, userInfo, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = true;
    $scope.view.loadingText = gettextCatalog.getString('Loading transactions');
    $scope.view.page = {title: gettextCatalog.getString('Pending transactions'), previous: null};
    $scope.view.bar = {showWalletBar: true};
    $scope.showAllColumns = true;
    $scope.showFullTime = false;
    $scope.transactionsView = transactionsService;
    $scope.searchTransactions = transactionsService;
    $scope.countForgingBlocks = 0;

    var data = [{}];

    $scope.userInfo = function (userId) {
        $scope.modal = userInfo.activate({userId: userId});
    }

    $scope.transactionInfo = function (block, signList) {
        $scope.modal = transactionInfo.activate({block: block, signList: signList});
    }

    // Transactions
    $scope.tableTransactions = new ngTableParams({
        page: 1,
        count: 25,
        sorting: {
            height: 'desc'
        }
    }, {
        total: 0,
        counts: [],
        getData: function ($defer, params) {
            $defer.resolve(data.slice((params.page() - 1) * params.count(), params.page() * params.count()));
            $scope.view.inLoading = false;
        }
    });

    $scope.tableTransactions.cols = {
        wallet : gettextCatalog.getString('Lisk Address'),
        transactionId : gettextCatalog.getString('Transaction ID'),
        recipientId : gettextCatalog.getString('Recipient'),
        timestamp : gettextCatalog.getString('Time'),
        amount : gettextCatalog.getString('Amount'),
        fee : gettextCatalog.getString('Fee'),
        confirmations : gettextCatalog.getString('Confirmations Needed')
    };

    $scope.tableTransactions.settings().$scope = $scope;

    $scope.$watch("filter.$", function () {
        $scope.tableTransactions.reload();
    });
    // end Transactions

    $scope.updateTransactions = function () {
        $scope.tableTransactions.reload();
    }

    $scope.$on('$destroy', function () {

    });

    $scope.updateTransactions();

}]);
