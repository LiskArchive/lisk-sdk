require('angular');

angular.module('liskApp').service('blockService', function ($http) {

    var blocks = {
        lastBlockId: null,
        searchForBlock: '',
        gettingBlocks: false,
        cached: {data: [], time: new Date()},
        getBlock: function (blockID, cb) {
            $http.get("/api/blocks/get", {
                params: {
                    id: blockID
                }
            }).then(function (response) {
                    if (response.data.success) {
                        cb({blocks: [response.data.block], count: 1});
                    }
                    else {
                        cb({blocks: [], count: 0});
                    }
                }
            );
        },
        getBlocks: function (searchForBlock, $defer, params, filter, cb, publicKey, fromBlocks) {
            blocks.searchForBlock = searchForBlock.trim();
            if (blocks.searchForBlock != '') {
                this.getBlock(blocks.searchForBlock, function (response) {
                    if (response.count) {
                        params.total(response.count);
                        $defer.resolve(response.blocks);
                        cb(null);
                    }
                    else {
                        var sortString = '';
                        var keys = [];
                        for (var key in params.$params.sorting) {
                            if (params.$params.sorting.hasOwnProperty(key)) {
                                sortString = key + ':' + params.$params.sorting[key];
                            }
                        }
                        var queryParams = {
                            orderBy: sortString,
                            limit: params.count(),
                            offset: (params.page() - 1) * params.count(),
                            height: blocks.searchForBlock
                        }
                        $http.get("/api/blocks/", {
                            params: queryParams
                        })
                            .then(function (response) {
                                params.total(response.data.count);
                                $defer.resolve(response.data.blocks);
                                cb(null);
                            });
                    }
                });
            }
            else {
                if (true) {
                    this.gettingBlocks = true;
                    var sortString = '';
                    var keys = [];
                    for (var key in params.$params.sorting) {
                        if (params.$params.sorting.hasOwnProperty(key)) {
                            sortString = key + ':' + params.$params.sorting[key];
                        }
                    }
                    var queryParams = {
                        orderBy: sortString,
                        limit: params.count(),
                        offset: (params.page() - 1) * params.count()
                    }
                    if (publicKey) {
                        queryParams.generatorPublicKey = publicKey;
                    }
                    $http.get("/api/blocks/", {
                        params: queryParams
                    })
                        .then(function (response) {
                            if (fromBlocks) {
                                $http.get("/api/blocks/getHeight")
                                    .then(function (res) {
                                        this.gettingBlocks = false;
                                        if (res.data.success) {
                                            params.total(res.data.height);
                                        }
                                        else {
                                            params.total(0);
                                        }

                                        if (response.data.success) {
                                            blocks.lastBlockId = response.data.blocks[response.data.blocks.length - 1].id;
                                            cb();
                                            $defer.resolve(response.data.blocks);
                                        }
                                        else {
                                            blocks.lastBlockId = 0;
                                            cb();
                                            $defer.resolve([]);
                                        }

                                    });
                            }
                            else {
                                var queryParams = {orderBy: "height:desc", limit: 1, offset: 0}
                                if (publicKey) {
                                    queryParams.generatorPublicKey = publicKey;
                                }
                                $http.get("/api/blocks/", {params: queryParams})
                                    .then(function (res) {
                                        this.gettingBlocks = false;

                                        if (publicKey) {
                                            params.total(res.data.count);
                                        }
                                        else {
                                            if (res.data.count) {
                                                params.total(res.data.blocks[0].height);
                                            }
                                            else {
                                                params.total(0);
                                            }
                                        }

                                        if (response.data.success) {
                                            blocks.lastBlockId = response.data.blocks.length ? response.data.blocks[response.data.blocks.length - 1].id : 0;
                                            cb();
                                            $defer.resolve(response.data.blocks);
                                        }
                                        else {
                                            blocks.lastBlockId = 0;
                                            cb();
                                            $defer.resolve([]);
                                        }

                                    });
                            }
                        });
                }
            }
        }
    }

    return blocks;

});
