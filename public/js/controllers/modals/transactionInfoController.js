require('angular');

angular.module('liskApp').controller('transactionInfoController', ["$scope", "$http", "transactionInfo", "userInfo", function ($scope, $http, transactionInfo, userInfo) {

    $scope.userInfo = function (userId) {
        transactionInfo.deactivate();
        $scope.modal = userInfo.activate({userId: userId});
    }

    $scope.close = function () {
        transactionInfo.deactivate();
    }

}]);
