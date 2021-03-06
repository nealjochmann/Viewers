import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import { Tracker } from 'meteor/tracker';
import { _ } from 'meteor/underscore';
import { $ } from 'meteor/jquery';
import { OHIF } from 'meteor/ohif:core';

/*
 * input: controls a select2 component
 */
OHIF.mixins.select2 = new OHIF.Mixin({
    dependencies: 'select',
    composition: {
        onCreated() {
            const instance = Template.instance();

            // Set the custom focus flag
            instance.component.isCustomFocus = true;

            // Utility function to get the dropdown jQuery element
            instance.getDropdownContainerElement = () => {
                const $select2 = instance.component.$element.nextAll('.select2:first');
                const containerId = $select2.find('.select2-selection').attr('aria-owns');
                return $(`#${containerId}`).closest('.select2-container');
            };

            // Check if this select will include a placeholder
            const placeholder = instance.data.options && instance.data.options.placeholder;
            if (placeholder) {
                instance.autorun(() => {
                    // Get the option items
                    let items = instance.data.items;

                    // Check if the items are reactive and get them if true
                    const isReactive = items instanceof ReactiveVar;
                    if (isReactive) {
                        items = items.get();
                    }

                    // Check if there is already an empty option on items list
                    if (!_.findWhere(items, { value: '' })) {
                        // Clone the current items
                        const newItems = _.clone(items) || [];
                        newItems.unshift({
                            label: placeholder,
                            value: ''
                        });

                        // Set the new items list including the empty option
                        if (isReactive) {
                            instance.data.items.set(newItems);
                        } else {
                            instance.data.items = newItems;
                        }
                    }
                });
            }
        },

        onRendered() {
            const instance = Template.instance();
            const component = instance.component;

            // Destroy and re-create the select2 instance
            const rebuildSelect2 = () => {
                // Destroy the select2 instance if exists and re-create it
                if (component.select2Instance) {
                    component.select2Instance.destroy();
                }

                // Apply the select2 to the component
                component.$element.select2(instance.data.options);

                // Store the select2 instance to allow its further destruction
                component.select2Instance = component.$element.data('select2');

                // Get the focusable elements
                const elements = [];
                const $select2 = component.$element.nextAll('.select2:first');
                elements.push(component.$element[0]);
                elements.push($select2.find('.select2-selection')[0]);

                // Attach focus and blur handlers to focusable elements
                $(elements).on('focus', event => {
                    if (event.target === event.currentTarget) {
                        // Show the state message on elements focus
                        component.toggleMessage(true);
                    }
                }).on('blur', event => {
                    if (event.target === event.currentTarget) {
                        // Hide the state message on elements blur
                        component.toggleMessage(false);
                    }
                });

                // Redirect keydown events from input to the select2 selection handler
                component.$element.on('keydown ', event => {
                    event.preventDefault();
                    $select2.find('.select2-selection').trigger(event);
                });

                // Keep focus on element if ESC was pressed
                $select2.on('keydown ', event => {
                    if (event.which === 27) {
                        instance.component.$element.focus();
                    }
                });
            };

            instance.autorun(() => {
                // Run this computation every time the reactive items suffer any changes
                const isReactive = instance.data.items instanceof ReactiveVar;
                if (isReactive) {
                    instance.data.items.dep.depend();
                }

                if (isReactive) {
                    // Keep the current value of the component
                    const currentValue = component.value();
                    Tracker.afterFlush(() => {
                        rebuildSelect2();
                        component.$element.val(currentValue);
                    });
                } else {
                    rebuildSelect2();
                }
            });
        },

        events: {
            // Focus element when selecting a value
            'select2:select'(event, instance) {
                instance.component.$element.focus();
            },

            // Focus the element when closing the dropdown container using ESC key
            'select2:open'(event, instance) {
                const { minimumResultsForSearch } = instance.data.options;
                if (minimumResultsForSearch === Infinity || minimumResultsForSearch === -1) return;
                const $container = instance.getDropdownContainerElement();
                const $searchInput = $container.find('.select2-search__field');
                $searchInput.on('keydown.focusOnEsc', event => {
                    if (event.which === 27) {
                        $searchInput.off('keydown.focusOnEsc');
                        instance.component.$element.focus();
                    }
                });
            }
        },

        onDestroyed() {
            const instance = Template.instance();
            const component = instance.component;

            // Destroy the select2 instance to remove unwanted DOM elements
            if (component.select2Instance) {
                component.select2Instance.destroy();
            }
        }
    }
});
