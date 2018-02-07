require('angular');

angular.module('liskApp').filter('timeAgoFilter', function ($filter) {
    return function (time, fullTime) {
        if (fullTime) {
            return $filter('timestampFilter')(time);
        }

        // Epoch time
        var d = new Date(Date.UTC(2016, 4, 24, 17, 0, 0, 0));
        var t = parseInt(d.getTime() / 1000);

        time = new Date((time + t) * 1000);

        var currentTime = new Date().getTime();
        var diffTime = (currentTime - time.getTime()) / 1000;

        if (diffTime < 60) {
            return Math.floor(diffTime) + ' sec ago';
        }
        if (Math.floor(diffTime / 60) <= 1) {
            return Math.floor(diffTime / 60) + ' min ago';
        }
        if ((diffTime / 60) < 60) {
            return Math.floor(diffTime / 60) + ' mins ago';
        }
        if (Math.floor(diffTime / 60 / 60) <= 1) {
            return Math.floor(diffTime / 60 / 60) + ' hour ago';
        }
        if ((diffTime / 60 / 60) < 24) {
            return Math.floor(diffTime / 60 / 60) + ' hours ago';
        }
        if (Math.floor(diffTime / 60 / 60 / 24) <= 1) {
            return Math.floor(diffTime / 60 / 60 / 24) + ' day ago';
        }
        if ((diffTime / 60 / 60 / 24) < 30) {
            return Math.floor(diffTime / 60 / 60 / 24) + ' days ago';
        }
        if (Math.floor(diffTime / 60 / 60 / 24 / 30) <= 1) {
            return Math.floor(diffTime / 60 / 60 / 24 / 30) + ' month ago';
        }
        if ((diffTime / 60 / 60 / 24 / 30) < 12) {
            return Math.floor(diffTime / 60 / 60 / 24 / 30) + ' months ago';
        }
        if (Math.floor((diffTime / 60 / 60 / 24 / 30 / 12)) <= 1) {
            return Math.floor(diffTime / 60 / 60 / 24 / 30 / 12) + ' year ago';
        }

        return Math.floor(diffTime / 60 / 60 / 24 / 30 / 12) + ' years ago';
    }
});
