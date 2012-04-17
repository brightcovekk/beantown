/* 
 * View is the base class for all views in this template. It handles common 
 * tasks like loading content feeds, caching content, retrieving content from
 * the cache, and listening for configuration changes. To extend this object:
 *
 * function MyView() {
 *    // view logic here
 * }
 * 
 * MyView.prototype = new View();
 * 
 */
function View() {
    // a reference to this object
    var self = this;

    // the "Loading ..." message. see styles in app.css
    var msg;

    // HTML templates by name
    var templates = {};

    // load HTML templates from a text file, then run callback function
    this.loadTemplates = function (file, callback) {
        file += "?" + (+new Date());

        // load the text file (see "txt" directory)
        $.get(file, function (text) {
            text = text.split("=====").splice(1);

            // split into named templates
            for (var t in text) {
                var i = text[t].indexOf("\n");
                var key = text[t].substr(0, i).trim();
                var val = text[t].substr(i).trim();
                templates[key] = val;
            }

            // run callback in the context of this View
            callback.call(self, templates);
        }, "html");
    };

    // get HTML template by name
    this.getTemplate = function (name) {
        return templates[name];
    };

    // show the "Loading ..." message. see styles in app.css
    this.showLoading = function () {
        if (!msg) {
            msg = document.createElement("div");
            msg.className = "loading";
            msg.innerHTML = "読み込み中 ...";
            document.body.appendChild(msg);
        }

        msg.style.opacity = 1;
    };

    // hide the "Loading ..." message
    this.hideLoading = function () {
        msg.style.opacity = 0;
    };

    // load a content feed from App Cloud and cache it by name
    this.loadFeed = function (name, callback, options) {
        // handle the response from bc.core.getData()
        var onSuccess = function (data) {
            // cache the response for later use
            bc.core.cache(name, data);

            // display response in debug console
            console.log(name, data);

            // run callback in the context of this View
            callback.call(self, data);

            // hide "Loading ..." message
            self.hideLoading();
        };

        // handle an error from bc.core.getData()
        var onError = function (error) {
            //bc.device.alert(error.errorMessage);
            console.log(error.errorMessage);
        };

        // show "Loading ..." message
        this.showLoading();

        // make the request
        bc.core.getData(name, onSuccess, onError, options || {});
    };

    // load JSON from a URL and cache it by name
    this.loadJSON = function (name, url, callback) {
        // handle the response from bc.device.fetchContentsOfURL()
        var onSuccess = function (data) {
            // when testing in the browser, fetchContentsOfURL() falls back
            // to $.get(), so we try to parse the response ourselves
            try {
                data = JSON.parse(data);
            }
            catch (e) {
            }

            // cache the response for later lookup
            bc.core.cache(name, data);

            // display response in debug console
            console.log(name, data);

            // run callback in the context of this View
            callback.call(self, data);

            // hide "Loading ..." message
            self.hideLoading();
        };

        // handle an error from bc.device.fetchContentsOfURL()
        var onError = function (error) {
            //bc.device.alert(error.errorMessage);
            console.log(error.errorMessage);
        };

        // show "Loading ..." message
        this.showLoading();

        // make the request
        bc.device.fetchContentsOfURL(url, onSuccess, onError);
    };

    // get a cached feed by name
    this.getCachedFeed = function (name) {
        return bc.core.cache(name) || null;
    };

    // get an item in a cached feed (by name) in which item[key] == val.
    // path is an optional string path to the array of items, in dot notation.
    // e.g. getCachedFeedItem("blog", "guid", "12345")
    this.getCachedFeedItem = function (name, key, val, path) {
        try {
            var data = this.getCachedFeed(name);
            return this.getDataItem(data, key, val, path);
        }
        catch (e) {
            return null;
        }
    };

    // get an item in a cached feed (data) in which item[key] == val.
    // path is an optional string path to the array of items, in dot notation.
    this.getDataItem = function (data, key, val, path) {
        var item, d, i = 0;

        if (path && (path = path.split("."))) {
            while ((d = path.shift())) {
                data = data[d];
            }
        }

        while ((item = data[i++])) {
            if (item[key] == val) {
                return item;
            }
        }

        return null;
    };

    // cache a "favorite" value in an array with the given key
    // e.g. saveFavorite("fruits", "apple")
    this.saveFavorite = function (key, val) {
        var favorites = bc.core.cache(key) || [];

        if (favorites.indexOf(val) === -1) {
            favorites.push(val);
        }

        bc.core.cache(key, favorites);
    };

    // delete a "favorite" value from a cached array with the given key
    // e.g. deleteFavorite("fruits", "apple")
    this.deleteFavorite = function (key, val) {
        var favorites = bc.core.cache(key) || [];
        var idx = favorites.indexOf(val);

        if (idx > -1) {
            favorites.splice(idx, 1);
            bc.core.cache(key, favorites);
        }
    };

    // determine if a value is contained in a list of favorites
    // e.g. isFavorite("fruits", "apple")
    this.isFavorite = function (key, val) {
        var favorites = bc.core.cache(key) || [];

        return favorites.indexOf(val) > -1;
    };

    // show this view
    this.show = function () {
        document.body.style.visibility = "visible";
    };

    // translate a bc error code into a user-friendly message
    this.getErrorMessage = function (errorCode) {
        var msg;

        // note: does not include USER_CANCEL
        switch (errorCode) {
            case bc.device.codes.CAMERA_UNAVAILABLE:
                msg = "カメラが使用できません。";
                break;
            case bc.device.codes.COMMAND_ONLY_AVAILABLE_IN_A_NATIVE_APPLICATION:
                msg = "この機能は使用できません。";
                break;
            case bc.device.codes.ERROR_FETCHING_CONTENTS_OF_URL_VIA_BROWSER:
                msg = "データの読み込み中にエラーが発生しました。";
                break;
            case bc.device.codes.GENERAL:
            default:
                msg = "エラーが発生しました。"
                break;
        }

        return "Oops! " + msg;
    };

    // listen for configuration changes from studio (on view focus)
    $(bc).bind("newconfigurations", function(evt, data) {
        if (data.styles.isNew) {
            bc.core.applyStyles();
        }
        if (data.settings.isNew) {
            // TODO
        }
    });

    // immediately apply studio styles on bc.init
    $(bc).bind("init", function (evt) {
        bc.core.applyStyles();
    });
}

