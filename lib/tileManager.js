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