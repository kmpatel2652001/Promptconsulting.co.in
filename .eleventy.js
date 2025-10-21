module.exports = function(eleventyConfig) {
  // Copy the admin folder to output
  eleventyConfig.addPassthroughCopy("blog-src/admin");

  return {
    dir: {
      input: "blog-src",
      output: "blog"
    }
  };
};
