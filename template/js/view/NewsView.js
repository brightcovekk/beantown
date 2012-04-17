/* 
 * NewsView extends View. Usage:
 *
 * var view = new NewsView();
 * view.init();
 */
function NewsView() {
    // a refererence to this object
    var self = this;

    // loaded state of blog feed and twitter feed
    var loaded = { blog: false, tweets: false };

    // a banner component. wraps element with id "banner"
    var banner = new View.Banner("banner", "ニュース");

    // a sharing component. wraps element with id "share"
    var share = new View.Share("share");

    // a toggle component. wraps element with id "toggle"
    var toggle = new View.Toggle("toggle");

    // scrolling components
    var outerDeck;
    var innerDeck;
    var blogScroll;
    var tweetsScroll;
    var articleScroll;

    // twitter query URL
    var TWITTER_URL = "http://search.twitter.com/search.json?" +
        "q={{query}}" +
        "&rpp={{rpp}}";

    // the current article
    var contentURI = null;

    // initialize this view
    this.init = function () {
        initDeck();
        initTitles();
        initListeners();

        // load HTML fragments from file. see View.js -> loadTemplates()
        this.loadTemplates("../txt/news.txt", function() {
            loadBlog();
            this.show();
        });
    };

    // initialize scrolling. see lib/scrollworks.js
    var initDeck = function () {
        Deck.factory("outer-deck");

        outerDeck = Deck.get("outer-deck");
        innerDeck = Deck.get("inner-deck");
        blogScroll = Scrollbox.get("results-blog-scrollbox");
        tweetsScroll = Scrollbox.get("results-tweets-scrollbox");
        articleScroll = Scrollbox.get("article-scrollbox");
    };

    // initialize dynamic titles
    var initTitles = function () {
        var blogTitle = bc.core.getSetting("blog-title");
        var tweetsTitle = bc.core.getSetting("tweets-title");

        toggle.setLabels(blogTitle, tweetsTitle);
    };

    // initialize all event listeners
    var initListeners = function () {
        // listen for a toggle change
        $(toggle).bind("toggle", function (evt, params) {
            innerDeck.go(params.index);
        });

        // listen for an outer deck change
        $(outerDeck).bind("deckchange", function (evt, params) {
            banner.setTitle(getTitle());
            banner.enableBackButton(params.toIndex === 1,"戻る");
            banner.enableContextButton(true, params.toIndex === 1 ? "共有" : "更新");
            share.hide();

            if (params.toIndex == 0) {
                endArticleView();
            }
        });

        // listen for an inner deck change
        $(innerDeck).bind("deckchange", function (evt, params) {
            if (params.toIndex === 1 && loaded.tweets === false) {
                loadTweets();
            }
        });

        // listen for a "back" tap
        $("#back-button").live("tap", function (evt) {
            outerDeck.back();
        });

        // listen for a "share" or "refresh" tap
        $("#context-button").live("tap", function (evt) {
            if (outerDeck.getIndex() === 0) {
                if (innerDeck.getIndex() === 0) {
                    loadBlog();
                }
                else {
                    loadTweets();
                }
            }
            else {
                share.toggle();
            }
        });

        // listen for a list item tap
        $(".results li").live("tap", function (evt) {
            var resultType = this.getAttribute("data-result-type");
            var resultId = this.getAttribute("data-result-id");

            // tapped a blog item
            if (resultType === "blog-entry") {
                renderBlogEntry(resultId);
            }
            // tapped a twitter item
            else {
                renderTweet(resultId);
            }

            outerDeck.go(1);

            return false;
        });

        // TODO doc
        $(bc).bind("newconfigurations", function (evt, data) {
            if (data.settings.isNew) {
                // for demo purposes
                initTitles();
            }
        });

        // end article track on viewblur
        $(bc).bind("viewblur", function (evt) {
            endArticleView();
        });
    };

    // get the current page title 
    var getTitle = function () {
        return outerDeck.getIndex() === 1 ? toggle.getLabel() : "ニュース";
    };

    // load blog data. see View.js -> loadFeed()
    var loadBlog = function () {
        // first attempt to display data from cache
        var data = self.getCachedFeed("blog");
        if (data && !loaded.blog) {
            renderBlog({results: data});
        }

        // then load the latest
        self.loadFeed("blog", onBlogLoad);
    };

    // load tweets data. see View.js -> loadJSON()
    var loadTweets = function () {
        var url = Mark.up(TWITTER_URL, {
            query: bc.core.getSetting("twitter-query"),
            rpp: 50
        });

        self.loadJSON("tweets", url, onTweetsLoad);
    };

    // handle blog data. callback for loadBlog()
    var onBlogLoad = function (data) {
        renderBlog({results: data});

        loaded.blog = true;

        banner.enableContextButton(true, "更新");
    };

    // handle twitter data. callback for loadTweets()
    var onTweetsLoad = function (data) {
        renderTweets({results: data.results});

        loaded.tweets = true;

        banner.enableContextButton(true, "更新");
    };

    // render the blog with the loaded data (context)
    var renderBlog = function (context) {
        var template = self.getTemplate("blog-results");
        var html = Mark.up(template, context);

        blogScroll.setContent(html);
        blogScroll.top();
    };

    // render tweets with the loaded data (context)
    var renderTweets = function (context) {
        var template = self.getTemplate("tweet-results");
        var html = Mark.up(template, context);

        tweetsScroll.setContent(html);
        tweetsScroll.top();
    };

    // render blog detail for the given blog entry id
    var renderBlogEntry = function (id) {
        var template = self.getTemplate("blog-detail");
        var context = self.getCachedFeedItem("blog", "guid", id);
        var message = context.title;
        var link = context.link;

        renderDetail(template, context, message, link);

        startArticleView(context.link, context.title);
    };

    // render twitter detail for the given tweet id
    var renderTweet = function (id) {
        var template = self.getTemplate("tweet-detail");
        var context = self.getCachedFeedItem("tweets", "id_str", id, "results");
        var message = "Tweet from @" + context.from_user;
        var link = "http://twitter.com/#!/Support/status/" + id;

        renderDetail(template, context, message, link);
    };

    // render detail page given template string, context data, and sharing info
    var renderDetail = function (template, context, message, link) {
        var html = Mark.up(template, context);

        articleScroll.top();
        articleScroll.setContent(html);

        share.setContext(message, link);
    };

    var startArticleView = function (uri, name) {
        contentURI = uri;

        console.log("start track", [contentURI, name]);

        bc.metrics.startContentSession(contentURI, name);
    };

    var endArticleView = function () {
        if (contentURI) {
            bc.metrics.endContentSession(contentURI);

            console.log("end track", contentURI);
        }

        contentURI = null;
    };
}

NewsView.prototype = new View();
