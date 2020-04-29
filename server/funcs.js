module.exports.asyncErrorHandler = function(f) {
    return async function(req, res, next) {
        try {
            await f(req, res, next);
        } catch (error) {
            next(error)
        }
    }
};

module.exports.sleep = async function(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};