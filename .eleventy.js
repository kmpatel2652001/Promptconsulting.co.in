module.exports = function(eleventyConfig) {
  // Copy the admin folder to the output root
  eleventyConfig.addPassthroughCopy("blog-src/admin");

  // Copy static assets folder
  eleventyConfig.addPassthroughCopy("assets");

  return {
    dir: {
      input: "blog-src",   // source folder
      output: ".",         // deploy to root of site
    },
    // Optional: disable template processing for static files
    passthroughFileCopy: true
  };
};
