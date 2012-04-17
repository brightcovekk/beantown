/* 
 * Template-wide functionality
 */

// custom pipes for Markup.js
// see full documentation at https://github.com/adammark/Markup.js

// strip all non-digit characters from a telephone number (string)
Mark.pipes.tel = function (str) {
    return str.replace(/[^\d]/g, "");
};

// strip all <img> and <a> tags (and empty tags) from a string
Mark.pipes.grafs = function (str) {
    return str.replace(/<(img|a)[^<]+>/gi, "")
              .replace(/<\/a>/gi, "")
              .replace(/<\w+>\s*<\/\w+>/gi, "");
};

// generate a transcode url given img url, width, height, and max dimension
Mark.pipes.transcode = function (url, width, height) {
    var src = "http://transcode.appcloud.brightcove.com?image=" + url;

    if (parseInt(width)) {
        src += "&width=" + width;
    }

    if (parseInt(height)) {
        src += "&height=" + height;
    }

    src += "&quality=85";

    return src;
};

// add links to all urls in a string
Mark.pipes.linkify = function (str) {
    return str.replace(/\b(https?:[^\b\s]+)\b/g, "<a href=\"$1\">$1</a>");
};

// add links to all twitter names in a string
Mark.pipes.twittify = function (str) {
    return str.replace(/(@\w+)/g, "<a href=\"http://twitter.com/#!/$1\">$1</a>");
};

// get the playtime of a video in stopwatch notation (xx:xx). factor is 1 or 1000
Mark.pipes.playtime = function (time, factor) {
    factor = factor || 1;
    var m = Math.floor(time / (60 * factor));
    var s = Math.floor((time / factor) % 60);
    return m + ":" + ("00" + s).substr(-2);
};

// format a number as "1,234.56"
Mark.pipes.numformat = function (num) {
    num = num.toString();
    var i = num.indexOf(".") > -1 ? num.indexOf(".") : num.length;
    while ((i -= 3) > 0) {
        num = num.substr(0, i) + "," + num.substr(i);
    }
    return num;
};

// format a date (object, string or int)
// date codes: D l n m M F j d Y y
// time codes: g G i a A
// see http://php.net/manual/en/function.date.php
Mark.pipes.datetime = function (date, format) {
    date = new Date(+date || date);

    format = format || "l, F j, Y g:i a";

    var days = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday"
    ];

    var months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December"
    ];

    var G = date.getHours();
    var i = ("0" + date.getMinutes()).substr(-2);
    var l = days[date.getDay()];
    var F = months[date.getMonth()];
    var j = date.getDate();
    var Y = date.getFullYear();

    return format.replace(/[a-z]/gi, function (str) {
        return {
            "g": (G % 12) || 12,
            "G": G,
            "i": i,
            "a": G < 12 ? "a.m." : "p.m.",
            "A": G < 12 ? "A.M." : "P.M.",
            "D": l.substr(0, 3),
            "l": l,
            "n": date.getMonth() + 1,
            "m": ("0" + (date.getMonth() + 1)).substr(-2),
            "M": F.substr(0, 3),
            "F": F,
            "j": j,
            "d": ("0" + j).substr(-2),
            "Y": Y,
            "y": Y.toString().substr(-2)
        }[str];
    });
};

// convert a date to "... ago" notation
Mark.pipes.timeago = function (date) {
    date = new Date(+date || date);

    var result = "";
    var diff = new Date().getTime() - date.getTime();
    var h = Math.floor(diff / 3600000);
    var to_s = function (n, label) {
        n = Math.floor(n);
        return n + " " + label + (n > 1 ? "s" : "") + " ago";
    };

    if (h === 0) {
        h = Math.floor(diff / 60000);
        result = h < 2 ? "Just now" : to_s(h, "minute");
    } else if (h < 24) {
        result = to_s(h, "hour");
    } else if (h < 168) {
        result = to_s(h / 24, "day");
    } else if (h < 744) {
        result = to_s(h / 168, "week");
    } else {
        result = to_s(h / 744, "month");
    }

    return result;
};

// get the device pixel ratio (1 or 2)
Mark.includes.pxratio = function () {
    return String(window.devicePixelRatio || 1);
};
