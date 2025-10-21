const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "blog-src/assets": "blog/assets" });

  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("dd LLL yyyy")
  );

  eleventyConfig.addFilter("isoDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd")
  );

  eleventyConfig.addCollection("latestPosts", (collectionApi) =>
    collectionApi.getFilteredByTag("posts").reverse().slice(0, 6)
  );

  return {
    dir: {
      input: "blog-src",
      includes: "layouts",
      data: "_data",
      output: "."
    }
  };
};
