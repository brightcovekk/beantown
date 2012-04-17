/* 
 * LearnView extends View. Usage:
 *
 * var view = new LearnView();
 * view.init();
 */
function LearnView() {
    // a refererence to this object
    var self = this;

    // loaded state of brightcove feed and youtube feed
    var loaded = { brightcove: false, youtube: false };

    // a banner component. wraps element with id "banner"
    var banner = new View.Banner("banner", "ビデオ");

    // a toggle component. wraps element with id "toggle"
    var toggle = new View.Toggle("toggle");

    // scrolling component
    var deck;

    // initialize this view
    this.init = function () {
        initDeck();
        initTitles();
        initListeners();

        // load HTML fragments from file. see View.js -> loadTemplates()
        this.loadTemplates("../txt/learn.txt", function() {
            loadBrightcove();
            enableRotation();
            this.show();
        });
    };

    // enable auto-rotation
    var enableRotation = function () {
        bc.device.setAutoRotateDirections(["all"],
            function (data) {
            },
            function (error) {
                if (bc.core.current_mode === bc.core.mode.PRODUCTION) {
                    bc.device.alert(data.errorMessage);
                }
            }
        );
    };

    // initialize scrolling. see lib/scrollworks.js
    var initDeck = function () {
        deck = Deck.factory("deck");
    };

    // initialize dynamic titles
    var initTitles = function () {
        var brightcoveTitle = bc.core.getSetting("brightcove-title");
        var youtubeTitle = bc.core.getSetting("youtube-title");

        toggle.setLabels(brightcoveTitle, youtubeTitle);
    };

    // initialize all event listeners
    var initListeners = function () {
        // listen for a toggle change
        $(toggle).bind("toggle", function (evt, params) {
            deck.go(params.index);
        });

        // listen for a deck change
        $(deck).bind("deckchange", function (evt, params) {
            if (params.toIndex === 1 && loaded.youtube === false) {
                loadYouTube();
            }
        });

        // listen for a "close" tap
        $("#close-button").live("tap", function (evt) {
            $("#overlay").empty().hide();
        });

        // listen for a list item tap
        $(".results li").live("tap", function (evt) {
            var resultType = this.getAttribute("data-result-type");
            var resultId = this.getAttribute("data-result-id");

            if (resultType === "brightcove") {
                var playlistIdx = $(this).parent().attr("data-playlist-idx");
                renderBrightcoveDetail(resultId, playlistIdx);
            }
            else {
                renderYouTubeDetail(resultId);
            }
        });
    };

    // load brightcove data. see View.js -> loadFeed()
    var loadBrightcove = function () {
        // first attempt to display data from cache
        var data = self.getCachedFeed("brightcove-videos");
        if (data && !loaded.brightcove) {
            renderBrightcoveIndex(data);
        }

        // then load the latest
        self.loadFeed("brightcove-videos", onBrightcoveLoad);
    };

    // load youtube data. see View.js -> loadFeed()
    var loadYouTube = function () {
        var playlistId = bc.core.getSetting("youtube-playlist-id");
        var options = { parameterizedFeedValues: { playlistId: playlistId } };

        self.loadFeed("youtube-videos", onYouTubeLoad, options);
    };

    // handle brightcove data. callback for loadBrightcove()
    var onBrightcoveLoad = function (data) {
        renderBrightcoveIndex(data);

        loaded.brightcove = true;
    };

    // handle youtube data. callback for loadYouTube()
    var onYouTubeLoad = function (data) {
        renderYouTubeIndex(data);

        loaded.youtube = true;
    };

    // render a list of brightcove videos
    var renderBrightcoveIndex = function (context) {
        var template = self.getTemplate("brightcove-results");
        var html = Mark.up(template, context);

        var scrollbox = Scrollbox.get("results-brightcove-scrollbox");
        scrollbox.setContent(html);
    };

    // render a list of youtube videos
    var renderYouTubeIndex = function (data) {
        var template = self.getTemplate("youtube-results");
        var html = Mark.up(template, {results: data});

        var scrollbox = Scrollbox.get("results-youtube-scrollbox");
        scrollbox.setContent(html);
    };

    // render a brightcove video detail
    var renderBrightcoveDetail = function (videoId, playlistIdx) {
        var playerKey = bc.core.getSetting("brightcove-player-key");
        var playerId = bc.core.getSetting("brightcove-player-id");

        var data = self.getCachedFeed("brightcove-videos");
        var template = self.getTemplate("brightcove-detail");
        var context = self.getDataItem(data.items[playlistIdx].videos, "id", videoId);

        context.playerKey = playerKey;
        context.playerId = playerId;

        renderDetail(template, context);

        brightcove.createExperiences();
    };

    // render a youtube video detail
    var renderYouTubeDetail = function (videoId) {
        var template = self.getTemplate("youtube-detail");
        var context = self.getCachedFeedItem("youtube-videos", "id", videoId);

        renderDetail(template, context);
    };

    // render video detail
    var renderDetail = function (template, context) {
        var html = Mark.up(template, context);

        // using an overlay here instead of a card transition because
        // ios < 5 doesn't allow iframes to be rendered off screen. :(

        $("#overlay").html(html).show();
    };
}

LearnView.prototype = new View();
