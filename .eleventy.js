module.exports = function(eleventyConfig) {
  // Copy the admin folder as-is to output
  eleventyConfig.addPassthroughCopy("blog-src/admin");

  return {
    dir: {
      input: "blog-src",
      output: "."   // <--- deploy to root instead of /blog
    }
  };
};
