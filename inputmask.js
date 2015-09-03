(function($){

	var inputMask = {

		init : function (opts, elem) {
			this.opts = opts;
			this.cacheElements(elem);
			this.loadMasks();

			return this;
		},

		cacheElements : function (elem) {
			this.$input = $(elem);
			this.placeholder = this.$input.attr('placeholder');
			this.number = this.$input.val();
			this.$descr = $(this.opts.descr);
			this.$toggle = $(this.opts.toggle);
			this.enabled = true;
		},

		bindEvents : function () {
			var self = this;

			// we need only one event
			if (this.enabled) {
				this.$toggle.on('click.mask', function(){
					if (self.enabled) {
						self.$input.off('click.mask input.mask keydown.mask');
						
						self.$input.attr('placeholder', '');
						self.$mask = null;
						self.applyMask();
					} else {
						self.bindEvents();
						self.$input.attr('placeholder', self.placeholder);
						self.$input.trigger('input.mask');
					}
					self.enabled = !self.enabled;
				});
			}

			this.$input.on('click.mask', function(){
				self.setCursorPos();
			});

			this.$input.on('input.mask', function(e){
				e.preventDefault();

				var pos = self.getRealCursorPos();

				self.number = self.$input.val().replace(/[^0-9]/g, '');

				self.findMask();
				self.applyMask();
				self.setCursorPos(pos);
			});

			this.$input.on('keydown.mask', function(e){
				// backspace processing
				if (e.which === 8) {
					e.preventDefault();

					var pos = self.getCursorPos(),
						posReal = self.getRealCursorPos(pos);

					if ( self.deletePrevious(pos) ) {
						self.findMask();
						self.applyMask();
						self.setCursorPos(posReal - 1);
					}
				}
			});
		},

		loadMasks : function () {
			var self = this, masks = [];

			$.getJSON(this.opts.masks).done(function(masks) {
				self.$masks = $(masks);

				self.$masks.each(function(i){
					if (self.opts.cutFirst){
						this.mask = this.mask.substr(1);
					}
					this.maskNum = this.mask.replace(/[^0-9]/g, '');
					this.numLen = this.mask.replace(/[^0-9#]/g, '').length
				});

				self.bindEvents();
			});
		},

		findMask: function () {
			var mask = null,
				i = this.$masks.length;

			while (--i >= 0) {
				if (this.number.indexOf(this.$masks[i].maskNum) === 0 &&
					this.number.length <= this.$masks[i].numLen) {

			 		mask = this.$masks[i];
			 		break;
				}
			}

			this.$mask = mask;
		},

		applyMask: function () {
			if (this.$mask === null) {
				this.$input.val(this.number);
				this.$descr.text('');
				this.$input.trigger('unmasked.mask');
				return;
			}

			var mask = this.$mask.mask,
				number = this.number.replace(this.$mask.maskNum, '');

			for (var i = 0; i < number.length; i++) {
				mask = mask.replace('#', number[i]);
			}

			this.$input.val(mask);
			this.$descr.text(this.$mask['name_' + this.opts.lang] || this.$mask.name_en);

			if (this.$mask.numLen === this.number.length) {
				this.$input.trigger('complete.mask');
			} else {
				this.$input.trigger('incomplete.mask');
			}
		},

		getCursorPos :  function() {
	        var input = this.$input.get(0),
	        	pos = 0;

	        // copied from stackoverflow
	        if ('selectionStart' in input) {
	            // Standard-compliant browsers
	            pos = input.selectionStart;
	        } else if (document.selection) {
	            // IE
	            input.focus();
	            var sel = document.selection.createRange();
	            var selLen = document.selection.createRange().text.length;
	            sel.moveStart('character', -input.value.length);
	            pos = sel.text.length - selLen;
	        }

	        return pos;
	    },

	    getRealCursorPos: function(pos) {
	    	pos = pos || this.getCursorPos();
	    	
	    	// recalculate pos without mask if mask exists
	    	if (this.$mask) {
	    		pos -= this.$mask.mask.substr(0, pos).replace(/[#0-9]/g, '').length;
	    	}

	    	return pos;
	    },

	    setCursorPos : function(pos) {
			var val = this.$input.val(),
				numbers = [];

			// if pos is undefined we set it to current one
			if (pos === undefined) {
				pos = this.getCursorPos();

			// else if mask exists get position in it
			} else if (this.$mask) {
				// take all digits and # with thier numbers in the line
				val.replace(/[#0-9]/g, function (match, offset) {
					numbers.push(offset);
				});
				pos = numbers[pos];
			}

			// if position is undefined or is between #, then we put carriage to the first #
			if (pos === undefined || val[pos] === '#' || val[pos - 1] === '#') {
				pos = val.indexOf('#');
				// if mask filled set caret to end
				if (pos === -1 && this.$mask) {
					pos = this.$mask.mask.length;
				}
			}

			// copied from stackoverflow
			this.$input.each(function(index, elem) {
				if (elem.setSelectionRange) {
					elem.setSelectionRange(pos, pos);
				} else if (elem.createTextRange) {
					var range = elem.createTextRange();
					range.collapse(true);
					range.moveEnd('character', pos);
					range.moveStart('character', pos);
					range.select();
				}
			});
		},

		deletePrevious : function(pos) {
			var val = this.$input.val();

			// digit delition processing through non-digits
			while (true) {
				if ($.isNumeric(val[pos - 1])){
					break;
				}

				if (pos < 1) {
					return false;
				}

				--pos;
			}

			// delition
			this.$input.val(val.substr(0, pos - 1) + val.substr(pos, val.length - 1));
			this.number = this.$input.val().replace(/[^0-9]/g, '');

			return true;		
		},

		// better dont use these two
		isMasked : function () {
			return !!this.$mask;
		},
		isComplete : function () {
			return this.$mask && this.number.length === this.$mask.numLen;
		}
	};

	$.fn.inputMask = function (opts, args) {

		var result = undefined;

		var set = this.each(function(){
		    var $this = $(this);
            var data = $this.data('inputMask/plugin');
            var options = $.extend({}, $.fn.inputMask.opts, $this.data(), typeof opts == 'object' && opts);
            var action = (typeof opts == 'string') ? opts : null;

            if (!data) {
                data = Object.create( inputMask ).init( options, this );
                $this.data('inputMask/plugin', data);
            }

            if (action) {
                result = data[action](args);
            }
		});

		return (result !== undefined) ? result : set;
	};
	
	$.fn.inputMask.opts = {
		'masks': null,
		'descr': '',
		'toggle': '',
		'lang': 'en',
		'cutFirst': false
	};

})(jQuery);