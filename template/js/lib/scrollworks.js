/*
 * A Deck is a collection of Cards. The deck element should have
 * class="deck"; child elements should have class="card". The deck
 * will grow to fit the height of its parent element minus the 
 * combined height of all siblings.
 *
 * A card can contain another deck or scrollbox (div class="deck"
 * or div class="scrollbox"). These are instantiated automatically
 * and can be accessed via static methods Deck.get(id) and 
 * Scrollbox.get(id), where id is an element ID.
 *
 * To enable dragging of the deck, add a "data-manual" attribute
 * to the deck element. Possible values are "back", "next", "both".
 *
 * If the computed CSS direction of the deck element is "rtl", its
 * drag behavior will be reversed. For example, to go back, a user 
 * will drag from right to left.
 *
 * A "deckchange" event (in jquery) is triggered on this object 
 * whenever the index changes. It has the following properties:
 *     id:         this deck's element id
 *     fromIndex:  the previous index
 *     toIndex:    the new index
 *     fromCardId: the previous card's element id
 *     toCardId:   the new card's element id
 *     manual:     true if the deck was dragged, otherwise false
 *
 * A "deckresize" event (in jquery) is triggered on this object 
 * whenever the size changes. It has the following properties:
 *     id:         this deck's element id
 *     width:      the new width
 *     height:     the new height
 */
