# How to use your Twitter archive

The simplest way to use your Twitter archive is through the archive browser interface provided in this file. Just double-click `index.html` from the root folder and you can browse your entire history of Tweets from inside your browser.

---

In the `data` folder, your Twitter archive is present in two formats: JSON and CSV exports by month and year.

* CSV is a generic format that can be imported into many data tools, spreadsheet applications, or consumed simply using a programming language.

## JSON for Developers

* The JSON export contains a full representation of your Tweets as returned by v1.1 of the Twitter API. See https://dev.twitter.com/docs/api/1.1 for more information.
* The JSON export is also used to power the archive browser interface (index.html).
* To consume the export in a generic JSON parser in any language, strip the first and last lines of each file.

To provide feedback, ask questions, or share ideas with other Twitter developers, join the discussion forums on https://dev.twitter.com.