/* 
 * View.Banner is a persistent page banner with a title, optional back button
 * and optional multi-purpose button. Usage:
 *
 * var banner = new View.Banner("banner", "News")
 */
View.Banner = function (elemId, title) {
    // the element wrapped by this object
    var elem = document.getElementById(elemId);

    elem.innerHTML = 
        '<div class="control">' +
        '<div id="back-button" class="btn">Back</div>' +
        '</div>' +
        '<h1>...</h1>' +
        '<div class="control">' +
        '<div id="context-button" class="btn">...</div>' +
        '</div>';

    // set the banner title, e.g. "Blog"
    this.setTitle = function (title) {
        elem.querySelector("h1").innerHTML = title;
    };

    // show or hide the back button. optional label defaults to "Back"
    this.enableBackButton = function (enable, label) {
        enableButton(elem.querySelector("#back-button"), enable, label);
    };

    // show or hide the contextual button and set the label
    this.enableContextButton = function (enable, label) {
        enableButton(elem.querySelector("#context-button"), enable, label);
    };

    // show or hide the given button and optionally change the label
    var enableButton = function (button, enable, label) {
        if (label) {
            button.innerHTML = label;
        }
        button.style.display = enable !== false ? "block" : "none";
    };

    // immediately set the title
    this.setTitle(title);
};

/* 
 * View.Toggle is a component for switching display modes in a View. See 
 * news.html for markup example and app.css for styles. Usage:
 *
 * var toggle = new View.Toggle("toggle");
 */
