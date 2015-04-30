/**
 * Created by julian on 4/30/15.
 */
"use strict";

var DataLoader = require('./dataLoader.js');
var Future = require('future-callbacks');
var Map = require("./map.js");
var Utils = require('yutils');

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
    },

    /**
     * for testing
     */
    randomMap: function (w,h) {
        var json = {
            "w": w,
            "h": h,
            "tileSize": 64,
            "height": [],
            "type": []
        };
        var x, y = 0;
        for (; y < h; y++) {
            x = 0;
            json.height[y] = [];
            json.type[y] = [];
            for(; x < w; x++) {
                json.height[y].push(Utils.getRandomInt(-1,60));
                json.type[y].push(Utils.getRandomInt(0,4));
            }
        }
        return new Map(json);
    }
    
};