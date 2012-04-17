/* 
 * MenuView extends View. Usage:
 *
 * var view = new MenuView();
 * view.init();
 */
function MenuView() {
    // a refererence to this object
    var self = this;

    // a banner component. wraps element with id "banner"
    var banner = new View.Banner("banner", "メニュー");

    // scrolling component
    var deck;

    // currently viewed category ID (e.g. "coffee")
    var catgoryId = null;

    // currently viewed category title (e.g. "Coffees")
    var categoryTitle = "";

    // initialize this view
    this.init = function () {
        initDeck();
        initBanner();
        initListeners();

        // load HTML fragments from file. see View.js -> loadTemplates()
        this.loadTemplates("../txt/menu.txt", function() {
            loadMenu();
            this.show();
        });
    };

    // initialize scrolling. see lib/scrollworks.js
    var initDeck = function () {
        deck = Deck.factory("deck");
    };

    // initialize page banner
    var initBanner = function () {
        banner.enableContextButton(getFavorites().length > 0, "お気に入り");
    };

    // initialize all event listeners
    var initListeners = function () {
        // listen for a category item tap
        $(".brick").live("tap", function (evt) {
            categoryId = this.getAttribute("data-result-id");
            categoryTitle = this.getAttribute("data-result-title");

            renderCategory(categoryId);

            deck.go(1);
        });

        // listen for a "back" tap
        $("#back-button").live("tap", function (evt) {
            deck.back();
        });

        // listen for a "favorites" button tap
        $("#context-button").live("tap", function (evt) {
            categoryId = "favorites";
            categoryTitle = "お気に入り";

            renderCategory(categoryId);

            deck.go(1);
        });

        // listen for a list item tap
        $(".results li").live("tap", function (evt) {
            var resultId = this.getAttribute("data-result-id");

            renderItem(resultId);

            deck.go(2);
        });

        // listen for "add to/remove from favorites" tap
        $(".save").live("tap", function (evt) {
            var resultId = this.getAttribute("data-result-id");

            if (isFavorite(resultId)) {
                unsetFavorite(resultId);
                this.innerHTML = "お気に入りに登録";
            }
            else {
                setFavorite(resultId);
                this.innerHTML = "お気に入りから外す";
            }

            // prevent tap from propagating to parent <li>
            evt.stopPropagation();
        });

        // listen for deck change
        $(deck).bind("deckchange", function (evt, params) {
            var idx = params.toIndex;

            banner.setTitle(idx === 0 ? "メニュー" : categoryTitle);
            banner.enableBackButton(idx > 0,"戻る");
            banner.enableContextButton(idx === 0 && getFavorites().length > 0);
        });
    };

    // load menu data. see View.js -> loadFeed()
    var loadMenu = function () {
        // first attempt to display data from cache
        var data = self.getCachedFeed("menu");
        if (data) {
            renderIndex(data);
        }

        // then load the latest
        self.loadFeed("menu", function (data) {
            renderIndex(data);
        });
    };

    // render the index
    var renderIndex = function (context) {
        var template = self.getTemplate("menu-index");
        var html = Mark.up(template, context);

        var card = deck.getCard(0);
        card.setContent(html);
    };

    // render the category list
    var renderCategory = function (categoryId) {
        var data = self.getCachedFeed("menu");
        var items = getItemsByType(data.items, categoryId);

        var template = self.getTemplate("menu-results");
        var context = {items: items};
        var html = Mark.up(template, context);

        var scrollbox = Scrollbox.get("menu-category-scrollbox");
        scrollbox.clear();
        scrollbox.setContent(html);
    };

    // render item details
    var renderItem = function (id) {
        var template = self.getTemplate("menu-detail");
        var context = self.getCachedFeedItem("menu", "id", id, "items");
        var html = Mark.up(template, context);

        var scrollbox = Scrollbox.get("menu-detail-scrollbox");
        scrollbox.clear();
        scrollbox.setContent(html);
    };

    // get items of a particular type (e.g. "coffee") from the cached feed
    var getItemsByType = function (items, type) {
        var results = [];
        var favorites = getFavorites();

        if (type === "favorites") {
            for (var i = 0, j = favorites.length; i < j; i++) {
                var item = self.getCachedFeedItem("menu", "id", favorites[i], "items");
                if (item) {
                    item.favorite = true;
                    results.push(item);
                }
            }
        }
        else {
            for (var i = 0, j = items.length; i < j; i++) {
                if (items[i].types.indexOf(type) > -1) {
                    var item = items[i];
                    item.favorite = favorites.indexOf(item.id) > -1;
                    results.push(item);
                }
            }
        }

        return results;
    };

    // get an array (IDs) of the user's favorites
    var getFavorites = function () {
        return bc.core.cache("menu-favorites") || [];
    };

    // determine if the given ID is in the user's favorites
    var isFavorite = function (id) {
        return getFavorites().indexOf(id) > -1;
    };

    // set a favorite in cache. see View.js -> saveFavorite()
    var setFavorite = function (id) {
        self.saveFavorite("menu-favorites", id);
    };

    // remove a favorite from cache. see View.js -> deleteFavorite()
    var unsetFavorite = function (id) {
        self.deleteFavorite("menu-favorites", id);

        if (categoryId === "favorites") {
            $("li[data-result-id='" + id + "']").fadeOut();
        }
    };
}

MenuView.prototype = new View();
