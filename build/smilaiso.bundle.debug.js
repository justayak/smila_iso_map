!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.SmilaIso=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by julian on 4/30/15.
 */
"use strict";

var TIMEOUT = 2000;
var Future = require('future-callbacks');

module.exports = {

    /**
     *
     * @param url
     * @returns {Fitire}
     */
    load: function (url) {
        var future = Future.create();
        var timeoutThread = setTimeout(function () {
            future.execFailure();
        }, TIMEOUT);

        var xobj = new XMLHttpRequest();
        xobj.onreadystatechange = function () {
            if (xobj.readyState == 4) {
                clearTimeout(timeoutThread);
                future.execSuccess(xobj.responseText);
            }
        };
        xobj.open("GET", url, true);
        xobj.send(null);
        return future;
    }

};
},{"future-callbacks":5}],2:[function(require,module,exports){
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
},{"./dataLoader.js":1,"./map.js":3,"future-callbacks":5}],3:[function(require,module,exports){
/**
 * This is the representation of an isometric map:
 *
 * The rendering order is:
 *
 *
 *      /    01   \
 *     y   05  02   x
 *   /   09  06  03   \
 *     13  10  07  04
 *       14  11  08
 *         15  12
 *           16
 *
 *
 *      01 02 03 04                 (0,0 = w/2,0)
 *      05 06 07 08     (1,0 = w/2-tw,th)   (0,1 = w/2+tw,th)
 *      09 10 11 12
 *      13 14 15 16
 *
 *  dx =
 *  dy = (y%w) h
 *
 * dx = Math.floor((x * tileWidth / 2) + (y * tileWidth / 2));
 * dy = Math.floor((y * tileHeight / 2) - (x * tileHeight / 2));
 *
 *
 * Furthermore, their is a height map for the terrain:
 *
 * -128 -  very low
 *  0   -  Sea level
 *  127 -  mountain
 *
 *
 * and a type definition:
 *
 * Created by julian on 4/30/15.
 */
"use strict";

var TILE_SIZE = 64;

var TileManager = require("./tileManager.js");


function Map(json) {
    if ("w" in json && "h" in json && "type" in json && "height" in json) {

        this.w = json.w;
        this.h = json.h;


        var w = this.w;

        var type = json.type;
        var height = json.height;

        this.tiles = TileManager.generate(TILE_SIZE);

        this.typeMatrix = new Int32Array(this.w * this.h);
        this.heightMatrix = new Int32Array(this.w * this.h);

        // (2,1)
        // 1   2   3   4
        // 5   6  (7)  8
        //
        // --> 1 2 3 4 5 6 (7) 8
        // w * y + x

        var x = -1, y = 0, pos = -1;
        for (; y < this.h; y++) {
            x = 0;
            for (; x < w; x++) {
                pos = w * y + x;
                this.typeMatrix[pos] = type[y][x];
                this.heightMatrix[pos] = height[y][x];
            }
        }
    } else {
        throw new Error("malformed JSON for Map creation");
    }


}

/**
 * Only for tests, better inline this for performance!
 * @param x
 * @param y
 * @returns {*}
 */
Map.prototype.getHeightAt = function (x, y) {
    return this.heightMatrix[this.w * y + x];
};

/**
 * Only for tests, better inline this for performance!
 * @param x
 * @param y
 * @returns {*}
 */
Map.prototype.getTypeAt = function (x, y) {
    return this.typeMatrix[this.w * y + x];
};

// =======================================
// INTERFACE IMPL
// =======================================

/**
 * INTERFACE IMPLEMENTATION
 * @returns {Array}
 */
Map.prototype.getRenderItems = function () {
    return [];
};

/**
 * INTERFACE IMPLEMENTATION
 * @param context {Canvas2D Context}
 * @param cameraX {Number}
 * @param cameraY {Number}
 * @param viewportW {Number}
 * @param viewportH {Number}
 */
Map.prototype.renderFront = function (context, cameraX, cameraY, viewportW, viewportH) {

};

/**
 * INTERFACE IMPLEMENTATION
 * @param context {Canvas2D Context}
 * @param cameraX {Number}
 * @param cameraY {Number}
 * @param viewportW {Number}
 * @param viewportH {Number}
 */
Map.prototype.renderBack = function (context, cameraX, cameraY, viewportW, viewportH) {

    var w = this.w;
    var h = this.h;
    var typeMatrix = this.typeMatrix;
    var heightMatrix = this.heightMatrix;
    var tx = Math.ceil(TILE_SIZE/2);
    var ty = Math.ceil(TILE_SIZE / 4);
    var tiles = this.tiles;

    var maxX = tx * w;
    var maxY = ty * h;
    var dx = maxX + Math.ceil(maxX/2);
    var dy = 0;

    var minX = 99999;
    var minY = 99999;

    var y = 0, x = -1, pos = -1;
    var cv;
    for (; y < h; y++) {
        x = 0;

        dy = ty * y;
        dx = dx - maxX - tx;

        for (; x < w; x++) {
            pos = w * y + x;
            cv = tiles[typeMatrix[pos]];

            //dx = Math.floor((x * tileWidth / 2) + (y * tileWidth / 2));
            //dy = Math.floor((y * tileHeight / 2) - (x * tileHeight / 2));


            context.drawImage(cv, dx, dy);

            minX = Math.min(dx, minX);
            minY = Math.min(dy, minY);

            dx += tx;
            dy += ty;

        }
    }

    //console.log("x:" + minX + " y:" + minY);

};

// =======================================
// INTERFACE IMPL END
// =======================================


// =======================================
// HELPER
// =======================================


module.exports = Map;
},{"./tileManager.js":4}],4:[function(require,module,exports){
/**
 * Created by julian on 4/30/15.
 */
"use strict";

var TILE_TYPE_COUNT = 10;

function createCanvas(size, color) {
    var canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = Math.floor(size/2);
    var context = canvas.getContext("2d");
    context.fillStyle = color;
    context.lineWidth = 1;
    context.strokeStyle = "rgb(250,250,250)";
    context.beginPath();

    var x_2 = Math.floor(size/2);
    var y_2 = Math.floor(size/4);
    var xl = 0;
    var xr = size;
    var yb = Math.floor(size/2);
    var yt = 0;

    context.moveTo(x_2, yt);
    context.lineTo(xr, y_2);
    context.lineTo(x_2, yb);
    context.lineTo(xl, y_2);
    context.lineTo(x_2, yt);
    context.closePath();
    context.fill();
    return {canvas: canvas, context: context};
}

/**
 * Defines the tiles
 */
module.exports = {

    /**
     * iso with and height of the tiles
     * @param w
     * @param h
     */
    generate: function(size) {
        var result = []; // access via id

        // GRASS1
        var grass = createCanvas(size, "rgb(102,204,0)");
        result.push(grass.canvas);

        // GRASS2
        grass = createCanvas(size, "rgb(122,204,0)");
        result.push(grass.canvas);

        // GRASS3
        grass = createCanvas(size, "rgb(102,234,0)");
        result.push(grass.canvas);

        // GRASS4
        grass = createCanvas(size, "rgb(89,234,23)");
        result.push(grass.canvas);

        // GRASS5
        grass = createCanvas(size, "rgb(121,234,23)");
        result.push(grass.canvas);

        // GRASS6
        grass = createCanvas(size, "rgb(250,2,23)");
        result.push(grass.canvas);

        return result;
    }


};
},{}],5:[function(require,module,exports){
/**
 * Created by Julian on 3/1/2015.
 */
function Future(obj, maxCount, timeout) {
    this.obj = typeof obj === "undefined" ? {} : obj;
    this.successHandler = null;
    this.failureHandler = null;
    this.finallyHandler = null;
    this.finallyCount = 0;
    this.timeout = 0;
    if (typeof maxCount !== 'undefined') {
        if (typeof timeout === 'undefined') {
            throw new Error('timeout must be defined!');
        }
        this.timeout = timeout;
        this.maxCount = maxCount;
    } else {
        this.maxCount = 1;
    }
    this.timeoutThread = null;
};

Future.prototype.execSuccess = function () {
    var self = this;
    var args = arguments;
    if (this.successHandler === null) {
        // delegate a second try
        setTimeout(function () {
            if (self.successHandler === null) {
                console.warn("success on function with no success handler");
            } else {
                execute(self, "successHandler", args);
            }
        }, 1); // NEXT EXECUTION
    } else {
        execute(this, "successHandler", arguments);
    }
};

function execute(future, handlerName, args) {
    future.finallyCount += 1;
    future[handlerName].apply(future.obj, args);
    if (future.finallyCount === future.maxCount && future.finallyHandler !== null) {
        clearInterval(future.timeoutThread);
        future.finallyHandler.call(future.obj);
        future.successHandler = null;
        future.failureHandler = null;
    }
}

Future.prototype.execFailure = function () {
    var self = this;
    var args = arguments;
    if (this.failureHandler == null) {
        // delegate a second try
        setTimeout(function () {
            if (self.failureHandler === null) {
                throw new Error("unhandled failure");
            } else {
                execute(this, "failureHandler", args);
            }
        }, 1);
    } else {
        execute(this, "failureHandler", arguments);
    }
};

Future.prototype.success = function (callback) {
    if (this.successHandler == null) {
        this.successHandler = callback;
    } else {
        throw new Error("Listener is already set!");
    }
    return this;
};

Future.prototype.failure = function (callback) {
    if (this.failureHandler == null) {
        this.failureHandler = callback;
    } else {
        throw new Error("Listener is already set!");
    }
    return this;
};

Future.prototype.finally = function (a, b, c) {
    var self = this;
    if (this.finallyHandler != null) {
        throw new Error("Listener is already set!");
    } else {
        if (isFunction(a)) {
            this.finallyHandler = a;
            if (this.timeout > 0) {
                this.timeoutThread = setTimeout(function () {
                    self.finallyHandler.call(self.obj);
                }, this.timeout);
            }
            return this;
        } else if (isNumber(a) && a > 0) {
            this.maxCount = a;
            if (isNumber(b)) {
                this.timeoutThread = setTimeout(function () {
                    self.finallyHandler.call(self.obj);
                }, b);
            } else {
                throw new Error("timeout parameter is missing!");
            }
            if (isFunction(c)) {
                self.finallyHandler = c;
            } else {
                clearTimeout(this.timeoutThread);
                throw new Error("callback must be a function!");
            }
        } else {
            throw new Error("first param must be number or function!");
        }
    }
};

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function isFunction(functionToCheck) {
    var getType = {};
    return functionToCheck && getType.toString.call(functionToCheck) === '[object Function]';
}

module.exports.create = function (obj, i, t) {
    return new Future(obj, i, t);
};
},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9kYXRhTG9hZGVyLmpzIiwibGliL2lzby5qcyIsImxpYi9tYXAuanMiLCJsaWIvdGlsZU1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZnV0dXJlLWNhbGxiYWNrcy9saWIvZnV0dXJlLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcE1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBqdWxpYW4gb24gNC8zMC8xNS5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBUSU1FT1VUID0gMjAwMDtcbnZhciBGdXR1cmUgPSByZXF1aXJlKCdmdXR1cmUtY2FsbGJhY2tzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gdXJsXG4gICAgICogQHJldHVybnMge0ZpdGlyZX1cbiAgICAgKi9cbiAgICBsb2FkOiBmdW5jdGlvbiAodXJsKSB7XG4gICAgICAgIHZhciBmdXR1cmUgPSBGdXR1cmUuY3JlYXRlKCk7XG4gICAgICAgIHZhciB0aW1lb3V0VGhyZWFkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmdXR1cmUuZXhlY0ZhaWx1cmUoKTtcbiAgICAgICAgfSwgVElNRU9VVCk7XG5cbiAgICAgICAgdmFyIHhvYmogPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcbiAgICAgICAgeG9iai5vbnJlYWR5c3RhdGVjaGFuZ2UgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBpZiAoeG9iai5yZWFkeVN0YXRlID09IDQpIHtcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dFRocmVhZCk7XG4gICAgICAgICAgICAgICAgZnV0dXJlLmV4ZWNTdWNjZXNzKHhvYmoucmVzcG9uc2VUZXh0KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICAgICAgeG9iai5vcGVuKFwiR0VUXCIsIHVybCwgdHJ1ZSk7XG4gICAgICAgIHhvYmouc2VuZChudWxsKTtcbiAgICAgICAgcmV0dXJuIGZ1dHVyZTtcbiAgICB9XG5cbn07IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGp1bGlhbiBvbiA0LzMwLzE1LlxuICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIERhdGFMb2FkZXIgPSByZXF1aXJlKCcuL2RhdGFMb2FkZXIuanMnKTtcbnZhciBGdXR1cmUgPSByZXF1aXJlKCdmdXR1cmUtY2FsbGJhY2tzJyk7XG52YXIgTWFwID0gcmVxdWlyZShcIi4vbWFwLmpzXCIpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIG1hcDogZnVuY3Rpb24gKHVybCkge1xuICAgICAgICB2YXIgZnV0dXJlID0gRnV0dXJlLmNyZWF0ZSgpO1xuICAgICAgICBEYXRhTG9hZGVyLmxvYWQodXJsKS5zdWNjZXNzKGZ1bmN0aW9uIChtYXBKU09OKSB7XG4gICAgICAgICAgICB2YXIgbWFwID0gbmV3IE1hcChKU09OLnBhcnNlKG1hcEpTT04pKTtcbiAgICAgICAgICAgIGZ1dHVyZS5leGVjU3VjY2VzcyhtYXApO1xuICAgICAgICB9KS5mYWlsdXJlKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGZ1dHVyZS5leGVjRmFpbHVyZSgpO1xuICAgICAgICB9KTtcbiAgICAgICAgcmV0dXJuIGZ1dHVyZTtcbiAgICB9XG4gICAgXG59OyIsIi8qKlxuICogVGhpcyBpcyB0aGUgcmVwcmVzZW50YXRpb24gb2YgYW4gaXNvbWV0cmljIG1hcDpcbiAqXG4gKiBUaGUgcmVuZGVyaW5nIG9yZGVyIGlzOlxuICpcbiAqXG4gKiAgICAgIC8gICAgMDEgICBcXFxuICogICAgIHkgICAwNSAgMDIgICB4XG4gKiAgIC8gICAwOSAgMDYgIDAzICAgXFxcbiAqICAgICAxMyAgMTAgIDA3ICAwNFxuICogICAgICAgMTQgIDExICAwOFxuICogICAgICAgICAxNSAgMTJcbiAqICAgICAgICAgICAxNlxuICpcbiAqXG4gKiAgICAgIDAxIDAyIDAzIDA0ICAgICAgICAgICAgICAgICAoMCwwID0gdy8yLDApXG4gKiAgICAgIDA1IDA2IDA3IDA4ICAgICAoMSwwID0gdy8yLXR3LHRoKSAgICgwLDEgPSB3LzIrdHcsdGgpXG4gKiAgICAgIDA5IDEwIDExIDEyXG4gKiAgICAgIDEzIDE0IDE1IDE2XG4gKlxuICogIGR4ID1cbiAqICBkeSA9ICh5JXcpIGhcbiAqXG4gKiBkeCA9IE1hdGguZmxvb3IoKHggKiB0aWxlV2lkdGggLyAyKSArICh5ICogdGlsZVdpZHRoIC8gMikpO1xuICogZHkgPSBNYXRoLmZsb29yKCh5ICogdGlsZUhlaWdodCAvIDIpIC0gKHggKiB0aWxlSGVpZ2h0IC8gMikpO1xuICpcbiAqXG4gKiBGdXJ0aGVybW9yZSwgdGhlaXIgaXMgYSBoZWlnaHQgbWFwIGZvciB0aGUgdGVycmFpbjpcbiAqXG4gKiAtMTI4IC0gIHZlcnkgbG93XG4gKiAgMCAgIC0gIFNlYSBsZXZlbFxuICogIDEyNyAtICBtb3VudGFpblxuICpcbiAqXG4gKiBhbmQgYSB0eXBlIGRlZmluaXRpb246XG4gKlxuICogQ3JlYXRlZCBieSBqdWxpYW4gb24gNC8zMC8xNS5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBUSUxFX1NJWkUgPSA2NDtcblxudmFyIFRpbGVNYW5hZ2VyID0gcmVxdWlyZShcIi4vdGlsZU1hbmFnZXIuanNcIik7XG5cblxuZnVuY3Rpb24gTWFwKGpzb24pIHtcbiAgICBpZiAoXCJ3XCIgaW4ganNvbiAmJiBcImhcIiBpbiBqc29uICYmIFwidHlwZVwiIGluIGpzb24gJiYgXCJoZWlnaHRcIiBpbiBqc29uKSB7XG5cbiAgICAgICAgdGhpcy53ID0ganNvbi53O1xuICAgICAgICB0aGlzLmggPSBqc29uLmg7XG5cblxuICAgICAgICB2YXIgdyA9IHRoaXMudztcblxuICAgICAgICB2YXIgdHlwZSA9IGpzb24udHlwZTtcbiAgICAgICAgdmFyIGhlaWdodCA9IGpzb24uaGVpZ2h0O1xuXG4gICAgICAgIHRoaXMudGlsZXMgPSBUaWxlTWFuYWdlci5nZW5lcmF0ZShUSUxFX1NJWkUpO1xuXG4gICAgICAgIHRoaXMudHlwZU1hdHJpeCA9IG5ldyBJbnQzMkFycmF5KHRoaXMudyAqIHRoaXMuaCk7XG4gICAgICAgIHRoaXMuaGVpZ2h0TWF0cml4ID0gbmV3IEludDMyQXJyYXkodGhpcy53ICogdGhpcy5oKTtcblxuICAgICAgICAvLyAoMiwxKVxuICAgICAgICAvLyAxICAgMiAgIDMgICA0XG4gICAgICAgIC8vIDUgICA2ICAoNykgIDhcbiAgICAgICAgLy9cbiAgICAgICAgLy8gLS0+IDEgMiAzIDQgNSA2ICg3KSA4XG4gICAgICAgIC8vIHcgKiB5ICsgeFxuXG4gICAgICAgIHZhciB4ID0gLTEsIHkgPSAwLCBwb3MgPSAtMTtcbiAgICAgICAgZm9yICg7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgICAgICAgeCA9IDA7XG4gICAgICAgICAgICBmb3IgKDsgeCA8IHc7IHgrKykge1xuICAgICAgICAgICAgICAgIHBvcyA9IHcgKiB5ICsgeDtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGVNYXRyaXhbcG9zXSA9IHR5cGVbeV1beF07XG4gICAgICAgICAgICAgICAgdGhpcy5oZWlnaHRNYXRyaXhbcG9zXSA9IGhlaWdodFt5XVt4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm1hbGZvcm1lZCBKU09OIGZvciBNYXAgY3JlYXRpb25cIik7XG4gICAgfVxuXG5cbn1cblxuLyoqXG4gKiBPbmx5IGZvciB0ZXN0cywgYmV0dGVyIGlubGluZSB0aGlzIGZvciBwZXJmb3JtYW5jZSFcbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0geVxuICogQHJldHVybnMgeyp9XG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0SGVpZ2h0QXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLmhlaWdodE1hdHJpeFt0aGlzLncgKiB5ICsgeF07XG59O1xuXG4vKipcbiAqIE9ubHkgZm9yIHRlc3RzLCBiZXR0ZXIgaW5saW5lIHRoaXMgZm9yIHBlcmZvcm1hbmNlIVxuICogQHBhcmFtIHhcbiAqIEBwYXJhbSB5XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuTWFwLnByb3RvdHlwZS5nZXRUeXBlQXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVNYXRyaXhbdGhpcy53ICogeSArIHhdO1xufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJTlRFUkZBQ0UgSU1QTFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSU5URVJGQUNFIElNUExFTUVOVEFUSU9OXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0UmVuZGVySXRlbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdO1xufTtcblxuLyoqXG4gKiBJTlRFUkZBQ0UgSU1QTEVNRU5UQVRJT05cbiAqIEBwYXJhbSBjb250ZXh0IHtDYW52YXMyRCBDb250ZXh0fVxuICogQHBhcmFtIGNhbWVyYVgge051bWJlcn1cbiAqIEBwYXJhbSBjYW1lcmFZIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRXIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRIIHtOdW1iZXJ9XG4gKi9cbk1hcC5wcm90b3R5cGUucmVuZGVyRnJvbnQgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FtZXJhWCwgY2FtZXJhWSwgdmlld3BvcnRXLCB2aWV3cG9ydEgpIHtcblxufTtcblxuLyoqXG4gKiBJTlRFUkZBQ0UgSU1QTEVNRU5UQVRJT05cbiAqIEBwYXJhbSBjb250ZXh0IHtDYW52YXMyRCBDb250ZXh0fVxuICogQHBhcmFtIGNhbWVyYVgge051bWJlcn1cbiAqIEBwYXJhbSBjYW1lcmFZIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRXIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRIIHtOdW1iZXJ9XG4gKi9cbk1hcC5wcm90b3R5cGUucmVuZGVyQmFjayA9IGZ1bmN0aW9uIChjb250ZXh0LCBjYW1lcmFYLCBjYW1lcmFZLCB2aWV3cG9ydFcsIHZpZXdwb3J0SCkge1xuXG4gICAgdmFyIHcgPSB0aGlzLnc7XG4gICAgdmFyIGggPSB0aGlzLmg7XG4gICAgdmFyIHR5cGVNYXRyaXggPSB0aGlzLnR5cGVNYXRyaXg7XG4gICAgdmFyIGhlaWdodE1hdHJpeCA9IHRoaXMuaGVpZ2h0TWF0cml4O1xuICAgIHZhciB0eCA9IE1hdGguY2VpbChUSUxFX1NJWkUvMik7XG4gICAgdmFyIHR5ID0gTWF0aC5jZWlsKFRJTEVfU0laRSAvIDQpO1xuICAgIHZhciB0aWxlcyA9IHRoaXMudGlsZXM7XG5cbiAgICB2YXIgbWF4WCA9IHR4ICogdztcbiAgICB2YXIgbWF4WSA9IHR5ICogaDtcbiAgICB2YXIgZHggPSBtYXhYICsgTWF0aC5jZWlsKG1heFgvMik7XG4gICAgdmFyIGR5ID0gMDtcblxuICAgIHZhciBtaW5YID0gOTk5OTk7XG4gICAgdmFyIG1pblkgPSA5OTk5OTtcblxuICAgIHZhciB5ID0gMCwgeCA9IC0xLCBwb3MgPSAtMTtcbiAgICB2YXIgY3Y7XG4gICAgZm9yICg7IHkgPCBoOyB5KyspIHtcbiAgICAgICAgeCA9IDA7XG5cbiAgICAgICAgZHkgPSB0eSAqIHk7XG4gICAgICAgIGR4ID0gZHggLSBtYXhYIC0gdHg7XG5cbiAgICAgICAgZm9yICg7IHggPCB3OyB4KyspIHtcbiAgICAgICAgICAgIHBvcyA9IHcgKiB5ICsgeDtcbiAgICAgICAgICAgIGN2ID0gdGlsZXNbdHlwZU1hdHJpeFtwb3NdXTtcblxuICAgICAgICAgICAgLy9keCA9IE1hdGguZmxvb3IoKHggKiB0aWxlV2lkdGggLyAyKSArICh5ICogdGlsZVdpZHRoIC8gMikpO1xuICAgICAgICAgICAgLy9keSA9IE1hdGguZmxvb3IoKHkgKiB0aWxlSGVpZ2h0IC8gMikgLSAoeCAqIHRpbGVIZWlnaHQgLyAyKSk7XG5cblxuICAgICAgICAgICAgY29udGV4dC5kcmF3SW1hZ2UoY3YsIGR4LCBkeSk7XG5cbiAgICAgICAgICAgIG1pblggPSBNYXRoLm1pbihkeCwgbWluWCk7XG4gICAgICAgICAgICBtaW5ZID0gTWF0aC5taW4oZHksIG1pblkpO1xuXG4gICAgICAgICAgICBkeCArPSB0eDtcbiAgICAgICAgICAgIGR5ICs9IHR5O1xuXG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvL2NvbnNvbGUubG9nKFwieDpcIiArIG1pblggKyBcIiB5OlwiICsgbWluWSk7XG5cbn07XG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSU5URVJGQUNFIElNUEwgRU5EXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cbi8vIEhFTFBFUlxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cblxubW9kdWxlLmV4cG9ydHMgPSBNYXA7IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IGp1bGlhbiBvbiA0LzMwLzE1LlxuICovXG5cInVzZSBzdHJpY3RcIjtcblxudmFyIFRJTEVfVFlQRV9DT1VOVCA9IDEwO1xuXG5mdW5jdGlvbiBjcmVhdGVDYW52YXMoc2l6ZSwgY29sb3IpIHtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImNhbnZhc1wiKTtcbiAgICBjYW52YXMud2lkdGggPSBzaXplO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBNYXRoLmZsb29yKHNpemUvMik7XG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuICAgIGNvbnRleHQuZmlsbFN0eWxlID0gY29sb3I7XG4gICAgY29udGV4dC5saW5lV2lkdGggPSAxO1xuICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYigyNTAsMjUwLDI1MClcIjtcbiAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuXG4gICAgdmFyIHhfMiA9IE1hdGguZmxvb3Ioc2l6ZS8yKTtcbiAgICB2YXIgeV8yID0gTWF0aC5mbG9vcihzaXplLzQpO1xuICAgIHZhciB4bCA9IDA7XG4gICAgdmFyIHhyID0gc2l6ZTtcbiAgICB2YXIgeWIgPSBNYXRoLmZsb29yKHNpemUvMik7XG4gICAgdmFyIHl0ID0gMDtcblxuICAgIGNvbnRleHQubW92ZVRvKHhfMiwgeXQpO1xuICAgIGNvbnRleHQubGluZVRvKHhyLCB5XzIpO1xuICAgIGNvbnRleHQubGluZVRvKHhfMiwgeWIpO1xuICAgIGNvbnRleHQubGluZVRvKHhsLCB5XzIpO1xuICAgIGNvbnRleHQubGluZVRvKHhfMiwgeXQpO1xuICAgIGNvbnRleHQuY2xvc2VQYXRoKCk7XG4gICAgY29udGV4dC5maWxsKCk7XG4gICAgcmV0dXJuIHtjYW52YXM6IGNhbnZhcywgY29udGV4dDogY29udGV4dH07XG59XG5cbi8qKlxuICogRGVmaW5lcyB0aGUgdGlsZXNcbiAqL1xubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICAvKipcbiAgICAgKiBpc28gd2l0aCBhbmQgaGVpZ2h0IG9mIHRoZSB0aWxlc1xuICAgICAqIEBwYXJhbSB3XG4gICAgICogQHBhcmFtIGhcbiAgICAgKi9cbiAgICBnZW5lcmF0ZTogZnVuY3Rpb24oc2l6ZSkge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW107IC8vIGFjY2VzcyB2aWEgaWRcblxuICAgICAgICAvLyBHUkFTUzFcbiAgICAgICAgdmFyIGdyYXNzID0gY3JlYXRlQ2FudmFzKHNpemUsIFwicmdiKDEwMiwyMDQsMClcIik7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdyYXNzLmNhbnZhcyk7XG5cbiAgICAgICAgLy8gR1JBU1MyXG4gICAgICAgIGdyYXNzID0gY3JlYXRlQ2FudmFzKHNpemUsIFwicmdiKDEyMiwyMDQsMClcIik7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdyYXNzLmNhbnZhcyk7XG5cbiAgICAgICAgLy8gR1JBU1MzXG4gICAgICAgIGdyYXNzID0gY3JlYXRlQ2FudmFzKHNpemUsIFwicmdiKDEwMiwyMzQsMClcIik7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdyYXNzLmNhbnZhcyk7XG5cbiAgICAgICAgLy8gR1JBU1M0XG4gICAgICAgIGdyYXNzID0gY3JlYXRlQ2FudmFzKHNpemUsIFwicmdiKDg5LDIzNCwyMylcIik7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdyYXNzLmNhbnZhcyk7XG5cbiAgICAgICAgLy8gR1JBU1M1XG4gICAgICAgIGdyYXNzID0gY3JlYXRlQ2FudmFzKHNpemUsIFwicmdiKDEyMSwyMzQsMjMpXCIpO1xuICAgICAgICByZXN1bHQucHVzaChncmFzcy5jYW52YXMpO1xuXG4gICAgICAgIC8vIEdSQVNTNlxuICAgICAgICBncmFzcyA9IGNyZWF0ZUNhbnZhcyhzaXplLCBcInJnYigyNTAsMiwyMylcIik7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdyYXNzLmNhbnZhcyk7XG5cbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcbiAgICB9XG5cblxufTsiLCIvKipcclxuICogQ3JlYXRlZCBieSBKdWxpYW4gb24gMy8xLzIwMTUuXHJcbiAqL1xyXG5mdW5jdGlvbiBGdXR1cmUob2JqLCBtYXhDb3VudCwgdGltZW91dCkge1xyXG4gICAgdGhpcy5vYmogPSB0eXBlb2Ygb2JqID09PSBcInVuZGVmaW5lZFwiID8ge30gOiBvYmo7XHJcbiAgICB0aGlzLnN1Y2Nlc3NIYW5kbGVyID0gbnVsbDtcclxuICAgIHRoaXMuZmFpbHVyZUhhbmRsZXIgPSBudWxsO1xyXG4gICAgdGhpcy5maW5hbGx5SGFuZGxlciA9IG51bGw7XHJcbiAgICB0aGlzLmZpbmFsbHlDb3VudCA9IDA7XHJcbiAgICB0aGlzLnRpbWVvdXQgPSAwO1xyXG4gICAgaWYgKHR5cGVvZiBtYXhDb3VudCAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICBpZiAodHlwZW9mIHRpbWVvdXQgPT09ICd1bmRlZmluZWQnKSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcigndGltZW91dCBtdXN0IGJlIGRlZmluZWQhJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XHJcbiAgICAgICAgdGhpcy5tYXhDb3VudCA9IG1heENvdW50O1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aGlzLm1heENvdW50ID0gMTtcclxuICAgIH1cclxuICAgIHRoaXMudGltZW91dFRocmVhZCA9IG51bGw7XHJcbn07XHJcblxyXG5GdXR1cmUucHJvdG90eXBlLmV4ZWNTdWNjZXNzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICBpZiAodGhpcy5zdWNjZXNzSGFuZGxlciA9PT0gbnVsbCkge1xyXG4gICAgICAgIC8vIGRlbGVnYXRlIGEgc2Vjb25kIHRyeVxyXG4gICAgICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBpZiAoc2VsZi5zdWNjZXNzSGFuZGxlciA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwic3VjY2VzcyBvbiBmdW5jdGlvbiB3aXRoIG5vIHN1Y2Nlc3MgaGFuZGxlclwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGV4ZWN1dGUoc2VsZiwgXCJzdWNjZXNzSGFuZGxlclwiLCBhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEpOyAvLyBORVhUIEVYRUNVVElPTlxyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBleGVjdXRlKHRoaXMsIFwic3VjY2Vzc0hhbmRsZXJcIiwgYXJndW1lbnRzKTtcclxuICAgIH1cclxufTtcclxuXHJcbmZ1bmN0aW9uIGV4ZWN1dGUoZnV0dXJlLCBoYW5kbGVyTmFtZSwgYXJncykge1xyXG4gICAgZnV0dXJlLmZpbmFsbHlDb3VudCArPSAxO1xyXG4gICAgZnV0dXJlW2hhbmRsZXJOYW1lXS5hcHBseShmdXR1cmUub2JqLCBhcmdzKTtcclxuICAgIGlmIChmdXR1cmUuZmluYWxseUNvdW50ID09PSBmdXR1cmUubWF4Q291bnQgJiYgZnV0dXJlLmZpbmFsbHlIYW5kbGVyICE9PSBudWxsKSB7XHJcbiAgICAgICAgY2xlYXJJbnRlcnZhbChmdXR1cmUudGltZW91dFRocmVhZCk7XHJcbiAgICAgICAgZnV0dXJlLmZpbmFsbHlIYW5kbGVyLmNhbGwoZnV0dXJlLm9iaik7XHJcbiAgICAgICAgZnV0dXJlLnN1Y2Nlc3NIYW5kbGVyID0gbnVsbDtcclxuICAgICAgICBmdXR1cmUuZmFpbHVyZUhhbmRsZXIgPSBudWxsO1xyXG4gICAgfVxyXG59XHJcblxyXG5GdXR1cmUucHJvdG90eXBlLmV4ZWNGYWlsdXJlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgdmFyIGFyZ3MgPSBhcmd1bWVudHM7XHJcbiAgICBpZiAodGhpcy5mYWlsdXJlSGFuZGxlciA9PSBudWxsKSB7XHJcbiAgICAgICAgLy8gZGVsZWdhdGUgYSBzZWNvbmQgdHJ5XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChzZWxmLmZhaWx1cmVIYW5kbGVyID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ1bmhhbmRsZWQgZmFpbHVyZVwiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGV4ZWN1dGUodGhpcywgXCJmYWlsdXJlSGFuZGxlclwiLCBhcmdzKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0sIDEpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICBleGVjdXRlKHRoaXMsIFwiZmFpbHVyZUhhbmRsZXJcIiwgYXJndW1lbnRzKTtcclxuICAgIH1cclxufTtcclxuXHJcbkZ1dHVyZS5wcm90b3R5cGUuc3VjY2VzcyA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgaWYgKHRoaXMuc3VjY2Vzc0hhbmRsZXIgPT0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMuc3VjY2Vzc0hhbmRsZXIgPSBjYWxsYmFjaztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdGVuZXIgaXMgYWxyZWFkeSBzZXQhXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5GdXR1cmUucHJvdG90eXBlLmZhaWx1cmUgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgIGlmICh0aGlzLmZhaWx1cmVIYW5kbGVyID09IG51bGwpIHtcclxuICAgICAgICB0aGlzLmZhaWx1cmVIYW5kbGVyID0gY2FsbGJhY2s7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3RlbmVyIGlzIGFscmVhZHkgc2V0IVwiKTtcclxuICAgIH1cclxuICAgIHJldHVybiB0aGlzO1xyXG59O1xyXG5cclxuRnV0dXJlLnByb3RvdHlwZS5maW5hbGx5ID0gZnVuY3Rpb24gKGEsIGIsIGMpIHtcclxuICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgIGlmICh0aGlzLmZpbmFsbHlIYW5kbGVyICE9IG51bGwpIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0ZW5lciBpcyBhbHJlYWR5IHNldCFcIik7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGlmIChpc0Z1bmN0aW9uKGEpKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZmluYWxseUhhbmRsZXIgPSBhO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50aW1lb3V0ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lb3V0VGhyZWFkID0gc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5maW5hbGx5SGFuZGxlci5jYWxsKHNlbGYub2JqKTtcclxuICAgICAgICAgICAgICAgIH0sIHRoaXMudGltZW91dCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRoaXM7XHJcbiAgICAgICAgfSBlbHNlIGlmIChpc051bWJlcihhKSAmJiBhID4gMCkge1xyXG4gICAgICAgICAgICB0aGlzLm1heENvdW50ID0gYTtcclxuICAgICAgICAgICAgaWYgKGlzTnVtYmVyKGIpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVvdXRUaHJlYWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmZpbmFsbHlIYW5kbGVyLmNhbGwoc2VsZi5vYmopO1xyXG4gICAgICAgICAgICAgICAgfSwgYik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJ0aW1lb3V0IHBhcmFtZXRlciBpcyBtaXNzaW5nIVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoaXNGdW5jdGlvbihjKSkge1xyXG4gICAgICAgICAgICAgICAgc2VsZi5maW5hbGx5SGFuZGxlciA9IGM7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBjbGVhclRpbWVvdXQodGhpcy50aW1lb3V0VGhyZWFkKTtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImNhbGxiYWNrIG11c3QgYmUgYSBmdW5jdGlvbiFcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJmaXJzdCBwYXJhbSBtdXN0IGJlIG51bWJlciBvciBmdW5jdGlvbiFcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gaXNOdW1iZXIobikge1xyXG4gICAgcmV0dXJuICFpc05hTihwYXJzZUZsb2F0KG4pKSAmJiBpc0Zpbml0ZShuKTtcclxufVxyXG5cclxuZnVuY3Rpb24gaXNGdW5jdGlvbihmdW5jdGlvblRvQ2hlY2spIHtcclxuICAgIHZhciBnZXRUeXBlID0ge307XHJcbiAgICByZXR1cm4gZnVuY3Rpb25Ub0NoZWNrICYmIGdldFR5cGUudG9TdHJpbmcuY2FsbChmdW5jdGlvblRvQ2hlY2spID09PSAnW29iamVjdCBGdW5jdGlvbl0nO1xyXG59XHJcblxyXG5tb2R1bGUuZXhwb3J0cy5jcmVhdGUgPSBmdW5jdGlvbiAob2JqLCBpLCB0KSB7XHJcbiAgICByZXR1cm4gbmV3IEZ1dHVyZShvYmosIGksIHQpO1xyXG59OyJdfQ==