function Deck(elem) {
    var self = this;
    var idx = 0;
    var cards = [];
    var touch;
    var direction = window.getComputedStyle(elem).direction === "rtl" ? -1 : 1;
    var os = navigator.userAgent.indexOf("Mac OS X") > -1 ? "ios" : "android";
    var width;
    var height;

    var init = function () {
        ScrollUtil.init();

        if (elem.id) {
            Deck.all[elem.id] = self;
            Deck.indexed.push(self);
        }

        setWidth();
        setHeight();
        createCards();
        setOptions();
    };

    var createCards = function () {
        for (var i = 0; i < elem.childNodes.length; i++) {
            var node = elem.childNodes[i];
            if (!(/^div|section$/i).test(node.nodeName)) {
                elem.removeChild(node);
            }
        }

        for (var i = 0; i < elem.childNodes.length; i++) {
            cards.push(new Card(elem.childNodes[i], height));
        }
    };

    var setOptions = function () {
        setManual(elem.getAttribute("data-manual"));
    };

    var pan = function (pct) {
        pct *= direction;
        pct = os === "ios" ? (pct * 100) + "%" : (pct * width) + "px";
        ScrollUtil.transform(elem, pct, "0");
    };

    var toggle = function (fromIdx, toIdx) {
        var offIdx = toIdx - ((toIdx - fromIdx) * 2);
        var onIdx = fromIdx - ((fromIdx - toIdx) * 2);
        setTimeout(function () {
            setVisible(onIdx, true);
            setVisible(offIdx, false);
        }, 150);
    };

    var reset = function (_idx) {
        var i;
        for (i = idx - 1; i <= idx + 1; i++) {
            setVisible(i, false);
        }
        for (i = _idx - 1; i <= _idx + 1; i++) {
            setVisible(i, true);
        }
    };

    var setVisible = function (idx, visible) {
        if (idx >= 0 && idx <= cards.length - 1) {
            cards[idx].setVisible(visible);
        }
    };

    var setWidth = function () {
        width = parseInt(window.getComputedStyle(elem).width);
    };

    var setHeight = function () {
        height = ScrollUtil.getAvailableHeight(elem);
        elem.style.setProperty("height", height + "px");
    };

    var setManual = function (mode) {
        if (["back", "next", "both"].indexOf(mode) === -1) {
            return;
        }

        var p1 = new Point(0, 0);
        var p2 = new Point(0, 0);
        var v;
        var dx;
        var pct = 0;
        var mousing = false;
        var moveable = function () {
            var _dx = dx * direction;
            return (Deck.engaged || Math.abs(dx) > 3) && (
                (_dx > 0 && mode !== "next" && idx > 0) ||
                (_dx < 0 && mode !== "back" && idx < cards.length - 1)
            );
        };

        var touchstart = function (touch) {
            setWidth();
            ScrollUtil.transition(elem, "0s linear");
            p1 = p2 = new Point(touch.pageX, touch.pageY);
            dx = 0;
        };

        var touchmove = function (touch) {
            v = (touch.pageX > p2.x ? 1 : -1) * direction;
            p2 = new Point(touch.pageX, touch.pageY);
            dx = p2.distanceX(p1);

            if (!Scrollbox.engaged) {
                if (moveable()) {
                    self.moving = true;
                    pct = (dx * direction) / elem.clientWidth;
                    Deck.engaged = true;
                    pan(pct - idx);
                }
            }
        };

        var touchend = function () {
            ScrollUtil.transition(elem, ".25s ease-out");
            self.moving = false;

            if (Deck.engaged) {
                pct = Math.min(1, Math.max(-1, pct * 3));
                if (Math.abs(v - pct) > 1) {
                    self.go(idx);
                }
                else {
                    self.go(Math.round(idx - pct), true);
                }
            }
            Deck.engaged = false;
        };

        if (ScrollUtil.hasTouchSupport()) {
            elem.addEventListener("touchstart", function (evt) {
                if (evt.touches.length > 1) {
                    return;
                }
                touchstart(evt.touches[0]);
            });

            elem.addEventListener("touchmove", function (evt) {
                if (evt.touches.length > 1) {
                    return;
                }
                touchmove(evt.touches[0]);
            });

            elem.addEventListener("touchend", function (evt) {
                if (evt.touches.length > 1) {
                    return;
                }
                touchend();
            });
        }
        else {
            elem.addEventListener("mousedown", function (evt) {
                mousing = true;
                touchstart(evt);
            });

            elem.addEventListener("mousemove", function (evt) {
                if (mousing) {
                    touchmove(evt);
                }
            });

            elem.addEventListener("mouseup", function (evt) {
                if (mousing) {
                    mousing = false;
                    touchend();
                }
            });
        }
    };

    // transition to the previous card
    this.back = function () {
        var i = Math.max(0, idx - 1);
        this.go(i);
    };

    // transition to the next card
    this.next = function () {
        var i = Math.min(cards.length - 1, idx + 1);
        this.go(i);
    };

    // transition to a card. params "manual" and "jump" are used internally
    this.go = function (_idx, manual, jump) {
        if ((_idx != idx) || jump) {
            var params = {
                id: elem.id,
                fromIndex: idx,
                toIndex: _idx,
                fromCardId: cards[idx].id,
                toCardId: cards[_idx].id,
                manual: manual === true
            };

            if (Math.abs(idx - _idx) > 1) {
                reset(_idx);
            }
            else if (idx != _idx) {
                toggle(idx, _idx);
            }

            idx = _idx;

            $(self).trigger("deckchange", params);
        }

        ScrollUtil.transition(elem, jump ? "0s linear" : ".25s ease-out");
        pan(-idx);
    };

    // go directly to a card without panning, forcing a deckchange event
    this.jump = function (idx) {
        this.go(idx, false, true);
    };

    // get a card with at the given index
    this.getCard = function (idx) {
        return cards[idx];
    };

    // get the width of the deck
    this.getWidth = function () {
        return elem.getBoundingClientRect().width;
    };

    // get the height of the deck
    this.getHeight = function () {
        return elem.getBoundingClientRect().height;
    };

    // add a card to the end of the deck. element is created if undefined
    this.addCard = function (_elem) {
        if (!_elem) {
            _elem = document.createElement("div");
            _elem.className = "card";
        }
        elem.appendChild(_elem);

        var card = new Card(_elem, height);
        cards.push(card);

        if (cards.length > 3) {
            _elem.style.visibility = "hidden";
        }

        return card;
    };

    // clear the deck
    this.clear = function () {
        cards = [];
        elem.innerHTML = "";
    };

    // get the number of cards in the deck
    this.getLength = function () {
        return cards.length;
    };

    // get the current index of the deck
    this.getIndex = function () {
        return idx;
    };

    // resize to fit available height and trigger a "deckresize"
    // event on this object. do not call directly
    this.resize = function () {
        setHeight();

        if (os === "android") {
            setWidth();
            pan(-idx);
        }

        for (var c in cards) {
            cards[c].setHeight(height);
        }

        $(self).trigger("deckresize", {
            id: elem.id,
            width: self.getWidth(),
            height: self.getHeight()
        });
    };

    init();
}

// internal
Deck.engaged = false;

// internal
Deck.all = {};

// internal
Deck.indexed = [];

// Create a deck with the given element ID
Deck.factory = function (elemId) {
    return new Deck(document.getElementById(elemId));
};

// Get a deck with the given element ID
Deck.get = function (elemId) {
    return Deck.all[elemId];
};

/* 
 * A Card is a unit in a deck. It wraps an element with class="card"
 * and will be given the same height as its parent deck. This class
 * should not be instantiated directly. Rather, use deck.addCard(elem)
 */
