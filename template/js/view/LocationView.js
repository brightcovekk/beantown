/* 
 * LocationView extends View. Usage:
 *
 * var view = new LocationView();
 * view.init();
 */
function LocationView() {
    // a refererence to this object
    var self = this;

    // a banner component. wraps element with id "banner"
    var banner = new View.Banner("banner", "場所");

    // the user's display preference ("map" or "list");
    var mode = bc.core.cache("location-mode") || "list";

    // a google map
    var map;

    // scrolling components
    var outerDeck;
    var innerDeck;
    var resultsScroll;
    var detailScroll;

    // the user's current position [lat, lng]
    var position;

    // google URLs
    var BASE_URL = "https://maps.googleapis.com/maps/api";
    var GEO_URL = BASE_URL + "/geocode/json" +
        "?address={{address}}" +
        "&sensor=true";
    var SEARCH_URL = BASE_URL + "/place/search/json" +
        "?location={{location}}" +
        "&radius={{radius}}" +
        "&types={{types}}" +
        "&sensor=true" +
        "&key={{key}}";
    var PLACE_URL = BASE_URL + "/place/details/json" +
        "?reference={{reference}}" +
        "&sensor=true" +
        "&key={{key}}";

    // initialize this view
    this.init = function () {
        initDeck();
        initBanner();
        initListeners();

        // load HTML fragments from file. see View.js -> loadTemplates()
        this.loadTemplates("../txt/location.txt", function() {
            getUserPosition();
            this.show();
        });
    };

    // initialize scrolling. see lib/scrollworks.js
    var initDeck = function () {
        Deck.factory("outer-deck");

        outerDeck = Deck.get("outer-deck");
        innerDeck = Deck.get("inner-deck");
        resultsScroll = Scrollbox.get("results-list-scrollbox");
        detailScroll = Scrollbox.get("detail-scrollbox");

        innerDeck.jump(mode == "map" ? 0 : 1);
    };

    // initialize the page banner
    var initBanner = function () {
        banner.enableBackButton(true, mode === "list" ? "地図" : "リスト");
        banner.enableContextButton(true, "場所の変更");
    };

    // initialize all event listeners
    var initListeners = function () {
        // listen for deck change
        $(outerDeck).bind("deckchange", function (evt, params) {
            var label = mode === "list" ? "地図" : "リスト";
            banner.enableBackButton(true, params.toIndex === 0 ? label : "戻る");
            banner.enableContextButton(params.toIndex === 0);
        });

        // listen for a "back" tap or mode tap (button has dual purpose)
        $("#back-button").live("tap", function (evt) {
            // changing mode
            if (outerDeck.getIndex() === 0) {
                mode = mode === "list" ? "map" : "list";
                bc.core.cache("location-mode", mode);
                banner.enableBackButton(true, mode === "list" ? "地図" : "リスト");
                innerDeck.go(mode === "map" ? 0 : 1);
            }
            // else going back
            else {
                outerDeck.go(0);
            }
        });

        // listen for an "edit" tap
        $("#context-button").bind("tap", function (evt) {
            renderForm();
            outerDeck.go(1);
        });

        // listen for a list item tap
        $(".results li").live("tap", function (evt) {
            renderDetail(this.getAttribute("data-result-id"));
            outerDeck.go(1);
        });

        // listen for a form submit tap
        $("#search").live("tap", function (evt) {
            var query = $("#query").attr("value");

            if (query.length) {
                getAddressPosition(query);
            }
        });

        // listen for "use my current location" tap
        $("#auto").live("tap", function (evt) {
            getUserPosition();
        });
    };

    // get the user's current position
    var getUserPosition = function () {
        bc.device.getLocation(
            function (data) {
                position = [data.latitude, data.longitude];
                loadPlaces(position);
            },
            function(error) {
                bc.device.alert("Oops! There was an error retrieving " +
                    "your location. Please check your location " +
                    "preferences for this app.")
            }
        );
    };

    // get the position of a given address
    var getAddressPosition = function (query) {
        var url = encodeURI(Mark.up(GEO_URL, { address: query }));

        self.loadJSON("geocode", url, function (data) {
            if (data.status === "OK") {
                position = [
                    data.results[0].geometry.location.lat,
                    data.results[0].geometry.location.lng
                ];

                loadPlaces(position);
            }
            else {
                bc.device.alert("Oops! " + data.status);
            }
        });

        bc.core.cache("geocode-query", query);
    };

    // load place data for the given position [lat, lng]
    var loadPlaces = function (position) {
        var url = Mark.up(SEARCH_URL, {
            types: bc.core.getSetting("place-types"),
            radius: bc.core.getSetting("place-radius"),
            key: bc.core.getSetting("place-api-key"),
            location: position.join()
        });

        self.loadJSON("places", url, function (data) {
            renderList(data.results);
            renderMap(data.results);

            outerDeck.go(0);
        });
    };

    // initialize the google map
    var initMap = function () {
        var coords = new google.maps.LatLng(position[0], position[1]);

        var opts = {
            zoom: 13,
            center: coords,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: bc.context.os === "ios"
        };

        var elem = document.getElementById("results-map-card");

        map = new google.maps.Map(elem, opts);
    };

    // render a list of places
    var renderList = function (results) {
        var template = self.getTemplate("location-results");
        var context = {results: results};
        var html = Mark.up(template, context);

        resultsScroll.top();
        resultsScroll.setContent(html);

        self.hideLoading();
    };

    // render markers on the map
    var renderMap = function (results) {
        initMap();

        for (var i = 0, j = results.length; i < j; i++) {
            var loc = results[i].geometry.location;

            var marker = new google.maps.Marker({
                position: new google.maps.LatLng(loc.lat, loc.lng),
                map: map,
                title: results[i].name
            });

            marker.reference = results[i].reference;

            google.maps.event.addListener(marker, "click", function (evt) {
                console.log(this.reference);
                outerDeck.go(1);
                renderDetail(this.reference);

                return false;
            });
        }
    };

    // render place details
    var renderDetail = function (reference) {
        self.showLoading();

        var template = self.getTemplate("location-detail");
        var html = Mark.up(template, getPlace(reference));

        detailScroll.clear();
        detailScroll.setContent(html);

        // load additional place details after rendering
        loadPlace(reference);
    };

    // render form for inputting place query
    var renderForm = function () {
        var template = self.getTemplate("location-form");
        var context = { query: bc.core.cache("geocode-query") };
        var html = Mark.up(template, context);

        detailScroll.clear();
        detailScroll.setContent(html);
    };

    // load additional details (e.g. telephone) of a place
    var loadPlace = function (reference) {
        var url = Mark.up(PLACE_URL, {
            reference: reference,
            key: bc.core.getSetting("place-api-key")
        });

        self.loadJSON("place", url, function (data) {
            var template = self.getTemplate("location-detail-call");
            var html = Mark.up(template, data.result);
    
            $("#detail-btns").append(html);

            self.hideLoading();
        });
    };

    // get a place from the cached result set
    var getPlace = function (reference) {
        return self.getCachedFeedItem("places", "reference", reference, "results");
    };
}

LocationView.prototype = new View();
