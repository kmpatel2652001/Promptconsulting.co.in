module.exports = function(eleventyConfig) {
  eleventyConfig.addPassthroughCopy("blog-src/assets");
  
  eleventyConfig.addFilter("date", function(date, format) {
    const d = new Date(date);
    if (format === "yyyy-LL-dd") {
      return d.toISOString().split('T')[0];
    }
    if (format === "dd LLL yyyy") {
      return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return d.toISOString();
  });
  
  eleventyConfig.addCollection("posts", function(collectionApi) {
    return collectionApi.getFilteredByGlob("blog-src/posts/*.md");
  });

  return {
    dir: {
      input: "blog-src",
      output: "blog",
      includes: "_includes",
      layouts: "layouts"
    },
    templateFormats: ["md", "njk", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk"
  };
};
