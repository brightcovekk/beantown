/* 
 * GalleryView extends View. Usage:
 *
 * var view = new GalleryView();
 * view.init();
 *
 * See "gallery" styles in app.css.
 */
function GalleryView() {
    // a reference to this object
    var self = this;

    // a banner component. wraps element with id "banner"
    var banner = new View.Banner("banner", "写真");

    // an image loader (not visible)
    var buffer = new Image();

    // data feed
    var data;

    // number of full-size images to maintain before and after the current
    var pad = 5;

    // scrolling components
    var outerDeck;
    var innerDeck;

    // the caption element
    var caption;

    // the user's captioning preference
    var captioned = false;

    // thumbnail width and height
    var thumbSize = Math.max(65, Math.floor(Math.min(bc.ui.width(), bc.ui.height()) / 6));

    // initialize this view
    this.init = function () {
        initDeck();
        this.showLoading();
        this.show();

        self.loadFeed("gallery", function (_data) {
            data = _data;

            initGrid();
            initCarousel();
            initListeners();
        });
    };

    // initialize scrolling. see lib/scrollworks.js
    var initDeck = function () {
        Deck.factory("outer-deck");

        outerDeck = Deck.get("outer-deck");
        innerDeck = Deck.get("inner-deck");
    };

    // initialize the grid page
    var initGrid = function () {
        var html = "",
            img,
            i = 0;

        for (i = 0; i < data.length; i++) {
            img = new Image();
            img.className = "thumbnail";
            img.width = thumbSize;
            img.height = thumbSize;
            img.setAttribute("data-idx", i);
            html += img.outerHTML;
        }

        Scrollbox.get("grid-scrollbox").setContent(html);

        loadThumbnails();
    };

    // load and crop thumbnails
    var loadThumbnails = function() {
        var images = document.querySelectorAll(".thumbnail");

        for (i = 0; i < data.length; i++) {
            images[i].src = getThumbnailPath(data[i], true); // crop=true
        }
    };

    // initialize the carousel pages with lo-res images
    var initCarousel = function () {
        var card, img, i = 0, loaded = 0;

        for (i = 0; i < data.length; i++) {
            card = innerDeck.addCard();
            card.setContent("<img/>");

            img = getImage(i);
            img.src = getThumbnailPath(data[i], false); // crop=false
            img.onload = function (evt) {
                fitImage(this);
                loaded++;
                if (loaded === data.length && outerDeck.getIndex() === 0) {
                    self.hideLoading();
                }
            };
        }

        // create caption element
        caption = document.createElement("div");
        caption.className = "gallery-caption";
        document.body.appendChild(caption);
    };

    // initialize all event listeners
    var initListeners = function () {
        // listen for a thumbnail tap
        $(".thumbnail").live("tap", function (evt) {
            outerDeck.go(1);
            banner.enableBackButton(true,"戻る");
            showCaption(captioned);

            var idx = parseInt(this.getAttribute("data-idx"));
            innerDeck.jump(idx);
        });

        // listen for a "back" tap
        $("#back-button").live("tap", function (evt) {
            outerDeck.go(0);
            showCaption(false);
            banner.enableBackButton(false);
        });

        // listen for a tap anywhere in the inside deck
        $("#inner-deck").bind("tap", function (evt) {
            // toggle captioning
            captioned = !captioned;
            showCaption(captioned);
        });

        // listen for an inner deck change
        $(innerDeck).bind("deckchange", function (evt, params) {
            var i = params.toIndex;
            var j = i + (params.fromIndex < params.toIndex ? -pad : pad);
    
            self.showLoading();

            // change the caption    
            setCaption(data[i].title, data[i].description);

            // let transition finish, then update the image
            setTimeout(function () {
                loadImage(i);
            }, 250);

            // wait some more, then unload an image
            setTimeout(function () {
                freeImage(j);
            }, 750);

            // update the banner title
            setTitle(params.id, params.toIndex);
        });

        // listen for a deck resize
        $(innerDeck).bind("deckresize", function (evt, params) {
            // resize all images
            for (var i = 0; i < data.length; i++) {
                fitImage(getImage(i));
            }
        });

        // listen for an outer deck change
        $(outerDeck).bind("deckchange", function (evt, params) {
            var i = innerDeck.getIndex();

            // unload all hi-res images
            if (params.toIndex === 0) {
                setTimeout(function () {
                    freeImages(i - pad, i + pad);
                }, 300);
            }
            else {
            }

            // update banner title
            setTitle(params.id, params.toIndex);
        });
    };

    var getBaseImagePath = function (url, w, h) {
        var url = "http://transcode.appcloud.brightcove.com/" +
            "?image=" + url +
            "&width=" + w +
            "&height=" + h +
            "&format=jpg" + 
            "&quality=80";

        return url;
    };

    var getThumbnailPath = function (data, crop) {
        var f = thumbSize / Math.min(data.width, data.height);
        var w = Math.round(f * data.width);
        var h = Math.round(f * data.height);
        var s = Math.min(data.width, data.height);
        var url;

        if (crop) {
            url = getBaseImagePath(data.url, thumbSize, thumbSize);
            url += "&crop=" + [0, 0, s, s].join(",");
        }
        else {
            url = getBaseImagePath(data.url, w, h);
        }

        return url;
    };

    var getFullSizeImagePath = function (data) {
        var f = Math.min(
            innerDeck.getWidth() / data.width,
            innerDeck.getHeight() / data.height
        );

        var w = Math.round(f * data.width);
        var h = Math.round(f * data.height);

        return getBaseImagePath(data.url, w, h);
    };

    // get the <img> element for the image at index i
    var getImage = function (i) {
        return innerDeck.getCard(i).getElement().querySelector("img");
    };

    // load full-res image at index i
    var loadImage = function (i) {
        // load and inject image if deck is not moving
        setTimeout(function () {
            if (innerDeck.moving) {
                // otherwise try again
                loadImage(i);
                return;
            }

            var img = getImage(i);
            var src = getFullSizeImagePath(data[i]);

            // if the image is not already set AND if we're still on the same card
            if (img.src !== src && i === innerDeck.getIndex()) {
                buffer.src = src;
                buffer.onload = function (evt) {
                    img.src = buffer.src;
                    self.hideLoading();
                };
            }
            else {
                self.hideLoading();
            }
        }, 200);
    };

    // scale the image to fit the available area
    var fitImage = function (img) {
        var w = img.naturalWidth;
        var h = img.naturalHeight;
        var W = innerDeck.getWidth();
        var H = innerDeck.getHeight();

        if ((w / W) > (h / H)) {
            img.width = W;
            img.height = Math.ceil((W / w) * h);
        }
        else {
            img.width = Math.ceil((H / h) * w);
            img.height = H;
        }

        // center image vertically
        img.style.paddingTop = Math.floor((H - img.height) / 2) + "px";
    };

    // set the banner title
    var setTitle = function (deckId, toIndex) {
        if (deckId === "outer-deck" && toIndex === 0) {
            banner.setTitle("写真");
        }
        else {
            banner.setTitle((innerDeck.getIndex() + 1) + " of " + data.length);
        }
    };

    // free images between indexes i and j, inclusive
    var freeImages = function (i, j) {
        while (i <= j) {
            freeImage(i);
            i++;
        };
        buffer.onload = undefined;
        buffer.src = "../img/blank.png";
    };

    // free the image at index i
    var freeImage = function (i) {
        if (i >= 0 && i < innerDeck.getLength()) {
            var img = innerDeck.getCard(i).getElement().firstChild;
            img.src = getThumbnailPath(data[i], false); // crop=false
        }
    };

    // show or hide the caption element
    var showCaption = function (show) {
        if (show) {
            caption.style.display = "block";
            setTimeout(function () {
                caption.style.opacity = 1;
            }, 0);
        }
        else {
            caption.style.opacity = 0;
            setTimeout(function () {
                caption.style.display = "none";
            }, 200);
        }
    };

    // change the caption
    var setCaption = function (title, description) {
        caption.innerHTML = "<b>" + title + ":</b> " + description;
    };

}

GalleryView.prototype = new View();
