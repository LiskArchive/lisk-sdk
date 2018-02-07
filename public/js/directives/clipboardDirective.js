require('angular');

angular.module('liskApp').directive('clipboard', function () {
    return {
        restrict: 'A',
        scope: {
           clipboardSuccess: '&',
           clipboardError: '&'
        },
        link: function (scope, element) {
           var clipboard = new window.Clipboard(element[0]);

           clipboard.on('success', function (e) {
              scope.$apply(function () {
                 scope.clipboardSuccess({ e: e });
              });
           });

           clipboard.on('error', function (e) {
              scope.$apply(function () {
                 scope.clipboardError({ e: e });
              });
           });
        }
   };
});