function Card(elem, height) {
    var self = this;

    this.id = elem.id;

    var init = function () {
        var i, j, child;

        self.setHeight(height);

        for (i = 0, j = elem.childNodes.length; i < j; i++) {
            child = elem.childNodes[i];
            if (/deck/.test(child.className)) {
                new Deck(child);
            }
            else if (/scrollbox/.test(child.className)) {
                new Scrollbox(child);
            }
        }
    };

    this.setHeight = function (height) {
        height = height || ScrollUtil.getAvailableHeight(elem);
        elem.style.setProperty("height", height + "px");
        elem.style.setProperty("overflow", "hidden");
    };

    this.getElement = function () {
        return elem;
    };

    this.getContent = function () {
        return elem.innerHTML;
    };

    this.setContent = function (html) {
        elem.innerHTML = html;
    };

    this.setVisible = function (visible) {
        elem.style.visibility = visible ? "visible" : "hidden";
    };

    init();
}

/*
 * Scrollbox turns a given element into a scrollable area. The scrollbox
 * element should have class="scrollbox"; it will grow to the height of 
 * its parent element minus the combined height of all siblings.
 */
function Scrollbox(elem) {
    var self = this;
    var p1;
    var p2;
    var y0 = 0;
    var y1 = 0;
    var dy = 0;
    var ty = 0;
    var eh = 0;
    var ch = 0;
    var touch;
    var child;
    var ytop = 0;
    var tension = 2.5;
    var mousing = false;

    var bound = function (y) {
        return Math.round(Math.min(0, Math.max(y, eh - ch)));
    };

    var init = function () {
        ScrollUtil.init();

        elem.innerHTML = "<div class=\"flow\">" + elem.innerHTML + "</div>";

        child = elem.firstChild;

        var div = document.createElement("div");
        div.className = "innershadow";
        elem.insertBefore(div, child);

        elem.style.setProperty("height", ScrollUtil.getAvailableHeight(elem) + "px");

        var touchstart = function (touch) {
            ScrollUtil.transition(child, "0s linear");

            y0 = elem.getBoundingClientRect().top;
            dy = 0;
            eh = elem.offsetHeight;
            ch = child.offsetHeight;
            p1 = new Point(touch.pageX, touch.pageY);
            y1 = child.getBoundingClientRect().top - y0;

            ScrollUtil.transform(child, "0", y1 + "px");
        };

        var touchmove = function (touch) {
            p2 = new Point(touch.pageX, touch.pageY);
            dy = p2.distanceY(p1);
            ty = y1;

            if (Math.abs(dy) > 5) {
                Scrollbox.engaged = true;
                ty += dy;
            }

            // tension up
            if (ty > ytop) {
                ty = ytop + ((ty - ytop) / tension);
            }
            // tension down
            else if (ty < eh - ch) {
                ty += (eh - (Math.max(eh, ch) + ty)) / tension;
            }

            ScrollUtil.transform(child, "0", ty + "px");
            y1 = Math.round(y1 + dy);
            p1 = p2;
        };

        var touchend = function () {
            if (Scrollbox.engaged) {
                self.scrollTo(y1 + (dy * Math.abs(dy) * 0.75));
            }
            Scrollbox.engaged = false;
        };

        if (ScrollUtil.hasTouchSupport()) {
            elem.addEventListener("touchstart", function (evt) {
                if (!Deck.engaged && evt.touches) {
                    touchstart(evt.touches[0]);
                }
            });

            elem.addEventListener("touchmove", function (evt) {
                if (!Deck.engaged && evt.touches) {
                    touchmove(evt.touches[0]);
                }
            });

            elem.addEventListener("touchend", function (evt) {
                touchend();
            });
        }
        else {
            elem.addEventListener("mousedown", function (evt) {
                if (!Deck.engaged) {
                    mousing = true;
                    touchstart(evt);
                }
            });

            elem.addEventListener("mousemove", function (evt) {
                if (!Deck.engaged && mousing) {
                    touchmove(evt);
                }
            });

            elem.addEventListener("mouseup", function (evt) {
                if (mousing) {
                    mousing = false;
                    touchend();
                }
            });
        }

        if (elem.id) {
            Scrollbox.all[elem.id] = self;
        }
    };

    this.scrollTo = function (y) {
        y1 = bound(y);
        ScrollUtil.transform(child, "0", y1 + "px");
        ScrollUtil.transition(child, "750ms cubic-bezier(0.250, 0.460, 0.450, 0.940)");
    };

    // resize to fit available height. do not call directly
    this.resize = function () {
        height = ScrollUtil.getAvailableHeight(elem);

        elem.style.setProperty("height", height + "px");

        eh = elem.offsetHeight;
        ch = child.offsetHeight;
        y1 = bound(y1);

        ScrollUtil.transform(child, "0", y1 + "px");
        ScrollUtil.transition(child, "0ms linear");
    };

    // get the HTML content of this scrollbox
    this.getContent = function () {
        return child.innerHTML;
    };

    // update the HTML content of this scrollbox
    this.setContent = function (html) {
        freeImages(elem);

        child.innerHTML = html;
        //$(child).html(wrap(html));
    };

    // snap to the top
    this.top = function () {
        y1 = ytop;
        ScrollUtil.transform(child, "0", "0");
        ScrollUtil.transition(child, "0s linear");
    };

    this.clear = function () {
        freeImages(elem);

        this.setContent("");
        this.top();
    };

    var freeImages = function (elem) {
        var imgs = elem.querySelectorAll("img");
        for (var i = 0; i < imgs.length; i++) {
            imgs[i].src = "../img/blank.png";
        }
    };

    init();
}

