const _ = require('lodash');

const { models: { mergeStages } } = require('strapi-utils');

module.exports = {
  find: async function (filters = {}, populate) {
    const hook = strapi.hook[this.orm];
    // Generate stages.
    const populateStage = hook.load().generateLookupStage(this, { whitelistedPopulate: populate }); // Nested-Population
    const matchStage = hook.load().generateMatchStage(this, filters); // Nested relation filter
    const aggregateStages = mergeStages(populateStage, matchStage);

    const result = this.aggregate(aggregateStages);

    if (_.has(filters, 'start')) result.skip(filters.start);
    if (_.has(filters, 'limit')) result.limit(filters.limit);
    if (_.has(filters, 'sort')) result.sort(filters.sort);

    return result;
  },

  count: async function (params = {}) {
    return Number(await this
      .count(params));
  },

  findOne: async function (params, populate) {
    const primaryKey = params[this.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [this.primaryKey]: primaryKey
      };
    }

    return this
      .findOne(params)
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  create: async function (params) {
    return this.create(Object.keys(params).reduce((acc, current) => {
      if (_.get(this._attributes, [current, 'type']) || _.get(this._attributes, [current, 'model'])) {
        acc[current] = params[current];
      }

      return acc;
    }, {}))
      .catch((err) => {
        if (err.message.indexOf('index:') !== -1) {
          const message = err.message.split('index:');
          const field = _.words(_.last(message).split('_')[0]);
          const error = { message: `This ${field} is already taken`, field };

          throw error;
        }

        throw err;
      });
  },

  update: async function (search, params = {}) {
    if (_.isEmpty(params)) {
      params = search;
    }

    const primaryKey = search[this.primaryKey] || search.id;

    if (primaryKey) {
      search = {
        [this.primaryKey]: primaryKey
      };
    }

    return this.update(search, params, {
      strict: false
    })
      .catch((error) => {
        const field = _.last(_.words(error.message.split('_')[0]));
        const err = { message: `This ${field} is already taken`, field };

        throw err;
      });
  },

  delete: async function (params) {
    // Delete entry.
    return this
      .remove({
        [this.primaryKey]: params[this.primaryKey] || params.id
      });
  },

  deleteMany: async function (params) {
    // Delete entry.
    return this
      .remove({
        [this.primaryKey]: {
          $in: params[this.primaryKey] || params.id
        }
      });
  },

  search: async function (params) {
    const re = new RegExp(params.id);

    return this
      .find({
        '$or': [
          { username: re },
          { email: re }
        ]
      });
  },

  addPermission: async function (params) {
    return this
      .create(params);
  },

  removePermission: async function (params) {
    return this
      .remove(params);
  }
};
