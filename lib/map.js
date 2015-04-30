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