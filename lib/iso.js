/**
 * Created by julian on 4/30/15.
 */
"use strict";

var DataLoader = require('./dataLoader.js');
var Future = require('future-callbacks');
var Map = require("./map.js");

module.exports = {

    map: function (url) {
        var future = Future.create();
        DataLoader.load(url).success(function (mapJSON) {
            var map = new Map(JSON.parse(mapJSON));
            future.execSuccess(map);
        }).failure(function () {
            future.execFailure();
        });
        return future;
    }
    
};