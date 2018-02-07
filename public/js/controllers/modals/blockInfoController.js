require('angular');

angular.module('liskApp').controller('blockInfoController', ["$scope", "$http", "blockInfo", "userInfo", function ($scope, $http, blockInfo, userInfo) {

    $scope.transactions = [];
    $scope.transactionsLength = 0;

    $scope.getTransactionsOfBlock = function (blockId) {
        $http.get("/api/transactions/", {params: {blockId: blockId}})
            .then(function (resp) {
                $scope.transactions = resp.data.transactions;
                $scope.transactionsLength = $scope.transactions.length;
            });
    };

    $scope.getTransactionsOfBlock($scope.block.id);

    $scope.close = function () {
        blockInfo.deactivate();
    }

    $scope.userInfo = function (userId) {
        blockInfo.deactivate();
        $scope.userInfo = userInfo.activate({userId: userId});
    }


    $scope.showGenerator = function (generatorId) {
        blockInfo.deactivate();
        $scope.userInfo = userInfo.activate({userId: generatorId});
    }

    $scope.previousBlock = function (blockId) {
        $http.get("/api/blocks/get?id=" +
        blockId)
            .then(function (resp) {
                $scope.block = resp.data.block;
                $scope.transactions = [];
                $scope.transactionsLength = 0;
                $scope.getTransactionsOfBlock($scope.block.id);
            });
    }

}]);
