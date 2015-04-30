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