import Helper from '../helper';

export default {
    namespaced: true,
    state: {
        settings: {},
        availableTax : {},
        cartdata :  {
            line_items: [],
            fee_lines: [],
        }
    },
    getters: {
        getSubtotal( state ) {
            var subtotal = 0;
            weLo_.forEach( state.cartdata.line_items, function( item, key ) {
                if ( item.on_sale ) {
                    subtotal += (item.quantity*item.sale_price)
                } else {
                    subtotal += (item.quantity*item.regular_price)
                }
            });

            return subtotal;
        },
        getTotalFee( state ) {
            var fee = 0;
            weLo_.forEach( state.cartdata.fee_lines, function( item, key ) {
                if ( item.type == 'fee' ) {
                    fee += Math.abs( item.total )
                }
            });
            return fee;
        },
        getTotalDiscount( state ) {
            var discount = 0;
            weLo_.forEach( state.cartdata.fee_lines, function( item, key ) {
                if ( item.type == 'discount' ) {
                    discount += Number( Math.abs( item.total ) );
                }
            });

            return discount;
        },
        getTotalLineTax( state ) {
            var self = this,
                taxLineTotal = 0;

            weLo_.forEach( state.cartdata.line_items, function( item, key ) {
                taxLineTotal += Math.abs( item.tax_amount * item.quantity );
            });

            return taxLineTotal;
        },
        getTotalTax( state ) {
            var self = this,
                taxLineTotal = 0,
                taxFeeTotal = 0;
            weLo_.forEach( state.cartdata.line_items, function( item, key ) {
                taxLineTotal += Math.abs( item.tax_amount * item.quantity );
            });

            if ( state.settings.woo_tax != undefined && state.settings.woo_tax.wc_tax_display_cart == 'incl' ) {
                taxLineTotal = 0;
            }

            weLo_.forEach( state.cartdata.fee_lines, function( item, key ) {
                if ( item.type == 'fee' ) {
                    if ( item.tax_status == 'taxable' ) {
                        var itemTaxClass = item.tax_class === '' ? 'standard' : item.tax_class;
                        var taxClass = weLo_.find( state.availableTax, { 'class' : itemTaxClass.toString() } );
                        if ( taxClass !== undefined ) {
                            taxFeeTotal += ( Math.abs(item.total)*Math.abs( taxClass.rate ) )/100;
                        }
                    }
                }
            });

            return taxLineTotal + taxFeeTotal;
        },
        getOrderTotal( state, getters ) {
            return (getters.getSubtotal + getters.getTotalFee + getters.getTotalTax );
        },
        getTotal( state, getters ) {
            return getters.getOrderTotal-getters.getTotalDiscount;
        },
        getSettings( state, getters ) {
            return state.settings;
        }
    },
    mutations: {
        setSettings( state, settings ) {
            state.settings = settings;
        },

        setAvailableTax( state, availableTax ) {
            state.availableTax = availableTax;
        },

        setCartData( state, cartdata ) {
            if ( weLo_.isEmpty( cartdata ) ) {
                state.cartdata = {
                    line_items: [],
                    fee_lines: [],
                }
            } else {
                state.cartdata = Object.assign( {}, cartdata );
            }
        },

        addToCartItem( state, product ) {
            var cartObject = {};
            cartObject.product_id         = ( product.parent_id === 0 ) ? product.id : product.parent_id;
            cartObject.name               = product.name;
            cartObject.quantity           = 1;
            cartObject.regular_price      = product.regular_display_price;
            cartObject.sale_price         = product.sales_display_price;
            cartObject.on_sale            = product.on_sale;
            cartObject.attribute          = product.attributes;
            cartObject.variation_id       = ( product.parent_id !== 0 ) ? product.id : 0;
            cartObject.editQuantity       = false;
            cartObject.type               = product.type;
            cartObject.tax_amount         = product.tax_amount;
            cartObject.manage_stock       = product.manage_stock;
            cartObject.stock_status       = product.stock_status;
            cartObject.backorders_allowed = product.backorders_allowed;
            cartObject.stock_quantity     = product.stock_quantity;

            if(product.meta_data) {
                for (const meta_object of product.meta_data) {
                    if(meta_object.key === '_fixed_price_rules' && meta_object.value) {
                        cartObject.fixed_price_rules = meta_object.value;
                        break;
                    }
                }

                if(cartObject.fixed_price_rules) {
                    const ar = Helper.apply_fixed_price_rules(cartObject.fixed_price_rules, cartObject.quantity)

                    if(cartObject.fixed_price_rules[ar]) {
                        cartObject.sale_price = cartObject.fixed_price_rules[ar]
                        cartObject.on_sale = true;
                    }
                }
            }

            var index = weLo_.findIndex( state.cartdata.line_items, { product_id: cartObject.product_id, variation_id: cartObject.variation_id} );

            if ( index < 0 ) {
                if ( Helper.hasStock( product ) ) {
                    state.cartdata.line_items.push( cartObject );
                }
            } else {
                if ( Helper.hasStock( product, state.cartdata.line_items[index].quantity ) ) {
                    state.cartdata.line_items[index].quantity = parseInt(state.cartdata.line_items[index].quantity) + 1 + '';

                    if(cartObject.fixed_price_rules) {
                        const ar = Helper.apply_fixed_price_rules(cartObject.fixed_price_rules, state.cartdata.line_items[index].quantity)

                        if(cartObject.fixed_price_rules[ar]) {
                            state.cartdata.line_items[index].sale_price = cartObject.fixed_price_rules[ar]
                            state.cartdata.line_items[index].on_sale = true;
                        }
                    }
                }
            }
        },
        addKioskToCart( state, product ) {
            var cartObject = {};
            cartObject.type               = 'kiosk';
            cartObject.product_id         = `kiosk-${product.sku || Date.now()}` ;
            cartObject.name               = `PRINTS ${product.sku ? `(${product.sku})` : '' }`.trim();
            cartObject.regular_price      = product.price;
            cartObject.quantity           = 1;

            cartObject.tax_amount         = 0;
            cartObject.attribute          = [];

            cartObject.total              = product.price;
            cartObject.subtotal           = product.price;

            var index = weLo_.findIndex( state.cartdata.line_items, { product_id: cartObject.product_id } );

            if( index < 0 ) {
                state.cartdata.line_items.push( cartObject );
            } else {
                alert( 'Kiosk order with the same number already in cart' );
            }
        },

        removeCartItem( state, itemKey ) {
            state.cartdata.line_items.splice( itemKey, 1 );
        },

        addCartItemQuantity( state, itemKey ) {
            var item = state.cartdata.line_items[itemKey];

            if(item.fixed_price_rules) {
                const ar = Helper.apply_fixed_price_rules(item.fixed_price_rules, item.quantity + 1)

                if(item.fixed_price_rules[ar]) {
                    item.sale_price = item.fixed_price_rules[ar];
                    item.on_sale = true;
                } else {
                    item.sale_price = item.sale_price_default;
                    item.on_sale = item.on_sale_default;
                }
            }

            if ( Helper.hasStock( item, item.quantity ) ) {
                state.cartdata.line_items[itemKey].quantity++;
            }
        },

        removeCartItemQuantity( state, itemKey ) {
            var item = state.cartdata.line_items[itemKey];

            if(item.fixed_price_rules) {
                const ar = Helper.apply_fixed_price_rules(item.fixed_price_rules, item.quantity - 1)

                if(item.fixed_price_rules[ar]) {
                    item.sale_price = item.fixed_price_rules[ar];
                    item.on_sale = true;
                } else {
                    item.sale_price = item.sale_price_default;
                    item.on_sale = item.on_sale_default;
                }
            }

            if ( item.quantity <= 1 ) {
                state.cartdata.line_items[itemKey].quantity = 1;
            } else {
                state.cartdata.line_items[itemKey].quantity--;
            }
        },

        changeCartItemQuantity( state, data ) {
            var item = state.cartdata.line_items[data.key];

            if(item.fixed_price_rules) {
                const ar = Helper.apply_fixed_price_rules(item.fixed_price_rules, data.qty)

                if(item.fixed_price_rules[ar]) {
                    item.sale_price = item.fixed_price_rules[ar];
                    item.on_sale = true;
                } else {
                    item.sale_price = item.sale_price_default;
                    item.on_sale = item.on_sale_default;
                }
            }

            if ( data.qty <= 1 ) {
                state.cartdata.line_items[data.key].quantity = 1;
            } else {
                state.cartdata.line_items[data.key].quantity = data.qty;
            }
        },

        toggleEditQuantity( state, itemKey ) {
            state.cartdata.line_items[itemKey].editQuantity = !  state.cartdata.line_items[itemKey].editQuantity;
        },

        addDiscount( state, discountData ) {
            state.cartdata.fee_lines.push({
                name: discountData.title,
                type: 'discount',
                value: discountData.value.toString(),
                isEdit: false,
                discount_type: discountData.type,
                tax_status: 'none',
                tax_class: '',
                total: 0
            });
        },

        addFee( state, feeData ) {
            state.cartdata.fee_lines.push({
                name: feeData.title,
                type: 'fee',
                value: feeData.value.toString(),
                isEdit: false,
                fee_type: feeData.type,
                tax_status: 'none',
                tax_class: '',
                total: 0
            });
        },

        saveFeeValue( state, item ) {
            state.cartdata.fee_lines.splice( item.key, 1, item.feeData );
            state.cartdata.fee_lines[item.key].isEdit = false;
        },

        editFeeValue( state, itemKey ) {
            state.cartdata.fee_lines[itemKey].isEdit = true;
        },

        cancelSaveFeeValue( state, itemKey ) {
            state.cartdata.fee_lines[itemKey].isEdit = false;
        },

        removeFeeLineItems( state, itemKey ) {
            state.cartdata.fee_lines.splice( itemKey, 1 );
        },

        emptyCart( state ) {
            state.cartdata =  {
                line_items: [],
                fee_lines: [],
            };
        },
        calculateDiscount( state, payload ) {
            if ( state.cartdata.fee_lines.length > 0 ) {
                weLo_.forEach( state.cartdata.fee_lines, ( item, key ) => {
                    if ( item.type == "discount" ) {
                        if ( item.discount_type == 'percent' ) {
                            state.cartdata.fee_lines[key].total = '-' + ( payload.getSubtotal*Math.abs( item.value ) )/100;
                        } else {
                            state.cartdata.fee_lines[key].total = '-' + Math.abs( item.value );
                        }
                    }
                } );
            }
        },
        calculateFee( state, payload ) {
            if ( state.cartdata.fee_lines.length > 0 ) {
                weLo_.forEach( state.cartdata.fee_lines, ( item,key ) => {
                    if ( item.type == 'fee' ) {
                        if ( item.fee_type == 'percent' ) {
                            state.cartdata.fee_lines[key].total = ( ( payload.getSubtotal*Math.abs( item.value ) )/100 ).toString();
                        } else {
                            state.cartdata.fee_lines[key].total = Math.abs( item.value ).toString();
                        }
                    }
                } );
            }
        },
    },
    actions: {
        setSettingsAction( context, settings ) {
            context.commit( 'setSettings', settings );
        },

        setAvailableTaxAction( context, availableTax ) {
            context.commit( 'setAvailableTax', availableTax );
        },

        setCartDataAction( context, cartdata ) {
            context.commit( 'setCartData', cartdata );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        addToCartAction( context, product ) {
            context.commit( 'addToCartItem', product );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        addKioskToCart( context, product ) {
            context.commit( 'addKioskToCart', product );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        removeCartItemAction( context, itemKey ) {
            context.commit( 'removeCartItem', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        addItemQuantityAction( context, itemKey ) {
            context.commit( 'addCartItemQuantity', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        removeItemQuantityAction( context, itemKey ) {
            context.commit( 'removeCartItemQuantity', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        changeItemQuantityAction( context, itemKey, qty ) {
            context.commit( 'changeCartItemQuantity', itemKey, qty );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        toggleEditQuantityAction( context, itemKey ) {
            context.commit( 'toggleEditQuantity', itemKey );
        },

        addDiscountAction( context, discountData ) {
            context.commit( 'addDiscount', discountData );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        addFeeAction( context, feeData ) {
            context.commit( 'addFee', feeData );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        removeFeeLineItemsAction( context, itemKey ) {
            context.commit( 'removeFeeLineItems', itemKey );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        saveFeeValueAction( context, feeData ) {
            context.commit( 'saveFeeValue', feeData );
            context.commit( 'calculateDiscount', context.getters );
            context.commit( 'calculateFee', context.getters );
        },

        editFeeValueAction( context, itemKey ) {
            context.commit( 'editFeeValue', itemKey );
        },

        cancelSaveFeeValueAction( context, itemKey ) {
            context.commit( 'cancelSaveFeeValue', itemKey );
        },

        emptyCartAction( context ) {
            context.commit( 'emptyCart' );
        },

        calculateDiscount( context ) {
            context.commit( 'calculateDiscount', context.getters );
        },

        calculateFee( context ) {
            context.commit( 'calculateFee', context.getters );
        }
    }
};
