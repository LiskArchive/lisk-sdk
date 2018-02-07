require('angular');

angular.module('liskApp').controller('dappsCategoryController', ['$scope', 'viewFactory', '$http', '$stateParams', 'dappsService', '$timeout', 'gettextCatalog', function ($scope, viewFactory, $http, $stateParams, dappsService, $timeout, gettextCatalog) {

    $scope.view = viewFactory;
    $scope.view.inLoading = true;
    $scope.view.loadingText = gettextCatalog.getString('Loading applications');
    $scope.category = $stateParams.categoryId;
    $scope.view.page = {title: $scope.category, previous: 'main.dappstore'};
    $scope.view.bar = {showDappsCategoryBar: true};
    $scope.searchedText = '';
    $scope.searchDapp = dappsService;
    $scope.searchDapp.searchForDapp = '';
    $scope.searchedTextString = '';
    $scope.searchDapp.inSearch = false;
    $scope.inLoading = true;
    $scope.categoryId = $scope.categories[$scope.category];

    $scope.shuffle = function (array) {
        var currentIndex = array.length, temporaryValue, randomIndex;

        while (0 !== currentIndex) {
            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;
            // And swap it with the current element.
            temporaryValue = array[currentIndex];
            array[currentIndex] = array[randomIndex];
            array[randomIndex] = temporaryValue;
        }
        return array;
    }

    // Search dapps watcher
    var tempsearchForDappID = '',
        searchForDappIDTimeout;
    $scope.$watch('searchDapp.searchForDapp', function (val) {
        if (searchForDappIDTimeout) $timeout.cancel(searchForDappIDTimeout);
        if (val.trim() != '') {
            $scope.searchDapp.inSearch = true;
        } else {
            $scope.searchDapp.inSearch = false;
            if (tempsearchForDappID != val) {
                tempsearchForDappID = val;
                $scope.searchDapp.searchForDapp = tempsearchForDappID;
                $scope.searchDappText();
                return;
            }
        }
        tempsearchForDappID = val;
        searchForDappIDTimeout = $timeout(function () {
            $scope.searchDapp.searchForDapp = tempsearchForDappID;
            $scope.searchedTextString = tempsearchForDappID;
            $scope.searchDappText();
        }, 2000); // Delay 2000 ms
    })

    $scope.searchDappText = function () {
        if ($scope.category == 'Installed') {
            if ($scope.searchDapp.searchForDapp.trim() != '') {
                $http.get("/api/dapps/search?q=" + $scope.searchDapp.searchForDapp + "&installed=1").then(function (response) {
                    $scope.dapps = $scope.shuffle(response.data.dapps);
                    $scope.searchDapp.inSearch=false;
                    $scope.view.inLoading = false;
                    $scope.searchedText = '(search for "' + $scope.searchDapp.searchForDapp + '")';
                });
            } else {
                $http.get("/api/dapps/installed").then(function (response) {
                    $scope.dapps = $scope.shuffle(response.data.dapps);
                    $scope.searchedText = '';
                    $scope.view.inLoading = false;
                    $scope.inLoading = false;
                });
            }
        } else {
            if ($scope.searchDapp.searchForDapp.trim() != '') {
                $http.get("/api/dapps/search?q=" + $scope.searchDapp.searchForDapp + "&category=" + $scope.categoryId).then(function (response) {
                    $scope.dapps = $scope.shuffle(response.data.dapps);
                    $scope.searchDapp.inSearch = false;
                    $scope.view.inLoading = false;
                    $scope.searchedText = '(search for "' + $scope.searchDapp.searchForDapp + '")';
                });
            } else {
                $http.get("/api/dapps/?category=" + $scope.category).then(function (response) {
                    $scope.dapps = $scope.shuffle(response.data.dapps);
                    $scope.searchDapp.inSearch = false;
                    $scope.searchedText = '';
                    $scope.view.inLoading = false;
                    $scope.inLoading = false;
                });
            }
        }
    };

    $scope.$on('updateControllerData', function (event, data) {
        if (data.indexOf('main.dapps') != -1) {
            $scope.searchDappText();
        }
    });

}]);