Scrollbox.engaged = false;

Scrollbox.all = {};

Scrollbox.get = function (elemId) {
    return Scrollbox.all[elemId];
};

// Point holds an arbitrary location measured from top left
function Point(x, y) {
    this.x = x;
    this.y = y;
}

Point.prototype.distanceX = function (point) {
    return this.x - point.x;
};

Point.prototype.distanceY = function (point) {
    return this.y - point.y;
};

/*
 * Static helper and init functions used by Deck and Scrollbox
 */
var ScrollUtil = {};

// add listeners, add css rules
ScrollUtil.init = function () {
    // do just once
    if (ScrollUtil.inited) {
        return;
    }

    var orientation = window.innerWidth > window.innerHeight ? "L" : "P";

    document.body.addEventListener("touchmove", function (evt) {
        evt.preventDefault();
    });

    window.addEventListener("resize", function (evt) {
        var o = window.innerWidth > window.innerHeight ? "L" : "P";
        if (o === orientation) {
            return;
        }
        orientation = o;

        for (var i = 0; i < Deck.indexed.length; i++) {
            Deck.indexed[i].resize();
        }

        // resize scrollboxes
        for (var s in Scrollbox.all) {
            Scrollbox.all[s].resize();
        }
    });

    var css = {
        "html": [
            "width: 100%",
            "overflow-x: hidden"
        ],
        ".deck": [
            "white-space: nowrap",
            "width: 100%",
            "-webkit-transition: -webkit-transform .25s ease-out"
        ],
        ".deck, .deck > .card": [
            "-webkit-transform: translate3d(0, 0, 0)"
        ],
        ".deck > .card": [
            "white-space: normal",
            "vertical-align: top",
            "display: inline-block",
            "width: 100%"
        ],
        ".scrollbox": [
            "overflow: hidden",
        ],
        ".scrollbox > .flow": [
            "-webkit-transform: translate3d(0, 0, 0)"
        ],
        ".innershadow": [
            "position: absolute",
            "z-index: 1000",
            "height: 8px",
            "width: 100%",
            "background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,rgba(0,0,0,0.5)), color-stop(100%,rgba(0,0,0,0)))"
        ]
    };

    var sheet = document.styleSheets[0];

    for (var c in css) {
        sheet.addRule(c, css[c].join(";"));
    }

    if (!ScrollUtil.hasTouchSupport()) {
        sheet.addRule(".deck", "-webkit-user-select: none");

        $("img").live("mousedown", function (evt) {
            evt.preventDefault();
            evt.stopPropagation();
        });
    };

    ScrollUtil.inited = true;
};

// apply a 3D transform to an element
ScrollUtil.transform = function (elem, x, y) {
    elem.style.setProperty("-webkit-transform", "translate3d(" + x + ", " + y + ", 0)");
};

// apply a CSS transition to an element's transform
// value is expressed as "time curve", e.g. "500ms linear"
ScrollUtil.transition = function (elem, value) {
    elem.style.setProperty("-webkit-transition", "-webkit-transform " + value);
};

// get the available height for an element
ScrollUtil.getAvailableHeight = function (elem) {
    var parent = elem.parentElement;
    var sibs = parent.childNodes;
    var h = 0;

    var isStatic = function (style) {
        return ["static", "relative"].indexOf(style.position) > -1;
    };

    var isBlock = function (style) {
        return style.display !== "inline-block" && style.float === "none";
    };

    for (var i in sibs) {
        if (sibs[i] !== elem) {
            var style = window.getComputedStyle(sibs[i]);
            if (style && isStatic(style) && isBlock(style)) {
                h += sibs[i].offsetHeight || 0;
            }
        }
    }

    return parent.getBoundingClientRect().height - h;
};

// is touch supported?
ScrollUtil.hasTouchSupport = function () {
    return "ontouchend" in document;
};