View.Toggle = function (elemId) {
    // a reference to this object
    var self = this;

    // the element wrapped by this object
    var elem = document.getElementById(elemId);

    // the list item elements
    var items = $(elem).find("li");

    // the current index
    var idx = 0;

    // trigger a jquery event when the index changes
    var dispatch = function (value, idx) {
        $(self).trigger("toggle", {
            id: elemId,
            value: value,
            index: idx
        });
    };

    // listen for tap events on <li> elements
    items.bind("tap", function (evt) {
        var i = items.index(this);

        // if not the current index ...
        if (i !== idx) {
            // update styles
            items.removeClass("accent");
            $(this).addClass("accent");

            // and trigger a "toggle" event
            dispatch($(this).data("value"), i);

            idx = i;
        }
    });

    // set <li> labels. e.g. setLabels("List", "Map")
    this.setLabels = function () {
        for (var i = 0; i < arguments.length; i++) {
            items[i].innerText = arguments[i];
        }
    };

    // get the index of the currently selected item
    this.getIndex = function () {
        return idx;
    };

    // get the value of the currently selected item
    this.getValue = function () {
        return items[idx].getAttribute("data-value");
    };

    // get the label of the currently selected item
    this.getLabel = function () {
        return items[idx].innerText;
    };

    // immediately highlight the first item
    items.first().addClass("accent");
};

/* 
 * View.Share is a display component for sharing content via email, Twitter
 * and Facebook. Email opens externally; Twitter and Facebook open modally.
 * See news.html for markup example and app.css for styles. Usage:
 *
 * var share = new View.Share("share");
 * ...
 * share.setContext("An apple a day", "http://www.apple.com/");
 * share.show();
 */
View.Share = function (elemId) {
    // a reference to this object
    var self = this;

    // the element wrapped by this object
    var elem = document.getElementById(elemId);

    // current visibility state
    var visible = false;

    // link elements for email, twitter, facebook
    var links = {};

    // inject markup into elem
    var init = function () {
        var opts = ["email", "twitter", "facebook"];
        var a;
        var img;

        for (var i in opts) {
            img = new Image();
            img.src = "../img/share-" + opts[i] + ".png";
            img.width = "50";
            img.height = "50";
            img.alt = opts[i];

            a = document.createElement("a");
            a.appendChild(img);
            elem.appendChild(a);
            links[opts[i]] = a;
        }

        // hide sharing controls on tap event
        $(elem).bind("tap", function (evt) {
            setTimeout(function () {
                self.hide();
            }, 1000);
        });
    };

    // get email href
    var getEmailLink = function (message, url) {
        return "mailto:?subject=" + message + "&body=Check it out!\n\n" + url;
    };

    // get twitter href
    var getTwitterLink = function (message, url) {
        if (url.indexOf("http://twitter.com") === 0) {
            return url;
        }
        return "http://twitter.com/share?text=" + message + "&url=" + url;
    };

    // get facebook href
    var getFacebookLink = function (message, url) {
        return "http://facebook.com?sharer.php?u=" + url + "&t=" + message;
    };

    // show the sharing controls
    this.show = function () {
        elem.style.display = "-webkit-box";
        visible = true;
    };

    // hide the sharing controls
    this.hide = function () {
        elem.style.display = "none";
        visible = false;
    };

    // show or hide the sharing controls
    this.toggle = function () {
        if (visible) {
            this.hide();
        }
        else {
            this.show();
        }
    };

    // set the text and url to share
    this.setContext = function (text, url) {
        links.twitter.href = encodeURI(getTwitterLink(text, url));
        links.facebook.href = encodeURI(getFacebookLink(text, url));
        links.email.href = encodeURI(getEmailLink(text, url));
    };

    init();
};

View.device = innerWidth * innerHeight > 200000 ? "tablet" : "phone";

Mark.includes.device = View.device;

