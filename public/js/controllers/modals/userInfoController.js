require('angular');

angular.module('liskApp').controller('userInfoController', ["$scope", "$http", "userInfo", "userService","sendTransactionModal", function ($scope, $http, userInfo, userService, sendTransactionModal) {

    $scope.userIdOld = '';
    $scope.thisUser = userService;

    $scope.sendTransactionToUser = function () {
        userInfo.deactivate();
        $scope.sendTransactionModal = sendTransactionModal.activate({
            totalBalance: $scope.unconfirmedBalance,
            to: $scope.userId,
            destroy: function () {
            }
        });
    }

    $scope.getAccountDetail = function (userId) {
        if ($scope.userIdOld == userId) {
            return;
        }
        $scope.userIdOld = userId;
        $scope.transactions = { view: false, list: [] };
        $http.get("/api/accounts", { params: { address: userId }})
        .then(function (resp) {
            if (resp.data.account) {
                $scope.account = resp.data.account;
            } else {
                $scope.account = { address: userId, publicKey: null };
            }
            $http.get("/api/transactions", {
                params: {
                    senderPublicKey: $scope.account.publicKey,
                    recipientId: $scope.account.address,
                    limit: 6,
                    orderBy: 'timestamp:desc'
                }
            })
            .then(function (resp) {
                var transactions = resp.data.transactions;

                $http.get('/api/transactions/unconfirmed', {
                    params: {
                        senderPublicKey: $scope.account.publicKey,
                        address: $scope.account.address
                    }
                })
                .then(function (resp) {
                    var unconfirmedTransactions = resp.data.transactions;
                    $scope.transactions.list = unconfirmedTransactions.concat(transactions).slice(0, 6);
                });
            });
        });
    }

    $scope.transactions = { view: false, list: [] };

    $scope.toggleTransactions = function () {
        $scope.transactions.view = !$scope.transactions.view;
    }

    $scope.close = function () {
        userInfo.deactivate();
    }

    $scope.getAccountDetail($scope.userId);

}]);
