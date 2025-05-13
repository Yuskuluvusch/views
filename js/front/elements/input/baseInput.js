var CONFIGURATOR = CONFIGURATOR || {};
CONFIGURATOR.ELEMENTS = CONFIGURATOR.ELEMENTS || {};
CONFIGURATOR.ELEMENTS.INPUT = CONFIGURATOR.ELEMENTS.INPUT || {};

CONFIGURATOR.ELEMENTS.INPUT.BaseInput = function(step, parent) {
    var Super = Object.getPrototypeOf(this);
    this.valueInactive = 'NOT DEFINED';
    this.HTMLReducPriceLabel = null;

    let debounceTimer = null;

    this.init = function(step, parent) {
        this.pristine = false;
        this.initDOMLinks(step, parent);
        Super.init.call(this, step, parent);
        this.updateInternal(step);
        this.syncHTMLState();
    };

    this.initDOMLinks = function(step, parent) {
        Super.initDOMLinks.call(this, step, parent);
        this.targetEvent = this.getHTMLElement().find('input');
        this.HTMLPriceLabel = this.getHTMLElement().find('.label.label-default');
        this.HTMLReducPriceLabel = this.getHTMLElement().find('.label.label-danger.reduc');
    };

    this.createOperationFromState = function(state, text) {
        var op = Super.createOperationFromState.call(this, state, text);
        op.value = text || op.value;
        return op;
    };

    this.onInteract = function(forcedValue) {
        var currentState = this.state;
        var text = (forcedValue !== undefined) ? forcedValue : this.targetEvent.val();
        this.hasError = !this.validateData(text);

        var nextState;
        var op;

        if (text === this.valueInactive) {
            if (currentState === this.STATE.ACTIVE) {
                nextState = this.STATE.INACTIVE;
                op = this.createOperationFromState(nextState);
            }
        } else {
            if (text !== this.currentContent) {
                nextState = this.STATE.ACTIVE;
                op = this.createOperationFromState(nextState, text);
            }
        }

        this.syncHTMLState();
        if (this.hasError) return;

        var oldOperations = this.operations;
        if (op) {
            this.resetOperations();
            this.addOperations(op);
        } else {
            return;
        }

        var allowed = true;
        if (typeof this.parent.scheduleNotify === 'function') {
            this.parent.scheduleNotify();
        } else {
            allowed = this.parent.notify(this.getID(), nextState);
        }

        this.state = allowed ? nextState : currentState;
        this.currentContent = allowed ? text : this.currentContent;

        if (!allowed) {
            this.operations = oldOperations;
            this.hasError = true;
        } else {
            this.pristine = true;
        }

        this.syncHTMLState();
    };

    this.validateData = function(inputContent) {
        return true;
    };

    this.setValue = function(value) {
        var d = { params: { value: value } };
        this.updateInternal(d);
    };

    this.updateInternal = function(data) {
        this.resetOperations();
        var op;

        if (data.params.value) {
            this.currentContent = data.params.value;
            this.state = this.STATE.ACTIVE;
            this.pristine = true;
            op = this.createOperationFromState(this.state, this.currentContent);
        } else {
            this.currentContent = this.valueInactive;
            this.state = this.STATE.INACTIVE;
            if (this.pristine) {
                op = this.createOperationFromState(this.state, this.currentContent);
            }
        }

        if (op) {
            this.addOperations(op);
        }

        this.targetEvent.prop('value', this.currentContent);
        this.hasError = false;
        this.syncHTMLState();
    };

    this.syncHTMLState = function() {
        var elt = this.getHTMLElement();
        if (this.hasError) {
            elt.removeClass('form-ok');
            elt.addClass('form-error');
        } else {
            elt.removeClass('form-error');
            if (this.STATE.ACTIVE === this.state) {
                elt.addClass('form-ok');
            } else {
                elt.removeClass('form-ok');
            }
        }
    };

    this.bind = function() {
        const self = this;

        this.targetEvent.on('blur', function () {
            self.onInteract();
        });

        this.targetEvent.on('input', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                self.onInteract(self.targetEvent.val());
            }, 600);
        });

        this.targetEvent.on('keypress', function (event) {
            if (event.key === "Enter") {
                clearTimeout(debounceTimer);
                self.onInteract(self.targetEvent.val());
            }
        });
    };

    this.unbind = function() {
        this.targetEvent.off('blur');
        this.targetEvent.off('input');
        this.targetEvent.off('keypress');
    };

    if (step) {
        this.init(step, parent);
    }

    this.getHTMLReducPriceLabel = function() {
        return this.HTMLReducPriceLabel;
    };
};

CONFIGURATOR.ELEMENTS.INPUT.BaseInput.prototype = new CONFIGURATOR.ELEMENTS.BaseSimpleElement;
