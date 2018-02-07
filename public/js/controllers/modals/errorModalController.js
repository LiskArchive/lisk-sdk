require('angular');

angular.module('liskApp').controller('errorModalController', ["$scope", "errorModal", "userService", 'gettextCatalog', function ($scope, errorModal, userService, gettextCatalog) {

    $scope.forging =  userService.forging;
    $scope.fee = 0;
    $scope.focus = 'secretPhrase';

    if ($scope.forging) {
        $scope.label = gettextCatalog.getString('Disable Forging');
    } else {
        $scope.label = gettextCatalog.getString('Enable Forging');
    }

    $scope.label = $scope.title || $scope.label;

    $scope.close = function () {
        if ($scope.destroy) {
            $scope.destroy();
        }

        errorModal.deactivate();
    }

}]);
