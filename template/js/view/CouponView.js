/* 
 * CouponView extends View. Usage:
 *
 * var view = new CouponView();
 * view.init();
 */
function CouponView() {
    // a refererence to this object
    var self = this;

    // a banner component. wraps element with id "banner"
    var banner = new View.Banner("banner", "クーポン");

    // scrolling component
    var deck;

    // the currently viewed coupon
    var coupon;

    // initialize this view
    this.init = function () {
        initDeck();
        initListeners();

        $("#directions").html(bc.core.getSetting("coupon-message"));

        // load HTML fragments from file. see View.js -> loadTemplates()
        this.loadTemplates("../txt/coupons.txt", function() {
            this.show();
        });
    };

    // initialize scrolling. see lib/scrollworks.js
    var initDeck = function () {
        deck = Deck.factory("deck");
    };

    // initialize all event listeners
    var initListeners = function () {
        // listen for a tap event on "Scan Coupon" button
        $("#scan-coupon").bind("tap", function (evt) {
            bc.device.getQRCode(
                function (data) {
                    loadCoupons(data);

                    deck.jump(1);
                },
                function (error) {
                    if (error.errorCode !== bc.device.codes.USER_CANCEL) {
                        bc.device.alert(self.getErrorMessage(error.errorCode));
                    }
                }
            );
        });

        // listen for a tap event on "My Coupons" button
        $("#my-coupons").bind("tap", function (evt) {
            var cached = self.getCachedFeed("coupons");

            if (cached) {
                renderCoupons(cached);
            }
            else {
                loadCoupons();
            }

            deck.go(1);
        });

        // listen for a deck change
        $(deck).bind("deckchange", function (evt, params) {
            banner.enableBackButton(params.toIndex > 0, "戻る");
            banner.enableContextButton(params.toIndex === 2 && coupon.expires != null, "消す");
        });

        // listen for a "back" tap
        $("#back-button").live("tap", function (evt) {
            deck.back();
        });

        // listen for a "delete" tap
        $("#context-button").live("tap", function (evt) {
            // fade out
            $("#coupon").addClass("deleted");

            // delete and go back
            setTimeout(function () {
                deleteCoupon(coupon.id);
                renderCoupons(self.getCachedFeed("coupons"));
                deck.back();
            }, 250);
        });

        // listen for a list item tap
        $(".results li").live("tap", function (evt) {
            renderCoupon(this.getAttribute("data-result-id"));
            deck.go(2);
        });
    };

    // load coupon feed after a QR scan. see View.js -> loadFeed()
    var loadCoupons = function (scannedCouponId) {
        self.loadFeed("coupons", function (data) {
            onCouponsLoad(data);

            if (scannedCouponId) {
                validateScannedCoupon(scannedCouponId);
            }
        });
    };

    // determine if a scanned coupon ID is present in the cached feed, then render
    var validateScannedCoupon = function (id) {
        var coupon = self.getCachedFeedItem("coupons", "id", id, "results");

        if (coupon) {
            saveCoupon(id);
            renderCoupons(self.getCachedFeed("coupons"));
            renderCoupon(id);
            deck.go(2);
        }
        else {
            bc.device.alert("ack!");
        }
    };

    // save a coupon ID. see View.js -> saveFavorite()
    var saveCoupon = function (id) {
        self.saveFavorite("scanned-coupons", id);
    };

    // delete a saved coupon ID. see View.js -> deleteFavorite()
    var deleteCoupon = function (id) {
        self.deleteFavorite("scanned-coupons", id);
    };

    // handle coupon data after load
    var onCouponsLoad = function (data) {
        renderCoupons(data);
    };

    // render a list of coupons
    var renderCoupons = function (data) {
        var template = self.getTemplate("coupon-results");
        var context = {results: getSavedCoupons(data)};
        var html = Mark.up(template, context);

        var scrollbox = Scrollbox.get("results-scrollbox");
        scrollbox.top();
        scrollbox.setContent(html);
    };

    // get saved coupons from the coupon feed
    var getSavedCoupons = function (data) {
        var coupons = data.results;
        var cached = bc.core.cache("scanned-coupons") || [];
        var saved = [];

        for (var i in coupons) {
            var scanned = cached.indexOf(coupons[i].id) > -1;

            if (coupons[i].expires == null || scanned) {
                saved.push(coupons[i]);
            }
        }

        return saved;
    };

    // render a coupon detail
    var renderCoupon = function (id) {
        var template = self.getTemplate("coupon-detail");
        var context = self.getCachedFeedItem("coupons", "id", id, "results");
        var html = Mark.up(template, context);

        var scrollbox = Scrollbox.get("detail-scrollbox");
        scrollbox.top();
        scrollbox.setContent(html);

        coupon = context;
    };
}

CouponView.prototype = new View();
