#!~/.nvm/versions/node/v16.20.2/bin/node

// ~/.nvm/versions/node/v16.14.0/bin/node ~/Documents/resources/scripts/carbon-cron/carbon-cron.js

/** Flags
 * --reset: to clear out successful urls and run
 * --ignore: to run without filtering out successful urls
 */

const { default: axios } = require("axios");
const jsdom = require("jsdom");
const fs = require("fs");

const home = process.env["HOME"];
const flag = process.argv[2];

async function getCarbon(url) {
  const api = "https://api.websitecarbon.com/b?url=";
  try {
    const res = await axios.get(api + url);
    fs.writeFileSync(
      `${home}/Documents/resources/scripts/carbon-cron/successful-urls.txt`,
      "\n" + url,
      { flag: "a" }
    );
    return res.data;
  } catch (e) {
    return {
      url,
      status: e.response.status,
      statusText: e.response.statusText,
    };
  }
}

async function parseSitemap() {
  const res = await axios.get(
    "https://raw.githubusercontent.com/bsc-xdc/anatomy/master/public/sitemap.xml"
  );
  const dom = new jsdom.JSDOM(res.data, { contentType: "application/xml" });
  return Array.from(
    dom.window.document.querySelectorAll("loc"),
    (loc) => loc.textContent
  );
}

function getSuccessfulUrls() {
  if (flag === "--reset") {
    fs.writeFileSync(
      `${home}/Documents/resources/scripts/carbon-cron/successful-urls.txt`,
      "",
      { flag: "w" }
    );
    return [];
  } else if (flag === "--ignore") {
    return [];
  } else {
    return fs
      .readFileSync(
        `${home}/Documents/resources/scripts/carbon-cron/successful-urls.txt`,
        "utf8"
      )
      .split("\n");
  }
}

async function hitUrls() {
  const urls = await parseSitemap();
  const log = JSON.parse(
    fs.readFileSync(
      `${home}/Documents/resources/scripts/carbon-cron/log.json`,
      "utf8"
    )
  );
  let successfulUrls = getSuccessfulUrls();
  const filteredUrls = urls
    .map((url) => url.replace(/\/$/m, ""))
    .filter((url) => !successfulUrls.includes(url));
  const promises = filteredUrls.map((url) => getCarbon(url));
  const results = Array.from(await Promise.all(promises));
  log[new Date().toLocaleString()] = {
    average: {
      carbon:
        results.filter((r) => !!r.c).reduce((acc, cur) => acc + cur.c, 0) /
        results.length,
      percent:
        results.filter((r) => !!r.p).reduce((acc, cur) => acc + cur.p, 0) /
        results.length,
    },
    results,
  };
  fs.writeFileSync(
    `${home}/Documents/resources/scripts/carbon-cron/log.json`,
    JSON.stringify(log, null, 2)
  );
}

hitUrls();
