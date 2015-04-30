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