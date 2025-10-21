const { DateTime } = require("luxon");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "blog-src/assets": "blog/assets" });

  eleventyConfig.addFilter("readableDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("dd LLL yyyy")
  );

  eleventyConfig.addFilter("isoDate", (dateObj) =>
    DateTime.fromJSDate(dateObj, { zone: "utc" }).toFormat("yyyy-LL-dd")
  );

  eleventyConfig.addFilter("pluck", (items = [], path = "") => {
    if (!Array.isArray(items) || !path) return [];
    const segments = String(path).split(".");
    return items.map((entry) => {
      return segments.reduce((acc, segment) => {
        if (acc && typeof acc === "object" && segment in acc) {
          return acc[segment];
        }
        return undefined;
      }, entry);
    });
  });

  eleventyConfig.addFilter("uniqueStrings", (items = []) => {
    if (!Array.isArray(items)) return [];
    const seen = new Set();
    return items.reduce((acc, item) => {
      if (item === undefined || item === null) {
        return acc;
      }
      const normalized = String(item).trim();
      if (!normalized) {
        return acc;
      }
      const key = normalized.toLowerCase();
      if (seen.has(key)) {
        return acc;
      }
      seen.add(key);
      acc.push(normalized);
      return acc;
    }, []);
  });

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
