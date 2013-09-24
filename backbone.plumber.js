/**
* Plumbing
*
* This is mainly used to add an additional step when
* generating views, and enable better memory management. 
* Adds the possibility for animations between views.
*
* Includes code from Backbone.Babysitter by Derick Bailey.
* Distributed under MIT license
* 
* @author rkalms <rkalms@vertic.com>
*/

/*jslint browser: true, white: true, nomen: true */
/*global define, Backbone*/

Backbone.Pipe = (function (Backbone, _) {
	'use strict';

	/**
	* Override standard View remove method.
	*
	* @param {object} element
	*/
	Backbone.View.prototype.remove = function (element) {
		if (element) {
			$(element).remove();
		} else {
			this.$el.empty();
		}

		this.undelegateEvents();

		return this;
	};

	function ViewController(options) {
		this._views = {};
		this._indexByModel = {};
		this._indexByCustom = {};

		this._configure(options || {});

		this.initialize.apply(this, arguments);
	}

	// Borrowing extend method from Backbone.Model.
	ViewController.extend = Backbone.Model.extend;

	// List of view options to be merged as properties.
	var controllerOptions = ['model', 'collection', 'views'];

	_.extend(ViewController.prototype, Backbone.Events, {
		/**
		 * Override this function.
		 */
		initialize: function () {},

		// Add a view to this container. Stores the view
		// by 'cid' and makes it searchable by the model
		// cid (and model itself). Optionally specify
		// a custom key to store an retrieve the view.
		storeView: function (view, customIndex) {
			var viewCid = view.cid;

			// store the view
			this._views[viewCid] = view;

			// index it by model
			if (view.model){
				this._indexByModel[view.model.cid] = viewCid;
			}

			// index by custom
			if (customIndex){
				this._indexByCustom[customIndex] = viewCid;
			}

			this._updateLength();
		},

		// Remove a view
		removeFromContainer: function (view) {
			var viewCid = view.cid;

			// delete model index
			if (view.model){
				delete this._indexByModel[view.model.cid];
			}

			// delete custom index
			_.any(this._indexByCustom, function(cid, key) {
				if (cid === viewCid) {
					delete this._indexByCustom[key];
					return true;
				}
			}, this);

			// remove the view from the container
			delete this._views[viewCid];

			// update the length
			this._updateLength();
		},

		/**
		 * Remove view
		 */
		removeView: function (view) {
			if (view !== null) {
				this.removeFromContainer(view);
				view.remove();
			}
		},

		/**
		 * Attach and control content.
		 *
		 * @param {object} index.
		 */
		attach: function (view) {
			var model, content;

			// View rendering with collections is a bit trickier.
			// Right now we're just delegating any render logic to the view itself.
			if (!view.collection) {
				if (view.model.attributes !== undefined) {
					model = view.model.toJSON();
				} else {
					model = view.model;
				}

				if (view.template !== undefined) {
					content = $(view.template(model));
					view.$el.html(content);
				}
			
				view.render();
			}
		},

		/**
		 * Wrapper for creating views.
		 *
		 * @param {string} customIndex - Identifier. Should be unique for the view.
		 * @param {object} ViewType - Passed view.
		 * @param {object} options - Passed options for the view.
		 */
		createView: function (ViewType, options, customIndex) {
			var view = new ViewType(options);

			if (customIndex) {
				this.storeView(view, customIndex);
			} else {
				this.storeView(view);
			}

			return view;
		},

		// Apply a method on every view in the container,
		// passing parameters to the call method one at a
		// time, like `function.apply`.
		apply: function (method, args) {
			_.each(this._views, function(view){
				if (_.isFunction(view[method])){
					view[method].apply(view, args || []);
				}
			});
		},

		/**
		 * Attach and control content.
		 *
		 * @param {string|number} index.
		 */
		attachSingleView: function (index) {
			var model,
				content;

			var view = this._views[index];

			this.attach(view);
		},

		/**
		 * Attach all views in container.
		 */
		attachViews: function () {
			_.each(this._views, function (view) {
				this.attach(view);
			}, this);
		},

		// Find a view by the model that was attached to
		// it. Uses the model's `cid` to find it.
		_getByModel: function (model) {
			return this.getByModelCid(model.cid);
		},

		// Find a view by the `cid` of the model that was attached to
		// it. Uses the model's `cid` to find the view `cid` and
		// retrieve the view using it.
		_getByModelCid: function (modelCid) {
			var viewCid = this._indexByModel[modelCid];
			return this.getByCid(viewCid);
		},

		// Find a view by a custom indexer.
		_getByCustom: function (index) {
			var viewCid = this._indexByCustom[index];
			return this.getByCid(viewCid);
		},

		// Find by index. This is not guaranteed to be a
		// stable index.
		_getByIndex: function (index) {
			return _.values(this._views)[index];
		},

		// retrieve a view by it's `cid` directly
		_getByCid: function (cid) {
			return this._views[cid];
		},

		// Update the `.length` attribute on this container
		_updateLength: function(){
			this.length = _.size(this._views);
		},

		/** 
		 * Borrowed from core.
		 *
		 * Performs the initial configuration of a Controller with a set of options.
		 * Keys with special meaning *(e.g. model, collection)* are
		 * attached directly to the view.  See `viewOptions` for an exhaustive
		 * list.
		 *
		 * @param {object} options
		 */
		_configure: function (options) {
			if (this.options) {
				options = _.extend({}, _.result(this, 'options'), options);
			}
			_.extend(this, _.pick(options, controllerOptions));
			this.options = options;
		}
	});

	return ViewController;
})(Backbone, _);
