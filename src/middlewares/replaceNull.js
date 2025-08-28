// middlewares/replaceNull.js
function replaceNull(req, res, next) {
  const oldJson = res.json;

  function replace(obj) {
    if (obj === null) return "";

    if (Array.isArray(obj)) {
      return obj.map((item) => replace(item));
    }

    if (obj && typeof obj === "object") {
      // Only work with plain JS objects, not mongoose docs
      const plainObj = obj.toObject ? obj.toObject() : obj;

      for (let key in plainObj) {
        plainObj[key] = replace(plainObj[key]);
      }
      return plainObj;
    }

    return obj;
  }

  res.json = function (data) {
    try {
      const safeData = replace(data);
      return oldJson.call(this, safeData);
    } catch (err) {
      console.error("replaceNull error:", err);
      return oldJson.call(this, data); // fallback to original
    }
  };

  next();
}

module.exports = replaceNull;
