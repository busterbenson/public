var Grailbird = function (type, date, data) {
  Grailbird.data = Grailbird.data || {};
  Grailbird.data[type+'_'+date] = data;
};

(function(exports) {
  "use strict";

  var User = {},
      Tweets = {},
      mixins = {};

// change the mustache tag delimiters so that it will leave the runtime variables alone
//
  var templates = {
    empty_month: Hogan.compile('<li class="without-tweets" title="" rel="tooltip" data-placement="bottom" data-date="" data-count="0"><span class="value">{{this_month}}</span></li>'),
    month_bar: Hogan.compile('<li><a href="#" class="with-tweets" title="{{str_title}}: {{str_count}}" rel="tooltip" data-placement="bottom" data-idx="{{data_idx}}" data-date="{{str_title}}" data-count="{{this_count}}"><span class="bar" style="height: {{this_height}}%;"></span><span class="value">{{this_month}}</span></a></li>'),
    header_str: Hogan.compile('{{title_str}} <span class="count">{{tweet_count}}</span>'),
    user_header: Hogan.compile('<li><h1 class="brand ltr-screen-name">@{{screen_name}}</h1></li>'),
    user_nav: Hogan.compile('<a href="#" class="icon-sprite icon-user dropdown-toggle" data-toggle="dropdown"></a><ul class="dropdown-menu"><li><a href="#user-info" data-toggle="modal"><i class="icon-user"></i>View account details</a></li><li class="divider"></li><li><a href="https://twitter.com/{{screen_name}}" target="_blank"><i class="icon-share-alt"></i>View profile on Twitter</a></li></ul>'),
    modal_header: Hogan.compile('<h3>Account details <span class="download-date muted">as of {{created_at_relative}}</span></h3>'),
    modal_user_details: Hogan.compile('<h3>{{full_name}}</h3><h4 class="muted ltr-screen-name">@{{screen_name}}</h4><div class="stats muted">{{#bio}}<p>{{bio}}</p>{{/bio}}<p>{{#location}}<a href="https://maps.google.com/?q={{location}}">{{location}}</a>{{/location}}{{#url}}{{#location}} &middot; {{/location}}<a href="{{url}}" title="{{#expanded_url}}{{expanded_url}}{{/expanded_url}}{{^expanded_url}}{{url}}{{/expanded_url}}">{{#display_url}}{{display_url}}{{/display_url}}{{^display_url}}{{url}}{{/display_url}}</a>{{/url}}</p></div>'),
    modal_payload_details: Hogan.compile('<p>{{tweets}} <span class="footer-label muted">Tweets</span></p>'),
    modal_account_details: Hogan.compile('<p>#{{id}} <span class="footer-label muted">User ID</span></p><p class="truncated">{{created_at_relative}} <span class="footer-label muted">Joined</span></p>'),
    nav_tab: Hogan.compile('<li class="{{sectionClass}}"><a href="#">{{sectionName}}</a></li>'),
    searching_for: Hogan.compile('Searching for {{{query}}} ...'),
    query_results_one: Hogan.compile('1 result matches {{{query}}}'),
    query_results_many: Hogan.compile('{{count}} results match {{{query}}}'),
    singular_tweet_count: Hogan.compile('{{count}} Tweet'),
    plural_tweet_count: Hogan.compile('{{count}} Tweets')
  };
//

  exports.init = function () {
    Grailbird.localizeStrings();
    var doc = $(document),
        header = $('.tweets-header');

    twt.settings.showLocalTimes = true;
    twt.settings.showRelativeTimes = true;
    twt.settings.product = 'archive';
    twt.settings.lang = payload_details.lang;

    // since twt is an imported library, we're going to mess with how it formats dates here, so that the changes aren't
    // overwritten. hopefully in the future it will use cldr properly and we can remove this.
    // we want it to look like it does on twitter.com: 10:15 AM - Mar 7, 2013, properly localized and in local time
    twt.formattedDate = function(str) {
      var d = twt.parseDate(str);
      var fmt = new TwitterCldr.DateTimeFormatter();
      var date, time;

      if (!d) return str;

      time = fmt.format(d, {"format": "additional", "type": "hm"});
      date = fmt.format(d, {"format": "date", "type": "long"})
      return [time, date].join(' - ')
    };

    twt.timeAgo = function(d, relative) {
      var fmt;
      var then = twt.parseDate(d), rightNow = new Date();

      if (!then) return "";

      var diff_seconds = Math.abs(rightNow.getTime() - then.getTime()) / 1000;
      var diff_minutes = Math.floor(diff_seconds / 60);
      var unit;

      if ((relative !== false) && (diff_minutes < (60 * 24 * 31)))  {
      // tweeted less than a month ago, so display time difference by unit "10 d"
        if (diff_minutes === 0) {
          unit = "second"
        } else if (diff_minutes < 60) {
          unit = "minute"
        } else if (diff_minutes < 60 * 24) {
          unit = "hour"
        } else if (diff_minutes < 60 * 24 * 31) {
          unit = "day"
        }
        // so many time units ago
        fmt = new TwitterCldr.TimespanFormatter();
        return fmt.format(diff_seconds, {direction: "none", type: "short", unit: unit});
      } else if (diff_minutes < 60 * 24 * 365) {
      // tweeted more than a month ago, but less than a year so show the month and day: "Mar 10"
        fmt = new TwitterCldr.DateTimeFormatter();
        return fmt.format(then, {"format": "additional", "type": "MMMd"});
      } else {
      // tweeted more than a year ago, so show the full date: Mar 10, 2012
        fmt = new TwitterCldr.DateTimeFormatter();
        return fmt.format(then, {format: "date", type: "long"});
      }
    };

    Grailbird.data = Grailbird.data || {};
    Grailbird.current_index = 0;

    User = Grailbird.user();
    User.init();

    Tweets = Grailbird.tweets();

    // Remove when tabs are implemented
    User.setState(Tweets);
    Tweets.init();

    $('.brand').click(function(e) {
      e.preventDefault();
      e.stopImmediatePropagation();
      $('.row .contents, .sidebar').removeClass('container-messages');
      $('.tweets-header .nav-clear').hide();
      $('.container').removeClass('searching');
      User.setState(Tweets);
      Tweets.init();
    });

    $('.tweets-header .nav-arrow').tooltip().click(function() {
      Tweets.displayTweets(Number($(this).attr('data-idx')));
      $(this).tooltip('show');
    });

    $('.navbar-search').submit(function(e) {
      e.preventDefault();

      var searchInput = $(this).find('.search-query').val(),
          searchString = searchInput.trim();

      if (!Grailbird.isValidSearchStr(searchString)) {
        $('.navbar-search').trigger('invalidSearch');
        return;
      }

      $('.navbar-search').trigger('dismissTooltip');
      $('.nav-arrow-left, .nav-arrow-right').tooltip('hide').hide();
      $('.container .tweets').fadeOut(0, function () {
        $('.months .with-tweets, .histogram').removeClass('active');
        $('.container').addClass('searching in-progress');
        $('.tweets-header-title').empty().text(templates.searching_for.render({'query' : searchInput}));
        $(this).empty();
        $(this).fadeIn(100);
        User.search(searchInput);
      });
    })
    .tooltip()
    .bind('dismissTooltip', function (e) {
      e.preventDefault();
      $(this).tooltip('hide');
    })
    .bind('invalidSearch', function (e) {
      e.preventDefault();
      $(this)
        .attr('data-original-title', 'Your query must be at least two characters.')
        .tooltip('show');
    });

    $('.navbar-search .search-query').blur(function(e) {
      $('.navbar-search').trigger('dismissTooltip');
    });

    $('.sidebar-nav .search-mask, .tweets-header .nav-clear').tooltip().click(jQuery.proxy(function(e) {
      e.preventDefault();
      User.getState().resetSearch();
    }, Grailbird));

    $('.icon-compose').tooltip();
    $('.icon-compose a').click(function(e){
      e.preventDefault();
      twt.popup($(this).attr('href'));
    });

    $(document).keyup(function (e) {
      if($('.container.searching').length === 0){
        // nav left if possible on keyup of left arrow
        if(e.keyCode === 37) {
          e.preventDefault();
          $('.nav-arrow-left:visible').click();
          $('.nav-arrow-right').tooltip('hide');
        }
        // nav right if possible on keyup of right arrow
        if(e.keyCode === 39) {
          e.preventDefault();
          $('.nav-arrow-right:visible').click();
          $('.nav-arrow-left').tooltip('hide');
        }
      } else {
        // exit search mode on keyup of 'esc'
        if(e.keyCode === 27) {
          $('.tweets-header .nav-clear:visible').click();
        }
      }
      // set focus and highlight search contents on keyup of /
      if(e.keyCode === 191) {
        $('.navbar-search .search-query:not(:focus)').focus().select();
      }

    });

    $(window).scroll(function() {
      var pos = doc.scrollTop();
      if(pos > 0) {
        header.addClass('raised');
      } else {
        header.removeClass('raised');
      }
    });
  };

  exports.extend = function (obj) {
    var args = Array.prototype.slice.call(arguments, 1),
        i = 0,
        l = args.length,
        prop,
        source;

    for (i; i < l; i++) {
      source = args[i];
      for (prop in source) {
        if (source[prop] !== undefined) {
          obj[prop] = source[prop];
        }
      }
    }
    return obj;
  };

  (function(exports) {
    exports.base = {
      init: function () {
        $('.navbar-search .search-query').attr('placeholder', 'Search all Tweets');
        this.buildNavigation();
        this.displayTweets(0);
      },
      buildNavigation: function () {
        // Note: Every DOM element constructed in this function must be removed and reinitialized as this
        // is called every time you click on a section nav element. If the DOM elements aren't flushed and
        // recreated, any click handlers bound to them will be bound to them again

        // build nav for each year/month
        var number_formatter = new TwitterCldr.DecimalFormatter();
        var date_formatter = new TwitterCldr.DateTimeFormatter();
        var count, status_file;
        var temp_date = new Date();
        var months = [
              'January',
              'February',
              'March',
              'April',
              'May',
              'June',
              'July',
              'August',
              'September',
              'October',
              'November',
              'December'
            ],
            self = this,
            $year_chart = $('<div class="histogram"><h3></h3><ol class="months unstyled"></ol></div>'),
            $year_chart_clone,
            month_bar = [],
            year_curr;

        $('.content-nav').empty();
        var month_count_max = _.max(this.status_index, function (month) {return month['tweet_count'];}),
            renderYear = function() {
              if ($year_chart_clone) {
                month_bar = month_bar.reverse();
                if (month_bar.length < 12) {
                  for (var m = 0; m < 12; m++) {
                    if (!month_bar[m] || month_bar[m].match(/class="value">(\d+)<\/span>/)[1] != m+1) {
                      month_bar.splice(m,0,templates.empty_month.render({this_month : m+1}));
                    }
                  }
                }
                $year_chart_clone.find('.months').append(month_bar.join(''));
              }
            };

        for (var i = 0, l = this.status_index.length; i < l; i++) {
          status_file = this.status_index[i];
          temp_date.setUTCFullYear(status_file.year, status_file.month - 1, 15);
          var title_str = date_formatter.format(temp_date, {"format": "additional", "type": "yMMMM"});
          count = number_formatter.format(status_file.tweet_count);
          var count_str = status_file.tweet_count > 1 ?
                            templates.plural_tweet_count.render({"count" : count}) :
                            templates.singular_tweet_count.render({"count" : count});
          var month_index = {
                this_year: status_file.year,
                this_month: status_file.month,
                this_count: count,
                this_height: (status_file.tweet_count / month_count_max.tweet_count) * 100,
                str_title: title_str,
                str_count: count_str,
                data_idx: i
              };

          status_file.title_str = title_str;

          if (status_file.year !== year_curr) {
            renderYear();

            $year_chart_clone = $year_chart.clone();
            month_bar = [];

            $year_chart_clone.find('h3').text(month_index.this_year);
            $('.content-nav').append($year_chart_clone);
            year_curr = month_index.this_year;
          }
          month_bar.push(templates.month_bar.render(month_index));
        }
        renderYear();

        $('.months .with-tweets').tooltip().click(function() {
          self.displayTweets(Number($(this).attr('data-idx')));
        });
      },

      displayTweets: function (tweet_index_id) {

        Grailbird.current_index = tweet_index_id;

        var timeline_options = {border: false, showMedia: true, popupWebIntents: true};
        var number_formatter = new TwitterCldr.DecimalFormatter();

        if (this.status_index.length === 0) return;

        var prev_month = 0,
            next_month = 0,
            tweet_month = this.status_index[tweet_index_id],
            tweet_array_name = tweet_month['var_name'],
            month_count = number_formatter.format(tweet_month.tweet_count),
            title = templates.header_str.render({
              title_str: tweet_month['title_str'],
              tweet_count: tweet_month.tweet_count > 1 ?
                            templates.plural_tweet_count.render({"count" : month_count}) :
                            templates.singular_tweet_count.render({"count" : month_count}),
            }),
            showTweets = function() {
              var header_title = $('.tweets-header-title');
              header_title.fadeOut(100);
              $('.container .contents .tweets').fadeOut(100, function () {
                header_title.empty().html(title).attr('title', '');
                $(this).empty();
                $(window).scrollTop(0);
                $('.navbar-search .search-query').val('');

                twt.timeline(
                  Grailbird.data[tweet_array_name],
                  timeline_options
                ).renderTo('.tweets');
                header_title.fadeIn(100);
                $(this).fadeIn(100);
              });
            };

        if (tweet_month.year === undefined) {
          $('.user-list .user').removeClass('active');
          $($('.user-list .user')[tweet_index_id]).addClass('active');
          timeline_options.showActions = false;
        } else {
          $('.months .with-tweets, .histogram').removeClass('active');
          $('.months .with-tweets[data-idx="'+tweet_index_id+'"]').addClass('active').parents('.histogram').addClass('active');
        }

        prev_month = Number(tweet_index_id)+1;
        next_month = Number(tweet_index_id)-1;
        if(tweet_index_id === 0) {
          next_month = null;
          $('.tweets-header .nav-arrow-right').hide();
        }
        if (this.status_index.length-1 == tweet_index_id) {
          prev_month = null;
          $('.tweets-header .nav-arrow-left').hide();
        }
        if(tweet_index_id < this.status_index.length-1) {
          $('.tweets-header .nav-arrow-left').attr({
            'data-idx': prev_month,
            'data-original-title': this.status_index[prev_month]['title_str']
          }).show();
        }

        if(tweet_index_id > 0) {
          $('.tweets-header .nav-arrow-right').attr({
            'data-idx': next_month,
            'data-original-title': this.status_index[next_month]['title_str']
          }).show();
        }

        if (!Grailbird.data[tweet_array_name]) {
          Grailbird.loadScript(tweet_month, showTweets);
        } else {
          showTweets();
        }
      },
      pluralize: function (value) {
        return (Number(value) === 1) ? this.str_singular : this.str_plural;
      },
      search: function (searchString) {
        var statusArr = this.status_index,
          statusIndex = this.status_index.length,
          statusIndexEntry,
          result = [],
          searchRegex = new RegExp(escapeRegexCharacters(searchString), "im"),
          escapedStr = escapeRegexCharacters(escapeURL(searchString)),
          escapedSearchRegex = new RegExp(escapedStr, "im"),
          readyCount = 0;

        while(statusIndex--) {
          statusIndexEntry = statusArr[statusIndex];

          if (!Grailbird.data[statusIndexEntry.var_name]) {
            Grailbird.loadScript(statusIndexEntry, (function(sie) {
              return function() {
                searchFunc(sie['var_name']);
              };
            })(statusIndexEntry));
          } else {
            window.setTimeout((function(sie) {
              return function(){
                searchFunc(sie['var_name']);
              };
            })(statusIndexEntry), 1);
          }
        }

        function escapeURL (text) {
          return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        }

        function escapeRegexCharacters (text) {
          return text.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
        }

        function unescapeHtml (text) {
          var div = document.createElement('div');
          div.innerHTML = text;
          return div.firstChild.nodeValue;
        }

        function searchFunc (statusArrName) {
          var filteredResults = _.filter(Grailbird.data[statusArrName], function(tweet) {
            var searchMatch = false;
            if(!!unescapeHtml(tweet.text).match(searchRegex)){
              searchMatch = true;
            } else if(!!(tweet.user && (tweet.user.screen_name.match(searchRegex) || ('@'+tweet.user.screen_name).match(searchRegex) || tweet.user.name.match(searchRegex)))){
              searchMatch = true;
            } else if(!!(tweet.retweeted_status && (unescapeHtml(tweet.retweeted_status.text).match(searchRegex)))){
              searchMatch = true;
            } else if(!!(tweet.retweeted_status && (tweet.retweeted_status.user && tweet.retweeted_status.user.name.match(searchRegex)))){
              searchMatch = true;
            } else if(!!(tweet.retweeted_status && (tweet.retweeted_status.user && tweet.retweeted_status.user.screen_name.match(searchRegex)))){
              searchMatch = true;
            } else if(!!(tweet.retweeted_status && (tweet.retweeted_status_user && ('@'+tweet.retweeted_status.user.screen_name).match(searchRegex)))){
              searchMatch = true;
            } else if(!!(tweet.entities)){
              _.each(tweet.entities.urls || [], function (u){
                if((u.display_url && u.display_url.match(escapedSearchRegex)) || (u.expanded_url && u.expanded_url.match(escapedSearchRegex))){
                  searchMatch = true;
                  return;
                }
              });
              _.each(tweet.entities.media || [], function (u){
                if((u.display_url && u.display_url.match(escapedSearchRegex)) || (u.expanded_url && u.expanded_url.match(escapedSearchRegex))){
                  searchMatch = true;
                }
              });
            }
            return searchMatch;
          });
          _.each(filteredResults, function(t){result.push(t);});
          showResults();
        }

        function showResults () {
          readyCount++;
          if (readyCount == statusArr.length) {
            var sortedResult = _.sortBy(result, function(x) {return Date.parse(x.created_at)*-1;});
            var header_title = (result.length === 1) ?
                templates.query_results_one.render({"query" : searchString}) :
                templates.query_results_many.render({"query" : searchString, "count" : result.length});

            $('.container .tweets').fadeOut(100, function () {
              $('.container').removeClass('in-progress');
              $('.tweets-header-title').empty().text(header_title).attr('title', header_title);
              $('.tweets-header .nav-clear').show();
              $(this).empty();

              twt.timeline(sortedResult, {border: false, showMedia: true, popupWebIntents: false}).renderTo('.tweets');

              _.each($('.e-content .p-name, .h-card .screen-name'), function(tweet) {
                _.each($(tweet).find("*").andSelf(), function(e) {$(e).highlight(escapeRegexCharacters(searchString), "found");});
              });
              $(this).fadeIn(100);
            });
          }
        }
      },
      resetSearch: function () {
        $('.container').removeClass('searching');
        Tweets.displayTweets(Grailbird.current_index);
      }
    };
  })(mixins);

  (function(exports) {
    var Tweets = function () {
      this.str_singular       = 'Tweet';
      this.str_plural         = 'Tweets';
      this.status_index       = tweet_index;
    };

    Tweets.prototype = Grailbird.extend({}, mixins.base);
    exports.tweets = function () {
      return new Tweets();
    };

  })(Grailbird);

  (function (exports){

    var User = function () {
      var active_display;
    };

    User.prototype.init = function () {
      user_details.created_at_relative = twt.formattedDate(user_details.created_at);
      payload_details.created_at_relative = twt.formattedDate(payload_details.created_at);

      user_details.id = Grailbird.insertCommas(user_details.id);

      payload_details.tweets = Grailbird.insertCommas(payload_details.tweets);

      $('#primary-nav').append(templates.user_header.render(user_details));
      $('#util-nav .dropdown').append(templates.user_nav.render(user_details));

      $('.modal-header').append(templates.modal_header.render(payload_details));
      $('.modal-body .user-details').append(templates.modal_user_details.render(user_details));
      $('.modal-footer .stats').append(templates.modal_payload_details.render(payload_details)).append(templates.modal_account_details.render(user_details));
    };

    User.prototype.setState = function (obj) {
      this.active_display = obj;
    };
    User.prototype.getState = function () {
      return this.active_display;
    };
    User.prototype.search = function (searchString) {
      this.active_display.search(searchString);
    };
    exports.user = function () {
      return new User();
    };

    exports.localizeStrings = function() {
      $('html').attr('lang', payload_details["lang"]);
      document.title = "Your Twitter archive";
      $('#footer-text').append("This is an offline archive of your Tweets from Twitter. Use the months above to navigate the archive.");
      var compose_new_tweet = "Compose new Tweet";
      $('#compose-tweet').append(compose_new_tweet);
      $('#compose-tweet-a').attr('title', compose_new_tweet);
      $('#compose-tweet-li').attr('data-original-title', compose_new_tweet);
    }

  })(Grailbird);


  exports.createNavTab = function (title, sectionObj) {
    var selector = 'nav-'+title.toLowerCase();

    $('#primary-nav').append(
      templates.nav_tab.render({
        sectionClass: selector,
        sectionName: title
      })
    );

    var sectionTab = $('.'+selector);
    sectionTab.click(function(e) {
      $(this).addClass('active').siblings().removeClass('active');
      $('.row .contents, .sidebar').removeClass('container-messages');
      User.setState(sectionObj);
      sectionObj.init();
    });
    return sectionTab;
  };

  exports.isValidSearchStr = function (searchString) {
    return searchString.length > 1;
  };

  exports.loadScript = function (tweet_month, callback) {
    var newScript = document.createElement('script'),
        loadCallback = function () {
          tweet_month.loaded = true;
          callback && callback();
        };

    newScript.src = tweet_month['file_name'];
    newScript.charset = 'utf-8';
    newScript.onreadystatechange = function() {
      if (this.readyState == 'complete' || this.readyState == 'loaded') {
        loadCallback();
      }
    };
    newScript.onload = loadCallback;
    document.getElementsByTagName('head')[0].appendChild(newScript);
  };

  exports.insertCommas = function InsertCommmas(num) {
    num = num.toString();
    return (num.length > 3) ? self.Grailbird.insertCommas(num.substr(0, num.length - 3)) + "," + num.substr(num.length - 3) : num ;
  };

})(Grailbird);

jQuery.fn.highlight = function (str, class_name) {
// change the mustache tag delimiters so that it will leave the runtime variables alone
//
  var regex = new RegExp(str, "gi"),
      search_highlight = Hogan.compile('<span class="{{class_name}}">{{{match}}}</span>');
//

  return this.each(function () {
    $(this).contents().filter(function() {
      return (this.nodeType == 3 && regex.test(this.nodeValue)) || ($(this).text().toLowerCase() === str.toLowerCase());
    }).replaceWith(function() {
      if(this.nodeValue === null) {
        return search_highlight.render({
          class_name: class_name,
          match: $(this).html()
        });
      } else {
        return (this.nodeValue || "").replace(regex, function(match) {
          return search_highlight.render({
            class_name: class_name,
            match: match
          });
        });
      }
    });
  });
};

$(document).ready(function(){
  Grailbird.init();
});
