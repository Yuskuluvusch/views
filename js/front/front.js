var CONFIGURATOR = CONFIGURATOR || {};

CONFIGURATOR.Front = function (step) {
    var Super = Object.getPrototypeOf(this);

    this.modules = [];
    this.queryError = '> div > div.errors';

    // NUEVAS BANDERAS
    this.isCalculating = false;
    this.shouldRecalculate = false;

    this.notify = function () {
        if (this.isCalculating) {
            this.shouldRecalculate = true;
            return;
        }

        console.log("Retrieving operations:");
        var operations = this.getOperations();
        console.log(operations);

        this.unbind();
        this.beforeIO();
        this.io.send(operations);
    };
    
    this.scheduleNotify = function () {
    if (this.isCalculating) {
        this.shouldRecalculate = true;
    } else {
        this.notify();
    }
};


    this.changeSharedStep = function () {
        var self = this;
        var operations = this.getOperations();
        this.unbind();
        this.beforeIO();
        this.io.sendSharedStep(operations, self.callBackIO());
        return true;
    };

    this.callBackIO = function () {
        var self = this;
        return function (data) {
            self.update(data);
        };
    };

    this.beforeIO = function () {
        $(this.step.params.queryLoading).addClass('loading');
        this.isCalculating = true;
    };

    this.afterIO = function () {
        $(this.step.params.queryLoading).removeClass('loading');
        this.isCalculating = false;
        this.refreshSharedStep(this.step);

        // Recalcula si hubo cambios mientras se estaba calculando
        if (this.shouldRecalculate) {
            this.shouldRecalculate = false;
            this.notify();
        }
    };

    this.disableFormFields = function (status) {
        // No usamos ya esta función para evitar bloqueos visuales
    };

    this.refreshSharedStep = function (steps) {
        for (var i in steps.substeps) {
            var step = steps.substeps[i];
            $('#configurator_block #step_' + step.params.id + ' input').prop('disabled', false);
            $('#configurator_block #step_' + step.params.id + ' select').prop('disabled', false);
        }
    };

    this.update = function (data) {
        $('#configurator_block .step_list').height($('#configurator_block .step_list').height());

        this.afterIO();
        this.refreshSharedStep(data);

        if (data.infos?.length) {
            this.step.infos = data.infos;
            this.showInfos();
        }

        if (data.errors?.length) {
            this.step.errors = data.errors;
            this.showErrors();
        } else {
            this.hideAll();
            this.hideAccordions();
            this.resetModules();
            this.updateModules(data.actions);
            this.step = data;
            Super.update.call(this, data);
        }

        this.bind();
        this.progressiveDisplay();
        this.sendActions();
        this.general.displayActionTab();
        this.general.displayActionAccordion();
        this.general.refreshCartPreviewButtons();
        this.general.refreshTabsStatus(data.tabs_status);

        $('#configurator_block .step_list').height('auto');
        console.log("Update");
    };

    this.appendError = function (error) {
        const alertClass = (error.type === 'ERROR') ? 'alert-danger' : 'alert-warning';
        const err = $('<div></div>', { class: 'alert ' + alertClass });
        err.append($('<p></p>', { text: error.title }));
        err.append($('<p></p>', { text: error.message }));
        this.getHTMLElement().find(this.queryError).append(err);
    };

    this.progressiveDisplay = function () {
        if (this.step.params.progressive_display) {
            var foundFirst = false;
            var self = this;
            this.substeps.forEach(function (substep) {
                if (substep.getVisibleState() === self.STATE.VISIBLE) {
                    if (foundFirst) {
                        substep.hideAll();
                    } else if (substep.getState() === self.STATE.INACTIVE) {
                        foundFirst = true;
                    }
                }
            });
        }
    };

    this.hideAccordions = function () {
        $('.configurator-card').hide();
    };

    this.updateModules = function (data) {
        for (var i in data) {
            var d = data[i];
            var element_type = d.element_type;
            if (this.modules[element_type]) {
                this.modules[element_type].handle(d);
            } else {
                console.log("Cannot handle request for " + element_type);
            }
        }
    };

    this.resetModules = function () {
        for (var p in this.modules) {
            this.modules[p].reset();
        }
    };

    this.setupDebouncedNotify = function () {
        var self = this;
        let debounceTimer = null;

        $('#configurator_block').on('input change', 'input, select', function () {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(function () {
                self.notify();
            }, 500);
        });
    };

    this.init = function (step) {
        this.hideAccordions();
        this.initModules(step, function () { });

        var self = this;
        Super.init.call(self, step);

        var setup = {
            url: typeof url_configurator_product !== 'undefined' ? url_configurator_product : '',
            done: self.callBackIO()
        };
        self.io = new CONFIGURATOR.IO(setup);

        self.general = new CONFIGURATOR.MODULES.General();
        self.general.showAll();
        self.general.eventAction();

        self.refreshSharedStep(step);
        self.bind();
        self.progressiveDisplay();
        self.sendActions();
        self.general.refreshTabsStatus(step.tabs_status);

        self.setupDebouncedNotify();
        self.notify(); // llamada inicial
    };

    this.initModules = function (step, callback) {
        var waitForIt = function () {
            var left = Object.keys(step.modules).length;
            return function () {
                left--;
                if (left <= 0) callback();
            };
        };
        var wait = waitForIt();
        var dispatch = CONFIGURATOR.MODULES.dispatch;
        this.modules = [];

        for (var key in step.modules) {
            var moduleConf = step.modules[key];
            var obj = dispatch.getAssociatedObject(moduleConf.element_type);
            if (obj && typeof (obj) !== 'string') {
                this.modules[key] = new obj(moduleConf, wait);
            } else {
                console.log(obj);
            }
        }
    };

    this.initDOMLinks = function (step, parent) {
        this.HTMLElement = $('#configurator_block');
    };

    if (step) {
        this.init(step);
    }
};

CONFIGURATOR.Front.prototype = new CONFIGURATOR.ELEMENTS.BaseGroupElement;