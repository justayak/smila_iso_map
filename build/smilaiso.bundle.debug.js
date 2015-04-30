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

var TileManager = require("./tileManager.js");


function Map(json) {
    if ("tileSize" in json && "w" in json && "h" in json && "type" in json && "height" in json) {

        this.w = json.w;
        this.h = json.h;

        this.tileSize = json.tileSize;

        var w = this.w;

        var type = json.type;
        var height = json.height;

        this.tiles = TileManager.generate(this.tileSize);

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

    var TILE_SIZE = this.tileSize;
    var w = this.w;
    var h = this.h;
    var typeMatrix = this.typeMatrix;
    var heightMatrix = this.heightMatrix;
    var tx = Math.ceil(TILE_SIZE/2);
    var ty = Math.ceil(TILE_SIZE / 4);
    var tiles = this.tiles;

    var maxX = tx * w;
    var dx = maxX + Math.ceil(maxX/2);
    var dy = 0;

    var startX = Math.floor(cameraX / TILE_SIZE);

    var y = 0, x = -1, pos = -1;
    var cv, height;
    for (; y < h; y++) {
        x = 0;
        dy = ty * y;
        dx = dx - maxX - tx;

        for (; x < w; x++) {
            pos = w * y + x;
            cv = tiles[typeMatrix[pos]];

            height = heightMatrix[pos];

            context.drawImage(cv, dx, dy - height);

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

var Utils = require('yutils');

var TILE_TYPE_COUNT = 10;

function createCanvas(size, color) {
    var SIZE_FAC = 5;
    var canvas = document.createElement("canvas");
    canvas.width = size;
    //canvas.height = Math.floor(size/2);
    canvas.height = size * SIZE_FAC;
    var context = canvas.getContext("2d");

    context.lineWidth = 1;
    context.strokeStyle = "rgb(250,250,250)";
    context.beginPath();

    var x_2 = Math.floor(size/2);
    var y_2 = Math.floor(size/4);
    var xl = 0;
    var xr = size;
    var yb = Math.floor(size/2);
    var yt = 0;


    // render ground
    /*
    var res = 12;
    var gx = 0, gy = y_2, dirtSize = Math.ceil(size/res);
    var y = 0, x;
    for (; gy < size * 2; gy += dirtSize) {
        x = 0;
        for (; x < size; x += res) {
            context.fillStyle = "rgb(" + Utils.getRandomInt(135, 255) + ","
                + Utils.getRandomInt(105,211) + "," +
                Utils.getRandomInt(19,140) + ")";
            context.fillRect(x,y,res, res);
        }
    }
    */
    context.fillStyle = "rgb(139,90,43)";
    context.fillRect(0, y_2, x_2, size * SIZE_FAC);

    context.fillStyle = "rgb(205,133,63)";
    context.fillRect(x_2, y_2, x_2, size * SIZE_FAC);

    // render real stuff
    context.fillStyle = color;
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
},{"yutils":6}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
/**
 * Created by Julian on 12/10/2014.
 */
(function (exports) {

    // performance.now polyfill
    var perf = null;
    if (typeof performance === 'undefined') {
        perf = {};
    } else {
        perf = performance;
    }

    perf.now = perf.now || perf.mozNow || perf.msNow || perf.oNow || perf.webkitNow || Date.now ||
        function () {
            return new Date().getTime();
        };

    function swap(array, i, j) {
        if (i !== j) {
            var temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
    }

    /*
     ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
     */

    var getRandomInt = exports.getRandomInt = function (min, max) {
        if (min > max) throw new Error("min must be smaller than max! {" + min + ">" + max + "}");
        return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    exports.sample = function (list, n) {
        var result = [], j, i = 0, L = n > list.length ? list.length : n, s = list.length - 1;
        for (; i < L; i++) {
            j = getRandomInt(i, s);
            swap(list, i, j);
            result.push(list[i]);
        }
        return result;
    };

    var isString = exports.isString = function (myVar) {
        return (typeof myVar === 'string' || myVar instanceof String)
    };

    exports.assertLength = function (arg, nbr) {
        if (arg.length === nbr) return true;
        else throw new Error("Wrong number of arguments: expected:" + nbr + ", but got: " + arg.length);
    };

    exports.guid = function () {
        var d = perf.now();
        var guid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return guid;
    };

    exports.timeDifferenceInMs = function (tsA, tsB) {
        if (tsA instanceof Date) {
            tsA = tsA.getTime();
        }
        if (tsB instanceof Date) {
            tsB = tsB.getTime();
        }
        return Math.abs(tsA - tsB);
    };

    /**
     * milliseconds to seconds
     * @param ms {Number} Millis
     */
    exports.msToS = function (ms) {
        return ms / 1000;
    };

    exports.isDefined = function (o) {
        if (o === null) return false;
        if (typeof o === "undefined") return false;
        return true;
    };

    /**
     * Shallow clone
     * @param list
     * @returns {Array|string|Blob}
     */
    exports.cloneArray = function (list) {
        return list.slice(0);
    };

    /**
     * removes the item at the position and reindexes the list
     * @param list
     * @param i
     * @returns {*}
     */
    exports.deletePosition = function (list, i) {
        if (i < 0 || i >= list.length) throw new Error("Out of bounds");
        list.splice(i, 1);
        return list;
    };

    /**
     * Checks weather the the object implements the full interface or not
     * @param o {Object}
     */
    var implements = exports.implements = function (o, a) {
        if (Array.isArray(a)) {
            return implements.apply({}, [o].concat(a));
        }
        var i = 1, methodName;
        while ((methodName = arguments[i++])) {
            if (typeof o[methodName] !== "function") {
                return false;
            }
        }
        return true;
    };

    var isNumber = exports.isNumber = function (o) {
        if (isString(o)) return false;
        return !isNaN(o - 0) && o !== null && typeof o !== 'undefined' && o !== false;
    };

    function not(l) {
        return !l;
    }

    /**
     * Checks if the object equals the definition
     * @param obj {Object}
     * @param definition {Object} {
     *      'key1': String,
     *      'key2': AnyClass,
     *      'key3': Number
     *
     * }
     * @returns {boolean}
     */
    var defines = exports.defines = function (obj, definition) {
        var key = null, type, i = 0, L;
        if (Array.isArray(obj)) {
            L = obj.length;
            for (;i<L;i++) {
                if (!defines(obj[i], definition)) {
                    return false;
                }
            }
        } else {
            for (key in definition) {
                type = definition[key];
                switch (type) {
                    case String:
                        if (not(isString(obj[key]))) {
                            console.error('object@' + key + ' does not implement ' + type + ':', obj);
                            return false;
                        }
                        break;
                    case Number:
                        if (not(isNumber(obj[key]))) {
                            console.error('object@' + key + ' does not implement ' + type + ':', obj);
                            return false
                        }
                        break;
                    default:
                        if (not(obj[key] instanceof type)) {
                            console.error('object@' + key + ' does not implement ' + type + ':', obj);
                            return false;
                        }
                        break;
                }
            }
        }
        return true;
    };

    /**
     * Inherit stuff from parent
     * @param child
     * @param parent
     */
    exports.inherit = function (child, parent) {
        child.prototype = Object.create(parent.prototype);
    };

    /**
     *
     * @param callbacks
     */
    exports.executeCallbacks = function (callbacks) {
        var args = null;
        if (arguments.length > 1) {
            args = Array.prototype.slice.call(arguments, 1, arguments.length);
        }
        var i = 0, L = callbacks.length;
        if (args == null) {
            for (; i < L; i++) {
                callbacks[i]();
            }
        } else {
            for (; i < L; i++) {
                callbacks[i].apply(this, args);
            }
        }
    };


})(typeof exports === 'undefined' ? this['yUtils'] = {} : exports);
},{}]},{},[2])(2)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImxpYi9kYXRhTG9hZGVyLmpzIiwibGliL2lzby5qcyIsImxpYi9tYXAuanMiLCJsaWIvdGlsZU1hbmFnZXIuanMiLCJub2RlX21vZHVsZXMvZnV0dXJlLWNhbGxiYWNrcy9saWIvZnV0dXJlLmpzIiwibm9kZV9tb2R1bGVzL3l1dGlscy95dXRpbHMuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCIvKipcbiAqIENyZWF0ZWQgYnkganVsaWFuIG9uIDQvMzAvMTUuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgVElNRU9VVCA9IDIwMDA7XG52YXIgRnV0dXJlID0gcmVxdWlyZSgnZnV0dXJlLWNhbGxiYWNrcycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqXG4gICAgICogQHBhcmFtIHVybFxuICAgICAqIEByZXR1cm5zIHtGaXRpcmV9XG4gICAgICovXG4gICAgbG9hZDogZnVuY3Rpb24gKHVybCkge1xuICAgICAgICB2YXIgZnV0dXJlID0gRnV0dXJlLmNyZWF0ZSgpO1xuICAgICAgICB2YXIgdGltZW91dFRocmVhZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgZnV0dXJlLmV4ZWNGYWlsdXJlKCk7XG4gICAgICAgIH0sIFRJTUVPVVQpO1xuXG4gICAgICAgIHZhciB4b2JqID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICAgIHhvYmoub25yZWFkeXN0YXRlY2hhbmdlID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgaWYgKHhvYmoucmVhZHlTdGF0ZSA9PSA0KSB7XG4gICAgICAgICAgICAgICAgY2xlYXJUaW1lb3V0KHRpbWVvdXRUaHJlYWQpO1xuICAgICAgICAgICAgICAgIGZ1dHVyZS5leGVjU3VjY2Vzcyh4b2JqLnJlc3BvbnNlVGV4dCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH07XG4gICAgICAgIHhvYmoub3BlbihcIkdFVFwiLCB1cmwsIHRydWUpO1xuICAgICAgICB4b2JqLnNlbmQobnVsbCk7XG4gICAgICAgIHJldHVybiBmdXR1cmU7XG4gICAgfVxuXG59OyIsIi8qKlxuICogQ3JlYXRlZCBieSBqdWxpYW4gb24gNC8zMC8xNS5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBEYXRhTG9hZGVyID0gcmVxdWlyZSgnLi9kYXRhTG9hZGVyLmpzJyk7XG52YXIgRnV0dXJlID0gcmVxdWlyZSgnZnV0dXJlLWNhbGxiYWNrcycpO1xudmFyIE1hcCA9IHJlcXVpcmUoXCIuL21hcC5qc1wiKTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG5cbiAgICBtYXA6IGZ1bmN0aW9uICh1cmwpIHtcbiAgICAgICAgdmFyIGZ1dHVyZSA9IEZ1dHVyZS5jcmVhdGUoKTtcbiAgICAgICAgRGF0YUxvYWRlci5sb2FkKHVybCkuc3VjY2VzcyhmdW5jdGlvbiAobWFwSlNPTikge1xuICAgICAgICAgICAgdmFyIG1hcCA9IG5ldyBNYXAoSlNPTi5wYXJzZShtYXBKU09OKSk7XG4gICAgICAgICAgICBmdXR1cmUuZXhlY1N1Y2Nlc3MobWFwKTtcbiAgICAgICAgfSkuZmFpbHVyZShmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICBmdXR1cmUuZXhlY0ZhaWx1cmUoKTtcbiAgICAgICAgfSk7XG4gICAgICAgIHJldHVybiBmdXR1cmU7XG4gICAgfVxuICAgIFxufTsiLCIvKipcbiAqIFRoaXMgaXMgdGhlIHJlcHJlc2VudGF0aW9uIG9mIGFuIGlzb21ldHJpYyBtYXA6XG4gKlxuICogVGhlIHJlbmRlcmluZyBvcmRlciBpczpcbiAqXG4gKlxuICogICAgICAvICAgIDAxICAgXFxcbiAqICAgICB5ICAgMDUgIDAyICAgeFxuICogICAvICAgMDkgIDA2ICAwMyAgIFxcXG4gKiAgICAgMTMgIDEwICAwNyAgMDRcbiAqICAgICAgIDE0ICAxMSAgMDhcbiAqICAgICAgICAgMTUgIDEyXG4gKiAgICAgICAgICAgMTZcbiAqXG4gKlxuICogICAgICAwMSAwMiAwMyAwNCAgICAgICAgICAgICAgICAgKDAsMCA9IHcvMiwwKVxuICogICAgICAwNSAwNiAwNyAwOCAgICAgKDEsMCA9IHcvMi10dyx0aCkgICAoMCwxID0gdy8yK3R3LHRoKVxuICogICAgICAwOSAxMCAxMSAxMlxuICogICAgICAxMyAxNCAxNSAxNlxuICpcbiAqXG4gKiBGdXJ0aGVybW9yZSwgdGhlaXIgaXMgYSBoZWlnaHQgbWFwIGZvciB0aGUgdGVycmFpbjpcbiAqXG4gKiAtMTI4IC0gIHZlcnkgbG93XG4gKiAgMCAgIC0gIFNlYSBsZXZlbFxuICogIDEyNyAtICBtb3VudGFpblxuICpcbiAqXG4gKiBhbmQgYSB0eXBlIGRlZmluaXRpb246XG4gKlxuICogQ3JlYXRlZCBieSBqdWxpYW4gb24gNC8zMC8xNS5cbiAqL1xuXCJ1c2Ugc3RyaWN0XCI7XG5cbnZhciBUaWxlTWFuYWdlciA9IHJlcXVpcmUoXCIuL3RpbGVNYW5hZ2VyLmpzXCIpO1xuXG5cbmZ1bmN0aW9uIE1hcChqc29uKSB7XG4gICAgaWYgKFwidGlsZVNpemVcIiBpbiBqc29uICYmIFwid1wiIGluIGpzb24gJiYgXCJoXCIgaW4ganNvbiAmJiBcInR5cGVcIiBpbiBqc29uICYmIFwiaGVpZ2h0XCIgaW4ganNvbikge1xuXG4gICAgICAgIHRoaXMudyA9IGpzb24udztcbiAgICAgICAgdGhpcy5oID0ganNvbi5oO1xuXG4gICAgICAgIHRoaXMudGlsZVNpemUgPSBqc29uLnRpbGVTaXplO1xuXG4gICAgICAgIHZhciB3ID0gdGhpcy53O1xuXG4gICAgICAgIHZhciB0eXBlID0ganNvbi50eXBlO1xuICAgICAgICB2YXIgaGVpZ2h0ID0ganNvbi5oZWlnaHQ7XG5cbiAgICAgICAgdGhpcy50aWxlcyA9IFRpbGVNYW5hZ2VyLmdlbmVyYXRlKHRoaXMudGlsZVNpemUpO1xuXG4gICAgICAgIHRoaXMudHlwZU1hdHJpeCA9IG5ldyBJbnQzMkFycmF5KHRoaXMudyAqIHRoaXMuaCk7XG4gICAgICAgIHRoaXMuaGVpZ2h0TWF0cml4ID0gbmV3IEludDMyQXJyYXkodGhpcy53ICogdGhpcy5oKTtcblxuICAgICAgICAvLyAoMiwxKVxuICAgICAgICAvLyAxICAgMiAgIDMgICA0XG4gICAgICAgIC8vIDUgICA2ICAoNykgIDhcbiAgICAgICAgLy9cbiAgICAgICAgLy8gLS0+IDEgMiAzIDQgNSA2ICg3KSA4XG4gICAgICAgIC8vIHcgKiB5ICsgeFxuXG4gICAgICAgIHZhciB4ID0gLTEsIHkgPSAwLCBwb3MgPSAtMTtcbiAgICAgICAgZm9yICg7IHkgPCB0aGlzLmg7IHkrKykge1xuICAgICAgICAgICAgeCA9IDA7XG4gICAgICAgICAgICBmb3IgKDsgeCA8IHc7IHgrKykge1xuICAgICAgICAgICAgICAgIHBvcyA9IHcgKiB5ICsgeDtcbiAgICAgICAgICAgICAgICB0aGlzLnR5cGVNYXRyaXhbcG9zXSA9IHR5cGVbeV1beF07XG4gICAgICAgICAgICAgICAgdGhpcy5oZWlnaHRNYXRyaXhbcG9zXSA9IGhlaWdodFt5XVt4XTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIm1hbGZvcm1lZCBKU09OIGZvciBNYXAgY3JlYXRpb25cIik7XG4gICAgfVxuXG5cbn1cblxuLyoqXG4gKiBPbmx5IGZvciB0ZXN0cywgYmV0dGVyIGlubGluZSB0aGlzIGZvciBwZXJmb3JtYW5jZSFcbiAqIEBwYXJhbSB4XG4gKiBAcGFyYW0geVxuICogQHJldHVybnMgeyp9XG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0SGVpZ2h0QXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLmhlaWdodE1hdHJpeFt0aGlzLncgKiB5ICsgeF07XG59O1xuXG4vKipcbiAqIE9ubHkgZm9yIHRlc3RzLCBiZXR0ZXIgaW5saW5lIHRoaXMgZm9yIHBlcmZvcm1hbmNlIVxuICogQHBhcmFtIHhcbiAqIEBwYXJhbSB5XG4gKiBAcmV0dXJucyB7Kn1cbiAqL1xuTWFwLnByb3RvdHlwZS5nZXRUeXBlQXQgPSBmdW5jdGlvbiAoeCwgeSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVNYXRyaXhbdGhpcy53ICogeSArIHhdO1xufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJTlRFUkZBQ0UgSU1QTFxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG5cbi8qKlxuICogSU5URVJGQUNFIElNUExFTUVOVEFUSU9OXG4gKiBAcmV0dXJucyB7QXJyYXl9XG4gKi9cbk1hcC5wcm90b3R5cGUuZ2V0UmVuZGVySXRlbXMgPSBmdW5jdGlvbiAoKSB7XG4gICAgcmV0dXJuIFtdO1xufTtcblxuLyoqXG4gKiBJTlRFUkZBQ0UgSU1QTEVNRU5UQVRJT05cbiAqIEBwYXJhbSBjb250ZXh0IHtDYW52YXMyRCBDb250ZXh0fVxuICogQHBhcmFtIGNhbWVyYVgge051bWJlcn1cbiAqIEBwYXJhbSBjYW1lcmFZIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRXIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRIIHtOdW1iZXJ9XG4gKi9cbk1hcC5wcm90b3R5cGUucmVuZGVyRnJvbnQgPSBmdW5jdGlvbiAoY29udGV4dCwgY2FtZXJhWCwgY2FtZXJhWSwgdmlld3BvcnRXLCB2aWV3cG9ydEgpIHtcblxufTtcblxuLyoqXG4gKiBJTlRFUkZBQ0UgSU1QTEVNRU5UQVRJT05cbiAqIEBwYXJhbSBjb250ZXh0IHtDYW52YXMyRCBDb250ZXh0fVxuICogQHBhcmFtIGNhbWVyYVgge051bWJlcn1cbiAqIEBwYXJhbSBjYW1lcmFZIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRXIHtOdW1iZXJ9XG4gKiBAcGFyYW0gdmlld3BvcnRIIHtOdW1iZXJ9XG4gKi9cbk1hcC5wcm90b3R5cGUucmVuZGVyQmFjayA9IGZ1bmN0aW9uIChjb250ZXh0LCBjYW1lcmFYLCBjYW1lcmFZLCB2aWV3cG9ydFcsIHZpZXdwb3J0SCkge1xuXG4gICAgdmFyIFRJTEVfU0laRSA9IHRoaXMudGlsZVNpemU7XG4gICAgdmFyIHcgPSB0aGlzLnc7XG4gICAgdmFyIGggPSB0aGlzLmg7XG4gICAgdmFyIHR5cGVNYXRyaXggPSB0aGlzLnR5cGVNYXRyaXg7XG4gICAgdmFyIGhlaWdodE1hdHJpeCA9IHRoaXMuaGVpZ2h0TWF0cml4O1xuICAgIHZhciB0eCA9IE1hdGguY2VpbChUSUxFX1NJWkUvMik7XG4gICAgdmFyIHR5ID0gTWF0aC5jZWlsKFRJTEVfU0laRSAvIDQpO1xuICAgIHZhciB0aWxlcyA9IHRoaXMudGlsZXM7XG5cbiAgICB2YXIgbWF4WCA9IHR4ICogdztcbiAgICB2YXIgZHggPSBtYXhYICsgTWF0aC5jZWlsKG1heFgvMik7XG4gICAgdmFyIGR5ID0gMDtcblxuICAgIHZhciBzdGFydFggPSBNYXRoLmZsb29yKGNhbWVyYVggLyBUSUxFX1NJWkUpO1xuXG4gICAgdmFyIHkgPSAwLCB4ID0gLTEsIHBvcyA9IC0xO1xuICAgIHZhciBjdiwgaGVpZ2h0O1xuICAgIGZvciAoOyB5IDwgaDsgeSsrKSB7XG4gICAgICAgIHggPSAwO1xuICAgICAgICBkeSA9IHR5ICogeTtcbiAgICAgICAgZHggPSBkeCAtIG1heFggLSB0eDtcblxuICAgICAgICBmb3IgKDsgeCA8IHc7IHgrKykge1xuICAgICAgICAgICAgcG9zID0gdyAqIHkgKyB4O1xuICAgICAgICAgICAgY3YgPSB0aWxlc1t0eXBlTWF0cml4W3Bvc11dO1xuXG4gICAgICAgICAgICBoZWlnaHQgPSBoZWlnaHRNYXRyaXhbcG9zXTtcblxuICAgICAgICAgICAgY29udGV4dC5kcmF3SW1hZ2UoY3YsIGR4LCBkeSAtIGhlaWdodCk7XG5cbiAgICAgICAgICAgIGR4ICs9IHR4O1xuICAgICAgICAgICAgZHkgKz0gdHk7XG5cbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vY29uc29sZS5sb2coXCJ4OlwiICsgbWluWCArIFwiIHk6XCIgKyBtaW5ZKTtcblxufTtcblxuLy8gPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XG4vLyBJTlRFUkZBQ0UgSU1QTCBFTkRcbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuXG5cbi8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxuLy8gSEVMUEVSXG4vLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cblxuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcDsiLCIvKipcbiAqIENyZWF0ZWQgYnkganVsaWFuIG9uIDQvMzAvMTUuXG4gKi9cblwidXNlIHN0cmljdFwiO1xuXG52YXIgVXRpbHMgPSByZXF1aXJlKCd5dXRpbHMnKTtcblxudmFyIFRJTEVfVFlQRV9DT1VOVCA9IDEwO1xuXG5mdW5jdGlvbiBjcmVhdGVDYW52YXMoc2l6ZSwgY29sb3IpIHtcbiAgICB2YXIgU0laRV9GQUMgPSA1O1xuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiY2FudmFzXCIpO1xuICAgIGNhbnZhcy53aWR0aCA9IHNpemU7XG4gICAgLy9jYW52YXMuaGVpZ2h0ID0gTWF0aC5mbG9vcihzaXplLzIpO1xuICAgIGNhbnZhcy5oZWlnaHQgPSBzaXplICogU0laRV9GQUM7XG4gICAgdmFyIGNvbnRleHQgPSBjYW52YXMuZ2V0Q29udGV4dChcIjJkXCIpO1xuXG4gICAgY29udGV4dC5saW5lV2lkdGggPSAxO1xuICAgIGNvbnRleHQuc3Ryb2tlU3R5bGUgPSBcInJnYigyNTAsMjUwLDI1MClcIjtcbiAgICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuXG4gICAgdmFyIHhfMiA9IE1hdGguZmxvb3Ioc2l6ZS8yKTtcbiAgICB2YXIgeV8yID0gTWF0aC5mbG9vcihzaXplLzQpO1xuICAgIHZhciB4bCA9IDA7XG4gICAgdmFyIHhyID0gc2l6ZTtcbiAgICB2YXIgeWIgPSBNYXRoLmZsb29yKHNpemUvMik7XG4gICAgdmFyIHl0ID0gMDtcblxuXG4gICAgLy8gcmVuZGVyIGdyb3VuZFxuICAgIC8qXG4gICAgdmFyIHJlcyA9IDEyO1xuICAgIHZhciBneCA9IDAsIGd5ID0geV8yLCBkaXJ0U2l6ZSA9IE1hdGguY2VpbChzaXplL3Jlcyk7XG4gICAgdmFyIHkgPSAwLCB4O1xuICAgIGZvciAoOyBneSA8IHNpemUgKiAyOyBneSArPSBkaXJ0U2l6ZSkge1xuICAgICAgICB4ID0gMDtcbiAgICAgICAgZm9yICg7IHggPCBzaXplOyB4ICs9IHJlcykge1xuICAgICAgICAgICAgY29udGV4dC5maWxsU3R5bGUgPSBcInJnYihcIiArIFV0aWxzLmdldFJhbmRvbUludCgxMzUsIDI1NSkgKyBcIixcIlxuICAgICAgICAgICAgICAgICsgVXRpbHMuZ2V0UmFuZG9tSW50KDEwNSwyMTEpICsgXCIsXCIgK1xuICAgICAgICAgICAgICAgIFV0aWxzLmdldFJhbmRvbUludCgxOSwxNDApICsgXCIpXCI7XG4gICAgICAgICAgICBjb250ZXh0LmZpbGxSZWN0KHgseSxyZXMsIHJlcyk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgKi9cbiAgICBjb250ZXh0LmZpbGxTdHlsZSA9IFwicmdiKDEzOSw5MCw0MylcIjtcbiAgICBjb250ZXh0LmZpbGxSZWN0KDAsIHlfMiwgeF8yLCBzaXplICogU0laRV9GQUMpO1xuXG4gICAgY29udGV4dC5maWxsU3R5bGUgPSBcInJnYigyMDUsMTMzLDYzKVwiO1xuICAgIGNvbnRleHQuZmlsbFJlY3QoeF8yLCB5XzIsIHhfMiwgc2l6ZSAqIFNJWkVfRkFDKTtcblxuICAgIC8vIHJlbmRlciByZWFsIHN0dWZmXG4gICAgY29udGV4dC5maWxsU3R5bGUgPSBjb2xvcjtcbiAgICBjb250ZXh0Lm1vdmVUbyh4XzIsIHl0KTtcbiAgICBjb250ZXh0LmxpbmVUbyh4ciwgeV8yKTtcbiAgICBjb250ZXh0LmxpbmVUbyh4XzIsIHliKTtcbiAgICBjb250ZXh0LmxpbmVUbyh4bCwgeV8yKTtcbiAgICBjb250ZXh0LmxpbmVUbyh4XzIsIHl0KTtcbiAgICBjb250ZXh0LmNsb3NlUGF0aCgpO1xuICAgIGNvbnRleHQuZmlsbCgpO1xuXG5cbiAgICByZXR1cm4ge2NhbnZhczogY2FudmFzLCBjb250ZXh0OiBjb250ZXh0fTtcbn1cblxuLyoqXG4gKiBEZWZpbmVzIHRoZSB0aWxlc1xuICovXG5tb2R1bGUuZXhwb3J0cyA9IHtcblxuICAgIC8qKlxuICAgICAqIGlzbyB3aXRoIGFuZCBoZWlnaHQgb2YgdGhlIHRpbGVzXG4gICAgICogQHBhcmFtIHdcbiAgICAgKiBAcGFyYW0gaFxuICAgICAqL1xuICAgIGdlbmVyYXRlOiBmdW5jdGlvbihzaXplKSB7XG4gICAgICAgIHZhciByZXN1bHQgPSBbXTsgLy8gYWNjZXNzIHZpYSBpZFxuXG4gICAgICAgIC8vIEdSQVNTMVxuICAgICAgICB2YXIgZ3Jhc3MgPSBjcmVhdGVDYW52YXMoc2l6ZSwgXCJyZ2IoMTAyLDIwNCwwKVwiKTtcbiAgICAgICAgcmVzdWx0LnB1c2goZ3Jhc3MuY2FudmFzKTtcblxuICAgICAgICAvLyBHUkFTUzJcbiAgICAgICAgZ3Jhc3MgPSBjcmVhdGVDYW52YXMoc2l6ZSwgXCJyZ2IoMTIyLDIwNCwwKVwiKTtcbiAgICAgICAgcmVzdWx0LnB1c2goZ3Jhc3MuY2FudmFzKTtcblxuICAgICAgICAvLyBHUkFTUzNcbiAgICAgICAgZ3Jhc3MgPSBjcmVhdGVDYW52YXMoc2l6ZSwgXCJyZ2IoMTAyLDIzNCwwKVwiKTtcbiAgICAgICAgcmVzdWx0LnB1c2goZ3Jhc3MuY2FudmFzKTtcblxuICAgICAgICAvLyBHUkFTUzRcbiAgICAgICAgZ3Jhc3MgPSBjcmVhdGVDYW52YXMoc2l6ZSwgXCJyZ2IoODksMjM0LDIzKVwiKTtcbiAgICAgICAgcmVzdWx0LnB1c2goZ3Jhc3MuY2FudmFzKTtcblxuICAgICAgICAvLyBHUkFTUzVcbiAgICAgICAgZ3Jhc3MgPSBjcmVhdGVDYW52YXMoc2l6ZSwgXCJyZ2IoMTIxLDIzNCwyMylcIik7XG4gICAgICAgIHJlc3VsdC5wdXNoKGdyYXNzLmNhbnZhcyk7XG5cbiAgICAgICAgLy8gR1JBU1M2XG4gICAgICAgIGdyYXNzID0gY3JlYXRlQ2FudmFzKHNpemUsIFwicmdiKDI1MCwyLDIzKVwiKTtcbiAgICAgICAgcmVzdWx0LnB1c2goZ3Jhc3MuY2FudmFzKTtcblxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH1cblxuXG59OyIsIi8qKlxyXG4gKiBDcmVhdGVkIGJ5IEp1bGlhbiBvbiAzLzEvMjAxNS5cclxuICovXHJcbmZ1bmN0aW9uIEZ1dHVyZShvYmosIG1heENvdW50LCB0aW1lb3V0KSB7XHJcbiAgICB0aGlzLm9iaiA9IHR5cGVvZiBvYmogPT09IFwidW5kZWZpbmVkXCIgPyB7fSA6IG9iajtcclxuICAgIHRoaXMuc3VjY2Vzc0hhbmRsZXIgPSBudWxsO1xyXG4gICAgdGhpcy5mYWlsdXJlSGFuZGxlciA9IG51bGw7XHJcbiAgICB0aGlzLmZpbmFsbHlIYW5kbGVyID0gbnVsbDtcclxuICAgIHRoaXMuZmluYWxseUNvdW50ID0gMDtcclxuICAgIHRoaXMudGltZW91dCA9IDA7XHJcbiAgICBpZiAodHlwZW9mIG1heENvdW50ICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIGlmICh0eXBlb2YgdGltZW91dCA9PT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCd0aW1lb3V0IG11c3QgYmUgZGVmaW5lZCEnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy50aW1lb3V0ID0gdGltZW91dDtcclxuICAgICAgICB0aGlzLm1heENvdW50ID0gbWF4Q291bnQ7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIHRoaXMubWF4Q291bnQgPSAxO1xyXG4gICAgfVxyXG4gICAgdGhpcy50aW1lb3V0VGhyZWFkID0gbnVsbDtcclxufTtcclxuXHJcbkZ1dHVyZS5wcm90b3R5cGUuZXhlY1N1Y2Nlc3MgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcclxuICAgIGlmICh0aGlzLnN1Y2Nlc3NIYW5kbGVyID09PSBudWxsKSB7XHJcbiAgICAgICAgLy8gZGVsZWdhdGUgYSBzZWNvbmQgdHJ5XHJcbiAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGlmIChzZWxmLnN1Y2Nlc3NIYW5kbGVyID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJzdWNjZXNzIG9uIGZ1bmN0aW9uIHdpdGggbm8gc3VjY2VzcyBoYW5kbGVyXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZXhlY3V0ZShzZWxmLCBcInN1Y2Nlc3NIYW5kbGVyXCIsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMSk7IC8vIE5FWFQgRVhFQ1VUSU9OXHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGV4ZWN1dGUodGhpcywgXCJzdWNjZXNzSGFuZGxlclwiLCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuZnVuY3Rpb24gZXhlY3V0ZShmdXR1cmUsIGhhbmRsZXJOYW1lLCBhcmdzKSB7XHJcbiAgICBmdXR1cmUuZmluYWxseUNvdW50ICs9IDE7XHJcbiAgICBmdXR1cmVbaGFuZGxlck5hbWVdLmFwcGx5KGZ1dHVyZS5vYmosIGFyZ3MpO1xyXG4gICAgaWYgKGZ1dHVyZS5maW5hbGx5Q291bnQgPT09IGZ1dHVyZS5tYXhDb3VudCAmJiBmdXR1cmUuZmluYWxseUhhbmRsZXIgIT09IG51bGwpIHtcclxuICAgICAgICBjbGVhckludGVydmFsKGZ1dHVyZS50aW1lb3V0VGhyZWFkKTtcclxuICAgICAgICBmdXR1cmUuZmluYWxseUhhbmRsZXIuY2FsbChmdXR1cmUub2JqKTtcclxuICAgICAgICBmdXR1cmUuc3VjY2Vzc0hhbmRsZXIgPSBudWxsO1xyXG4gICAgICAgIGZ1dHVyZS5mYWlsdXJlSGFuZGxlciA9IG51bGw7XHJcbiAgICB9XHJcbn1cclxuXHJcbkZ1dHVyZS5wcm90b3R5cGUuZXhlY0ZhaWx1cmUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cztcclxuICAgIGlmICh0aGlzLmZhaWx1cmVIYW5kbGVyID09IG51bGwpIHtcclxuICAgICAgICAvLyBkZWxlZ2F0ZSBhIHNlY29uZCB0cnlcclxuICAgICAgICBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKHNlbGYuZmFpbHVyZUhhbmRsZXIgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInVuaGFuZGxlZCBmYWlsdXJlXCIpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZXhlY3V0ZSh0aGlzLCBcImZhaWx1cmVIYW5kbGVyXCIsIGFyZ3MpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSwgMSk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAgIGV4ZWN1dGUodGhpcywgXCJmYWlsdXJlSGFuZGxlclwiLCBhcmd1bWVudHMpO1xyXG4gICAgfVxyXG59O1xyXG5cclxuRnV0dXJlLnByb3RvdHlwZS5zdWNjZXNzID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICBpZiAodGhpcy5zdWNjZXNzSGFuZGxlciA9PSBudWxsKSB7XHJcbiAgICAgICAgdGhpcy5zdWNjZXNzSGFuZGxlciA9IGNhbGxiYWNrO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMaXN0ZW5lciBpcyBhbHJlYWR5IHNldCFcIik7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdGhpcztcclxufTtcclxuXHJcbkZ1dHVyZS5wcm90b3R5cGUuZmFpbHVyZSA9IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgaWYgKHRoaXMuZmFpbHVyZUhhbmRsZXIgPT0gbnVsbCkge1xyXG4gICAgICAgIHRoaXMuZmFpbHVyZUhhbmRsZXIgPSBjYWxsYmFjaztcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTGlzdGVuZXIgaXMgYWxyZWFkeSBzZXQhXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRoaXM7XHJcbn07XHJcblxyXG5GdXR1cmUucHJvdG90eXBlLmZpbmFsbHkgPSBmdW5jdGlvbiAoYSwgYiwgYykge1xyXG4gICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgaWYgKHRoaXMuZmluYWxseUhhbmRsZXIgIT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihcIkxpc3RlbmVyIGlzIGFscmVhZHkgc2V0IVwiKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgICAgaWYgKGlzRnVuY3Rpb24oYSkpIHtcclxuICAgICAgICAgICAgdGhpcy5maW5hbGx5SGFuZGxlciA9IGE7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRpbWVvdXQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVvdXRUaHJlYWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgICAgICBzZWxmLmZpbmFsbHlIYW5kbGVyLmNhbGwoc2VsZi5vYmopO1xyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy50aW1lb3V0KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9IGVsc2UgaWYgKGlzTnVtYmVyKGEpICYmIGEgPiAwKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4Q291bnQgPSBhO1xyXG4gICAgICAgICAgICBpZiAoaXNOdW1iZXIoYikpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZW91dFRocmVhZCA9IHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYuZmluYWxseUhhbmRsZXIuY2FsbChzZWxmLm9iaik7XHJcbiAgICAgICAgICAgICAgICB9LCBiKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcInRpbWVvdXQgcGFyYW1ldGVyIGlzIG1pc3NpbmchXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpc0Z1bmN0aW9uKGMpKSB7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmZpbmFsbHlIYW5kbGVyID0gYztcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNsZWFyVGltZW91dCh0aGlzLnRpbWVvdXRUaHJlYWQpO1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiY2FsbGJhY2sgbXVzdCBiZSBhIGZ1bmN0aW9uIVwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcImZpcnN0IHBhcmFtIG11c3QgYmUgbnVtYmVyIG9yIGZ1bmN0aW9uIVwiKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn07XHJcblxyXG5mdW5jdGlvbiBpc051bWJlcihuKSB7XHJcbiAgICByZXR1cm4gIWlzTmFOKHBhcnNlRmxvYXQobikpICYmIGlzRmluaXRlKG4pO1xyXG59XHJcblxyXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGZ1bmN0aW9uVG9DaGVjaykge1xyXG4gICAgdmFyIGdldFR5cGUgPSB7fTtcclxuICAgIHJldHVybiBmdW5jdGlvblRvQ2hlY2sgJiYgZ2V0VHlwZS50b1N0cmluZy5jYWxsKGZ1bmN0aW9uVG9DaGVjaykgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XHJcbn1cclxuXHJcbm1vZHVsZS5leHBvcnRzLmNyZWF0ZSA9IGZ1bmN0aW9uIChvYmosIGksIHQpIHtcclxuICAgIHJldHVybiBuZXcgRnV0dXJlKG9iaiwgaSwgdCk7XHJcbn07IiwiLyoqXG4gKiBDcmVhdGVkIGJ5IEp1bGlhbiBvbiAxMi8xMC8yMDE0LlxuICovXG4oZnVuY3Rpb24gKGV4cG9ydHMpIHtcblxuICAgIC8vIHBlcmZvcm1hbmNlLm5vdyBwb2x5ZmlsbFxuICAgIHZhciBwZXJmID0gbnVsbDtcbiAgICBpZiAodHlwZW9mIHBlcmZvcm1hbmNlID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICBwZXJmID0ge307XG4gICAgfSBlbHNlIHtcbiAgICAgICAgcGVyZiA9IHBlcmZvcm1hbmNlO1xuICAgIH1cblxuICAgIHBlcmYubm93ID0gcGVyZi5ub3cgfHwgcGVyZi5tb3pOb3cgfHwgcGVyZi5tc05vdyB8fCBwZXJmLm9Ob3cgfHwgcGVyZi53ZWJraXROb3cgfHwgRGF0ZS5ub3cgfHxcbiAgICAgICAgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xuICAgICAgICB9O1xuXG4gICAgZnVuY3Rpb24gc3dhcChhcnJheSwgaSwgaikge1xuICAgICAgICBpZiAoaSAhPT0gaikge1xuICAgICAgICAgICAgdmFyIHRlbXAgPSBhcnJheVtpXTtcbiAgICAgICAgICAgIGFycmF5W2ldID0gYXJyYXlbal07XG4gICAgICAgICAgICBhcnJheVtqXSA9IHRlbXA7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvKlxuICAgICB+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+fn5+flxuICAgICAqL1xuXG4gICAgdmFyIGdldFJhbmRvbUludCA9IGV4cG9ydHMuZ2V0UmFuZG9tSW50ID0gZnVuY3Rpb24gKG1pbiwgbWF4KSB7XG4gICAgICAgIGlmIChtaW4gPiBtYXgpIHRocm93IG5ldyBFcnJvcihcIm1pbiBtdXN0IGJlIHNtYWxsZXIgdGhhbiBtYXghIHtcIiArIG1pbiArIFwiPlwiICsgbWF4ICsgXCJ9XCIpO1xuICAgICAgICByZXR1cm4gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKG1heCAtIG1pbiArIDEpKSArIG1pbjtcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5zYW1wbGUgPSBmdW5jdGlvbiAobGlzdCwgbikge1xuICAgICAgICB2YXIgcmVzdWx0ID0gW10sIGosIGkgPSAwLCBMID0gbiA+IGxpc3QubGVuZ3RoID8gbGlzdC5sZW5ndGggOiBuLCBzID0gbGlzdC5sZW5ndGggLSAxO1xuICAgICAgICBmb3IgKDsgaSA8IEw7IGkrKykge1xuICAgICAgICAgICAgaiA9IGdldFJhbmRvbUludChpLCBzKTtcbiAgICAgICAgICAgIHN3YXAobGlzdCwgaSwgaik7XG4gICAgICAgICAgICByZXN1bHQucHVzaChsaXN0W2ldKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gcmVzdWx0O1xuICAgIH07XG5cbiAgICB2YXIgaXNTdHJpbmcgPSBleHBvcnRzLmlzU3RyaW5nID0gZnVuY3Rpb24gKG15VmFyKSB7XG4gICAgICAgIHJldHVybiAodHlwZW9mIG15VmFyID09PSAnc3RyaW5nJyB8fCBteVZhciBpbnN0YW5jZW9mIFN0cmluZylcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5hc3NlcnRMZW5ndGggPSBmdW5jdGlvbiAoYXJnLCBuYnIpIHtcbiAgICAgICAgaWYgKGFyZy5sZW5ndGggPT09IG5icikgcmV0dXJuIHRydWU7XG4gICAgICAgIGVsc2UgdGhyb3cgbmV3IEVycm9yKFwiV3JvbmcgbnVtYmVyIG9mIGFyZ3VtZW50czogZXhwZWN0ZWQ6XCIgKyBuYnIgKyBcIiwgYnV0IGdvdDogXCIgKyBhcmcubGVuZ3RoKTtcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5ndWlkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgZCA9IHBlcmYubm93KCk7XG4gICAgICAgIHZhciBndWlkID0gJ3h4eHh4eHh4LXh4eHgtNHh4eC15eHh4LXh4eHh4eHh4eHh4eCcucmVwbGFjZSgvW3h5XS9nLCBmdW5jdGlvbiAoYykge1xuICAgICAgICAgICAgdmFyIHIgPSAoZCArIE1hdGgucmFuZG9tKCkgKiAxNikgJSAxNiB8IDA7XG4gICAgICAgICAgICBkID0gTWF0aC5mbG9vcihkIC8gMTYpO1xuICAgICAgICAgICAgcmV0dXJuIChjID09PSAneCcgPyByIDogKHIgJiAweDMgfCAweDgpKS50b1N0cmluZygxNik7XG4gICAgICAgIH0pO1xuICAgICAgICByZXR1cm4gZ3VpZDtcbiAgICB9O1xuXG4gICAgZXhwb3J0cy50aW1lRGlmZmVyZW5jZUluTXMgPSBmdW5jdGlvbiAodHNBLCB0c0IpIHtcbiAgICAgICAgaWYgKHRzQSBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIHRzQSA9IHRzQS5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKHRzQiBpbnN0YW5jZW9mIERhdGUpIHtcbiAgICAgICAgICAgIHRzQiA9IHRzQi5nZXRUaW1lKCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIE1hdGguYWJzKHRzQSAtIHRzQik7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIG1pbGxpc2Vjb25kcyB0byBzZWNvbmRzXG4gICAgICogQHBhcmFtIG1zIHtOdW1iZXJ9IE1pbGxpc1xuICAgICAqL1xuICAgIGV4cG9ydHMubXNUb1MgPSBmdW5jdGlvbiAobXMpIHtcbiAgICAgICAgcmV0dXJuIG1zIC8gMTAwMDtcbiAgICB9O1xuXG4gICAgZXhwb3J0cy5pc0RlZmluZWQgPSBmdW5jdGlvbiAobykge1xuICAgICAgICBpZiAobyA9PT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgICAgICBpZiAodHlwZW9mIG8gPT09IFwidW5kZWZpbmVkXCIpIHJldHVybiBmYWxzZTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIFNoYWxsb3cgY2xvbmVcbiAgICAgKiBAcGFyYW0gbGlzdFxuICAgICAqIEByZXR1cm5zIHtBcnJheXxzdHJpbmd8QmxvYn1cbiAgICAgKi9cbiAgICBleHBvcnRzLmNsb25lQXJyYXkgPSBmdW5jdGlvbiAobGlzdCkge1xuICAgICAgICByZXR1cm4gbGlzdC5zbGljZSgwKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogcmVtb3ZlcyB0aGUgaXRlbSBhdCB0aGUgcG9zaXRpb24gYW5kIHJlaW5kZXhlcyB0aGUgbGlzdFxuICAgICAqIEBwYXJhbSBsaXN0XG4gICAgICogQHBhcmFtIGlcbiAgICAgKiBAcmV0dXJucyB7Kn1cbiAgICAgKi9cbiAgICBleHBvcnRzLmRlbGV0ZVBvc2l0aW9uID0gZnVuY3Rpb24gKGxpc3QsIGkpIHtcbiAgICAgICAgaWYgKGkgPCAwIHx8IGkgPj0gbGlzdC5sZW5ndGgpIHRocm93IG5ldyBFcnJvcihcIk91dCBvZiBib3VuZHNcIik7XG4gICAgICAgIGxpc3Quc3BsaWNlKGksIDEpO1xuICAgICAgICByZXR1cm4gbGlzdDtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIHdlYXRoZXIgdGhlIHRoZSBvYmplY3QgaW1wbGVtZW50cyB0aGUgZnVsbCBpbnRlcmZhY2Ugb3Igbm90XG4gICAgICogQHBhcmFtIG8ge09iamVjdH1cbiAgICAgKi9cbiAgICB2YXIgaW1wbGVtZW50cyA9IGV4cG9ydHMuaW1wbGVtZW50cyA9IGZ1bmN0aW9uIChvLCBhKSB7XG4gICAgICAgIGlmIChBcnJheS5pc0FycmF5KGEpKSB7XG4gICAgICAgICAgICByZXR1cm4gaW1wbGVtZW50cy5hcHBseSh7fSwgW29dLmNvbmNhdChhKSk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGkgPSAxLCBtZXRob2ROYW1lO1xuICAgICAgICB3aGlsZSAoKG1ldGhvZE5hbWUgPSBhcmd1bWVudHNbaSsrXSkpIHtcbiAgICAgICAgICAgIGlmICh0eXBlb2Ygb1ttZXRob2ROYW1lXSAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG5cbiAgICB2YXIgaXNOdW1iZXIgPSBleHBvcnRzLmlzTnVtYmVyID0gZnVuY3Rpb24gKG8pIHtcbiAgICAgICAgaWYgKGlzU3RyaW5nKG8pKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIHJldHVybiAhaXNOYU4obyAtIDApICYmIG8gIT09IG51bGwgJiYgdHlwZW9mIG8gIT09ICd1bmRlZmluZWQnICYmIG8gIT09IGZhbHNlO1xuICAgIH07XG5cbiAgICBmdW5jdGlvbiBub3QobCkge1xuICAgICAgICByZXR1cm4gIWw7XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogQ2hlY2tzIGlmIHRoZSBvYmplY3QgZXF1YWxzIHRoZSBkZWZpbml0aW9uXG4gICAgICogQHBhcmFtIG9iaiB7T2JqZWN0fVxuICAgICAqIEBwYXJhbSBkZWZpbml0aW9uIHtPYmplY3R9IHtcbiAgICAgKiAgICAgICdrZXkxJzogU3RyaW5nLFxuICAgICAqICAgICAgJ2tleTInOiBBbnlDbGFzcyxcbiAgICAgKiAgICAgICdrZXkzJzogTnVtYmVyXG4gICAgICpcbiAgICAgKiB9XG4gICAgICogQHJldHVybnMge2Jvb2xlYW59XG4gICAgICovXG4gICAgdmFyIGRlZmluZXMgPSBleHBvcnRzLmRlZmluZXMgPSBmdW5jdGlvbiAob2JqLCBkZWZpbml0aW9uKSB7XG4gICAgICAgIHZhciBrZXkgPSBudWxsLCB0eXBlLCBpID0gMCwgTDtcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqKSkge1xuICAgICAgICAgICAgTCA9IG9iai5sZW5ndGg7XG4gICAgICAgICAgICBmb3IgKDtpPEw7aSsrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFkZWZpbmVzKG9ialtpXSwgZGVmaW5pdGlvbikpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoa2V5IGluIGRlZmluaXRpb24pIHtcbiAgICAgICAgICAgICAgICB0eXBlID0gZGVmaW5pdGlvbltrZXldO1xuICAgICAgICAgICAgICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgICAgICAgICAgICAgICBjYXNlIFN0cmluZzpcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChub3QoaXNTdHJpbmcob2JqW2tleV0pKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ29iamVjdEAnICsga2V5ICsgJyBkb2VzIG5vdCBpbXBsZW1lbnQgJyArIHR5cGUgKyAnOicsIG9iaik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgICAgICAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vdChpc051bWJlcihvYmpba2V5XSkpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignb2JqZWN0QCcgKyBrZXkgKyAnIGRvZXMgbm90IGltcGxlbWVudCAnICsgdHlwZSArICc6Jywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2VcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5vdChvYmpba2V5XSBpbnN0YW5jZW9mIHR5cGUpKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignb2JqZWN0QCcgKyBrZXkgKyAnIGRvZXMgbm90IGltcGxlbWVudCAnICsgdHlwZSArICc6Jywgb2JqKTtcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcblxuICAgIC8qKlxuICAgICAqIEluaGVyaXQgc3R1ZmYgZnJvbSBwYXJlbnRcbiAgICAgKiBAcGFyYW0gY2hpbGRcbiAgICAgKiBAcGFyYW0gcGFyZW50XG4gICAgICovXG4gICAgZXhwb3J0cy5pbmhlcml0ID0gZnVuY3Rpb24gKGNoaWxkLCBwYXJlbnQpIHtcbiAgICAgICAgY2hpbGQucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShwYXJlbnQucHJvdG90eXBlKTtcbiAgICB9O1xuXG4gICAgLyoqXG4gICAgICpcbiAgICAgKiBAcGFyYW0gY2FsbGJhY2tzXG4gICAgICovXG4gICAgZXhwb3J0cy5leGVjdXRlQ2FsbGJhY2tzID0gZnVuY3Rpb24gKGNhbGxiYWNrcykge1xuICAgICAgICB2YXIgYXJncyA9IG51bGw7XG4gICAgICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID4gMSkge1xuICAgICAgICAgICAgYXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSwgYXJndW1lbnRzLmxlbmd0aCk7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGkgPSAwLCBMID0gY2FsbGJhY2tzLmxlbmd0aDtcbiAgICAgICAgaWYgKGFyZ3MgPT0gbnVsbCkge1xuICAgICAgICAgICAgZm9yICg7IGkgPCBMOyBpKyspIHtcbiAgICAgICAgICAgICAgICBjYWxsYmFja3NbaV0oKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGZvciAoOyBpIDwgTDsgaSsrKSB7XG4gICAgICAgICAgICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfTtcblxuXG59KSh0eXBlb2YgZXhwb3J0cyA9PT0gJ3VuZGVmaW5lZCcgPyB0aGlzWyd5VXRpbHMnXSA9IHt9IDogZXhwb3J0cyk7Il19
